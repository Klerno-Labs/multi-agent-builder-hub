import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects/store";
import { runPipeline } from "@/lib/pipeline/engine";
import { startPipelineSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = startPipelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
  }

  const { projectId } = parsed.data;
  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const run = runPipeline(projectId);
  return NextResponse.json(run, { status: 201 });
}
