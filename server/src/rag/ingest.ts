/**
 * Builds the card knowledge index.
 *
 *   cd server
 *   npm run chroma     # in one terminal: local Chroma on port 8000
 *   npm run ingest     # in another: embeds and stores all documents
 *
 * Re-run after `npm run build:data` in the app, or after editing any file in server/knowledge.
 *
 * For Vercel (Gemini embeddings, no Chroma), from the project folder:
 *   EMBEDDINGS_PROVIDER=gemini VECTOR_STORE=file npm run aura:ingest
 * then commit server/index/knowledge-index.gemini.json.
 */
import { relative } from 'node:path';

import { catalog } from '../../../src/data/catalog';
import { collectChunks } from './documents.ts';
import { config } from '../config.ts';
import { embed } from './embeddings.ts';
import { writeLocalIndex } from './localIndex.ts';
import { resetCollection, upsertChunks } from './store.ts';

const EMBED_BATCH = 32;

async function main() {
  const started = Date.now();
  const chunks = collectChunks();
  console.log(`Prepared ${chunks.length} chunks from ${catalog.cards.length} cards plus seed and general docs.`);

  console.log(
    config.embeddingsProvider === 'local' ? 'Loading the embedding model (first run downloads it)…' : `Embedding with ${config.embeddingsProvider} (${config.embeddingsModel})…`,
  );
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    vectors.push(...(await embed(chunks.slice(i, i + EMBED_BATCH).map((c) => c.text), 'document')));
    process.stdout.write(`\rEmbedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
  }
  process.stdout.write('\n');

  const records = chunks.map((c, i) => ({
    id: c.id,
    text: c.text,
    embedding: vectors[i],
    metadata: { cardId: c.meta.cardId, cardName: c.meta.cardName, bank: c.meta.bank, section: c.section, last_updated: c.meta.last_updated, source: c.meta.source },
  }));

  // The index file always gets written, so search works even without Chroma.
  writeLocalIndex(records, config.embeddingsModel);
  console.log(`Wrote the index file ${relative(process.cwd(), config.knowledgeIndexFile)}.`);
  if (config.vectorStore === 'file') return;

  try {
    await resetCollection();
    await upsertChunks(records);
    console.log(`Stored ${chunks.length} chunks in Chroma in ${Math.round((Date.now() - started) / 1000)} s.`);
  } catch (error) {
    console.warn(`Chroma is not reachable (${error instanceof Error ? error.message.split('.')[0] : error}). Aura will use the backup index file. Start Chroma with: npm run aura:chroma, then run ingest again.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (/ECONNREFUSED|fetch failed|connect/i.test(String(error))) console.error('Is Chroma running? Start it with: npm run chroma');
  process.exit(1);
});
