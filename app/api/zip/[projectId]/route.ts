import fs from "node:fs/promises";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { projectIdParamSchema } from "@/lib/validation/schemas";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;

  const parsed = projectIdParamSchema.safeParse({ projectId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const targetDir = path.join(process.cwd(), "project-output", projectId);

  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "Project output not found" },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Project output not found" },
      { status: 404 },
    );
  }

  const totalSize = await calculateDirSize(targetDir);
  if (totalSize > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { error: `ZIP too large (${Math.round(totalSize / (1024 * 1024))}MB). Limit is 50MB.` },
      { status: 400 },
    );
  }

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  let bytes = 0;
  let rejected = false;

  archive.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_ZIP_BYTES && !rejected) {
      rejected = true;
      archive.emit("error", new Error("ZIP size limit exceeded"));
    }
  });

  archive.on("error", (err) => {
    passThrough.destroy(err);
  });

  archive.directory(targetDir, false);
  archive.pipe(passThrough);
  void archive.finalize();

  const responseStream = Readable.toWeb(passThrough) as unknown as ReadableStream;

  return new NextResponse(responseStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${projectId}.zip`,
    },
  });
}

async function calculateDirSize(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let size = 0;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += await calculateDirSize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      size += stats.size;
    }
  }
  return size;
}
