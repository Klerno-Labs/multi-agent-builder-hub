import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/dashboard/metrics-aggregator";

export async function GET() {
  const metrics = getDashboardMetrics();
  return NextResponse.json(metrics);
}
