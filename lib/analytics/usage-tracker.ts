/**
 * Usage tracking and cost analytics
 * Tracks token usage and costs per request, project, and agent
 */

import { AgentId } from "../agents/types";
import { UsageLog, CostBreakdown, AnalyticsSummary, BudgetAlert } from "./types";
import { calculateCost, calculateCacheSavings } from "./pricing";

// In-memory storage (could be replaced with database)
const usageLogs: UsageLog[] = [];
const budgetLimits = new Map<string, number>();

// Default budget limits (can be configured)
const DEFAULT_DAILY_BUDGET = 10.00; // $10/day
const DEFAULT_MONTHLY_BUDGET = 200.00; // $200/month

/**
 * Log a usage event
 */
export function logUsage(log: Omit<UsageLog, "id" | "timestamp" | "totalTokens" | "costUsd">): UsageLog {
  const totalTokens = log.inputTokens + log.outputTokens;
  const costUsd = calculateCost(log.model, log.inputTokens, log.outputTokens, log.cached);

  const usageLog: UsageLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    totalTokens,
    costUsd,
  };

  usageLogs.push(usageLog);

  // Check budget limits
  checkBudgetAlerts();

  return usageLog;
}

/**
 * Get usage logs for a time period
 */
export function getUsageLogs(
  period: "today" | "week" | "month" | "all" = "all",
  filters?: {
    projectId?: string;
    agentId?: AgentId;
    provider?: string;
  }
): UsageLog[] {
  const now = new Date();
  let startDate = new Date(0); // Beginning of time

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return usageLogs.filter((log) => {
    const logDate = new Date(log.timestamp);
    if (logDate < startDate) return false;
    if (filters?.projectId && log.projectId !== filters.projectId) return false;
    if (filters?.agentId && log.agentId !== filters.agentId) return false;
    if (filters?.provider && log.provider !== filters.provider) return false;
    return true;
  });
}

/**
 * Calculate cost breakdown
 */
export function getCostBreakdown(logs: UsageLog[]): CostBreakdown {
  const breakdown: CostBreakdown = {
    totalCost: 0,
    byProvider: {},
    byAgent: {},
    byModel: {},
    byProject: {},
    totalTokens: 0,
    cachedTokens: 0,
    cacheSavings: 0,
  };

  for (const log of logs) {
    breakdown.totalCost += log.costUsd;
    breakdown.totalTokens += log.totalTokens;

    // By provider
    breakdown.byProvider[log.provider] = (breakdown.byProvider[log.provider] || 0) + log.costUsd;

    // By agent
    breakdown.byAgent[log.agentId] = (breakdown.byAgent[log.agentId] || 0) + log.costUsd;

    // By model
    breakdown.byModel[log.model] = (breakdown.byModel[log.model] || 0) + log.costUsd;

    // By project
    breakdown.byProject[log.projectId] = (breakdown.byProject[log.projectId] || 0) + log.costUsd;

    // Cache tracking
    if (log.cached) {
      breakdown.cachedTokens += log.inputTokens;
      breakdown.cacheSavings += calculateCacheSavings(log.model, log.inputTokens);
    }
  }

  return breakdown;
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(period: "today" | "week" | "month" | "all" = "today"): AnalyticsSummary {
  const logs = getUsageLogs(period);
  const breakdown = getCostBreakdown(logs);

  // Find most expensive agent
  let mostExpensiveAgent: { agentId: AgentId; cost: number } = { agentId: "mia", cost: 0 };
  for (const [agentId, cost] of Object.entries(breakdown.byAgent)) {
    if (cost > mostExpensiveAgent.cost) {
      mostExpensiveAgent = { agentId: agentId as AgentId, cost };
    }
  }

  // Find most expensive project
  let mostExpensiveProject: { projectId: string; cost: number } = { projectId: "", cost: 0 };
  for (const [projectId, cost] of Object.entries(breakdown.byProject)) {
    if (cost > mostExpensiveProject.cost) {
      mostExpensiveProject = { projectId, cost };
    }
  }

  // Calculate budget remaining
  const budgetLimit = getBudgetLimit(period);
  const budgetRemaining = budgetLimit ? budgetLimit - breakdown.totalCost : undefined;

  return {
    period,
    totalSpend: breakdown.totalCost,
    totalRequests: logs.length,
    avgCostPerRequest: logs.length > 0 ? breakdown.totalCost / logs.length : 0,
    mostExpensiveAgent,
    mostExpensiveProject,
    breakdown,
    budgetRemaining,
    alerts: getActiveAlerts(period),
  };
}

/**
 * Set budget limit
 */
export function setBudgetLimit(period: "daily" | "monthly", limit: number): void {
  budgetLimits.set(period, limit);
}

/**
 * Get budget limit
 */
export function getBudgetLimit(period: "today" | "week" | "month" | "all"): number | null {
  if (period === "today") {
    return budgetLimits.get("daily") || DEFAULT_DAILY_BUDGET;
  }
  if (period === "month") {
    return budgetLimits.get("monthly") || DEFAULT_MONTHLY_BUDGET;
  }
  return null;
}

/**
 * Check for budget alerts
 */
function checkBudgetAlerts(): void {
  const todaySpend = getCostBreakdown(getUsageLogs("today")).totalCost;
  const monthSpend = getCostBreakdown(getUsageLogs("month")).totalCost;

  const dailyLimit = budgetLimits.get("daily") || DEFAULT_DAILY_BUDGET;
  const monthlyLimit = budgetLimits.get("monthly") || DEFAULT_MONTHLY_BUDGET;

  // Check daily budget
  if (todaySpend > dailyLimit * 0.9) {
    console.warn(`⚠️  Daily budget alert: $${todaySpend.toFixed(2)} / $${dailyLimit.toFixed(2)}`);
  }

  // Check monthly budget
  if (monthSpend > monthlyLimit * 0.9) {
    console.warn(`⚠️  Monthly budget alert: $${monthSpend.toFixed(2)} / $${monthlyLimit.toFixed(2)}`);
  }
}

/**
 * Get active budget alerts
 */
function getActiveAlerts(period: "today" | "week" | "month" | "all"): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const breakdown = getCostBreakdown(getUsageLogs(period));
  const budgetLimit = getBudgetLimit(period);

  if (!budgetLimit) return alerts;

  const percentUsed = (breakdown.totalCost / budgetLimit) * 100;

  if (percentUsed >= 90) {
    alerts.push({
      id: crypto.randomUUID(),
      level: "critical",
      message: `${period} budget at ${percentUsed.toFixed(1)}% - $${breakdown.totalCost.toFixed(2)} of $${budgetLimit.toFixed(2)}`,
      currentSpend: breakdown.totalCost,
      budgetLimit,
      timestamp: new Date().toISOString(),
    });
  } else if (percentUsed >= 75) {
    alerts.push({
      id: crypto.randomUUID(),
      level: "warning",
      message: `${period} budget at ${percentUsed.toFixed(1)}% - $${breakdown.totalCost.toFixed(2)} of $${budgetLimit.toFixed(2)}`,
      currentSpend: breakdown.totalCost,
      budgetLimit,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Clear usage logs (for testing or reset)
 */
export function clearUsageLogs(): void {
  usageLogs.length = 0;
}

/**
 * Export usage logs as CSV
 */
export function exportUsageLogsCSV(logs: UsageLog[]): string {
  const headers = [
    "Timestamp",
    "Project ID",
    "Agent ID",
    "Model",
    "Provider",
    "Input Tokens",
    "Output Tokens",
    "Total Tokens",
    "Cost (USD)",
    "Cached",
  ];

  const rows = logs.map((log) => [
    log.timestamp,
    log.projectId,
    log.agentId,
    log.model,
    log.provider,
    log.inputTokens.toString(),
    log.outputTokens.toString(),
    log.totalTokens.toString(),
    log.costUsd.toFixed(4),
    log.cached ? "Yes" : "No",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}
