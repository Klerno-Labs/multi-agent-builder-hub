const { OpenAI } = require('openai');
const { ChromaClient } = require('chromadb');

async function main() {
  // load .env.local if present
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      });
    }
  } catch (e) {
    // ignore
  }

  const query = process.argv[2] || 'e-commerce best practices';
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('OPENAI_API_KEY not set');
    process.exit(2);
  }
  const openai = new OpenAI({ apiKey: openaiKey });
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  const client = new ChromaClient({ path: chromaUrl });
  const collection = await client.getOrCreateCollection({ name: 'discovery_knowledge' });

  // embed query
  const qemb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
  const resp = await collection.query({ queryEmbeddings: [qemb.data[0].embedding], nResults: 5 });
  const docs = (resp.documents?.[0] || []).map((d, i) => ({ id: resp.ids[0]?.[i], text: d, metadata: resp.metadatas?.[0]?.[i] }));
  console.log('Retrieved', docs.length, 'documents');
  docs.forEach((d, i) => console.log(i + 1, d.metadata?.title || d.id));

  // Build a simple prompt injecting retrieved docs
  const context = docs.map((d, i) => `Doc ${i + 1} (${d.metadata?.title || d.id}):\n${d.text}`).join('\n\n');
  const prompt = `You are a helpful assistant. Use the following retrieved documents to answer the user query.\n\nRetrieved:\n${context}\n\nUser question: ${query}\n\nAnswer briefly:`;

  const completion = await openai.chat.completions.create({
    model: process.env.LLM_MODEL_GENERAL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
  });
  console.log('\nAssistant reply:\n', completion.choices?.[0]?.message?.content || completion.choices?.[0]);
}

main().catch(err => { console.error(err && err.message ? err.message : err); process.exit(2); });
