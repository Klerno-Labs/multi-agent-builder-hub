import Anthropic from "@anthropic-ai/sdk";
import { LLMRequest, LLMResponse } from "./types";

/**
 * Claude (Anthropic) LLM client implementation
 */
export async function runWithClaude(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({
    apiKey,
  });

  // Convert messages to Anthropic format
  // Anthropic doesn't support system messages in the messages array
  const systemMessage = request.messages.find((m) => m.role === "system");
  const userMessages = request.messages.filter((m) => m.role !== "system");

  // Convert tools to Anthropic format if provided
  const tools = request.tools?.map((tool: any) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));

  const response = await client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens ?? 4000,
    temperature: request.temperature,
    top_p: request.topP,
    system: systemMessage?.content,
    messages: userMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    tools: tools && tools.length > 0 ? tools : undefined,
  });

  // Extract content and tool calls from response
  let textContent = "";
  const toolCalls: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    }
  }

  return {
    output: textContent,
    raw: response,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
