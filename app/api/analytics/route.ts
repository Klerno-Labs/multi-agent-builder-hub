import { NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  getUsageLogs,
  setBudgetLimit,
  exportUsageLogsCSV,
} from "../../../lib/analytics/usage-tracker";
import type { AgentId } from "../../../lib/agents/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") as "today" | "week" | "month" | "all") || "today";
  const format = searchParams.get("format") || "json";
  const projectId = searchParams.get("projectId") || undefined;
  const agentId = searchParams.get("agentId") || undefined;

  try {
    if (format === "csv") {
      const logs = getUsageLogs(period, { projectId, agentId: agentId as AgentId | undefined });
      const csv = exportUsageLogsCSV(logs);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="usage-logs-${period}.csv"`,
        },
      });
    }

    const summary = getAnalyticsSummary(period);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, period, limit } = body;

    if (action === "set_budget") {
      if (!period || !limit) {
        return NextResponse.json(
          { error: "Missing period or limit" },
          { status: 400 }
        );
      }

      setBudgetLimit(period, limit);

      return NextResponse.json({ success: true, period, limit });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
