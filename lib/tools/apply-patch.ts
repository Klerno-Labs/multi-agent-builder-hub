import path from 'path';
import fs from 'fs/promises';
import { applyPatch, createPatch, parsePatch } from 'diff';

export interface ApplyPatchOperation {
  path: string;
  diff: string;
  operation: 'create' | 'edit' | 'delete';
  requireApproval?: boolean;
}

export interface ApplyPatchResult {
  success: boolean;
  output: string;
  error?: string;
  preview?: string;
}

export interface PatchApprovalRequest {
  operation: ApplyPatchOperation;
  relativePath: string;
  preview: string;
  timestamp: string;
}

/**
 * Workspace file editor using unified diff format
 * Implements the apply_patch pattern from OpenAI's coding agent
 */
export class WorkspaceEditor {
  private workspaceRoot: string;
  private approvalCallback?: (request: PatchApprovalRequest) => Promise<boolean>;

  constructor(workspaceRoot: string, approvalCallback?: (request: PatchApprovalRequest) => Promise<boolean>) {
    this.workspaceRoot = workspaceRoot;
    this.approvalCallback = approvalCallback;
  }

  /**
   * Apply a patch operation to a file
   */
  async applyPatch(operation: ApplyPatchOperation): Promise<ApplyPatchResult> {
    try {
      const relativePath = this.getRelativePath(operation.path);
      const absolutePath = this.resolvePath(operation.path);

      // Validate path is within workspace
      this.validatePath(absolutePath);

      // Generate preview
      const preview = await this.generatePreview(operation, absolutePath);

      // Request approval if needed
      if (operation.requireApproval !== false) {
        const approved = await this.requestApproval({
          operation,
          relativePath,
          preview,
          timestamp: new Date().toISOString(),
        });

        if (!approved) {
          return {
            success: false,
            output: '',
            error: 'Patch operation was not approved',
          };
        }
      }

      // Execute the operation
      switch (operation.operation) {
        case 'create':
          return await this.createFile(operation, absolutePath, relativePath);
        case 'edit':
          return await this.editFile(operation, absolutePath, relativePath);
        case 'delete':
          return await this.deleteFile(absolutePath, relativePath);
        default:
          return {
            success: false,
            output: '',
            error: `Unknown operation: ${operation.operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new file
   */
  private async createFile(
    operation: ApplyPatchOperation,
    absolutePath: string,
    relativePath: string
  ): Promise<ApplyPatchResult> {
    try {
      // Check if file already exists
      const exists = await this.fileExists(absolutePath);
      if (exists) {
        return {
          success: false,
          output: '',
          error: `File already exists: ${relativePath}`,
        };
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(absolutePath);
      await fs.mkdir(parentDir, { recursive: true });

      // Apply diff to empty string to get new content
      const content = this.applyUnifiedDiff('', operation.diff, true);

      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');

      return {
        success: true,
        output: `Created ${relativePath}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to create file',
      };
    }
  }

  /**
   * Edit an existing file
   */
  private async editFile(
    operation: ApplyPatchOperation,
    absolutePath: string,
    relativePath: string
  ): Promise<ApplyPatchResult> {
    try {
      // Read existing content
      const exists = await this.fileExists(absolutePath);
      if (!exists) {
        return {
          success: false,
          output: '',
          error: `File does not exist: ${relativePath}`,
        };
      }

      const originalContent = await fs.readFile(absolutePath, 'utf-8');

      // Apply diff
      const newContent = this.applyUnifiedDiff(originalContent, operation.diff, false);

      // Write updated content
      await fs.writeFile(absolutePath, newContent, 'utf-8');

      return {
        success: true,
        output: `Edited ${relativePath}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to edit file',
      };
    }
  }

  /**
   * Delete a file
   */
  private async deleteFile(absolutePath: string, relativePath: string): Promise<ApplyPatchResult> {
    try {
      const exists = await this.fileExists(absolutePath);
      if (!exists) {
        return {
          success: false,
          output: '',
          error: `File does not exist: ${relativePath}`,
        };
      }

      await fs.unlink(absolutePath);

      return {
        success: true,
        output: `Deleted ${relativePath}`,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  /**
   * Apply a unified diff to content
   */
  private applyUnifiedDiff(originalContent: string, diff: string, isCreation: boolean): string {
    if (!diff || diff.trim() === '') {
      return originalContent;
    }

    try {
      // Try using the diff library's applyPatch
      const result = applyPatch(originalContent, diff);

      if (result === false) {
        throw new Error('Failed to apply patch - content mismatch');
      }

      return result;
    } catch (error) {
      // Fallback: if it's a creation, try to extract content from diff
      if (isCreation) {
        const lines = diff.split('\n');
        const content: string[] = [];

        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            content.push(line.substring(1));
          }
        }

        return content.join('\n');
      }

      throw error;
    }
  }

  /**
   * Generate preview of changes
   */
  private async generatePreview(operation: ApplyPatchOperation, absolutePath: string): Promise<string> {
    try {
      switch (operation.operation) {
        case 'create':
          return `Create new file: ${this.getRelativePath(operation.path)}\n\n${operation.diff}`;
        case 'edit':
          return `Edit file: ${this.getRelativePath(operation.path)}\n\n${operation.diff}`;
        case 'delete':
          return `Delete file: ${this.getRelativePath(operation.path)}`;
        default:
          return 'Unknown operation';
      }
    } catch (error) {
      return 'Failed to generate preview';
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get relative path from workspace root
   */
  private getRelativePath(filePath: string): string {
    const absolute = this.resolvePath(filePath);
    return path.relative(this.workspaceRoot, absolute);
  }

  /**
   * Resolve path relative to workspace
   */
  private resolvePath(filePath: string, ensureParent = false): string {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.workspaceRoot, filePath);

    return path.normalize(resolved);
  }

  /**
   * Validate path is within workspace bounds
   */
  private validatePath(absolutePath: string): void {
    const normalized = path.normalize(absolutePath);
    const workspaceNormalized = path.normalize(this.workspaceRoot);

    if (!normalized.startsWith(workspaceNormalized)) {
      throw new Error('Path must be within workspace bounds');
    }
  }

  /**
   * Request approval for patch operation
   */
  private async requestApproval(request: PatchApprovalRequest): Promise<boolean> {
    if (!this.approvalCallback) {
      // Auto-approve if no callback provided (for testing/development)
      console.warn('No approval callback provided - auto-approving patch operation');
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
 * Create a workspace editor instance
 */
export function createWorkspaceEditor(
  workspaceRoot: string,
  approvalCallback?: (request: PatchApprovalRequest) => Promise<boolean>
): WorkspaceEditor {
  return new WorkspaceEditor(workspaceRoot, approvalCallback);
}

/**
 * Generate a unified diff for file changes
 */
export function generateDiff(
  originalContent: string,
  newContent: string,
  fileName: string = 'file'
): string {
  return createPatch(fileName, originalContent, newContent);
}
