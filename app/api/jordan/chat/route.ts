import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
  projectType: z.enum(["website", "web_app", "mobile_app", "database", "web3_dapp"]),
  message: z.string().optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
  }

  const body = parsed.data;
  const jordanUrl = process.env.JORDAN_API_URL;
  if (!jordanUrl) {
    return NextResponse.json(
      { error: "JORDAN_API_URL not configured. This endpoint requires a live Jordan backend." },
      { status: 500 },
    );
  }

  try {
    const resp = await fetch(jordanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.JORDAN_API_KEY ? { Authorization: `Bearer ${process.env.JORDAN_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: "Jordan backend error", detail: err }, { status: 502 });
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Jordan backend failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
