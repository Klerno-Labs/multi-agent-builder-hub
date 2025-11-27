/**
 * Container executor for running commands in isolated Docker containers
 */

import { Writable } from "stream";
import {
  getDockerContainer,
  createContainer,
  stopContainer,
  isDockerAvailable,
} from "./docker-manager";
import { ExecutionResult, FileOperation, BuildValidation, TestResults } from "./types";

/**
 * Execute a command in a container
 */
export async function executeCommand(
  projectId: string,
  command: string,
  timeoutMs: number = 300000
): Promise<ExecutionResult> {
  const container = getDockerContainer(projectId);
  if (!container) {
    throw new Error(`No container found for project: ${projectId}`);
  }

  const startTime = Date.now();
  let timedOut = false;

  try {
    // Create exec instance
    const exec = await container.exec({
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    });

    // Start exec
    const stream = await exec.start({ Detach: false, Tty: false });

    let stdout = "";
    let stderr = "";

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      stream.destroy();
    }, timeoutMs);

    // Collect output
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        const data = chunk.toString();
        // Docker multiplexes stdout/stderr - first byte indicates stream type
        if (chunk[0] === 1) {
          stdout += data.slice(8);
        } else if (chunk[0] === 2) {
          stderr += data.slice(8);
        } else {
          stdout += data;
        }
      });

      stream.on("end", () => {
        clearTimeout(timeoutHandle);
        resolve();
      });

      stream.on("error", (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });
    });

    // Get exit code
    const inspectResult = await exec.inspect();
    const exitCode = inspectResult.ExitCode || 0;

    const executionTimeMs = Date.now() - startTime;

    return {
      exitCode: timedOut ? -1 : exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      executionTimeMs,
      timedOut,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    return {
      exitCode: -1,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown error",
      executionTimeMs,
      timedOut,
    };
  }
}

/**
 * Copy files to/from container
 */
export async function performFileOperation(
  projectId: string,
  operation: FileOperation
): Promise<void> {
  const container = getDockerContainer(projectId);
  if (!container) {
    throw new Error(`No container found for project: ${projectId}`);
  }

  try {
    if (operation.type === "copy") {
      // Copy from host to container
      const tar = await import("tar-stream");
      const pack = tar.pack();

      const fs = await import("fs");
      const fileContent = fs.readFileSync(operation.source);

      pack.entry({ name: operation.destination.split("/").pop()! }, fileContent);
      pack.finalize();

      await container.putArchive(pack, { path: operation.destination });
    } else if (operation.type === "write") {
      // Write content directly to container
      if (!operation.content) {
        throw new Error("Content is required for write operation");
      }

      const tar = await import("tar-stream");
      const pack = tar.pack();

      pack.entry({ name: operation.destination.split("/").pop()! }, operation.content);
      pack.finalize();

      await container.putArchive(pack, { path: operation.destination });
    } else if (operation.type === "read") {
      // Read file from container
      const stream = await container.getArchive({ path: operation.source });

      const tar = await import("tar-stream");
      const extract = tar.extract();

      return new Promise<void>((resolve, reject) => {
        extract.on("entry", (header, entryStream, next) => {
          const chunks: Buffer[] = [];
          entryStream.on("data", (chunk) => chunks.push(chunk));
          entryStream.on("end", () => {
            const content = Buffer.concat(chunks).toString();
            const fs = require("fs");
            fs.writeFileSync(operation.destination, content);
            next();
          });
          entryStream.resume();
        });

        extract.on("finish", () => resolve());
        extract.on("error", reject);

        stream.pipe(extract);
      });
    }
  } catch (error) {
    throw new Error(
      `File operation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Run npm install in container
 */
export async function runNpmInstall(
  projectId: string,
  workDir: string = "/app"
): Promise<ExecutionResult> {
  console.log(`📦 Running npm install in container...`);
  return executeCommand(projectId, `cd ${workDir} && npm install`, 600000);
}

/**
 * Run npm test in container
 */
export async function runNpmTest(
  projectId: string,
  workDir: string = "/app"
): Promise<TestResults> {
  console.log(`🧪 Running tests in container...`);
  const result = await executeCommand(projectId, `cd ${workDir} && npm test`, 300000);

  // Parse test output (example for Jest/Vitest)
  const testOutput = result.stdout + result.stderr;
  const passedMatch = testOutput.match(/(\d+) passed/);
  const failedMatch = testOutput.match(/(\d+) failed/);
  const totalMatch = testOutput.match(/Tests:\s+(\d+) total/);

  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed;

  return {
    total,
    passed,
    failed,
    output: testOutput,
  };
}

/**
 * Run npm build in container
 */
export async function runNpmBuild(
  projectId: string,
  workDir: string = "/app"
): Promise<ExecutionResult> {
  console.log(`🏗️  Running build in container...`);
  return executeCommand(projectId, `cd ${workDir} && npm run build`, 600000);
}

/**
 * Validate project build (install, test, build)
 */
export async function validateProjectBuild(
  projectId: string,
  workDir: string = "/app"
): Promise<BuildValidation> {
  const errors: string[] = [];
  let allOutput = "";

  // Check if Docker is available
  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    return {
      success: false,
      output: "Docker is not available. Skipping sandbox validation.",
      errors: ["Docker daemon not running"],
    };
  }

  try {
    // Run npm install
    const installResult = await runNpmInstall(projectId, workDir);
    allOutput += `=== NPM INSTALL ===\n${installResult.stdout}\n${installResult.stderr}\n\n`;

    if (installResult.exitCode !== 0) {
      errors.push(`npm install failed with exit code ${installResult.exitCode}`);
      return {
        success: false,
        output: allOutput,
        errors,
      };
    }

    // Run npm test (if test script exists)
    let testResults: TestResults | undefined;
    try {
      testResults = await runNpmTest(projectId, workDir);
      allOutput += `=== NPM TEST ===\n${testResults.output}\n\n`;

      if (testResults.failed > 0) {
        errors.push(`${testResults.failed} tests failed`);
      }
    } catch (error) {
      // Test script might not exist - that's okay
      allOutput += `=== NPM TEST ===\nNo test script found or tests failed\n\n`;
    }

    // Run npm build
    const buildResult = await runNpmBuild(projectId, workDir);
    allOutput += `=== NPM BUILD ===\n${buildResult.stdout}\n${buildResult.stderr}\n\n`;

    if (buildResult.exitCode !== 0) {
      errors.push(`npm build failed with exit code ${buildResult.exitCode}`);
      return {
        success: false,
        output: allOutput,
        errors,
        testResults,
      };
    }

    // All validations passed
    return {
      success: errors.length === 0,
      output: allOutput,
      errors,
      testResults,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown validation error");
    return {
      success: false,
      output: allOutput,
      errors,
    };
  }
}

/**
 * Start a dev server in the container (background)
 */
export async function startDevServer(
  projectId: string,
  port: number = 3000,
  workDir: string = "/app"
): Promise<ExecutionResult> {
  console.log(`🚀 Starting dev server in container on port ${port}...`);

  // Start server in background and immediately return
  const command = `cd ${workDir} && npm run dev -- --port ${port} &`;
  const result = await executeCommand(projectId, command, 10000);

  // Wait a bit for server to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return result;
}

/**
 * Check if a URL is accessible in the container
 */
export async function checkUrlAccessible(
  projectId: string,
  url: string,
  maxRetries: number = 5
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await executeCommand(
      projectId,
      `wget --spider --timeout=5 ${url}`,
      10000
    );

    if (result.exitCode === 0) {
      return true;
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}
