import { NextResponse } from "next/server";
import { querySimilarProjects } from "@/lib/memory/agent-memory";
import { z } from "zod";

const schema = z.object({
  q: z.string().min(3),
  limit: z.coerce.number().min(1).max(10).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const limit = url.searchParams.get("limit");
  const parsed = schema.safeParse({ q, limit });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.errors }, { status: 400 });
  }

  try {
    const results = await querySimilarProjects(parsed.data.q, { limit: parsed.data.limit ?? 5 });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
