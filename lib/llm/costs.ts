import { LLMRequest } from "./types";

type ModelCost = {
  prompt: number; // dollars per 1K tokens
  completion: number;
};

// Approximate public pricing; adjust to your contract.
const MODEL_COSTS: Record<string, ModelCost> = {
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "claude-3.5-sonnet": { prompt: 0.003, completion: 0.015 },
  "gemini-2.0-flash-thinking-exp-01-21": { prompt: 0, completion: 0 }, // currently free (subject to change)
};

function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateTokensFromMessages(messages: LLMRequest["messages"]): number {
  return messages.reduce(
    (acc, m) => acc + estimateTokensFromText(m.content ?? ""),
    0,
  );
}

export function estimateCost(
  request: LLMRequest,
  completionText: string,
): { promptTokens: number; completionTokens: number; cost: number } {
  const promptTokens = estimateTokensFromMessages(request.messages);
  const completionTokens = estimateTokensFromText(completionText);
  const costs = MODEL_COSTS[request.model] ?? { prompt: 0, completion: 0 };
  const cost =
    (promptTokens / 1000) * costs.prompt +
    (completionTokens / 1000) * costs.completion;
  return { promptTokens, completionTokens, cost };
}
