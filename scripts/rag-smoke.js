const { OpenAI } = require("openai");
const net = require("net");
const fs = require("fs");
const path = require("path");

// Load .env.local from repo root (if present) into process.env without printing secrets
try {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const keys = [];
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
      keys.push(key);
    });
    if (keys.length > 0) console.log("Loaded env keys from .env.local:", keys.join(", "));
  }
} catch (err) {
  console.error("Failed to load .env.local:", err && err.message ? err.message : err);
}

async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log("OpenAI: OPENAI_API_KEY not set — skipping OpenAI test");
    return { ok: false, reason: "no_key" };
  }
  try {
    const client = new OpenAI({ apiKey: key });
    const resp = await client.embeddings.create({ model: "text-embedding-3-small", input: "hello" });
    if (resp?.data?.[0]?.embedding) {
      console.log("OpenAI: embeddings OK (length=", resp.data[0].embedding.length, ")");
      return { ok: true };
    }
    console.log("OpenAI: unexpected response", resp?.status, resp?.statusText);
    return { ok: false, reason: "unexpected_response" };
  } catch (err) {
    console.error("OpenAI check error:", err && err.message ? err.message : err);
    return { ok: false, reason: "error", error: err };
  }
}

function checkChroma() {
  const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
  try {
    const parsed = new URL(chromaUrl);
    const host = parsed.hostname;
    const port = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'));

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const onError = (err) => {
        socket.destroy();
        resolve({ ok: false, reason: 'connect_error', error: err && err.message ? err.message : err });
      };
      socket.setTimeout(2000);
      socket.once('error', onError);
      socket.once('timeout', () => onError(new Error('timeout')));
      socket.connect(port, host, () => {
        socket.end();
        resolve({ ok: true, host, port });
      });
    });
  } catch (err) {
    return Promise.resolve({ ok: false, reason: 'invalid_url', error: String(err) });
  }
}

(async function main() {
  console.log('RAG smoke-check (JS)');
  console.log('CHROMA_URL=', process.env.CHROMA_URL || 'http://localhost:8000');
  console.log('OPENAI_API_KEY set=', !!process.env.OPENAI_API_KEY);

  const chroma = await checkChroma();
  console.log('Chroma:', chroma.ok ? `reachable ${chroma.host}:${chroma.port}` : `not reachable (${chroma.reason})`);

  const openai = await checkOpenAI();
  console.log('OpenAI:', openai.ok ? 'OK' : `not OK (${openai.reason})`);

  if (chroma.ok && openai.ok) process.exit(0);
  process.exit(2);
})();
