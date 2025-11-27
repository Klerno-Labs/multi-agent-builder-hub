import OpenAI from "openai";
import {
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { LLMRequest, LLMResponse } from "./types";
import { runWithClaude } from "./claude-client";
import { runWithGemini } from "./gemini-client";

/**
 * Multi-provider LLM client with fallback support
 * Supports OpenAI, Anthropic Claude, and Google Gemini
 */
export async function runWithLLM(request: LLMRequest): Promise<LLMResponse> {
  const provider = request.provider ?? "openai";

  try {
    if (provider === "anthropic") {
      return await runWithClaude(request);
    } else if (provider === "gemini" || provider === "google") {
      return await runWithGemini(request);
    } else {
      return await runWithOpenAI(request);
    }
  } catch (error) {
    // If there's a fallback configured, try it
    if (request.fallbackModel && request.fallbackProvider) {
      console.warn(`Primary model ${request.model} failed, trying fallback ${request.fallbackModel}`);

      const fallbackRequest: LLMRequest = {
        ...request,
        model: request.fallbackModel,
        provider: request.fallbackProvider,
        fallbackModel: undefined, // Don't cascade fallbacks
        fallbackProvider: undefined,
      };

      if (request.fallbackProvider === "anthropic") {
        return await runWithClaude(fallbackRequest);
      } else if (request.fallbackProvider === "gemini" || request.fallbackProvider === "google") {
        return await runWithGemini(fallbackRequest);
      } else {
        return await runWithOpenAI(fallbackRequest);
      }
    }

    throw error;
  }
}

async function runWithOpenAI(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    top_p: request.topP,
    tools: request.tools as ChatCompletionTool[] | undefined,
  });

  const message = response.choices?.[0]?.message;
  const content = message?.content ?? "";
  const toolCalls = message?.tool_calls;

  return {
    output: content,
    raw: response,
    toolCalls: toolCalls
      ? (toolCalls as ChatCompletionMessageToolCall[])
          .map((tc) => {
            if ("function" in tc && tc.function) {
              return {
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>
      : undefined,
  };
}
