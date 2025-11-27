/**
 * Agent Memory & Learning System (RAG)
 * Stores project patterns in ChromaDB for agents to learn from past successes
 */

import { ChromaClient, Collection } from "chromadb";
import { AgentId, ProjectType } from "../agents/types";
import {
  ProjectMemory,
  AgentLearning,
  ErrorPattern,
  SimilarProject,
  MemoryQueryOptions,
  MemoryStats,
} from "./types";
import {
  generateEmbedding,
  createProjectSearchText,
} from "./embeddings";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const PROJECTS_COLLECTION = "projects";
const LEARNINGS_COLLECTION = "agent_learnings";
const ERRORS_COLLECTION = "error_patterns";

let chromaClient: ChromaClient | null = null;
let projectsCollection: Collection | null = null;
let learningsCollection: Collection | null = null;
let errorsCollection: Collection | null = null;

async function initializeChroma() {
  if (chromaClient) return;

  try {
    chromaClient = new ChromaClient({ path: CHROMA_URL });
    projectsCollection = await chromaClient.getOrCreateCollection({
      name: PROJECTS_COLLECTION,
      metadata: { description: "Completed project patterns for reuse" },
    });
    learningsCollection = await chromaClient.getOrCreateCollection({
      name: LEARNINGS_COLLECTION,
      metadata: { description: "Agent-specific successful patterns" },
    });
    errorsCollection = await chromaClient.getOrCreateCollection({
      name: ERRORS_COLLECTION,
      metadata: { description: "Common error patterns and solutions" },
    });
    console.log(" ChromaDB initialized successfully");
  } catch (error) {
    console.warn("�  ChromaDB not available:", error);
  }
}

export async function storeProjectMemory(memory: ProjectMemory): Promise<void> {
  await initializeChroma();
  if (!projectsCollection) {
    console.warn("ChromaDB not available, skipping project memory storage");
    return;
  }

  try {
    const searchText = createProjectSearchText(
      memory.description,
      memory.techStack,
      memory.features
    );
    const embedding = await generateEmbedding(searchText);

    await projectsCollection.add({
      ids: [memory.projectId],
      embeddings: [embedding],
      metadatas: [
        {
          projectType: memory.projectType,
          description: memory.description,
          techStack: JSON.stringify(memory.techStack),
          features: JSON.stringify(memory.features),
          outcome: memory.outcome,
          createdAt: memory.createdAt,
          snippetCount: memory.codeSnippets.length,
        },
      ],
      documents: [searchText],
    });

    console.log(` Stored project memory: ${memory.projectId}`);
  } catch (error) {
    console.error("Failed to store project memory:", error);
  }
}

export async function querySimilarProjects(
  description: string,
  options: MemoryQueryOptions = {}
): Promise<SimilarProject[]> {
  await initializeChroma();
  if (!projectsCollection) {
    console.warn("ChromaDB not available, returning empty results");
    return [];
  }

  try {
    const { projectType, techStack = [], limit = 5, minSimilarity = 0.7 } = options;
    const queryText = createProjectSearchText(description, techStack, []);
    const queryEmbedding = await generateEmbedding(queryText);

    const where = projectType ? { projectType } : undefined;

    const results = await projectsCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit * 2,
      where,
    });

    const similarProjects: SimilarProject[] = [];
    if (results.ids && results.ids[0] && results.metadatas && results.metadatas[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const metadata = results.metadatas[0][i];
        const distance = results.distances?.[0]?.[i] ?? 1;
        const similarity = 1 / (1 + Math.sqrt(distance));

        if (similarity >= minSimilarity) {
          similarProjects.push({
            projectId: results.ids[0][i],
            projectType: (metadata?.projectType as ProjectType) || "website",
            description: (metadata?.description as string) || "",
            similarity,
            techStack: JSON.parse((metadata?.techStack as string) || "[]"),
            codeSnippets: [],
          });
        }
        if (similarProjects.length >= limit) break;
      }
    }

    console.log(`= Found ${similarProjects.length} similar projects`);
    return similarProjects;
  } catch (error) {
    console.error("Failed to query similar projects:", error);
    return [];
  }
}

export async function storeAgentLearning(learning: AgentLearning): Promise<void> {
  await initializeChroma();
  if (!learningsCollection) return;

  try {
    const embedding = await generateEmbedding(learning.description);
    const learningId = `${learning.agentId}_${Date.now()}`;

    await learningsCollection.add({
      ids: [learningId],
      embeddings: [embedding],
      metadatas: [
        {
          agentId: learning.agentId,
          pattern: learning.pattern,
          description: learning.description,
          successCount: learning.successCount,
          lastUsed: learning.lastUsed,
          projectIds: JSON.stringify(learning.projectIds),
        },
      ],
      documents: [learning.description],
    });

    console.log(` Stored learning for agent ${learning.agentId}`);
  } catch (error) {
    console.error("Failed to store agent learning:", error);
  }
}

export async function getAgentLearnings(
  agentId: AgentId,
  limit = 10
): Promise<AgentLearning[]> {
  await initializeChroma();
  if (!learningsCollection) return [];

  try {
    const results = await learningsCollection.get({
      where: { agentId },
      limit,
    });

    const learnings: AgentLearning[] = [];
    if (results.ids && results.metadatas) {
      for (let i = 0; i < results.ids.length; i++) {
        const metadata = results.metadatas[i];
        if (metadata) {
          learnings.push({
            agentId: metadata.agentId as AgentId,
            pattern: (metadata.pattern as string) || "",
            description: (metadata.description as string) || "",
            successCount: (metadata.successCount as number) || 0,
            lastUsed: (metadata.lastUsed as string) || "",
            projectIds: JSON.parse((metadata.projectIds as string) || "[]"),
          });
        }
      }
    }
    return learnings;
  } catch (error) {
    console.error("Failed to get agent learnings:", error);
    return [];
  }
}

export async function storeErrorPattern(pattern: ErrorPattern): Promise<void> {
  await initializeChroma();
  if (!errorsCollection) return;

  try {
    const embedding = await generateEmbedding(pattern.description);
    const errorId = `${pattern.errorType}_${Date.now()}`;

    await errorsCollection.add({
      ids: [errorId],
      embeddings: [embedding],
      metadatas: [
        {
          errorType: pattern.errorType,
          description: pattern.description,
          solution: pattern.solution,
          occurrenceCount: pattern.occurrenceCount,
          affectedAgents: JSON.stringify(pattern.affectedAgents),
          lastOccurred: pattern.lastOccurred,
        },
      ],
      documents: [pattern.description],
    });

    console.log(` Stored error pattern: ${pattern.errorType}`);
  } catch (error) {
    console.error("Failed to store error pattern:", error);
  }
}

export async function getMemoryStats(): Promise<MemoryStats> {
  await initializeChroma();

  const stats: MemoryStats = {
    totalProjects: 0,
    totalLearnings: 0,
    totalErrorPatterns: 0,
    storageSize: 0,
    lastUpdated: new Date().toISOString(),
  };

  try {
    if (projectsCollection) stats.totalProjects = await projectsCollection.count();
    if (learningsCollection) stats.totalLearnings = await learningsCollection.count();
    if (errorsCollection) stats.totalErrorPatterns = await errorsCollection.count();
  } catch (error) {
    console.error("Failed to get memory stats:", error);
  }

  return stats;
}
