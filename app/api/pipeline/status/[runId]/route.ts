import { NextResponse } from "next/server";
import { cancelPipelineSchema } from "@/lib/validation/schemas";
import { getPipelineRun as getRunFromStore } from "@/lib/projects/store";
import { getPipelineRunTail } from "@/lib/pipeline/engine";

function isEventRequest(request: Request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const parsed = cancelPipelineSchema.safeParse({ runId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  // Non-SSE: return current run as JSON
  if (!isEventRequest(request)) {
    const run = getRunFromStore(runId);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    return NextResponse.json(run);
  }

  // SSE streaming
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));
      // allow client to pass `since` query param to resume from last timestamp
      const url = new URL(request.url);
      let lastTimestamp: string | undefined = url.searchParams.get("since") ?? undefined;

      while (!closed) {
        const run = getRunFromStore(runId);
        if (!run) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'run not found' })}\n\n`));
          controller.close();
          break;
        }

        const logs = getPipelineRunTail(runId, lastTimestamp);
        if (logs.length > 0) {
          lastTimestamp = logs[logs.length - 1].timestamp;
          for (const l of logs) {
            controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(l)}\n\n`));
          }
        }

        if (["completed", "failed", "cancelled"].includes(run.status)) {
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(run)}\n\n`));
          controller.close();
          break;
        }

        // keep-alive comment
        controller.enqueue(encoder.encode(`: ping\n\n`));
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

