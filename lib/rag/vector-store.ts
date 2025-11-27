import { ChromaClient, Collection } from "chromadb";
import OpenAI from "openai";

/**
 * Vector store client for RAG system using ChromaDB
 */
export class VectorStore {
  private client: ChromaClient;
  private openai: OpenAI;
  private collection: Collection | null = null;

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  /**
   * Initialize or get the collection for discovery knowledge
   */
  async getCollection(collectionName: string = "discovery_knowledge"): Promise<Collection> {
    if (this.collection) {
      return this.collection;
    }

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: collectionName,
        metadata: { description: "Knowledge base for project discovery conversations" },
      });
      return this.collection;
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  /**
   * Generate embeddings using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    const collection = await this.getCollection();

    const ids = documents.map(doc => doc.id);
    const texts = documents.map(doc => doc.text);
    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );
    const metadatas = documents.map(doc => doc.metadata || {});

    await collection.add({
      ids,
      embeddings,
      documents: texts,
      metadatas,
    });
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, nResults: number = 5): Promise<Array<{
    id: string;
    document: string;
    metadata: Record<string, any>;
    distance: number;
  }>> {
    const collection = await this.getCollection();
    const queryEmbedding = await this.generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
    });

    if (!results.ids[0] || !results.documents[0] || !results.distances[0]) {
      return [];
    }

    return results.ids[0].map((id, index) => ({
      id: id as string,
      document: results.documents[0]![index] as string,
      metadata: (results.metadatas?.[0]?.[index] as Record<string, any>) || {},
      distance: results.distances[0]![index] as number,
    }));
  }

  /**
   * Delete the collection (useful for testing/reset)
   */
  async deleteCollection(collectionName: string = "discovery_knowledge"): Promise<void> {
    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collection = null;
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  }

  /**
   * Check if collection has documents
   */
  async count(): Promise<number> {
    const collection = await this.getCollection();
    const count = await collection.count();
    return count;
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}
