import { AgentId, ProjectType } from "../agents/types";

/**
 * Memory system types for agent learning and pattern reuse
 */

export interface ProjectMemory {
  projectId: string;
  projectType: ProjectType;
  description: string;
  techStack: string[];
  features: string[];
  codeSnippets: CodeSnippet[];
  outcome: "success" | "failed";
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CodeSnippet {
  filePath: string;
  language: string;
  code: string;
  purpose: string;
  agentId: AgentId;
}

export interface AgentLearning {
  agentId: AgentId;
  pattern: string;
  description: string;
  successCount: number;
  lastUsed: string;
  projectIds: string[];
  embedding?: number[];
}

export interface ErrorPattern {
  errorType: string;
  description: string;
  solution: string;
  occurrenceCount: number;
  affectedAgents: AgentId[];
  lastOccurred: string;
}

export interface SimilarProject {
  projectId: string;
  projectType: ProjectType;
  description: string;
  similarity: number;
  techStack: string[];
  codeSnippets: CodeSnippet[];
}

export interface MemoryQueryOptions {
  projectType?: ProjectType;
  agentId?: AgentId;
  techStack?: string[];
  limit?: number;
  minSimilarity?: number;
}

export interface MemoryStats {
  totalProjects: number;
  totalLearnings: number;
  totalErrorPatterns: number;
  storageSize: number;
  lastUpdated: string;
}
