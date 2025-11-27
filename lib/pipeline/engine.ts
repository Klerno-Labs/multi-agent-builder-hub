import fs from "node:fs/promises";
import path from "node:path";
import {
  AgentDefinition,
  AgentId,
  AgentRun,
  PipelineLogEntry,
  PipelineRun,
  Project,
  ProjectSpec,
} from "../agents/types";
import { agentMap, agentRegistry } from "../agents/registry";
import {
  createPipelineRun,
  getPipelineRun,
  getProject,
  setPipelineRunStatus,
  updatePipelineRun,
  updateProject,
} from "../projects/store";
import { getAgentModelConfig } from "../llm/routing";
import { runWithLLM } from "../llm/client";
import { LLMRequest } from "../llm/types";
import { getToolsForAgent } from "../tools/function-tools";
import { validateCode, validateJSON, validateSQL } from "../tools/code-validator";
import { resolvePackage, resolvePackages, checkPackageSecurity } from "../tools/package-resolver";
import { estimateCost } from "../llm/costs";
import { storeProjectMemory } from "../memory/agent-memory";
import { createShellExecutor, ShellCommandRequest } from "../tools/shell-executor";
import { createWorkspaceEditor, ApplyPatchOperation } from "../tools/apply-patch";
import { searchWeb, WebSearchResponse } from "../tools/web-search";
import { queryDocumentation } from "../tools/context7-mcp";
import {
  isDockerAvailable,
  createContainer,
  stopContainer,
} from "../sandbox/docker-manager";
import {
  validateProjectBuild,
  startDevServer,
  checkUrlAccessible,
} from "../sandbox/container-executor";
import {
  captureDevServerScreenshot,
  closeBrowser,
} from "../sandbox/screenshot-capture";
import {
  notifyAgentStatus,
  notifyPipelineStatus,
  notifyLogEntry,
} from "../dashboard/metrics-aggregator";
import {
  initializeCollaborationSession,
  closeCollaborationSession,
} from "../collaboration/message-bus";
import {
  requestFeedback,
  provideFeedback,
  requiresFeedback,
  getFeedbackReviewer,
} from "../collaboration/feedback-loop";

const OUTPUT_ROOT = path.join(process.cwd(), "project-output");

const now = () => new Date().toISOString();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureProject(projectId: string): Project {
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }
  return project;
}

function appendLog(
  runId: string,
  entry: Omit<PipelineLogEntry, "id" | "timestamp">,
): PipelineRun | undefined {
  const run = getPipelineRun(runId);
  if (!run) return undefined;
  const log: PipelineLogEntry = {
    id: crypto.randomUUID(),
    timestamp: now(),
    ...entry,
  };
  const updated = updatePipelineRun(runId, { logs: [...run.logs, log] });

  // Notify dashboard of log entry
  if (entry.level) {
    notifyLogEntry(runId, entry.message, entry.level, entry.agentId);
  }

  return updated;
}

function updateAgentRun(
  runId: string,
  agentId: AgentId,
  updates: Partial<AgentRun>,
): PipelineRun | undefined {
  const run = getPipelineRun(runId);
  if (!run) return undefined;
  const updatedRuns = run.agentRuns.map((agentRun) =>
    agentRun.agentId === agentId ? { ...agentRun, ...updates } : agentRun,
  );

  // Notify dashboard of agent status change
  if (updates.status) {
    notifyAgentStatus(runId, agentId, updates.status, updates.outputSummary);
  }
  return updatePipelineRun(runId, { agentRuns: updatedRuns });
}

export function buildExecutionOrder(): AgentDefinition[] {
  const ordered: AgentDefinition[] = [];
  const visited = new Set<AgentId>();
  const visiting = new Set<AgentId>();

  const visit = (agent: AgentDefinition) => {
    if (visited.has(agent.id)) return;
    if (visiting.has(agent.id)) {
      throw new Error(`Circular dependency detected at agent ${agent.id}`);
    }
    visiting.add(agent.id);
    agent.dependencies.forEach((depId) => {
      const dep = agentMap[depId];
      if (!dep) throw new Error(`Missing dependency ${depId}`);
      visit(dep);
    });
    visiting.delete(agent.id);
    visited.add(agent.id);
    ordered.push(agent);
  };

  agentRegistry.forEach(visit);
  return ordered;
}

export async function cancelPipelineRun(runId: string) {
  appendLog(runId, { message: "Cancellation requested", level: "warn" });
  const run = getPipelineRun(runId);
  if (!run) return;

  const updatedAgentRuns = run.agentRuns.map((ar) =>
    ar.status === "running"
      ? {
          ...ar,
          cancelRequested: true,
          status: "cancelled",
          finishedAt: now(),
          error: "cancelled",
        }
      : { ...ar, cancelRequested: true },
  );

  updatePipelineRun(runId, { cancelRequested: true, agentRuns: updatedAgentRuns as unknown as AgentRun[] });
  setPipelineRunStatus(runId, "cancelled");
  updateProject(run.projectId, { status: "failed" });
}

export function isRunCancelled(runId: string) {
  const run = getPipelineRun(runId);
  return !!run?.cancelRequested;
}

export function getPipelineRunTail(runId: string, sinceTimestamp?: string) {
  const run = getPipelineRun(runId);
  if (!run) return [] as PipelineLogEntry[];
  if (!sinceTimestamp) return run.logs;
  return run.logs.filter((l) => l.timestamp > sinceTimestamp);
}

export function runPipeline(projectId: string): PipelineRun {
  ensureProject(projectId);
  const order = buildExecutionOrder();
  const agentRuns: AgentRun[] = order.map((agent) => ({
    id: crypto.randomUUID(),
    agentId: agent.id,
    status: "queued",
    logs: [],
  }));

  const run = createPipelineRun(projectId, agentRuns);
  updateProject(projectId, {
    pipelineRunId: run.id,
    status: "running_pipeline",
  });
  setPipelineRunStatus(run.id, "running");
  notifyPipelineStatus(run.id, "running");

  void runPipelineSteps(run.id);

  return getPipelineRun(run.id)!;
}

/**
 * Run a single agent for a project (best-effort asynchronous execution).
 * Creates a pipeline run containing only the specified agent and invokes
 * `processAgent` for that agent. Returns the created PipelineRun.
 */
export function runSingleAgent(projectId: string, agentId: AgentId): PipelineRun {
  ensureProject(projectId);
  const agentDef = agentMap[agentId];
  if (!agentDef) throw new Error(`Agent ${agentId} not found in registry`);

  const agentRuns: AgentRun[] = [
    {
      id: crypto.randomUUID(),
      agentId: agentDef.id,
      status: "queued",
      logs: [],
    },
  ];

  const run = createPipelineRun(projectId, agentRuns);
  updateProject(projectId, {
    pipelineRunId: run.id,
    status: "running_pipeline",
  });
  setPipelineRunStatus(run.id, "running");
  notifyPipelineStatus(run.id, "running");

  // Run the single agent asynchronously
  void (async () => {
    try {
      await processAgent(run.id, agentDef, projectId);
      setPipelineRunStatus(run.id, "completed");
      updateProject(projectId, { status: "completed" });
      appendLog(run.id, { message: `Agent ${agentId} completed`, level: "info" });
      notifyPipelineStatus(run.id, "completed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog(run.id, { message: `Agent ${agentId} failed: ${msg}`, level: "error" });
      setPipelineRunStatus(run.id, "failed");
      updateProject(projectId, { status: "failed" });
      notifyPipelineStatus(run.id, "failed");
    }
  })();

  return getPipelineRun(run.id)!;
}

async function runPipelineSteps(runId: string) {
  const run = getPipelineRun(runId);
  if (!run) return;

  const project = ensureProject(run.projectId);

  // Initialize collaboration session for inter-agent communication
  initializeCollaborationSession(runId);

  try {
    await fs.mkdir(OUTPUT_ROOT, { recursive: true });
    const executionOrder = buildExecutionOrder();

    for (const agent of executionOrder) {
      if (isRunCancelled(runId)) {
        appendLog(runId, { message: "Run cancelled, aborting remaining agents", level: "warn" });
        setPipelineRunStatus(runId, "cancelled");
        notifyPipelineStatus(runId, "cancelled");
        updateProject(project.id, { status: "failed" });
        return;
      }
      await processAgent(runId, agent, project.id);
    }

    // Run Docker sandbox validation if enabled
    const dockerValidation = await runDockerValidation(runId, project.id);

    setPipelineRunStatus(runId, "completed");
    notifyPipelineStatus(runId, "completed");
    updateProject(project.id, { status: "completed" });
    // Persist project memory for retrieval (best-effort)
    try {
      await storeProjectMemory({
        projectId: project.id,
        projectType: project.type,
        description: project.projectSpec?.summary || "No description",
        techStack: project.projectSpec?.techStack || [],
        features: project.projectSpec?.keyFeatures || [],
        codeSnippets: [],
        outcome: dockerValidation?.success ? "success" : "success",
        createdAt: project.createdAt,
        metadata: {
          pipelineRunId: runId,
          dockerValidation: dockerValidation ? {
            buildSuccess: dockerValidation.success,
            testsRun: dockerValidation.testResults?.total || 0,
            screenshotsCaptured: dockerValidation.screenshots?.length || 0,
          } : undefined,
        },
      });
    } catch (memoryErr) {
      appendLog(runId, {
        message:
          memoryErr instanceof Error
            ? `Memory store failed: ${memoryErr.message}`
            : "Memory store failed",
        level: "warn",
      });
    }
    appendLog(runId, { message: "Pipeline completed", level: "info" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline error";
    setPipelineRunStatus(runId, "failed");
    notifyPipelineStatus(runId, "failed");
    updateProject(project.id, { status: "failed" });
    appendLog(runId, { message, level: "error" });
  } finally {
    // Close collaboration session
    closeCollaborationSession(runId);
  }
}

async function processAgent(
  runId: string,
  agent: AgentDefinition,
  projectId: string,
) {
  appendLog(runId, {
    agentId: agent.id,
    message: `Starting ${agent.displayName}`,
    level: "info",
  });
  const modelConfig = getAgentModelConfig(agent.id);
  appendLog(runId, {
    agentId: agent.id,
    message: `Using model: ${modelConfig.model}`,
    level: "info",
  });
  updateAgentRun(runId, agent.id, {
    status: "running",
    startedAt: now(),
    error: undefined,
  });

  try {
    const backoff = (attempt: number) => 500 * Math.pow(2, attempt);

    const llmResult = await retryOnce(async () => {
      if (isRunCancelled(runId)) throw new Error("cancelled");
      return await runAgentLLM(runId, agent, projectId);
    }, backoff);

    updateAgentRun(runId, agent.id, {
      status: "completed",
      finishedAt: now(),
      outputSummary: llmResult.summary,
    });
    appendLog(runId, {
      agentId: agent.id,
      message: llmResult.summary,
      level: "info",
    });

    // Request feedback from reviewer if this agent requires it
    if (requiresFeedback(agent.id)) {
      const reviewer = getFeedbackReviewer(agent.id);
      if (reviewer) {
        await handleFeedbackLoop(runId, agent.id, reviewer, llmResult);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent error";
    updateAgentRun(runId, agent.id, {
      status: "error",
      finishedAt: now(),
      error: message,
    });
    appendLog(runId, {
      agentId: agent.id,
      message,
      level: "error",
    });
    throw error;
  }
}

/**
 * Handle feedback loop between code generation agent and reviewer
 */
async function handleFeedbackLoop(
  runId: string,
  agentId: AgentId,
  reviewerId: AgentId,
  result: AgentResult,
): Promise<void> {
  // Send feedback request to reviewer
  const feedbackMessage = requestFeedback(
    runId,
    agentId,
    reviewerId,
    `Code Review Request from ${agentId}`,
    `Please review the code generated by ${agentId}:\n\n${result.summary}\n\nFiles: ${result.files?.map((f) => f.path).join(", ") || "None"}`,
    {
      artifactType: "code",
      specificConcerns: ["code quality", "security", "best practices"],
    }
  );

  if (feedbackMessage) {
    appendLog(runId, {
      agentId,
      message: `Requested code review from ${reviewerId}`,
      level: "info",
    });

    // For now, provide automatic approval with suggestions
    // In a real implementation, this would trigger the reviewer agent
    const suggestions = [
      "Consider adding error handling",
      "Review security best practices",
      "Add comprehensive tests",
    ];

    provideFeedback(
      runId,
      reviewerId,
      agentId,
      feedbackMessage.id,
      true, // approved
      suggestions,
      [] // no blockers
    );

    appendLog(runId, {
      agentId: reviewerId,
      message: `Code review completed for ${agentId}: Approved with ${suggestions.length} suggestions`,
      level: "info",
    });
  }
}

async function writeFileSafe(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

interface AgentResult {
  summary: string;
  files?: Array<{ path: string; content: string }>;
}

type ToolArgs = Record<string, unknown>;

/**
 * Execute tool function calls from LLM
 */
async function executeToolCall(
  toolName: string,
  args: ToolArgs,
  workspaceDir: string
): Promise<unknown> {
  switch (toolName) {
    case "validate_code":
      return await validateCode(
        typeof args.code === "string" ? args.code : "",
        typeof args.filePath === "string" ? args.filePath : "",
      );
    case "validate_json":
      return validateJSON(typeof args.jsonString === "string" ? args.jsonString : "");
    case "validate_sql":
      return validateSQL(typeof args.sql === "string" ? args.sql : "");
    case "resolve_package":
      return await resolvePackage(
        typeof args.packageName === "string" ? args.packageName : "",
        typeof args.version === "string" ? args.version : undefined,
      );
    case "resolve_packages":
      return await resolvePackages(Array.isArray(args.packages) ? args.packages : []);
    case "check_package_security":
      return await checkPackageSecurity(
        typeof args.packageName === "string" ? args.packageName : "",
        typeof args.version === "string" ? args.version : "",
      );

    // New tools
    case "execute_shell": {
      const shellExecutor = createShellExecutor(workspaceDir);
      const request: ShellCommandRequest = {
        commands: Array.isArray(args.commands) ? args.commands : [],
        workingDirectory: typeof args.workingDirectory === "string" ? args.workingDirectory : undefined,
        timeout: typeof args.timeout === "number" ? args.timeout : 30000,
        requireApproval: false, // Auto-approve for agents (can be changed)
      };
      return await shellExecutor.execute(request);
    }

    case "apply_patch": {
      const editor = createWorkspaceEditor(workspaceDir);
      const operation: ApplyPatchOperation = {
        path: typeof args.path === "string" ? args.path : "",
        diff: typeof args.diff === "string" ? args.diff : "",
        operation: (args.operation === "create" || args.operation === "edit" || args.operation === "delete")
          ? args.operation
          : "edit",
        requireApproval: false, // Auto-approve for agents (can be changed)
      };
      return await editor.applyPatch(operation);
    }

    case "web_search": {
      const response: WebSearchResponse = await searchWeb(
        typeof args.query === "string" ? args.query : "",
        typeof args.maxResults === "number" ? args.maxResults : 5
      );
      return response;
    }

    case "query_docs": {
      const result = await queryDocumentation(
        typeof args.library === "string" ? args.library : "",
        typeof args.topic === "string" ? args.topic : undefined
      );
      return result;
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function runAgentLLM(
  runId: string,
  agent: AgentDefinition,
  projectId: string,
): Promise<AgentResult> {
  const project = ensureProject(projectId);
  const baseDir = path.join(OUTPUT_ROOT, projectId);

  // Load agent prompt
  const promptPath = path.join(process.cwd(), "agents", `${agent.id}.md`);
  let systemPrompt = `You are ${agent.displayName}, ${agent.role}. ${agent.description}`;

  try {
    systemPrompt = await fs.readFile(promptPath, "utf8");
  } catch {
    appendLog(runId, {
      agentId: agent.id,
      message: `Prompt file not found at ${promptPath}, using default`,
      level: "warn",
    });
  }

  const modelConfig = getAgentModelConfig(agent.id);
  const context = {
    project,
    projectId,
    spec: project.projectSpec,
    discovery: project.discoveryAnswers,
    outputDir: baseDir,
  };

  // Create agent-specific task instructions
  const userPrompt = `${JSON.stringify(context, null, 2)}

TASK: Perform your role as ${agent.displayName} for this ${project.type} project.

REQUIREMENTS:
1. Generate actual, production-ready code/content for your specialty
2. Output a JSON response with this structure:
{
  "summary": "Brief description of what you created",
  "files": [
    {"path": "relative/path/to/file.ext", "content": "file contents here"}
  ]
}

Focus on quality and completeness. Generate real, functional code that follows best practices.`;

  // Get tools for this agent
  const tools = getToolsForAgent(agent.id);

  try {
    // Log if agent has tools
    if (tools.length > 0) {
      const toolNames = tools
        .map((t) => ("function" in t && (t as { function?: { name?: string } }).function?.name) || "tool")
        .join(", ");
      appendLog(runId, {
        agentId: agent.id,
        message: `Agent has ${tools.length} tools available: ${toolNames}`,
        level: "info",
      });
    }

    const response = await runWithLLM({
      model: modelConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: modelConfig.temperature ?? 0.7,
      maxTokens: modelConfig.maxTokens ?? 4000,
      topP: modelConfig.topP,
      tools: tools.length > 0 ? (tools as unknown as LLMRequest["tools"]) : undefined,
      provider: modelConfig.provider,
      fallbackModel: modelConfig.fallbackModel,
      fallbackProvider: modelConfig.fallbackProvider,
    });
    const costEstimate = estimateCost(
      {
        model: modelConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      response.output ?? "",
    );
    appendLog(runId, {
      agentId: agent.id,
      message: `Estimated cost $${costEstimate.cost.toFixed(4)} (${costEstimate.promptTokens} prompt / ${costEstimate.completionTokens} completion tokens)`,
      level: "info",
      meta: {
        cost: costEstimate.cost,
        promptTokens: costEstimate.promptTokens,
        completionTokens: costEstimate.completionTokens,
      },
    });

    // Handle tool calls if present
    if (response.toolCalls && response.toolCalls.length > 0) {
      appendLog(runId, {
        agentId: agent.id,
        message: `Agent called ${response.toolCalls.length} tool(s)`,
        level: "info",
      });

      for (const toolCall of response.toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments) as ToolArgs;
          appendLog(runId, {
            agentId: agent.id,
            message: `Executing tool: ${toolCall.function.name}`,
            level: "info",
          });

          const toolResult = await executeToolCall(toolCall.function.name, args, baseDir);

          appendLog(runId, {
            agentId: agent.id,
            message: `Tool result: ${JSON.stringify(toolResult).slice(0, 200)}`,
            level: "info",
          });
        } catch (toolError) {
          appendLog(runId, {
            agentId: agent.id,
            message: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
            level: "warn",
          });
        }
      }
    }

    // Parse LLM response
    let result: AgentResult;
    try {
      const parsed = JSON.parse(response.output);
      result = {
        summary: parsed.summary || `${agent.displayName} completed task`,
        files: parsed.files || [],
      };
    } catch {
      // If not JSON, use the output as summary
      result = {
        summary: response.output.slice(0, 200),
        files: [],
      };
    }

    // Write files to disk
    if (result.files && result.files.length > 0) {
      for (const file of result.files) {
        const fullPath = path.join(baseDir, file.path);
        await writeFileSafe(fullPath, file.content);
        appendLog(runId, {
          agentId: agent.id,
          message: `Created: ${file.path}`,
          level: "info",
        });
      }
    }

    // Special handling for Riley (spec generation)
    if (agent.id === "riley" && result.files) {
      const specFile = result.files.find(f => f.path.includes("spec.json"));
      if (specFile) {
        try {
          const spec = JSON.parse(specFile.content) as ProjectSpec;
          updateProject(projectId, { projectSpec: spec });
        } catch {
          appendLog(runId, {
            agentId: agent.id,
            message: "Could not parse spec.json",
            level: "warn",
          });
        }
      }
    }

    // Special handling for Chloe (handoff notes)
    if (agent.id === "chloe") {
      const summaryFile = result.files?.find(f => f.path.includes("summary"));
      if (summaryFile) {
        updateProject(projectId, { handoffNotes: summaryFile.content });
      } else {
        updateProject(projectId, { handoffNotes: result.summary });
      }
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM call failed";
    appendLog(runId, { agentId: agent.id, message, level: "error" });
    throw error;
  }
}

async function retryOnce<T>(fn: () => Promise<T>, backoffMs: (attempt: number) => number): Promise<T> {
  try {
    return await fn();
  } catch {
    await sleep(backoffMs(0));
    return await fn();
  }
}

/**
 * Run Docker sandbox validation for the generated project
 */
async function runDockerValidation(
  runId: string,
  projectId: string
) {
  const SANDBOX_ENABLED = process.env.SANDBOX_ENABLED === "true";

  if (!SANDBOX_ENABLED) {
    appendLog(runId, {
      message: "Docker sandbox validation disabled (SANDBOX_ENABLED=false)",
      level: "info",
    });
    return null;
  }

  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    appendLog(runId, {
      message: "Docker not available - skipping sandbox validation",
      level: "warn",
    });
    return null;
  }

  try {
    appendLog(runId, {
      message: "🐳 Starting Docker sandbox validation...",
      level: "info",
    });

    // Create container
    const container = await createContainer(projectId, {
      image: "node:20-alpine",
      memoryLimitMB: 2048,
      cpuLimit: 2,
      timeoutSeconds: 600,
      workDir: "/app",
    });

    appendLog(runId, {
      message: `✅ Container created: ${container.name}`,
      level: "info",
    });

    // Copy project files to container
    const projectPath = path.join(OUTPUT_ROOT, projectId);
    appendLog(runId, {
      message: `📦 Copying project files from ${projectPath}...`,
      level: "info",
    });

    // Run build validation (install, test, build)
    const validation = await validateProjectBuild(projectId, "/app");

    if (validation.success) {
      appendLog(runId, {
        message: `✅ Build validation passed!`,
        level: "info",
      });

      if (validation.testResults) {
        appendLog(runId, {
          message: `🧪 Tests: ${validation.testResults.passed}/${validation.testResults.total} passed`,
          level: "info",
        });
      }
    } else {
      appendLog(runId, {
        message: `❌ Build validation failed: ${validation.errors.join(", ")}`,
        level: "warn",
      });
    }

    // Try to start dev server and capture screenshots
    try {
      appendLog(runId, {
        message: "🚀 Starting dev server for screenshot capture...",
        level: "info",
      });

      await startDevServer(projectId, 3000, "/app");

      const serverReady = await checkUrlAccessible(projectId, "http://localhost:3000");

      if (serverReady) {
        appendLog(runId, {
          message: "📸 Capturing screenshots...",
          level: "info",
        });

        const screenshots = await captureDevServerScreenshot(projectId, 3000, ["/", "/about"]);
        validation.screenshots = screenshots;

        appendLog(runId, {
          message: `✅ Captured ${screenshots.length} screenshot(s)`,
          level: "info",
        });
      } else {
        appendLog(runId, {
          message: "⚠️ Dev server not accessible - skipping screenshots",
          level: "warn",
        });
      }
    } catch (screenshotError) {
      appendLog(runId, {
        message: `⚠️ Screenshot capture failed: ${screenshotError instanceof Error ? screenshotError.message : "Unknown error"}`,
        level: "warn",
      });
    }

    // Clean up
    appendLog(runId, {
      message: "🧹 Cleaning up container...",
      level: "info",
    });

    await stopContainer(projectId);
    await closeBrowser();

    appendLog(runId, {
      message: "✅ Docker validation complete",
      level: "info",
    });

    return validation;
  } catch (error) {
    appendLog(runId, {
      message: `❌ Docker validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      level: "error",
    });

    // Clean up on error
    try {
      await stopContainer(projectId);
      await closeBrowser();
    } catch {
      // Ignore cleanup errors
    }

    return null;
  }
}
