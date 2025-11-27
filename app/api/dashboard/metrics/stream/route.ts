import { NextResponse } from "next/server";
import {
  subscribeToDashboard,
  getDashboardMetrics,
  DashboardUpdateMessage,
} from "@/lib/dashboard/metrics-aggregator";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial metrics
      try {
        const initialMetrics = getDashboardMetrics();
        controller.enqueue(
          encoder.encode(
            `event: metrics\ndata: ${JSON.stringify(initialMetrics)}\n\n`
          )
        );
      } catch (error) {
        console.error("Failed to send initial metrics:", error);
      }

      // Subscribe to real-time updates
      const unsubscribe = subscribeToDashboard(
        (update: DashboardUpdateMessage) => {
          if (closed) return;

          try {
            const eventType =
              update.type === "metrics_update" ? "metrics" : update.type;
            const data = JSON.stringify(update);
            controller.enqueue(
              encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`)
            );
          } catch (error) {
            console.error("Failed to send update:", error);
          }
        }
      );

      // Fallback: send metrics every 5 seconds if no updates
      const intervalId = setInterval(() => {
        if (closed) {
          clearInterval(intervalId);
          return;
        }

        try {
          const metrics = getDashboardMetrics();
          controller.enqueue(
            encoder.encode(`event: metrics\ndata: ${JSON.stringify(metrics)}\n\n`)
          );
        } catch (error) {
          console.error("Failed to send periodic update:", error);
        }
      }, 5000);

      // Cleanup on close
      const cleanup = () => {
        closed = true;
        unsubscribe();
        clearInterval(intervalId);
      };

      // Wait for cancellation
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (closed) {
            clearInterval(checkInterval);
            cleanup();
            resolve();
          }
        }, 100);
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
