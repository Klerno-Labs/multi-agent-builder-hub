/**
 * Real-time dashboard types for agent monitoring
 */

import { AgentId, AgentStatus } from "../agents/types";

export interface AgentMetrics {
  agentId: AgentId;
  displayName: string;
  status: AgentStatus;
  currentTask?: string;
  startedAt?: string;
  finishedAt?: string;
  tokensUsed: number;
  costUsd: number;
  executionTimeMs?: number;
  error?: string;
}

export interface PipelineMetrics {
  runId: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  agentMetrics: AgentMetrics[];
  totalTokens: number;
  totalCost: number;
  totalExecutionTimeMs: number;
  currentAgentIndex: number;
  totalAgents: number;
  progressPercentage: number;
}

export interface DashboardMetrics {
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalTokensToday: number;
  totalCostToday: number;
  averageExecutionTime: number;
  currentPipeline?: PipelineMetrics;
  recentPipelines: PipelineMetrics[];
}

export interface DashboardUpdate {
  type: "agent_status" | "pipeline_status" | "metrics_update" | "log_entry";
  timestamp: string;
  data: unknown;
}

export interface AgentStatusUpdate extends DashboardUpdate {
  type: "agent_status";
  data: {
    runId: string;
    agentId: AgentId;
    status: AgentStatus;
    message?: string;
  };
}

export interface PipelineStatusUpdate extends DashboardUpdate {
  type: "pipeline_status";
  data: {
    runId: string;
    status: "running" | "completed" | "failed" | "cancelled";
    metrics?: PipelineMetrics;
  };
}

export interface MetricsUpdate extends DashboardUpdate {
  type: "metrics_update";
  data: DashboardMetrics;
}

export interface LogEntryUpdate extends DashboardUpdate {
  type: "log_entry";
  data: {
    runId: string;
    agentId?: AgentId;
    message: string;
    level: "info" | "warn" | "error";
  };
}

export type DashboardUpdateMessage =
  | AgentStatusUpdate
  | PipelineStatusUpdate
  | MetricsUpdate
  | LogEntryUpdate;
