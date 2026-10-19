/**
 * Builds the card knowledge index.
 *
 *   cd server
 *   npm run chroma     # in one terminal: local Chroma on port 8000
 *   npm run ingest     # in another: embeds and stores all documents
 *
 * Re-run after `npm run build:data` in the app, or after editing any file in server/knowledge.
 */
import { catalog } from '../../../src/data/catalog';
import { collectChunks } from './documents.ts';
import { embed } from './embeddings.ts';
import { resetCollection, upsertChunks } from './store.ts';

const EMBED_BATCH = 32;

async function main() {
  const started = Date.now();
  const chunks = collectChunks();
  console.log(`Prepared ${chunks.length} chunks from ${catalog.cards.length} cards plus seed and general docs.`);

  console.log('Loading the embedding model (first run downloads it)…');
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    vectors.push(...(await embed(chunks.slice(i, i + EMBED_BATCH).map((c) => c.text))));
    process.stdout.write(`\rEmbedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
  }
  process.stdout.write('\n');

  await resetCollection();
  await upsertChunks(
    chunks.map((c, i) => ({
      id: c.id,
      text: c.text,
      embedding: vectors[i],
      metadata: { cardId: c.meta.cardId, cardName: c.meta.cardName, bank: c.meta.bank, section: c.section, last_updated: c.meta.last_updated, source: c.meta.source },
    })),
  );
  console.log(`Stored ${chunks.length} chunks in Chroma in ${Math.round((Date.now() - started) / 1000)} s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (/ECONNREFUSED|fetch failed|connect/i.test(String(error))) console.error('Is Chroma running? Start it with: npm run chroma');
  process.exit(1);
});
