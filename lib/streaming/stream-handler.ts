/**
 * Server-Sent Events (SSE) stream handler for real-time agent responses
 */

export interface StreamChunk {
  type: "token" | "tool_call" | "status" | "complete" | "error";
  data: unknown;
  timestamp: string;
}

export class StreamHandler {
  private encoder = new TextEncoder();

  /**
   * Create SSE response stream
   */
  createStream(iterator: AsyncIterableIterator<StreamChunk>): ReadableStream {
    const encoder = this.encoder;

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of iterator) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * Send a chunk to the stream
   */
  static createChunk(
    type: StreamChunk["type"],
    data: unknown
  ): StreamChunk {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create Response headers for SSE
   */
  static getSSEHeaders(): HeadersInit {
    return {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
  }
}

/**
 * Async generator for streaming LLM responses
 */
export async function* streamLLMResponse(
  generateFn: () => AsyncIterableIterator<string>
): AsyncIterableIterator<StreamChunk> {
  try {
    // Send initial status
    yield StreamHandler.createChunk("status", { message: "Starting generation" });

    // Stream tokens
    for await (const token of generateFn()) {
      yield StreamHandler.createChunk("token", { text: token });
    }

    // Send completion
    yield StreamHandler.createChunk("complete", { message: "Generation complete" });
  } catch (error) {
    yield StreamHandler.createChunk("error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
