import { indexKnowledgeBase } from "../lib/rag/indexer.ts";

async function main() {
  console.log("RAG smoke-check starting...");
  console.log("ENV: CHROMA_URL=", process.env.CHROMA_URL || "(default http://localhost:8000)");
  console.log("ENV: OPENAI_API_KEY=", !!process.env.OPENAI_API_KEY);

  try {
    await indexKnowledgeBase();
    console.log("indexKnowledgeBase() finished successfully");
    process.exit(0);
  } catch (err) {
    console.error("indexKnowledgeBase() failed:", err instanceof Error ? err.message : err);
    if (err instanceof Error && (err as any).stack) console.error((err as any).stack);
    process.exit(2);
  }
}

main();
