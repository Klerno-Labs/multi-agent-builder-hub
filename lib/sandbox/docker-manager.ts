/**
 * Docker container manager for isolated execution environments
 */

import Docker from "dockerode";
import path from "path";
import fs from "fs";
import { SandboxConfig, ContainerInfo, DEFAULT_SANDBOX_CONFIG } from "./types";

// In-memory container registry
const activeContainers = new Map<string, ContainerInfo>();

let dockerClient: Docker | null = null;

/**
 * Initialize Docker client
 */
export function getDockerClient(): Docker {
  if (!dockerClient) {
    dockerClient = new Docker();
  }
  return dockerClient;
}

/**
 * Legacy interface for backward compatibility
 */
export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface SandboxOptions {
  image?: string;
  workdir?: string;
  timeoutMs?: number;
  cpuShares?: number;
  memory?: number; // bytes
}

const DEFAULT_IMAGE = process.env.SANDBOX_IMAGE || "node:20-alpine";
const ENABLED = process.env.SANDBOX_ENABLED === "true";

/**
 * Legacy sandbox execution (backward compatible)
 */
export async function runInSandbox(
  projectId: string,
  commands: string[],
  opts: SandboxOptions = {},
): Promise<SandboxResult> {
  if (!ENABLED) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Sandbox disabled. Set SANDBOX_ENABLED=true to enable container execution.",
    };
  }

  const docker = getDockerClient();
  const image = opts.image || DEFAULT_IMAGE;
  const workspaceHost = path.join(process.cwd(), "project-output", projectId);
  if (!fs.existsSync(workspaceHost)) {
    return { exitCode: 1, stdout: "", stderr: "Workspace not found." };
  }

  // Ensure image exists locally
  await docker.pull(image).catch(() => undefined);

  const binds = [`${workspaceHost}:/workspace`];
  const container = await docker.createContainer({
    Image: image,
    Cmd: ["sh", "-c", commands.join(" && ")],
    WorkingDir: "/workspace",
    HostConfig: {
      Binds: binds,
      CpuShares: opts.cpuShares ?? 512,
      Memory: opts.memory ?? 2 * 1024 * 1024 * 1024, // 2GB
      NetworkMode: "none",
    },
  });

  await container.start();

  const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
  const timer = setTimeout(async () => {
    try {
      await container.kill();
    } catch {
      // ignore
    }
  }, timeout);

  const stream = await container.attach({ stream: true, stdout: true, stderr: true });
  let stdout = "";
  let stderr = "";
  stream.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  stream.on("stderr", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const wait = await container.wait();
  clearTimeout(timer);

  try {
    await container.remove({ force: true });
  } catch {
    // ignore
  }

  return {
    exitCode: wait.StatusCode ?? 1,
    stdout,
    stderr,
  };
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    const docker = getDockerClient();
    await docker.ping();
    return true;
  } catch (error) {
    console.warn("Docker not available:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

/**
 * Create a new isolated container for a project
 */
export async function createContainer(
  projectId: string,
  config: Partial<SandboxConfig> = {}
): Promise<ContainerInfo> {
  const docker = getDockerClient();
  const fullConfig = { ...DEFAULT_SANDBOX_CONFIG, ...config };

  const containerName = `agent-sandbox-${projectId}-${Date.now()}`;

  try {
    // Pull image if not exists
    await ensureImageExists(fullConfig.image);

    // Create container with resource limits
    const container = await docker.createContainer({
      Image: fullConfig.image,
      name: containerName,
      WorkingDir: fullConfig.workDir,
      Env: Object.entries(fullConfig.env || {}).map(([key, value]) => `${key}=${value}`),
      HostConfig: {
        Memory: fullConfig.memoryLimitMB * 1024 * 1024,
        NanoCpus: fullConfig.cpuLimit * 1e9,
        AutoRemove: false,
        NetworkMode: "bridge",
      },
      Tty: false,
      OpenStdin: false,
      AttachStdout: true,
      AttachStderr: true,
    });

    const containerInfo: ContainerInfo = {
      id: container.id,
      name: containerName,
      projectId,
      status: "creating",
      createdAt: new Date().toISOString(),
    };

    activeContainers.set(projectId, containerInfo);

    // Start container
    await container.start();
    containerInfo.status = "running";

    console.log(`✅ Container created: ${containerName} (${container.id.slice(0, 12)})`);

    return containerInfo;
  } catch (error) {
    const errorInfo: ContainerInfo = {
      id: "",
      name: containerName,
      projectId,
      status: "error",
      createdAt: new Date().toISOString(),
    };
    activeContainers.set(projectId, errorInfo);
    throw new Error(`Failed to create container: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Ensure Docker image exists (pull if needed)
 */
async function ensureImageExists(imageName: string): Promise<void> {
  const docker = getDockerClient();

  try {
    await docker.getImage(imageName).inspect();
    console.log(`✅ Image exists: ${imageName}`);
  } catch (error) {
    console.log(`📥 Pulling image: ${imageName}...`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }

        docker.modem.followProgress(
          stream,
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          },
          (event: { status?: string; progress?: string }) => {
            if (event.status) {
              console.log(`  ${event.status} ${event.progress || ""}`);
            }
          }
        );
      });
    });
    console.log(`✅ Image pulled: ${imageName}`);
  }
}

/**
 * Get container by project ID
 */
export function getContainer(projectId: string): ContainerInfo | undefined {
  return activeContainers.get(projectId);
}

/**
 * Get Docker container instance
 */
export function getDockerContainer(projectId: string): Docker.Container | null {
  const containerInfo = getContainer(projectId);
  if (!containerInfo || !containerInfo.id) {
    return null;
  }

  const docker = getDockerClient();
  return docker.getContainer(containerInfo.id);
}

/**
 * Stop and remove container
 */
export async function stopContainer(projectId: string): Promise<void> {
  const container = getDockerContainer(projectId);
  if (!container) {
    console.warn(`No container found for project: ${projectId}`);
    return;
  }

  try {
    const containerInfo = getContainer(projectId);
    console.log(`🛑 Stopping container: ${containerInfo?.name}`);

    await container.stop({ t: 10 });
    await container.remove();

    if (containerInfo) {
      containerInfo.status = "stopped";
    }
    activeContainers.delete(projectId);

    console.log(`✅ Container stopped and removed`);
  } catch (error) {
    console.error(`Failed to stop container:`, error);
    throw error;
  }
}

/**
 * Stop all active containers
 */
export async function stopAllContainers(): Promise<void> {
  const projectIds = Array.from(activeContainers.keys());

  console.log(`🛑 Stopping ${projectIds.length} containers...`);

  await Promise.allSettled(
    projectIds.map((projectId) => stopContainer(projectId))
  );

  console.log(`✅ All containers stopped`);
}

/**
 * List all active containers
 */
export function listActiveContainers(): ContainerInfo[] {
  return Array.from(activeContainers.values());
}

/**
 * Get container stats (CPU, memory usage)
 */
export async function getContainerStats(projectId: string): Promise<Docker.ContainerStats | null> {
  const container = getDockerContainer(projectId);
  if (!container) return null;

  try {
    const stats = await container.stats({ stream: false });
    return stats as Docker.ContainerStats;
  } catch (error) {
    console.error("Failed to get container stats:", error);
    return null;
  }
}

/**
 * Clean up stopped containers (runs periodically)
 */
export async function cleanupStoppedContainers(): Promise<void> {
  const docker = getDockerClient();

  try {
    const containers = await docker.listContainers({ all: true });

    const stoppedAgentContainers = containers.filter(
      (c) =>
        c.State === "exited" &&
        c.Names.some((name) => name.includes("agent-sandbox"))
    );

    console.log(`🧹 Cleaning up ${stoppedAgentContainers.length} stopped containers...`);

    await Promise.allSettled(
      stoppedAgentContainers.map((c) =>
        docker.getContainer(c.Id).remove()
      )
    );

    console.log(`✅ Cleanup complete`);
  } catch {
    console.error("Failed to cleanup containers");
  }
}
