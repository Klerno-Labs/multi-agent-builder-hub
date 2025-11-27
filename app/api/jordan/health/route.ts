import { NextResponse } from "next/server";

async function checkJordanBackend(url: string, token?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
    return { ok: resp.ok, status: resp.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const url = process.env.JORDAN_API_URL;
  const token = process.env.JORDAN_API_KEY;

  if (!url) {
    return NextResponse.json(
      { configured: false, ok: false, message: "JORDAN_API_URL is not set" },
      { status: 200 },
    );
  }

  const result = await checkJordanBackend(url, token);
  return NextResponse.json({
    configured: true,
    ok: result.ok,
    status: result.status,
    error: result.error,
  });
}
