import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects/store";
import { ProjectType } from "@/lib/agents/types";
import {
  createProjectSchema,
} from "@/lib/validation/schemas";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(request: Request) {
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parse = createProjectSchema.safeParse(jsonBody);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid input", details: parse.error.errors }, { status: 400 });
  }

  const project = createProject(parse.data.type as ProjectType);
  return NextResponse.json(project, { status: 201 });
}
