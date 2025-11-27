import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { runInSandbox } from "@/lib/sandbox/docker-manager";

export async function GET() {
  if (process.env.SANDBOX_ENABLED !== "true") {
    return NextResponse.json(
      { enabled: false, ok: false, message: "Sandbox disabled (set SANDBOX_ENABLED=true)" },
      { status: 200 },
    );
  }

  const projectId = "sandbox-health";
  const workspace = path.join(process.cwd(), "project-output", projectId);
  await fs.mkdir(workspace, { recursive: true });

  try {
    const result = await runInSandbox(projectId, ['echo "sandbox ok"'], {
      timeoutMs: 10000,
    });
    const ok = result.exitCode === 0;
    return NextResponse.json({
      enabled: true,
      ok,
      exitCode: result.exitCode,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox error";
    return NextResponse.json({ enabled: true, ok: false, error: message }, { status: 500 });
  }
}
