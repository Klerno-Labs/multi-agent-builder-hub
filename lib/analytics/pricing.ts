import { ModelPricing } from "./types";

/**
 * Current LLM pricing as of January 2025
 * Prices in USD per 1M tokens
 */

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": {
    model: "gpt-4o",
    provider: "openai",
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    cachedInputCostPer1M: 1.25,
  },
  "gpt-4o-mini": {
    model: "gpt-4o-mini",
    provider: "openai",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    cachedInputCostPer1M: 0.075,
  },
  "gpt-4-turbo": {
    model: "gpt-4-turbo",
    provider: "openai",
    inputCostPer1M: 10.00,
    outputCostPer1M: 30.00,
  },

  // Anthropic Claude
  "claude-3-5-sonnet-20241022": {
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    cachedInputCostPer1M: 0.30,
  },
  "claude-3-5-haiku-20241022": {
    model: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    cachedInputCostPer1M: 0.08,
  },

  // Google Gemini (currently free for experimental models)
  "gemini-2.0-flash-exp": {
    model: "gemini-2.0-flash-exp",
    provider: "gemini",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
  },
  "gemini-2.0-flash-thinking-exp-01-21": {
    model: "gemini-2.0-flash-thinking-exp-01-21",
    provider: "gemini",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
  },
  "gemini-1.5-pro": {
    model: "gemini-1.5-pro",
    provider: "gemini",
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
  },
  "gemini-1.5-flash": {
    model: "gemini-1.5-flash",
    provider: "gemini",
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
  },
};

/**
 * Calculate cost for a request
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cached: boolean = false
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`Unknown model pricing: ${model}, using GPT-4o-mini pricing`);
    return calculateCost("gpt-4o-mini", inputTokens, outputTokens, cached);
  }

  const inputCost = cached && pricing.cachedInputCostPer1M
    ? (inputTokens / 1_000_000) * pricing.cachedInputCostPer1M
    : (inputTokens / 1_000_000) * pricing.inputCostPer1M;

  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;

  return inputCost + outputCost;
}

/**
 * Estimate cache savings
 */
export function calculateCacheSavings(
  model: string,
  cachedTokens: number
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing || !pricing.cachedInputCostPer1M) {
    return 0;
  }

  const fullCost = (cachedTokens / 1_000_000) * pricing.inputCostPer1M;
  const cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInputCostPer1M;

  return fullCost - cachedCost;
}

/**
 * Get pricing for a model
 */
export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] || null;
}

/**
 * Compare costs between models
 */
export function compareCosts(
  modelA: string,
  modelB: string,
  inputTokens: number,
  outputTokens: number
): { modelA: number; modelB: number; savings: number; percentSaved: number } {
  const costA = calculateCost(modelA, inputTokens, outputTokens);
  const costB = calculateCost(modelB, inputTokens, outputTokens);
  const savings = Math.abs(costA - costB);
  const percentSaved = costA > 0 ? (savings / costA) * 100 : 0;

  return {
    modelA: costA,
    modelB: costB,
    savings,
    percentSaved,
  };
}
