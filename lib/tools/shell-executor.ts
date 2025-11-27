import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ShellCommandRequest {
  commands: string[];
  workingDirectory?: string;
  timeout?: number;
  requireApproval?: boolean;
}

export interface ShellResult {
  success: boolean;
  outputs: Array<{
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  error?: string;
}

export interface ApprovalRequest {
  commands: string[];
  workingDirectory: string;
  timestamp: string;
}

/**
 * Shell command executor with workspace isolation and approval flow
 * Implements the pattern from OpenAI's coding agent example
 */
export class ShellExecutor {
  private workspaceRoot: string;
  private approvalCallback?: (request: ApprovalRequest) => Promise<boolean>;

  constructor(workspaceRoot: string, approvalCallback?: (request: ApprovalRequest) => Promise<boolean>) {
    this.workspaceRoot = workspaceRoot;
    this.approvalCallback = approvalCallback;
  }

  /**
   * Execute shell commands with optional approval flow
   */
  async execute(request: ShellCommandRequest): Promise<ShellResult> {
    try {
      const workingDir = request.workingDirectory
        ? path.resolve(this.workspaceRoot, request.workingDirectory)
        : this.workspaceRoot;

      // Ensure working directory exists and is within workspace
      await this.validateWorkingDirectory(workingDir);

      // Check for dangerous commands and request approval if needed
      if (request.requireApproval !== false && this.requiresApproval(request.commands)) {
        const approved = await this.requestApproval({
          commands: request.commands,
          workingDirectory: workingDir,
          timestamp: new Date().toISOString(),
        });

        if (!approved) {
          return {
            success: false,
            outputs: [],
            error: 'Command execution was not approved',
          };
        }
      }

      // Execute commands sequentially
      const outputs: ShellResult['outputs'] = [];

      for (const command of request.commands) {
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: workingDir,
            timeout: request.timeout || 30000, // 30 second default timeout
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          });

          outputs.push({
            command,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: 0,
          });
        } catch (error: any) {
          outputs.push({
            command,
            stdout: error.stdout?.toString() || '',
            stderr: error.stderr?.toString() || error.message,
            exitCode: error.code || 1,
          });

          // Stop execution on error
          return {
            success: false,
            outputs,
            error: `Command failed: ${command}`,
          };
        }
      }

      return {
        success: true,
        outputs,
      };
    } catch (error) {
      return {
        success: false,
        outputs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate that the working directory is safe and within workspace
   */
  private async validateWorkingDirectory(dir: string): Promise<void> {
    // Ensure directory is within workspace bounds
    const normalizedDir = path.normalize(dir);
    const normalizedWorkspace = path.normalize(this.workspaceRoot);

    if (!normalizedDir.startsWith(normalizedWorkspace)) {
      throw new Error('Working directory must be within workspace bounds');
    }

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create working directory: ${error}`);
    }
  }

  /**
   * Check if commands require user approval
   */
  private requiresApproval(commands: string[]): boolean {
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /rm\s+-fr/i,
      /del\s+\/[sS]/i,
      /format\s+/i,
      /mkfs/i,
      /dd\s+if=/i,
      />\s*\/dev\//i,
      /sudo/i,
      /curl.*\|\s*bash/i,
      /wget.*\|\s*sh/i,
      /npm\s+install\s+-g/i,
      /pip\s+install.*--user/i,
    ];

    return commands.some(cmd =>
      dangerousPatterns.some(pattern => pattern.test(cmd))
    );
  }

  /**
   * Request approval from user (or auto-approve if no callback)
   */
  private async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (!this.approvalCallback) {
      // Auto-approve if no callback provided (for testing/development)
      console.warn('No approval callback provided - auto-approving command execution');
      return true;
    }

    return await this.approvalCallback(request);
  }

  /**
   * Get workspace root
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}

/**
 * Create a shell executor instance for a specific workspace
 */
export function createShellExecutor(
  workspaceRoot: string,
  approvalCallback?: (request: ApprovalRequest) => Promise<boolean>
): ShellExecutor {
  return new ShellExecutor(workspaceRoot, approvalCallback);
}

/**
 * Execute a single shell command (convenience function)
 */
export async function executeCommand(
  command: string,
  workspaceRoot: string,
  options?: Partial<ShellCommandRequest>
): Promise<ShellResult> {
  const executor = createShellExecutor(workspaceRoot);
  return executor.execute({
    commands: [command],
    ...options,
  });
}
