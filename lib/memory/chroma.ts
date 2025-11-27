import { ChromaClient, Collection } from "chromadb";

let client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (client) return client;
  const url = process.env.CHROMA_URL || "http://localhost:8000";
  client = new ChromaClient({ path: url });
  return client;
}

export async function getCollection(name: string): Promise<Collection> {
  const chroma = getChromaClient();
  try {
    return await chroma.getCollection({ name });
  } catch {
    return await chroma.createCollection({ name });
  }
}
