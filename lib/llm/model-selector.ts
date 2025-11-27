import { AgentId } from '../agents/types';
import { ModelConfig } from './types';

/**
 * Smart model selector that routes tasks to optimal models
 *
 * Strategy:
 * - Gemini 2.0 Flash Thinking: Complex reasoning, architecture, specs
 * - Claude Sonnet 4.5: Code review, auditing, refactoring
 * - GPT-4o-mini: Fast code generation, simple tasks
 */

export type TaskComplexity = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'spec' | 'code' | 'review' | 'design' | 'integration' | 'summary' | 'discovery';

export interface ModelSelectionContext {
  agentId: AgentId;
  taskType: TaskType;
  complexity?: TaskComplexity;
  requiresTools?: boolean;
  promptLength?: number;
}

/**
 * Select the optimal model based on task characteristics
 */
export function selectOptimalModel(context: ModelSelectionContext): ModelConfig {
  const { agentId, taskType, complexity, promptLength } = context;

  // Determine complexity if not provided
  const taskComplexity = complexity || inferComplexity(agentId, taskType, promptLength);

  // Deep thinking tasks -> Gemini 2.0 Flash Thinking
  if (shouldUseGeminiThinking(taskType, taskComplexity)) {
    return {
      model: 'gemini-2.0-flash-thinking-exp-01-21',
      provider: 'gemini',
      temperature: 0.3,
      maxTokens: 8192,
      fallbackModel: 'claude-3-5-sonnet-20241022',
      fallbackProvider: 'anthropic',
    };
  }

  // Code review/audit -> Claude Sonnet
  if (shouldUseClaude(taskType, taskComplexity)) {
    return {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      temperature: 0,
      maxTokens: 4096,
      fallbackModel: 'gpt-4o-mini',
      fallbackProvider: 'openai',
    };
  }

  // Fast code generation -> GPT-4o-mini
  return {
    model: 'gpt-4o-mini',
    provider: 'openai',
    temperature: 0.1,
    maxTokens: 2048,
    fallbackModel: 'gemini-2.0-flash-exp',
    fallbackProvider: 'gemini',
  };
}

/**
 * Determine if Gemini Thinking model should be used
 */
function shouldUseGeminiThinking(taskType: TaskType, complexity: TaskComplexity): boolean {
  // High complexity tasks that benefit from deep reasoning
  if (complexity === 'critical' || complexity === 'high') {
    return ['spec', 'design', 'discovery', 'integration'].includes(taskType);
  }

  // Always use for specs and architecture
  return taskType === 'spec' || taskType === 'design';
}

/**
 * Determine if Claude should be used
 */
function shouldUseClaude(taskType: TaskType, complexity: TaskComplexity): boolean {
  // Claude excels at code review and auditing
  if (taskType === 'review') return true;

  // High complexity code tasks
  if (taskType === 'code' && (complexity === 'high' || complexity === 'critical')) {
    return true;
  }

  return false;
}

/**
 * Infer task complexity from agent and task type
 */
function inferComplexity(
  agentId: AgentId,
  taskType: TaskType,
  promptLength?: number
): TaskComplexity {
  // Riley (specs), Jordan (discovery) -> high complexity
  if (agentId === 'riley' || agentId === 'jordan') return 'high';

  // Grace (auditing) -> critical
  if (agentId === 'grace') return 'critical';

  // Ava (design), Nova (infrastructure) -> medium-high
  if (agentId === 'ava' || agentId === 'nova') return 'medium';

  // Long prompts suggest complex tasks
  if (promptLength && promptLength > 2000) return 'high';
  if (promptLength && promptLength > 1000) return 'medium';

  return 'low';
}

/**
 * Get cost multiplier for a model (relative to GPT-4o-mini baseline)
 */
export function getModelCostMultiplier(model: string): number {
  const costMap: Record<string, number> = {
    'gpt-4o-mini': 1.0,              // Baseline: $0.15/$0.60 per 1M tokens
    'gemini-2.0-flash-exp': 0.0,     // Free (currently)
    'gemini-2.0-flash-thinking-exp-01-21': 0.0, // Free (currently)
    'claude-3-5-sonnet-20241022': 6.67, // $3/$15 per 1M tokens (4-6x more expensive)
    'gpt-4-turbo': 40.0,             // $10/$30 per 1M tokens
  };

  return costMap[model] || 1.0;
}

/**
 * Estimate cost for a request in dollars
 */
export function estimateRequestCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const baseCostPer1M = 0.15; // GPT-4o-mini input cost
  const multiplier = getModelCostMultiplier(model);

  const inputCost = (inputTokens / 1_000_000) * baseCostPer1M * multiplier;
  const outputCost = (outputTokens / 1_000_000) * baseCostPer1M * 4 * multiplier; // Output is ~4x input

  return inputCost + outputCost;
}
