/**
 * The Vercel set-up: Gemini embeddings, the file-only vector store and the shared router.
 * Settings are read when config.ts loads, so they are set before the dynamic imports.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

const dir = mkdtempSync(join(tmpdir(), 'aura-deploy-'));
const indexFile = join(dir, 'index.json');
process.env.EMBEDDINGS_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'test-key';
process.env.VECTOR_STORE = 'file';
process.env.KNOWLEDGE_INDEX_FILE = indexFile;

const { config } = await import('../config.ts');
const { embed } = await import('../rag/embeddings.ts');
const { writeLocalIndex } = await import('../rag/localIndex.ts');
const { packChunks } = await import('../rag/chunk.ts');
const { queryChunks } = await import('../rag/store.ts');
const { handleRequest } = await import('../http.ts');

after(() => rmSync(dir, { recursive: true, force: true }));

const meta = (cardId: string) => ({ cardId, cardName: cardId, bank: 'Bank', section: 'Fees', last_updated: '2026-01-01', source: 'test' });

describe('Gemini embeddings', () => {
  it('sends the task type, retries a rate limit and returns unit vectors', async () => {
    const bodies: { requests: { model: string; outputDimensionality: number; taskType?: string; content: { parts: { text: string }[] } }[] }[] = [];
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      calls++;
      assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'test-key');
      if (calls === 1) return new Response('{"error":{"details":[{"retryDelay":"0s"}]}}', { status: 429 });
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      return Response.json({ embeddings: body.requests.map(() => ({ values: [3, 4] })) });
    }) as typeof fetch;
    try {
      const [q] = await embed(['annual fee?'], 'query');
      const docs = await embed(['doc one', 'doc two']);
      assert.deepEqual(q, [0.6, 0.8]);
      assert.equal(docs.length, 2);
      assert.equal(calls, 3);
      assert.equal(bodies[0].requests[0].model, `models/${config.embeddingsModel}`);
      assert.equal(bodies[0].requests[0].outputDimensionality, 768);
      assert.equal(bodies[0].requests[0].taskType, 'RETRIEVAL_QUERY');
      assert.equal(bodies[0].requests[0].content.parts[0].text, 'annual fee?');
      assert.equal(bodies[1].requests[1].taskType, 'RETRIEVAL_DOCUMENT');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('stops at once when the free daily quota is used up', async () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response('{"error":{"details":[{"quotaId":"EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier"}]}}', { status: 429 });
    }) as typeof fetch;
    try {
      await assert.rejects(() => embed(['x'], 'query'), /daily embedding quota/);
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('packing chunks for Gemini', () => {
  it('joins neighbouring chunks of one document up to the size limit', () => {
    const chunk = (id: string, cardId: string, section: string, text: string) => ({ id, text, section, meta: { ...meta(cardId), source: 's' } });
    const packed = packChunks(
      [chunk('a1', 'a', 'Fees', 'x'.repeat(40)), chunk('a2', 'a', 'Rewards', 'y'.repeat(40)), chunk('a3', 'a', 'Lounge', 'z'.repeat(40)), chunk('b1', 'b', 'Fees', 'w')],
      90,
    );
    assert.deepEqual(packed.map((c) => c.id), ['a1', 'a3', 'b1']);
    assert.equal(packed[0].section, 'Fees, Rewards');
    assert.equal(packed[0].text, `${'x'.repeat(40)}

${'y'.repeat(40)}`);
  });
});

describe('file vector store', () => {
  it('stores 8-bit vectors and ranks by cosine similarity with card filters', async () => {
    const unit = (v: number[]) => v.map((x) => x / Math.hypot(...v));
    writeLocalIndex(
      [
        { id: 'a', text: 'A', metadata: meta('card-a'), embedding: unit([1, 0, 0]) },
        { id: 'b', text: 'B', metadata: meta('card-b'), embedding: unit([0.8, 0.6, 0]) },
        { id: 'c', text: 'C', metadata: meta('card-c'), embedding: unit([0, 0, 1]) },
      ],
      config.embeddingsModel,
    );
    const file = JSON.parse(readFileSync(indexFile, 'utf8'));
    assert.equal(typeof file.chunks[0].e8, 'string');

    const hits = await queryChunks([1, 0, 0], 2);
    assert.deepEqual(hits.map((h) => h.id), ['a', 'b']);
    assert.ok(Math.abs(hits[0].score - 1) < 0.01 && Math.abs(hits[1].score - 0.8) < 0.01);
    assert.deepEqual((await queryChunks([1, 0, 0], 5, ['card-c'])).map((h) => h.id), ['c']);
  });

  it('refuses an index built with another model', async () => {
    writeLocalIndex([{ id: 'a', text: 'A', metadata: meta('card-a'), embedding: [1, 0] }], 'some-other-model');
    await assert.rejects(() => queryChunks([1, 0], 1), /built with some-other-model/);
  });
});

describe('router', () => {
  it('answers /health with the deployment settings and 404s unknown paths', async () => {
    const server = createServer(handleRequest).listen(0);
    await new Promise((r) => server.once('listening', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const health = await (await fetch(`${base}/health`)).json();
      assert.equal(health.ok, true);
      assert.equal(health.embeddings, 'gemini');
      assert.equal(health.embeddingsKeySet, true);
      assert.equal(health.vectorStore, 'file');
      assert.equal((await fetch(`${base}/nope`)).status, 404);
    } finally {
      server.close();
    }
  });
});
