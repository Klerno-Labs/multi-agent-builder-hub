import { NextResponse } from "next/server";
import { cancelPipelineRun } from "@/lib/pipeline/engine";
import { getPipelineRun } from "@/lib/projects/store";
import { cancelPipelineSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cancelPipelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
  }

  // Access control stub: if ADMIN_TOKEN is set, require it in `x-admin-token` header.
  const adminToken = process.env.ADMIN_TOKEN;
  const provided = request.headers.get("x-admin-token");
  if (adminToken && provided !== adminToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { runId } = parsed.data;
  const run = getPipelineRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Pipeline run not found" }, { status: 404 });
  }

  try {
    await cancelPipelineRun(runId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
