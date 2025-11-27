import { AgentId } from "../agents/types";

export type LLMProvider = "openai" | "anthropic" | "gemini" | "google";

export interface ModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  provider?: LLMProvider;
  fallbackModel?: string;
  fallbackProvider?: LLMProvider;
}

export interface AgentModelRouting {
  agentId: AgentId;
  config: ModelConfig;
}

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: Array<{
    type?: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  provider?: LLMProvider;
  fallbackModel?: string;
  fallbackProvider?: LLMProvider;
}

export interface LLMResponse {
  output: string;
  raw?: unknown;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}
