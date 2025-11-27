import { getVectorStore } from "./vector-store";
import { knowledgeBase, KnowledgeDocument } from "./knowledge-base";
import { v4 as uuidv4 } from "uuid";

/**
 * Index the knowledge base into the vector store
 */
export async function indexKnowledgeBase(): Promise<void> {
  console.log("Starting knowledge base indexing...");
  const vectorStore = getVectorStore();

  // Check if already indexed
  const count = await vectorStore.count();
  if (count > 0) {
    console.log(`Knowledge base already indexed with ${count} documents`);
    return;
  }

  // Prepare documents for indexing
  const documents = knowledgeBase.map((doc) => ({
    id: doc.id,
    text: `${doc.title}\n\n${doc.content}`,
    metadata: {
      title: doc.title,
      category: doc.category,
      tags: doc.tags.join(","),
    },
  }));

  // Add documents in batches
  const batchSize = 10;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
    console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
  }

  const finalCount = await vectorStore.count();
  console.log(`Knowledge base indexing complete! ${finalCount} documents indexed.`);
}

/**
 * Add a custom document to the knowledge base
 */
export async function addCustomDocument(
  title: string,
  content: string,
  category: string,
  tags: string[]
): Promise<void> {
  const vectorStore = getVectorStore();

  await vectorStore.addDocuments([{
    id: uuidv4(),
    text: `${title}\n\n${content}`,
    metadata: {
      title,
      category,
      tags: tags.join(","),
    },
  }]);

  console.log(`Added custom document: ${title}`);
}

/**
 * Reset the knowledge base (delete and re-index)
 */
export async function resetKnowledgeBase(): Promise<void> {
  console.log("Resetting knowledge base...");
  const vectorStore = getVectorStore();

  await vectorStore.deleteCollection();
  await indexKnowledgeBase();

  console.log("Knowledge base reset complete!");
}
