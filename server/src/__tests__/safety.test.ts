/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { runTool } from '../agent/tools.ts';
import type { ToolContext } from '../agent/tools.ts';
import { parseFrontMatter } from '../rag/chunk.ts';
import { collectChunks } from '../rag/documents.ts';

function ctx(): ToolContext & { cta: unknown } {
  const c = { wallet: { cards: [], profile: { experience: 'NEW' as const } }, cta: null as unknown, setCta: (x: unknown) => (c.cta = x) };
  return c as ToolContext & { cta: unknown };
}

describe('scam and rights screens', () => {
  it('show_app_screen opens the scam check and rights screens', async () => {
    const c = ctx();
    assert.equal(JSON.parse(await runTool('show_app_screen', JSON.stringify({ screen: 'scam_check' }), c)).ok, true);
    assert.deepEqual(c.cta, { label: 'Is this a scam?', route: '/scam-check' });
    assert.equal(JSON.parse(await runTool('show_app_screen', JSON.stringify({ screen: 'your_rights' }), c)).ok, true);
    assert.deepEqual(c.cta, { label: 'Your rights', route: '/rights' });
  });
});

describe('general knowledge docs', () => {
  for (const name of ['rights-and-scams.md', 'add-on-and-family.md']) {
    it(`${name} has the same front matter as credit-card-basics.md`, () => {
      const raw = readFileSync(new URL(`../../knowledge/general/${name}`, import.meta.url), 'utf8');
      const { data } = parseFrontMatter(raw);
      for (const key of ['cardId', 'cardName', 'bank', 'last_updated', 'source']) assert.ok(data[key], `${name} is missing ${key}`);
      assert.equal(data.cardId, 'general');
    });
  }

  it('the new docs are chunked with the rest of the knowledge base', () => {
    const chunks = collectChunks();
    const text = JSON.stringify(chunks);
    assert.match(text, /cms\.rbi\.org\.in/);
    assert.match(text, /add-on card/i);
  });
});
