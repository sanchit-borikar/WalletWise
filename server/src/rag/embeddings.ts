/**
 * Text embeddings for card-knowledge search. Groq has no embeddings API, so this is
 * separate from the LLM. Two providers, picked with EMBEDDINGS_PROVIDER:
 *
 *  - "local" (default): all-MiniLM-L6-v2 run on this computer through Transformers.js
 *    (the JavaScript port of sentence-transformers). No API key; the model (~25 MB)
 *    downloads once into server/.cache on first use.
 *  - "gemini": Google's Gemini embeddings API (GEMINI_API_KEY, free key from Google AI
 *    Studio). Used on Vercel, where the local model and its runtime are too big.
 *
 * Re-run `npm run ingest` after changing provider or model, because stored vectors must
 * come from the same model as the queries.
 */
import { config } from '../config.ts';

/** "document" for text being indexed, "query" for a user's question. */
export type EmbedKind = 'document' | 'query';
export type EmbedFn = (texts: string[], kind?: EmbedKind) => Promise<number[][]>;

let embedder: EmbedFn | null = null;

async function localEmbedder(): Promise<EmbedFn> {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = new URL('../../.cache/models', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const extractor = await pipeline('feature-extraction', config.embeddingsModel, { dtype: 'fp32' });
  return async (texts) => {
    // Mean pooling and L2 normalisation give sentence-transformers compatible vectors.
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist() as number[][];
  };
}

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Texts per batchEmbedContents request. */
const GEMINI_BATCH = 100;
const GEMINI_RETRIES = 6;

/**
 * gemini-embedding-2 takes the task as a text prefix (it has no task_type field);
 * gemini-embedding-001 takes a taskType field instead.
 */
function geminiRequest(text: string, kind: EmbedKind) {
  const model = `models/${config.embeddingsModel}`;
  const base = { model, outputDimensionality: config.embeddingsDimensions };
  if (config.embeddingsModel === 'gemini-embedding-001') {
    return { ...base, content: { parts: [{ text }] }, taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' };
  }
  const prefixed = kind === 'query' ? `task: search result | query: ${text}` : `title: none | text: ${text}`;
  return { ...base, content: { parts: [{ text: prefixed }] } };
}

const normalize = (v: number[]) => {
  const len = Math.hypot(...v) || 1;
  return v.map((x) => x / len);
};

function geminiEmbedder(): EmbedFn {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY is not set on the server');
  const url = `${GEMINI_API}/${config.embeddingsModel}:batchEmbedContents`;

  async function batch(texts: string[], kind: EmbedKind): Promise<number[][]> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
        body: JSON.stringify({ requests: texts.map((t) => geminiRequest(t, kind)) }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = (await res.json()) as { embeddings?: { values: number[] }[] };
        if (data.embeddings?.length !== texts.length) throw new Error('Gemini returned the wrong number of embeddings');
        // Shortened vectors are not always unit length; search relies on that.
        return data.embeddings.map((e) => normalize(e.values));
      }
      const body = await res.text();
      // The free tier's daily cap: waiting minutes will not help.
      if (res.status === 429 && /PerDay/.test(body)) {
        throw new Error(`Gemini's free daily embedding quota for ${config.embeddingsModel} is used up; it resets after midnight Pacific time.`);
      }
      // Per-minute rate limits (429) and server errors: wait and retry.
      if ((res.status === 429 || res.status >= 500) && attempt < GEMINI_RETRIES) {
        const hinted = Number(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body)?.[1]);
        const waitMs = Number.isFinite(hinted) && hinted > 0 ? hinted * 1000 : 2000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 65000)));
        continue;
      }
      throw new Error(`Gemini embeddings failed (${res.status}): ${body.slice(0, 300)}`);
    }
  }

  return async (texts, kind = 'document') => {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += GEMINI_BATCH) out.push(...(await batch(texts.slice(i, i + GEMINI_BATCH), kind)));
    return out;
  };
}

export async function embed(texts: string[], kind: EmbedKind = 'document'): Promise<number[][]> {
  if (!embedder) {
    switch (config.embeddingsProvider) {
      case 'local':
        embedder = await localEmbedder();
        break;
      case 'gemini':
        embedder = geminiEmbedder();
        break;
      default:
        throw new Error(`Unknown EMBEDDINGS_PROVIDER "${config.embeddingsProvider}"`);
    }
  }
  return embedder(texts, kind);
}

/** Lets tests replace the embedder with a fake. */
export function setEmbedderForTests(fn: EmbedFn | null) {
  embedder = fn;
}
