/**
 * Vector store: Chroma, run locally with `npm run chroma` (from the server folder).
 * Chosen because the project has no Postgres (so pgvector is not an option), Chroma's
 * JS client ships a local server command, and it supports metadata filters by cardId.
 * Vectors are computed by ./embeddings.ts and passed in, so Chroma's own embedding
 * function is not used.
 */
import { ChromaClient } from 'chromadb';
import type { Collection } from 'chromadb';

import { config } from '../config.ts';

export type ChunkMetadata = {
  cardId: string;
  cardName: string;
  bank: string;
  section: string;
  last_updated: string;
  source: string;
};

export type StoredChunk = { id: string; text: string; metadata: ChunkMetadata; embedding: number[] };
export type ScoredChunk = { id: string; text: string; metadata: ChunkMetadata; score: number };

let collection: Promise<Collection> | null = null;

function getCollection(): Promise<Collection> {
  if (!collection) {
    const client = new ChromaClient({ host: config.chromaHost, port: config.chromaPort });
    collection = client
      .getOrCreateCollection({
        name: config.chromaCollection,
        configuration: { hnsw: { space: 'cosine' } },
        embeddingFunction: null,
      })
      .catch((e) => {
        collection = null; // retry on the next call
        throw e;
      });
  }
  return collection;
}

/** Deletes and recreates the collection (used by ingest so removed docs do not linger). */
export async function resetCollection(): Promise<void> {
  const client = new ChromaClient({ host: config.chromaHost, port: config.chromaPort });
  try {
    await client.deleteCollection({ name: config.chromaCollection });
  } catch {
    // Did not exist yet.
  }
  collection = null;
  await getCollection();
}

export async function upsertChunks(chunks: StoredChunk[], batchSize = 100): Promise<void> {
  const col = await getCollection();
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await col.upsert({
      ids: batch.map((c) => c.id),
      documents: batch.map((c) => c.text),
      embeddings: batch.map((c) => c.embedding),
      metadatas: batch.map((c) => c.metadata),
    });
  }
}

/** Nearest chunks by cosine similarity (score = 1 - cosine distance). */
export async function queryChunks(embedding: number[], topK: number, cardIds?: string[]): Promise<ScoredChunk[]> {
  const col = await getCollection();
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: !cardIds?.length ? undefined : cardIds.length === 1 ? { cardId: cardIds[0] } : { cardId: { $in: cardIds } },
    include: ['documents', 'metadatas', 'distances'],
  });
  const ids = result.ids[0] ?? [];
  return ids.map((id, i) => ({
    id,
    text: result.documents[0]?.[i] ?? '',
    metadata: (result.metadatas[0]?.[i] ?? {}) as unknown as ChunkMetadata,
    score: 1 - (result.distances[0]?.[i] ?? 1),
  }));
}
