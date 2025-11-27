import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/projects/store";
import { projectIdRouteParamSchema, patchProjectSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = projectIdRouteParamSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = projectIdRouteParamSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
  }

  // typed as Partial<Project> for updateProject
  const updates = parsed.data as Partial<import("@/lib/agents/types").Project>;
  const updated = updateProject(id, updates);
  return NextResponse.json(updated);
}
