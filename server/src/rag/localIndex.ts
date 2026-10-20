/**
 * The knowledge index as a file, written by `npm run ingest`:
 *  - local model:  server/.cache/knowledge-index.json (backup for when Chroma is down)
 *  - Gemini:       server/index/knowledge-index.gemini.json (committed; the only store on Vercel)
 * Search over it uses the same embeddings and cosine similarity as Chroma. About 2,000
 * chunks fit easily in memory.
 *
 * Vectors are stored as 8-bit integers with one scale per vector (base64), which keeps the
 * file about four times smaller than JSON numbers without changing rankings in practice.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { config } from '../config.ts';
import type { ChunkMetadata, ScoredChunk, StoredChunk } from './store.ts';

type FileChunk = { id: string; text: string; metadata: ChunkMetadata; e8?: string; s?: number; embedding?: number[] };
type IndexFile = { model: string; dimensions?: number; createdAt: string; chunks: FileChunk[] };
type Loaded = { model: string; chunks: { id: string; text: string; metadata: ChunkMetadata; vector: Float32Array }[] };

let loaded: Loaded | null | undefined;

function quantize(v: number[]): { e8: string; s: number } {
  const max = v.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
  const s = max / 127;
  const bytes = Int8Array.from(v, (x) => Math.round(x / s));
  return { e8: Buffer.from(bytes.buffer).toString('base64'), s: Number(s.toPrecision(8)) };
}

function dequantize(c: FileChunk): Float32Array {
  if (c.embedding) return Float32Array.from(c.embedding); // older files stored plain numbers
  const buf = Buffer.from(c.e8 ?? '', 'base64');
  const bytes = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
  return Float32Array.from(bytes, (b) => b * (c.s ?? 0));
}

export function writeLocalIndex(chunks: StoredChunk[], model: string, file = config.knowledgeIndexFile): void {
  mkdirSync(dirname(file), { recursive: true });
  const data: IndexFile = {
    model,
    dimensions: chunks[0]?.embedding.length,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((c) => ({ id: c.id, text: c.text, metadata: c.metadata, ...quantize(c.embedding) })),
  };
  writeFileSync(file, JSON.stringify(data));
  loaded = undefined;
}

function load(): Loaded | null {
  if (loaded === undefined) {
    if (!existsSync(config.knowledgeIndexFile)) loaded = null;
    else {
      const data = JSON.parse(readFileSync(config.knowledgeIndexFile, 'utf8')) as IndexFile;
      if (data.model !== config.embeddingsModel) {
        // Vectors from another model would give meaningless scores.
        throw new Error(`The index file was built with ${data.model} but EMBEDDINGS_MODEL is ${config.embeddingsModel}. Run npm run aura:ingest.`);
      }
      loaded = { model: data.model, chunks: data.chunks.map((c) => ({ id: c.id, text: c.text, metadata: c.metadata, vector: dequantize(c) })) };
    }
  }
  return loaded;
}

/** Cosine similarity search over the file index. Embeddings are already L2-normalised. */
export function queryLocalIndex(embedding: number[], topK: number, cardIds?: string[]): ScoredChunk[] | null {
  const index = load();
  if (!index) return null;
  const allowed = cardIds?.length ? new Set(cardIds) : null;
  const scored: ScoredChunk[] = [];
  for (const c of index.chunks) {
    if (allowed && !allowed.has(c.metadata.cardId)) continue;
    let dot = 0;
    for (let i = 0; i < embedding.length; i++) dot += embedding[i] * c.vector[i];
    scored.push({ id: c.id, text: c.text, metadata: c.metadata, score: dot });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
