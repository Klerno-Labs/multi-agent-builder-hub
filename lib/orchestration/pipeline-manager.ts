/**
 * Pipeline Manager - Core orchestration engine for multi-agent pipeline
 */

export type ProjectType = "website" | "web_app" | "mobile_app" | "database" | "web3_dapp";
export type AgentName = "Mia" | "Jordan" | "Riley" | "Ava" | "Iris" | "Liam" | "Noah" | "Sophia" | "Kai" | "Ethan" | "Grace" | "Nova" | "Owen" | "Chloe";
export type AgentStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "blocked";
export type PipelinePhase = "discovery" | "planning" | "design" | "development" | "testing" | "security" | "infrastructure" | "integration" | "documentation";

export interface AgentConfig {
  name: AgentName;
  phase: PipelinePhase;
  dependencies: AgentName[];
  optional: boolean;
  conditional?: (projectType: ProjectType) => boolean;
  timeout: number; // milliseconds
  retryable: boolean;
  maxRetries: number;
}

export interface AgentExecution {
  agent: AgentName;
  status: AgentStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  error?: string;
  output?: any;
  blockedBy?: AgentName[];
}

export interface PipelineState {
  projectId: string;
  projectType: ProjectType;
  phase: PipelinePhase;
  status: "initializing" | "running" | "paused" | "completed" | "failed";
  agents: Map<AgentName, AgentExecution>;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  checkpoints: PipelineCheckpoint[];
}

export interface PipelineCheckpoint {
  timestamp: Date;
  phase: PipelinePhase;
  completedAgents: AgentName[];
  state: any;
}

/**
 * Define agent configurations with dependencies
 */
export const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  Mia: {
    name: "Mia",
    phase: "discovery",
    dependencies: [],
    optional: false,
    timeout: 60000, // 1 minute
    retryable: false,
    maxRetries: 0,
  },
  Jordan: {
    name: "Jordan",
    phase: "discovery",
    dependencies: ["Mia"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
  Riley: {
    name: "Riley",
    phase: "planning",
    dependencies: ["Jordan"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
  Ava: {
    name: "Ava",
    phase: "design",
    dependencies: ["Riley"],
    optional: false,
    timeout: 240000, // 4 minutes
    retryable: true,
    maxRetries: 2,
  },
  Iris: {
    name: "Iris",
    phase: "design",
    dependencies: ["Ava"],
    optional: false,
    timeout: 180000, // 3 minutes
    retryable: true,
    maxRetries: 2,
  },
  Liam: {
    name: "Liam",
    phase: "development",
    dependencies: ["Riley", "Ava", "Iris"],
    optional: false,
    timeout: 420000, // 7 minutes
    retryable: true,
    maxRetries: 2,
  },
  Noah: {
    name: "Noah",
    phase: "development",
    dependencies: ["Riley", "Sophia"],
    optional: false,
    timeout: 420000, // 7 minutes
    retryable: true,
    maxRetries: 2,
  },
  Sophia: {
    name: "Sophia",
    phase: "development",
    dependencies: ["Riley"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
  Kai: {
    name: "Kai",
    phase: "development",
    dependencies: ["Riley"],
    optional: true,
    conditional: (projectType) => projectType === "web3_dapp",
    timeout: 480000, // 8 minutes
    retryable: true,
    maxRetries: 2,
  },
  Ethan: {
    name: "Ethan",
    phase: "testing",
    dependencies: ["Liam", "Noah", "Sophia"],
    optional: false,
    timeout: 360000, // 6 minutes
    retryable: true,
    maxRetries: 2,
  },
  Grace: {
    name: "Grace",
    phase: "security",
    dependencies: ["Liam", "Noah", "Sophia"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
  Nova: {
    name: "Nova",
    phase: "infrastructure",
    dependencies: ["Liam", "Noah", "Sophia"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
  Owen: {
    name: "Owen",
    phase: "integration",
    dependencies: ["Liam", "Noah", "Sophia", "Ethan", "Grace", "Nova"],
    optional: false,
    timeout: 360000, // 6 minutes
    retryable: true,
    maxRetries: 3,
  },
  Chloe: {
    name: "Chloe",
    phase: "documentation",
    dependencies: ["Owen"],
    optional: false,
    timeout: 300000, // 5 minutes
    retryable: true,
    maxRetries: 2,
  },
};

/**
 * Pipeline Manager Class
 */
export class PipelineManager {
  private state: PipelineState;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(projectId: string, projectType: ProjectType) {
    this.state = {
      projectId,
      projectType,
      phase: "discovery",
      status: "initializing",
      agents: new Map(),
      startTime: new Date(),
      checkpoints: [],
    };

    this.initializeAgents();
  }

  /**
   * Initialize all agents based on project type
   */
  private initializeAgents(): void {
    Object.values(AGENT_CONFIGS).forEach((config) => {
      // Skip conditional agents that don't match project type
      if (config.conditional && !config.conditional(this.state.projectType)) {
        this.state.agents.set(config.name, {
          agent: config.name,
          status: "skipped",
          retryCount: 0,
        });
        return;
      }

      this.state.agents.set(config.name, {
        agent: config.name,
        status: "pending",
        retryCount: 0,
      });
    });
  }

  /**
   * Get agents ready to execute (dependencies satisfied)
   */
  public getReadyAgents(): AgentName[] {
    const ready: AgentName[] = [];

    for (const [agentName, execution] of this.state.agents) {
      if (execution.status !== "pending") continue;

      const config = AGENT_CONFIGS[agentName];
      const dependenciesMet = config.dependencies.every((dep) => {
        const depExecution = this.state.agents.get(dep);
        return depExecution?.status === "completed" || depExecution?.status === "skipped";
      });

      if (dependenciesMet) {
        ready.push(agentName);
      }
    }

    return ready;
  }

  /**
   * Get agents that can run in parallel
   */
  public getParallelExecutionGroups(): AgentName[][] {
    const groups: AgentName[][] = [];
    let currentReady = this.getReadyAgents();

    while (currentReady.length > 0) {
      groups.push(currentReady);

      // Simulate completion to find next group
      currentReady.forEach((agent) => {
        const execution = this.state.agents.get(agent);
        if (execution) execution.status = "completed";
      });

      currentReady = this.getReadyAgents();

      // Reset status
      groups.flat().forEach((agent) => {
        const execution = this.state.agents.get(agent);
        if (execution) execution.status = "pending";
      });
    }

    return groups;
  }

  /**
   * Check if agent is blocked by dependencies
   */
  public isAgentBlocked(agentName: AgentName): { blocked: boolean; blockedBy: AgentName[] } {
    const config = AGENT_CONFIGS[agentName];
    const blockedBy: AgentName[] = [];

    for (const dep of config.dependencies) {
      const depExecution = this.state.agents.get(dep);
      if (depExecution?.status !== "completed" && depExecution?.status !== "skipped") {
        blockedBy.push(dep);
      }
    }

    return { blocked: blockedBy.length > 0, blockedBy };
  }

  /**
   * Start agent execution
   */
  public async startAgent(agentName: AgentName): Promise<void> {
    const execution = this.state.agents.get(agentName);
    if (!execution) throw new Error(`Agent ${agentName} not found`);

    const { blocked, blockedBy } = this.isAgentBlocked(agentName);
    if (blocked) {
      execution.status = "blocked";
      execution.blockedBy = blockedBy;
      throw new Error(`Agent ${agentName} blocked by: ${blockedBy.join(", ")}`);
    }

    execution.status = "running";
    execution.startTime = new Date();
    this.emit("agentStarted", { agent: agentName, execution });
  }

  /**
   * Complete agent execution
   */
  public async completeAgent(agentName: AgentName, output?: any): Promise<void> {
    const execution = this.state.agents.get(agentName);
    if (!execution) throw new Error(`Agent ${agentName} not found`);

    execution.status = "completed";
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime!.getTime();
    execution.output = output;

    this.emit("agentCompleted", { agent: agentName, execution });
    this.updatePhase();
    this.checkPipelineCompletion();
  }

  /**
   * Fail agent execution
   */
  public async failAgent(agentName: AgentName, error: string): Promise<void> {
    const execution = this.state.agents.get(agentName);
    if (!execution) throw new Error(`Agent ${agentName} not found`);

    const config = AGENT_CONFIGS[agentName];

    execution.error = error;
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime!.getTime();

    // Check if retryable
    if (config.retryable && execution.retryCount < config.maxRetries) {
      execution.retryCount++;
      execution.status = "pending";
      this.emit("agentRetrying", { agent: agentName, execution, retryCount: execution.retryCount });
    } else {
      execution.status = "failed";
      this.emit("agentFailed", { agent: agentName, execution, error });

      // Check if pipeline should fail
      if (!config.optional) {
        this.failPipeline(`Critical agent ${agentName} failed: ${error}`);
      }
    }
  }

  /**
   * Update current pipeline phase
   */
  private updatePhase(): void {
    const phases: PipelinePhase[] = [
      "discovery",
      "planning",
      "design",
      "development",
      "testing",
      "security",
      "infrastructure",
      "integration",
      "documentation",
    ];

    for (const phase of phases) {
      const phaseAgents = Object.values(AGENT_CONFIGS).filter((c) => c.phase === phase);
      const allCompleted = phaseAgents.every((config) => {
        const execution = this.state.agents.get(config.name);
        return execution?.status === "completed" || execution?.status === "skipped";
      });

      if (!allCompleted) {
        this.state.phase = phase;
        break;
      }
    }
  }

  /**
   * Check if pipeline is complete
   */
  private checkPipelineCompletion(): void {
    const allAgents = Array.from(this.state.agents.values());
    const allCompleted = allAgents.every(
      (e) => e.status === "completed" || e.status === "skipped" || (e.status === "failed" && AGENT_CONFIGS[e.agent].optional)
    );

    if (allCompleted) {
      this.completePipeline();
    }
  }

  /**
   * Complete pipeline
   */
  private completePipeline(): void {
    this.state.status = "completed";
    this.state.endTime = new Date();
    this.state.totalDuration = this.state.endTime.getTime() - this.state.startTime.getTime();
    this.emit("pipelineCompleted", { state: this.state });
  }

  /**
   * Fail pipeline
   */
  private failPipeline(reason: string): void {
    this.state.status = "failed";
    this.state.endTime = new Date();
    this.state.totalDuration = this.state.endTime.getTime() - this.state.startTime.getTime();
    this.emit("pipelineFailed", { state: this.state, reason });
  }

  /**
   * Create checkpoint for resume capability
   */
  public createCheckpoint(): PipelineCheckpoint {
    const checkpoint: PipelineCheckpoint = {
      timestamp: new Date(),
      phase: this.state.phase,
      completedAgents: Array.from(this.state.agents.entries())
        .filter(([_, exec]) => exec.status === "completed")
        .map(([name]) => name),
      state: JSON.parse(JSON.stringify(this.state)),
    };

    this.state.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Get pipeline statistics
   */
  public getStatistics(): {
    totalAgents: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    skipped: number;
    progress: number;
    estimatedTimeRemaining?: number;
  } {
    const agents = Array.from(this.state.agents.values());

    const stats = {
      totalAgents: agents.length,
      completed: agents.filter((a) => a.status === "completed").length,
      failed: agents.filter((a) => a.status === "failed").length,
      pending: agents.filter((a) => a.status === "pending").length,
      running: agents.filter((a) => a.status === "running").length,
      skipped: agents.filter((a) => a.status === "skipped").length,
      progress: 0,
      estimatedTimeRemaining: undefined as number | undefined,
    };

    const completedOrSkipped = stats.completed + stats.skipped;
    stats.progress = Math.round((completedOrSkipped / stats.totalAgents) * 100);

    // Estimate time remaining based on average completion time
    const completedAgents = agents.filter((a) => a.status === "completed" && a.duration);
    if (completedAgents.length > 0) {
      const avgDuration = completedAgents.reduce((sum, a) => sum + (a.duration || 0), 0) / completedAgents.length;
      stats.estimatedTimeRemaining = Math.round(avgDuration * stats.pending);
    }

    return stats;
  }

  /**
   * Event system for pipeline monitoring
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }

  /**
   * Get current pipeline state
   */
  public getState(): PipelineState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Pause pipeline execution
   */
  public pause(): void {
    if (this.state.status === "running") {
      this.state.status = "paused";
      this.emit("pipelinePaused", { state: this.state });
    }
  }

  /**
   * Resume pipeline execution
   */
  public resume(): void {
    if (this.state.status === "paused") {
      this.state.status = "running";
      this.emit("pipelineResumed", { state: this.state });
    }
  }
}

/**
 * Generate pipeline execution plan
 */
export function generateExecutionPlan(projectType: ProjectType): {
  phases: PipelinePhase[];
  agents: AgentName[];
  parallelGroups: AgentName[][];
  estimatedDuration: number;
} {
  const manager = new PipelineManager("plan", projectType);
  const parallelGroups = manager.getParallelExecutionGroups();

  const agents: AgentName[] = [];
  const phases: PipelinePhase[] = [];

  parallelGroups.flat().forEach((agent) => {
    if (!agents.includes(agent)) agents.push(agent);
    const phase = AGENT_CONFIGS[agent].phase;
    if (!phases.includes(phase)) phases.push(phase);
  });

  // Estimate duration (sum of longest path through dependency graph)
  let estimatedDuration = 0;
  parallelGroups.forEach((group) => {
    const maxDuration = Math.max(...group.map((agent) => AGENT_CONFIGS[agent].timeout));
    estimatedDuration += maxDuration;
  });

  return {
    phases,
    agents,
    parallelGroups,
    estimatedDuration,
  };
}

/**
 * Validate pipeline can execute
 */
export function validatePipeline(projectType: ProjectType): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for circular dependencies
  const visited = new Set<AgentName>();
  const recursionStack = new Set<AgentName>();

  const hasCycle = (agent: AgentName): boolean => {
    visited.add(agent);
    recursionStack.add(agent);

    const config = AGENT_CONFIGS[agent];
    for (const dep of config.dependencies) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recursionStack.has(dep)) {
        errors.push(`Circular dependency detected: ${agent} -> ${dep}`);
        return true;
      }
    }

    recursionStack.delete(agent);
    return false;
  };

  Object.keys(AGENT_CONFIGS).forEach((agent) => {
    if (!visited.has(agent as AgentName)) {
      hasCycle(agent as AgentName);
    }
  });

  // Check for missing dependencies
  Object.values(AGENT_CONFIGS).forEach((config) => {
    config.dependencies.forEach((dep) => {
      if (!AGENT_CONFIGS[dep]) {
        errors.push(`Agent ${config.name} depends on non-existent agent ${dep}`);
      }
    });
  });

  // Warnings for optional agents
  Object.values(AGENT_CONFIGS)
    .filter((c) => c.optional)
    .forEach((config) => {
      warnings.push(`Agent ${config.name} is optional and may be skipped`);
    });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
