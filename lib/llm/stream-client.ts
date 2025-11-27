/**
 * Streaming LLM client for real-time token-by-token responses
 */

import OpenAI from "openai";
import { LLMRequest } from "./types";

export interface StreamToken {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Stream OpenAI responses token-by-token
 */
export async function* streamOpenAI(
  request: LLMRequest
): AsyncIterableIterator<StreamToken> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });

  const stream = await client.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    top_p: request.topP,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    const content = delta?.content || "";

    if (content) {
      fullContent += content;
      yield {
        content,
        isComplete: false,
      };
    }

    // Check for completion
    if (chunk.choices[0]?.finish_reason) {
      yield {
        content: "",
        isComplete: true,
        usage: chunk.usage
          ? {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            }
          : undefined,
      };
    }
  }
}

/**
 * Stream Anthropic Claude responses
 */
export async function* streamClaude(
  request: LLMRequest
): AsyncIterableIterator<StreamToken> {
  // Anthropic streaming implementation
  // Note: Requires @anthropic-ai/sdk streaming support
  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = request.messages.find((m) => m.role === "system")?.content || "";
  const messages = request.messages.filter((m) => m.role !== "system");

  const stream = await client.messages.stream({
    model: request.model,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield {
        content: event.delta.text,
        isComplete: false,
      };
    }

    if (event.type === "message_stop") {
      yield {
        content: "",
        isComplete: true,
        usage: (event as any).usage
          ? {
              promptTokens: (event as any).usage.input_tokens,
              completionTokens: (event as any).usage.output_tokens,
              totalTokens: (event as any).usage.input_tokens + (event as any).usage.output_tokens,
            }
          : undefined,
      };
    }
  }
}

/**
 * Unified streaming function that routes to the correct provider
 */
export async function* streamLLM(
  request: LLMRequest
): AsyncIterableIterator<StreamToken> {
  const provider = request.provider || "openai";

  if (provider === "anthropic") {
    yield* streamClaude(request);
  } else if (provider === "openai") {
    yield* streamOpenAI(request);
  } else {
    throw new Error(`Streaming not supported for provider: ${provider}`);
  }
}
