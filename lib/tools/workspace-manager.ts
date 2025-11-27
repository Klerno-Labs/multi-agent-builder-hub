import path from 'path';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { randomUUID } from 'crypto';
import archiver from 'archiver';
import { ShellExecutor } from './shell-executor';
import { WorkspaceEditor } from './apply-patch';
import { WebSearchTool } from './web-search';

export interface WorkspaceConfig {
  rootDir: string;
  projectName: string;
  sessionId?: string;
  enableApproval?: boolean;
}

export interface WorkspaceTools {
  shell: ShellExecutor;
  editor: WorkspaceEditor;
  search: WebSearchTool;
}

export interface WorkspaceMetadata {
  workspaceDir: string;
  projectName: string;
  sessionId: string;
  sizeBytes: number;
  sizeFormatted: string;
  fileCount: number;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Workspace isolation manager for safe agent operations
 * Provides sandboxed environment for each project
 */
export class WorkspaceManager {
  private config: WorkspaceConfig;
  private workspaceDir: string;
  private tools: WorkspaceTools;

  constructor(config: WorkspaceConfig) {
    this.config = config;
    this.workspaceDir = this.createWorkspaceDir();
    this.tools = this.initializeTools();
  }

  /**
   * Initialize workspace (create directories, setup isolation)
   */
  async initialize(): Promise<void> {
    try {
      // Create workspace directory
      await fs.mkdir(this.workspaceDir, { recursive: true });

      // Create standard project directories
      const standardDirs = [
        'src',
        'tests',
        'docs',
        'scripts',
        'config',
      ];

      for (const dir of standardDirs) {
        await fs.mkdir(path.join(this.workspaceDir, dir), { recursive: true });
      }

      // Create .gitignore
      await this.createGitignore();

      console.log(`Workspace initialized: ${this.workspaceDir}`);
    } catch (error) {
      throw new Error(`Failed to initialize workspace: ${error}`);
    }
  }

  /**
   * Get workspace tools (shell, editor, search)
   */
  getTools(): WorkspaceTools {
    return this.tools;
  }

  /**
   * Get workspace directory
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.workspaceDir, absolutePath);
  }

  /**
   * List all files in workspace
   */
  async listFiles(directory = ''): Promise<string[]> {
    const targetDir = directory
      ? path.join(this.workspaceDir, directory)
      : this.workspaceDir;

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(targetDir, entry.name);
        const relativePath = this.getRelativePath(fullPath);

        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(relativePath);
          files.push(...subFiles);
        } else {
          files.push(relativePath);
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Read file from workspace
   */
  async readFile(relativePath: string): Promise<string> {
    const absolutePath = path.join(this.workspaceDir, relativePath);
    this.validatePath(absolutePath);

    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${relativePath}`);
    }
  }

  /**
   * Clean up workspace (delete all files)
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workspaceDir, { recursive: true, force: true });
      console.log(`Workspace cleaned up: ${this.workspaceDir}`);
    } catch (error) {
      console.error(`Failed to cleanup workspace: ${error}`);
    }
  }

  /**
   * Archive workspace (create zip)
   */
  async archive(outputPath?: string): Promise<string> {
    const archivePath = outputPath || path.join(
      path.dirname(this.workspaceDir),
      'archives',
      `${path.basename(this.workspaceDir)}-${Date.now()}.zip`
    );

    // Ensure archive directory exists
    await fs.mkdir(path.dirname(archivePath), { recursive: true });

    return new Promise((resolve, reject) => {
      const output = createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`✅ Workspace archived: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to archive workspace: ${err.message}`));
      });

      archive.pipe(output);
      archive.directory(this.workspaceDir, path.basename(this.workspaceDir));
      archive.finalize();
    });
  }

  /**
   * Get workspace size in bytes
   */
  async getSize(): Promise<number> {
    let totalSize = 0;

    async function calculateDirSize(dirPath: string): Promise<number> {
      let size = 0;
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            size += await calculateDirSize(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            size += stats.size;
          }
        }
      } catch (error) {
        // Ignore permission errors
      }

      return size;
    }

    totalSize = await calculateDirSize(this.workspaceDir);
    return totalSize;
  }

  /**
   * Get workspace metadata
   */
  async getMetadata(): Promise<WorkspaceMetadata> {
    const size = await this.getSize();
    const files = await this.listFiles();

    try {
      const stats = await fs.stat(this.workspaceDir);
      return {
        workspaceDir: this.workspaceDir,
        projectName: this.config.projectName,
        sessionId: this.config.sessionId || 'unknown',
        sizeBytes: size,
        sizeFormatted: this.formatBytes(size),
        fileCount: files.length,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get workspace metadata: ${error}`);
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Create workspace directory path
   */
  private createWorkspaceDir(): string {
    const sessionId = this.config.sessionId || randomUUID();
    const sanitizedProjectName = this.config.projectName.replace(/[^a-zA-Z0-9-_]/g, '_');

    return path.join(
      this.config.rootDir,
      'workspaces',
      `${sanitizedProjectName}-${sessionId}`
    );
  }

  /**
   * Initialize workspace tools
   */
  private initializeTools(): WorkspaceTools {
    const approvalCallback = this.config.enableApproval
      ? this.createApprovalCallback()
      : undefined;

    return {
      shell: new ShellExecutor(this.workspaceDir, approvalCallback),
      editor: new WorkspaceEditor(this.workspaceDir, approvalCallback),
      search: new WebSearchTool(),
    };
  }

  /**
   * Create approval callback for dangerous operations
   */
  private createApprovalCallback() {
    // In a real implementation, this would integrate with a UI or notification system
    // For now, we'll auto-approve in development mode
    return async (request: any): Promise<boolean> => {
      console.warn('⚠️  Approval requested:', request);
      console.warn('⚠️  Auto-approving in development mode');
      return true;
    };
  }

  /**
   * Create default .gitignore
   */
  private async createGitignore(): Promise<void> {
    const gitignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Production
build/
dist/
.next/
out/

# Misc
.DS_Store
*.log
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo
`;

    const gitignorePath = path.join(this.workspaceDir, '.gitignore');
    await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
  }

  /**
   * Validate path is within workspace bounds
   */
  private validatePath(absolutePath: string): void {
    const normalized = path.normalize(absolutePath);
    const workspaceNormalized = path.normalize(this.workspaceDir);

    if (!normalized.startsWith(workspaceNormalized)) {
      throw new Error('Path must be within workspace bounds');
    }
  }
}

/**
 * Create a new workspace manager
 */
export function createWorkspace(config: WorkspaceConfig): WorkspaceManager {
  return new WorkspaceManager(config);
}

/**
 * Global workspace registry for session management
 * Provides cleanup scheduling and disk space monitoring
 */
class WorkspaceRegistry {
  private workspaces = new Map<string, WorkspaceManager>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private maxTotalSize = 10 * 1024 * 1024 * 1024; // 10 GB

  constructor() {
    this.startCleanupScheduler();
  }

  register(sessionId: string, workspace: WorkspaceManager): void {
    this.workspaces.set(sessionId, workspace);
  }

  get(sessionId: string): WorkspaceManager | undefined {
    return this.workspaces.get(sessionId);
  }

  async delete(sessionId: string, archive = false): Promise<void> {
    const workspace = this.workspaces.get(sessionId);
    if (workspace) {
      if (archive) {
        try {
          await workspace.archive();
          console.log(`✅ Workspace archived before deletion: ${sessionId}`);
        } catch (error) {
          console.error(`Failed to archive workspace: ${error}`);
        }
      }

      await workspace.cleanup();
      this.workspaces.delete(sessionId);
    }
  }

  listAll(): string[] {
    return Array.from(this.workspaces.keys());
  }

  /**
   * Get total size of all workspaces
   */
  async getTotalSize(): Promise<number> {
    let totalSize = 0;

    for (const workspace of this.workspaces.values()) {
      totalSize += await workspace.getSize();
    }

    return totalSize;
  }

  /**
   * Get all workspace metadata
   */
  async getAllMetadata(): Promise<WorkspaceMetadata[]> {
    const metadata: WorkspaceMetadata[] = [];

    for (const workspace of this.workspaces.values()) {
      metadata.push(await workspace.getMetadata());
    }

    return metadata;
  }

  /**
   * Cleanup old workspaces based on age
   */
  async cleanupOld(maxAgeMs = this.maxAge, archiveBeforeDelete = true): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, workspace] of this.workspaces.entries()) {
      const metadata = await workspace.getMetadata();
      const ageMs = now - metadata.modifiedAt.getTime();

      if (ageMs > maxAgeMs) {
        console.log(`🗑️  Cleaning up old workspace: ${sessionId} (age: ${Math.round(ageMs / 1000 / 60 / 60)}h)`);
        await this.delete(sessionId, archiveBeforeDelete);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Cleanup workspaces when total size exceeds limit
   */
  async cleanupBySize(maxSizeBytes = this.maxTotalSize, archiveBeforeDelete = true): Promise<number> {
    const totalSize = await this.getTotalSize();

    if (totalSize <= maxSizeBytes) {
      return 0;
    }

    // Get all workspaces sorted by modification time (oldest first)
    const allMetadata = await this.getAllMetadata();
    allMetadata.sort((a, b) => a.modifiedAt.getTime() - b.modifiedAt.getTime());

    let cleaned = 0;
    let currentSize = totalSize;

    for (const metadata of allMetadata) {
      if (currentSize <= maxSizeBytes) {
        break;
      }

      console.log(`🗑️  Cleaning up workspace to reduce size: ${metadata.sessionId}`);
      await this.delete(metadata.sessionId, archiveBeforeDelete);
      currentSize -= metadata.sizeBytes;
      cleaned++;
    }

    return cleaned;
  }

  /**
   * Start automated cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup every 6 hours
    const intervalMs = 6 * 60 * 60 * 1000;

    this.cleanupInterval = setInterval(async () => {
      console.log('🧹 Running scheduled workspace cleanup...');

      try {
        const oldCleaned = await this.cleanupOld();
        const sizeCleaned = await this.cleanupBySize();

        console.log(`✅ Cleanup complete: ${oldCleaned} old workspaces, ${sizeCleaned} by size`);
      } catch (error) {
        console.error(`Failed to run scheduled cleanup: ${error}`);
      }
    }, intervalMs);
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Set maximum age for workspaces
   */
  setMaxAge(maxAgeMs: number): void {
    this.maxAge = maxAgeMs;
  }

  /**
   * Set maximum total size for all workspaces
   */
  setMaxTotalSize(maxSizeBytes: number): void {
    this.maxTotalSize = maxSizeBytes;
  }
}

export const workspaceRegistry = new WorkspaceRegistry();
