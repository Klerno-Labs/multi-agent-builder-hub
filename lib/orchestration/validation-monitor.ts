/**
 * Validation & Monitoring - Pipeline validation and real-time monitoring
 */

import { AgentName, AgentExecution, PipelineState, ProjectType } from "./pipeline-manager";

export interface ValidationRule {
  name: string;
  description: string;
  validate: (data: any) => ValidationResult;
  severity: "error" | "warning" | "info";
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface HealthCheck {
  agent: AgentName;
  healthy: boolean;
  responseTime?: number;
  lastCheck: Date;
  issues: string[];
}

export interface PerformanceMetrics {
  agent: AgentName;
  executionTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  throughput?: number;
}

/**
 * Validate project specification
 */
export function validateProjectSpec(spec: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required fields
  if (!spec.id) errors.push("Missing required field: id");
  if (!spec.type) errors.push("Missing required field: type");
  if (!spec.name) errors.push("Missing required field: name");

  // Validate project type
  const validTypes: ProjectType[] = ["website", "web_app", "mobile_app", "database", "web3_dapp"];
  if (spec.type && !validTypes.includes(spec.type)) {
    errors.push(`Invalid project type: ${spec.type}. Must be one of: ${validTypes.join(", ")}`);
  }

  // Validate structure
  if (spec.features && !Array.isArray(spec.features)) {
    errors.push("features must be an array");
  }

  if (spec.pages && !Array.isArray(spec.pages)) {
    errors.push("pages must be an array");
  }

  if (spec.dataModel && typeof spec.dataModel !== "object") {
    errors.push("dataModel must be an object");
  }

  if (spec.apiRoutes && !Array.isArray(spec.apiRoutes)) {
    errors.push("apiRoutes must be an array");
  }

  // Warnings for optional but recommended fields
  if (!spec.description) warnings.push("Missing recommended field: description");
  if (!spec.techStack) warnings.push("Missing recommended field: techStack");
  if (!spec.constraints) warnings.push("Missing recommended field: constraints");

  // Suggestions
  if (spec.features && spec.features.length === 0) {
    suggestions.push("Consider adding features to the specification");
  }

  if (spec.type === "web3_dapp" && !spec.blockchain) {
    warnings.push("Web3 project missing blockchain specification");
  }

  if (spec.type === "mobile_app" && !spec.platforms) {
    warnings.push("Mobile app missing platform specification (iOS/Android)");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate agent output
 */
export function validateAgentOutput(agent: AgentName, output: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Common validations
  if (!output) {
    errors.push(`${agent} returned no output`);
    return { valid: false, errors, warnings, suggestions };
  }

  if (typeof output !== "object") {
    errors.push(`${agent} output must be an object`);
    return { valid: false, errors, warnings, suggestions };
  }

  // Validate summary
  if (!output.summary || typeof output.summary !== "string") {
    errors.push("Missing or invalid 'summary' field");
  }

  // Validate files array
  if (!output.files || !Array.isArray(output.files)) {
    errors.push("Missing or invalid 'files' array");
  } else {
    // Validate each file
    output.files.forEach((file: any, index: number) => {
      if (!file.path) errors.push(`File ${index} missing 'path' field`);
      if (!file.content) warnings.push(`File ${index} (${file.path}) has no content`);

      // Validate file paths
      if (file.path && !file.path.match(/^[a-zA-Z0-9\/_\-\.]+$/)) {
        errors.push(`Invalid file path: ${file.path}`);
      }

      // Check for absolute paths (should be relative)
      if (file.path && (file.path.startsWith("/") || file.path.match(/^[A-Z]:\\/))) {
        warnings.push(`File path should be relative: ${file.path}`);
      }
    });
  }

  // Agent-specific validations
  if (agent === "Riley") {
    if (!output.spec) errors.push("Riley must include 'spec' in output");
    if (output.spec && !output.spec.features) warnings.push("Spec missing 'features' array");
  }

  if (agent === "Liam") {
    const hasReactComponents = output.files?.some((f: any) =>
      f.path?.endsWith(".tsx") || f.path?.endsWith(".jsx")
    );
    if (!hasReactComponents) warnings.push("Liam should generate React components");
  }

  if (agent === "Noah") {
    const hasAPIRoutes = output.files?.some((f: any) =>
      f.path?.includes("/api/") || f.path?.includes("routes")
    );
    if (!hasAPIRoutes) warnings.push("Noah should generate API routes");
  }

  if (agent === "Sophia") {
    const hasSchema = output.files?.some((f: any) =>
      f.path?.includes("schema") || f.path?.includes("migration")
    );
    if (!hasSchema) errors.push("Sophia must generate database schema or migrations");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Check agent health
 */
export async function checkAgentHealth(agent: AgentName): Promise<HealthCheck> {
  const startTime = Date.now();
  const issues: string[] = [];

  try {
    // Simulate health check (in real implementation, would ping agent)
    const responseTime = Date.now() - startTime;

    return {
      agent,
      healthy: true,
      responseTime,
      lastCheck: new Date(),
      issues,
    };
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    return {
      agent,
      healthy: false,
      lastCheck: new Date(),
      issues,
    };
  }
}

/**
 * Monitor pipeline performance
 */
export function monitorPerformance(execution: AgentExecution): PerformanceMetrics {
  const executionTime = execution.duration || 0;

  return {
    agent: execution.agent,
    executionTime,
    memoryUsage: undefined, // Would be populated with actual memory metrics
    cpuUsage: undefined, // Would be populated with actual CPU metrics
    throughput: execution.output?.files?.length || 0,
  };
}

/**
 * Detect pipeline anomalies
 */
export function detectAnomalies(state: PipelineState): {
  anomalies: string[];
  severity: "low" | "medium" | "high" | "critical";
} {
  const anomalies: string[] = [];

  // Check for stuck agents
  state.agents.forEach((execution, agent) => {
    if (execution.status === "running" && execution.startTime) {
      const runningTime = Date.now() - execution.startTime.getTime();
      const timeout = AGENT_CONFIGS[agent]?.timeout || 300000;

      if (runningTime > timeout * 1.5) {
        anomalies.push(`${agent} running for ${Math.round(runningTime / 1000)}s (timeout: ${timeout / 1000}s)`);
      }
    }
  });

  // Check for excessive retries
  state.agents.forEach((execution, agent) => {
    if (execution.retryCount > 2) {
      anomalies.push(`${agent} has retried ${execution.retryCount} times`);
    }
  });

  // Check for blocked agents
  const blocked = Array.from(state.agents.values()).filter((e) => e.status === "blocked");
  if (blocked.length > 0) {
    anomalies.push(`${blocked.length} agents blocked`);
  }

  // Check pipeline duration
  if (state.totalDuration && state.totalDuration > 3600000) {
    // 1 hour
    anomalies.push(`Pipeline running for over 1 hour`);
  }

  // Determine severity
  let severity: "low" | "medium" | "high" | "critical" = "low";
  if (anomalies.length > 5) severity = "critical";
  else if (anomalies.length > 3) severity = "high";
  else if (anomalies.length > 1) severity = "medium";

  return { anomalies, severity };
}

/**
 * Generate pipeline report
 */
export function generatePipelineReport(state: PipelineState): {
  summary: string;
  statistics: any;
  completedAgents: AgentName[];
  failedAgents: AgentName[];
  totalFiles: number;
  recommendations: string[];
} {
  const completedAgents: AgentName[] = [];
  const failedAgents: AgentName[] = [];
  let totalFiles = 0;

  state.agents.forEach((execution, agent) => {
    if (execution.status === "completed") {
      completedAgents.push(agent);
      totalFiles += execution.output?.files?.length || 0;
    } else if (execution.status === "failed") {
      failedAgents.push(agent);
    }
  });

  const totalDuration = state.totalDuration || 0;
  const avgDuration = totalDuration / (completedAgents.length || 1);

  const recommendations: string[] = [];

  if (failedAgents.length > 0) {
    recommendations.push(`Review and fix failures in: ${failedAgents.join(", ")}`);
  }

  if (totalDuration > 1800000) {
    // 30 minutes
    recommendations.push("Consider enabling parallel execution to reduce pipeline time");
  }

  if (totalFiles === 0) {
    recommendations.push("No files generated - verify agent outputs");
  }

  const summary = `Pipeline ${state.status}: ${completedAgents.length}/${state.agents.size} agents completed, ${totalFiles} files generated in ${Math.round(totalDuration / 1000)}s`;

  return {
    summary,
    statistics: {
      totalAgents: state.agents.size,
      completed: completedAgents.length,
      failed: failedAgents.length,
      totalDuration,
      avgDuration: Math.round(avgDuration),
      totalFiles,
    },
    completedAgents,
    failedAgents,
    totalFiles,
    recommendations,
  };
}

/**
 * Validate pipeline configuration
 */
export function validatePipelineConfiguration(
  projectType: ProjectType,
  config: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate timeout configurations
  if (config.globalTimeout && config.globalTimeout < 60000) {
    warnings.push("Global timeout is very short (< 1 minute)");
  }

  // Validate concurrency limits
  if (config.maxConcurrentAgents && config.maxConcurrentAgents > 10) {
    warnings.push("High concurrent agent limit may cause resource issues");
  }

  // Project type specific validations
  if (projectType === "web3_dapp" && !config.enableKai) {
    errors.push("Web3 project requires Kai agent to be enabled");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Monitor resource usage
 */
export interface ResourceUsage {
  timestamp: Date;
  memoryUsed: number;
  memoryTotal: number;
  cpuUsage: number;
  activeAgents: number;
}

export function monitorResources(): ResourceUsage {
  // In a real implementation, would use process.memoryUsage() and os.cpus()
  return {
    timestamp: new Date(),
    memoryUsed: 0,
    memoryTotal: 0,
    cpuUsage: 0,
    activeAgents: 0,
  };
}

/**
 * Generate execution timeline
 */
export function generateExecutionTimeline(state: PipelineState): {
  timeline: Array<{
    agent: AgentName;
    start: Date;
    end?: Date;
    duration: number;
    status: string;
  }>;
  ganttChart: string;
} {
  const timeline = Array.from(state.agents.values())
    .filter((e) => e.startTime)
    .map((e) => ({
      agent: e.agent,
      start: e.startTime!,
      end: e.endTime,
      duration: e.duration || 0,
      status: e.status,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Generate Mermaid Gantt chart
  let ganttChart = "gantt\n";
  ganttChart += `  title Pipeline Execution Timeline\n`;
  ganttChart += `  dateFormat HH:mm:ss\n`;

  timeline.forEach((item) => {
    const startTime = item.start.toTimeString().split(" ")[0];
    const endTime = item.end ? item.end.toTimeString().split(" ")[0] : "active";
    const status = item.status === "completed" ? "done" : item.status === "failed" ? "crit" : "active";

    ganttChart += `  ${item.agent} :${status}, ${startTime}, ${endTime}\n`;
  });

  return { timeline, ganttChart };
}

// Import for type reference
import { AGENT_CONFIGS } from "./pipeline-manager";
