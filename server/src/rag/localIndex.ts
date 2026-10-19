/**
 * Backup copy of the knowledge index in a file (server/.cache/knowledge-index.json),
 * written by `npm run ingest` next to Chroma. When Chroma is not running, search uses
 * this file instead, with the same embeddings and cosine similarity, so Aura keeps
 * answering card questions. About 2,000 chunks fit easily in memory.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { ChunkMetadata, ScoredChunk, StoredChunk } from './store.ts';

const INDEX_FILE = fileURLToPath(new URL('../../.cache/knowledge-index.json', import.meta.url));

type IndexFile = { model: string; createdAt: string; chunks: { id: string; text: string; metadata: ChunkMetadata; embedding: number[] }[] };

let loaded: IndexFile | null | undefined;

export function writeLocalIndex(chunks: StoredChunk[], model: string): void {
  mkdirSync(fileURLToPath(new URL('../../.cache/', import.meta.url)), { recursive: true });
  const data: IndexFile = {
    model,
    createdAt: new Date().toISOString(),
    // Five decimals keep the file small without changing rankings.
    chunks: chunks.map((c) => ({ ...c, embedding: c.embedding.map((x) => Math.round(x * 1e5) / 1e5) })),
  };
  writeFileSync(INDEX_FILE, JSON.stringify(data));
  loaded = data;
}

function load(): IndexFile | null {
  if (loaded === undefined) loaded = existsSync(INDEX_FILE) ? (JSON.parse(readFileSync(INDEX_FILE, 'utf8')) as IndexFile) : null;
  return loaded;
}

export function hasLocalIndex(): boolean {
  return load() !== null;
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
    for (let i = 0; i < embedding.length; i++) dot += embedding[i] * c.embedding[i];
    scored.push({ id: c.id, text: c.text, metadata: c.metadata, score: dot });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
