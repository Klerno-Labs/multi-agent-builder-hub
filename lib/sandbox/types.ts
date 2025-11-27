/**
 * Docker Sandbox types for isolated execution environment
 */

export interface SandboxConfig {
  /** Docker image to use (default: node:20-alpine) */
  image: string;
  /** Memory limit in MB (default: 2048) */
  memoryLimitMB: number;
  /** CPU limit (default: 2) */
  cpuLimit: number;
  /** Timeout in seconds (default: 300) */
  timeoutSeconds: number;
  /** Working directory inside container */
  workDir: string;
  /** Environment variables */
  env?: Record<string, string>;
}

export interface ContainerInfo {
  /** Container ID */
  id: string;
  /** Container name */
  name: string;
  /** Project ID this container is for */
  projectId: string;
  /** Container status */
  status: "creating" | "running" | "stopped" | "error";
  /** Created timestamp */
  createdAt: string;
  /** Port mappings (host -> container) */
  ports?: Record<number, number>;
}

export interface ExecutionResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Whether execution timed out */
  timedOut: boolean;
}

export interface FileOperation {
  /** Operation type */
  type: "copy" | "write" | "read";
  /** Source path (host or container) */
  source: string;
  /** Destination path (container or host) */
  destination: string;
  /** File content (for write operations) */
  content?: string;
}

export interface ScreenshotOptions {
  /** URL to capture */
  url: string;
  /** Output file path */
  outputPath: string;
  /** Viewport width */
  width?: number;
  /** Viewport height */
  height?: number;
  /** Wait for selector before capturing */
  waitForSelector?: string;
  /** Full page screenshot */
  fullPage?: boolean;
}

export interface BuildValidation {
  /** Whether build succeeded */
  success: boolean;
  /** Build output */
  output: string;
  /** Build errors */
  errors: string[];
  /** Test results */
  testResults?: TestResults;
  /** Screenshot paths */
  screenshots?: string[];
}

export interface TestResults {
  /** Total tests */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Test output */
  output: string;
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  image: "node:20-alpine",
  memoryLimitMB: 2048,
  cpuLimit: 2,
  timeoutSeconds: 300,
  workDir: "/app",
  env: {
    NODE_ENV: "production",
  },
};
