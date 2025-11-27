const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { ChromaClient } = require('chromadb');

function parseKnowledgeBase(tsText) {
  const re = /{[^}]*?id:\s*"([^"]+)"[^}]*?title:\s*"([^"]+)"[^}]*?content:\s*`([\s\S]*?)`[^}]*?category:\s*"([^"]+)"[^}]*?tags:\s*\[([^\]]*)\][^}]*}/g;
  const docs = [];
  let m;
  while ((m = re.exec(tsText)) !== null) {
    const [, id, title, content, category, tagsRaw] = m;
    const tags = Array.from((tagsRaw.match(/"([^"]+)"/g) || []).map(s => s.replace(/"/g, '')));
    docs.push({ id, title, content: content.trim(), category, tags });
  }
  return docs;
}

async function main() {
  console.log('Indexing knowledge base into Chroma...');
  // Load .env.local if present
  try {
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
      console.log('Loaded env from .env.local');
    }
  } catch (err) {
    console.warn('Failed to load .env.local', err && err.message ? err.message : err);
  }

  const kbPath = path.join(__dirname, '..', 'lib', 'rag', 'knowledge-base.ts');
  if (!fs.existsSync(kbPath)) {
    console.error('knowledge-base.ts not found at', kbPath);
    process.exit(2);
  }
  const text = fs.readFileSync(kbPath, 'utf8');
  const docs = parseKnowledgeBase(text);
  console.log(`Parsed ${docs.length} documents from knowledge-base.ts`);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('OPENAI_API_KEY not set');
    process.exit(2);
  }
  const openai = new OpenAI({ apiKey: openaiKey });

  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  const client = new ChromaClient({ path: chromaUrl });
  const collectionName = 'discovery_knowledge';
  const collection = await client.getOrCreateCollection({ name: collectionName, metadata: { description: 'KB' } });

  const batchSize = 10;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const texts = batch.map(d => `${d.title}\n\n${d.content}`);
    const ids = batch.map(d => d.id);

    // generate embeddings in parallel
    const embeddings = [];
    for (const t of texts) {
      const resp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: t });
      embeddings.push(resp.data[0].embedding);
    }

    const metadatas = batch.map(d => ({ title: d.title, category: d.category, tags: Array.isArray(d.tags) ? d.tags.join(',') : String(d.tags) }));
    await collection.add({ ids, embeddings, documents: texts, metadatas });
    console.log(`Indexed batch ${Math.floor(i / batchSize) + 1} (${ids.length} docs)`);
  }

  const count = await collection.count();
  console.log('Indexing complete. Document count in collection:', count);
}

main().catch(err => { console.error(err && err.message ? err.message : err); process.exit(2); });
