/**
 * Real-time metrics aggregator for dashboard
 */

import { getPipelineRun, listPipelineRuns } from "../projects/store";
import { agentRegistry } from "../agents/registry";
import { getUsageLogs } from "../analytics/usage-tracker";
import {
  DashboardMetrics,
  PipelineMetrics,
  AgentMetrics,
} from "./types";
import { AgentId, PipelineRunStatus, AgentStatus } from "../agents/types";

export type { DashboardUpdateMessage, AgentStatusUpdate, PipelineStatusUpdate, MetricsUpdate, LogEntryUpdate } from "./types";

// In-memory subscribers for real-time updates
const subscribers = new Set<(update: any) => void>();

/**
 * Subscribe to real-time dashboard updates
 */
export function subscribeToDashboard(
  callback: (update: any) => void
): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Broadcast update to all subscribers
 */
export function broadcastDashboardUpdate(update: any): void {
  subscribers.forEach((callback) => {
    try {
      callback(update);
    } catch (error) {
      console.error("Failed to broadcast update:", error);
    }
  });
}

/**
 * Get current dashboard metrics
 */
export function getDashboardMetrics(): DashboardMetrics {
  const allRuns = listPipelineRuns();

  // Count runs by status
  const activeRuns = allRuns.filter((r) => r.status === "running").length;
  const completedRuns = allRuns.filter((r) => r.status === "completed").length;
  const failedRuns = allRuns.filter((r) => r.status === "failed").length;

  // Get today's usage data
  const todayLogs = getUsageLogs("today");
  const totalTokensToday = todayLogs.reduce((sum, log) => sum + log.totalTokens, 0);
  const totalCostToday = todayLogs.reduce((sum, log) => sum + log.costUsd, 0);

  // Calculate average execution time
  const completedToday = allRuns.filter(
    (r) =>
      r.status === "completed" &&
      r.updatedAt &&
      new Date(r.updatedAt).toDateString() === new Date().toDateString()
  );

  const averageExecutionTime =
    completedToday.length > 0
      ? completedToday.reduce((sum, r) => {
          const start = new Date(r.createdAt).getTime();
          const end = r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now();
          return sum + (end - start);
        }, 0) / completedToday.length
      : 0;

  // Get current pipeline if any
  const currentRun = allRuns.find((r) => r.status === "running");
  const currentPipeline = currentRun
    ? getPipelineMetrics(currentRun.id) || undefined
    : undefined;

  // Get recent pipelines (last 10)
  const recentPipelines = allRuns
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((run) => getPipelineMetrics(run.id))
    .filter((m): m is PipelineMetrics => m !== null);

  return {
    activeRuns,
    completedRuns,
    failedRuns,
    totalTokensToday,
    totalCostToday,
    averageExecutionTime,
    currentPipeline,
    recentPipelines,
  };
}

/**
 * Get metrics for a specific pipeline
 */
export function getPipelineMetrics(runId: string): PipelineMetrics | null {
  const run = getPipelineRun(runId);
  if (!run) return null;

  const agentMetrics: AgentMetrics[] = run.agentRuns.map((agentRun) => {
    const agent = agentRegistry.find((a) => a.id === agentRun.agentId);

    // Calculate execution time
    let executionTimeMs: number | undefined;
    if (agentRun.startedAt && agentRun.finishedAt) {
      executionTimeMs =
        new Date(agentRun.finishedAt).getTime() -
        new Date(agentRun.startedAt).getTime();
    }

    // Get usage data for this agent in this run
    const agentLogs = getUsageLogs("all", {
      projectId: run.projectId,
      agentId: agentRun.agentId,
    });

    const tokensUsed = agentLogs.reduce((sum, log) => sum + log.totalTokens, 0);
    const costUsd = agentLogs.reduce((sum, log) => sum + log.costUsd, 0);

    return {
      agentId: agentRun.agentId,
      displayName: agent?.displayName || agentRun.agentId,
      status: agentRun.status,
      currentTask: agentRun.outputSummary,
      startedAt: agentRun.startedAt,
      finishedAt: agentRun.finishedAt,
      tokensUsed,
      costUsd,
      executionTimeMs,
      error: agentRun.error,
    };
  });

  const totalTokens = agentMetrics.reduce((sum, a) => sum + a.tokensUsed, 0);
  const totalCost = agentMetrics.reduce((sum, a) => sum + a.costUsd, 0);

  const startTime = new Date(run.createdAt).getTime();
  const endTime = run.updatedAt ? new Date(run.updatedAt).getTime() : Date.now();
  const totalExecutionTimeMs = endTime - startTime;

  // Calculate progress
  const completedAgents = agentMetrics.filter(
    (a) => a.status === "completed" || a.status === "error"
  ).length;
  const totalAgents = agentMetrics.length;
  const currentAgentIndex = completedAgents;
  const progressPercentage =
    totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  // Map pipeline status to our subset
  const status = mapPipelineStatus(run.status);

  return {
    runId: run.id,
    projectId: run.projectId,
    status,
    startedAt: run.createdAt,
    finishedAt: run.updatedAt,
    agentMetrics,
    totalTokens,
    totalCost,
    totalExecutionTimeMs,
    currentAgentIndex,
    totalAgents,
    progressPercentage,
  };
}

/**
 * Map PipelineRunStatus to our dashboard status subset
 */
function mapPipelineStatus(
  status: PipelineRunStatus
): "running" | "completed" | "failed" | "cancelled" {
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return "running"; // default for "not_started"
}

/**
 * Map AgentStatus to our dashboard status subset
 */
function mapAgentStatus(
  status: AgentStatus
): "queued" | "running" | "completed" | "failed" {
  if (status === "queued") return "queued";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "error" || status === "cancelled") return "failed";
  return "queued"; // default for "idle"
}

/**
 * Notify dashboard of agent status change
 */
export function notifyAgentStatus(
  runId: string,
  agentId: AgentId,
  status: AgentStatus,
  message?: string
): void {
  broadcastDashboardUpdate({
    type: "agent_status",
    timestamp: new Date().toISOString(),
    data: {
      runId,
      agentId,
      status: mapAgentStatus(status),
      message,
    },
  });

  // Also update overall metrics
  notifyMetricsUpdate();
}

/**
 * Notify dashboard of pipeline status change
 */
export function notifyPipelineStatus(
  runId: string,
  status: PipelineRunStatus
): void {
  const metrics = getPipelineMetrics(runId);

  broadcastDashboardUpdate({
    type: "pipeline_status",
    timestamp: new Date().toISOString(),
    data: {
      runId,
      status: mapPipelineStatus(status),
      metrics: metrics || undefined,
    },
  });

  // Also update overall metrics
  notifyMetricsUpdate();
}

/**
 * Notify dashboard of metrics update
 */
export function notifyMetricsUpdate(): void {
  const metrics = getDashboardMetrics();

  broadcastDashboardUpdate({
    type: "metrics_update",
    timestamp: new Date().toISOString(),
    data: metrics,
  });
}

/**
 * Notify dashboard of log entry
 */
export function notifyLogEntry(
  runId: string,
  message: string,
  level: "info" | "warn" | "error",
  agentId?: AgentId
): void {
  broadcastDashboardUpdate({
    type: "log_entry",
    timestamp: new Date().toISOString(),
    data: {
      runId,
      agentId,
      message,
      level,
    },
  });
}

/**
 * Get number of active subscribers
 */
export function getSubscriberCount(): number {
  return subscribers.size;
}
