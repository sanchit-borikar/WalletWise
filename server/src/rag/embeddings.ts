/**
 * Text embeddings for card-knowledge search. Groq has no embeddings API, so this is
 * separate from the LLM. The default runs all-MiniLM-L6-v2 locally through
 * Transformers.js (the JavaScript port of sentence-transformers): no API key, and the
 * model (~25 MB) downloads once into server/.cache on first use.
 *
 * To swap: add a branch below (for example a hosted embeddings API) and set
 * EMBEDDINGS_PROVIDER. Re-run `npm run ingest` after changing models, because stored
 * vectors must come from the same model as the queries.
 */
import { config } from '../config.ts';

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

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

export async function embed(texts: string[]): Promise<number[][]> {
  if (!embedder) {
    switch (config.embeddingsProvider) {
      case 'local':
        embedder = await localEmbedder();
        break;
      default:
        throw new Error(`Unknown EMBEDDINGS_PROVIDER "${config.embeddingsProvider}"`);
    }
  }
  return embedder(texts);
}

/** Lets tests replace the embedder with a fake. */
export function setEmbedderForTests(fn: EmbedFn | null) {
  embedder = fn;
}
