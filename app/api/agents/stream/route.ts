import { NextRequest } from "next/server";
import { StreamHandler, streamLLMResponse } from "../../../../lib/streaming/stream-handler";
import { streamLLM } from "../../../../lib/llm/stream-client";
import { LLMRequest } from "../../../../lib/llm/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  const agentId = searchParams.get("agentId");

  if (!runId || !agentId) {
    return new Response("Missing runId or agentId", { status: 400 });
  }

  // Create a simple streaming example
  async function* generateTokens() {
    const testMessage = "Generating response for agent...";
    for (const char of testMessage) {
      yield char;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  const streamHandler = new StreamHandler();
  const stream = streamHandler.createStream(streamLLMResponse(generateTokens));

  return new Response(stream, {
    headers: StreamHandler.getSSEHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const llmRequest: LLMRequest = body;

    async function* streamTokens() {
      for await (const token of streamLLM(llmRequest)) {
        if (!token.isComplete) {
          yield token.content;
        }
      }
    }

    const streamHandler = new StreamHandler();
    const stream = streamHandler.createStream(streamLLMResponse(streamTokens));

    return new Response(stream, {
      headers: StreamHandler.getSSEHeaders(),
    });
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
