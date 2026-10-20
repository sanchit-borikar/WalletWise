/**
 * Collects every knowledge document and splits it into chunks (used by ingest and tests).
 *  - knowledge/cards/<cardId>.md   hand-written seed docs (replace the generated doc for that card)
 *  - knowledge/general/*.md        general credit-card basics
 *  - one generated doc per catalog card (fees, rates, lounge, redemption, changes)
 */
import { readdirSync, readFileSync } from 'node:fs';

import { catalog } from '../../../src/data/catalog';
import { cardDocument } from './catalogDocs.ts';
import { chunkMarkdown, parseFrontMatter } from './chunk.ts';
import type { Chunk, DocMeta } from './chunk.ts';

const KNOWLEDGE = new URL('../../knowledge/', import.meta.url);

function readMarkdownDocs(folder: string): { meta: DocMeta; body: string }[] {
  const dir = new URL(`${folder}/`, KNOWLEDGE);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, body } = parseFrontMatter(readFileSync(new URL(f, dir), 'utf8'));
      for (const key of ['cardId', 'cardName', 'bank', 'last_updated', 'source']) {
        if (!data[key]) throw new Error(`${folder}/${f} is missing front matter "${key}"`);
      }
      return { meta: data as unknown as DocMeta, body };
    });
}

export function collectChunks(): Chunk[] {
  const seeds = readMarkdownDocs('cards');
  const general = readMarkdownDocs('general');
  const seeded = new Set(seeds.map((s) => s.meta.cardId));

  const chunks: Chunk[] = [];
  for (const doc of [...seeds, ...general]) chunks.push(...chunkMarkdown(doc.body, doc.meta));
  for (const card of catalog.cards) {
    if (seeded.has(card.id)) continue;
    const { meta, markdown } = cardDocument(card);
    chunks.push(...chunkMarkdown(markdown, meta));
  }
  return chunks;
}
