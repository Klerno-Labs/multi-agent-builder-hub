import { AgentId, ProjectType } from "../agents/types";

/**
 * Cost tracking and analytics types
 */

export interface UsageLog {
  id: string;
  projectId: string;
  agentId: AgentId;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  cached: boolean;
  timestamp: string;
  pipelineRunId?: string;
}

export interface CostBreakdown {
  totalCost: number;
  byProvider: Record<string, number>;
  byAgent: Record<string, number>;
  byModel: Record<string, number>;
  byProject: Record<string, number>;
  totalTokens: number;
  cachedTokens: number;
  cacheSavings: number;
}

export interface BudgetAlert {
  id: string;
  level: "warning" | "critical";
  message: string;
  currentSpend: number;
  budgetLimit: number;
  timestamp: string;
}

export interface AnalyticsSummary {
  period: "today" | "week" | "month" | "all";
  totalSpend: number;
  totalRequests: number;
  avgCostPerRequest: number;
  mostExpensiveAgent: { agentId: AgentId; cost: number };
  mostExpensiveProject: { projectId: string; cost: number };
  breakdown: CostBreakdown;
  budgetRemaining?: number;
  alerts: BudgetAlert[];
}

export interface ModelPricing {
  model: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  cachedInputCostPer1M?: number;
}
