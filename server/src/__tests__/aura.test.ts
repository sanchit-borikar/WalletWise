/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, describe, it } from 'node:test';

import { runAgent } from '../agent/agent.ts';
import type { AgentEvent } from '../agent/agent.ts';
import { resolveCard, runTool, TOOL_DEFINITIONS } from '../agent/tools.ts';
import type { ToolContext } from '../agent/tools.ts';
import { LLMBusyError } from '../llm/index.ts';
import type { ChatMessage, LLMClient, LLMStreamEvent, ToolDefinition } from '../llm/index.ts';
import { detectCardMention } from '../rag/cardMention.ts';
import { chunkMarkdown, estimateTokens, parseFrontMatter } from '../rag/chunk.ts';
import { collectChunks } from '../rag/documents.ts';
import { setEmbedderForTests } from '../rag/embeddings.ts';
import { searchCardKnowledge, setQueryForTests } from '../rag/search.ts';
import { handleAuraChat, parseChatRequest } from '../routes/auraChat.ts';

const WALLET = {
  cards: [
    { catalogId: 'hdfc-swiggy', points: 0 },
    { catalogId: 'sbi-bpcl-octane', points: 4000 },
    { catalogId: 'hdfc-infinia', points: 20000 },
  ],
  profile: { experience: 'NEW' as const },
};

function ctx(wallet = WALLET): ToolContext & { cta: unknown } {
  const c = { wallet, cta: null as unknown, setCta: (x: unknown) => (c.cta = x) };
  return c as ToolContext & { cta: unknown };
}

/** A fake model that plays back a script of turns. */
class ScriptedLLM implements LLMClient {
  calls: { messages: ChatMessage[]; tools: ToolDefinition[]; toolChoice?: string }[] = [];
  private readonly turns: (LLMStreamEvent[] | Error)[];
  constructor(turns: (LLMStreamEvent[] | Error)[]) {
    this.turns = turns;
  }
  async *chat(messages: ChatMessage[], tools: ToolDefinition[], options: { toolChoice?: 'auto' | 'none' } = {}) {
    this.calls.push({ messages: [...messages], tools, toolChoice: options.toolChoice });
    const turn = this.turns[this.calls.length - 1] ?? [{ type: 'text', delta: 'ok' }, { type: 'done' }];
    if (turn instanceof Error) throw turn;
    for (const e of turn) yield e;
  }
}

async function collect(gen: AsyncGenerator<AgentEvent>) {
  const out: AgentEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe('tools', () => {
  it('exposes the six tools plus show_app_screen with JSON schemas', () => {
    assert.deepEqual(
      TOOL_DEFINITIONS.map((t) => t.name).sort(),
      ['get_best_card', 'get_card_updates', 'get_points_value', 'get_user_wallet', 'plan_trip', 'search_card_knowledge', 'show_app_screen'],
    );
    for (const t of TOOL_DEFINITIONS) assert.equal((t.parameters as { type: string }).type, 'object');
  });

  it('get_best_card uses the engine: Swiggy card wins at Swiggy', async () => {
    const out = JSON.parse(await runTool('get_best_card', JSON.stringify({ category: 'DINING', amount: 1500, merchant: 'Swiggy', online: true }), ctx()));
    assert.equal(out.ok, true);
    assert.equal(out.ranking[0].cardId, 'hdfc-swiggy');
    assert.equal(out.ranking[0].rupees_back, 150);
  });

  it('returns structured errors instead of throwing', async () => {
    const empty = JSON.parse(await runTool('get_user_wallet', '{}', ctx({ cards: [], profile: { experience: 'NEW' } })));
    assert.deepEqual([empty.ok, empty.error], [false, 'empty_wallet']);
    const bad = JSON.parse(await runTool('get_best_card', '{not json', ctx()));
    assert.equal(bad.error, 'invalid_arguments');
    const unknown = JSON.parse(await runTool('nope', '{}', ctx()));
    assert.equal(unknown.error, 'unknown_tool');
  });

  it('get_points_value and get_card_updates work for a named card', async () => {
    const value = JSON.parse(await runTool('get_points_value', JSON.stringify({ cardId: 'Infinia' }), ctx()));
    assert.equal(value.cards[0].cardId, 'hdfc-infinia');
    assert.equal(value.cards[0].points, 20000);
    const updates = JSON.parse(await runTool('get_card_updates', JSON.stringify({ cardId: 'hdfc-infinia' }), ctx()));
    assert.equal(updates.cards[0].cardId, 'hdfc-infinia');
  });

  it('plan_trip sets the Trip Planner button', async () => {
    const c = ctx();
    const out = JSON.parse(await runTool('plan_trip', JSON.stringify({ destination: 'Goa', spend: 6500 }), c));
    assert.equal(out.ok, true);
    assert.deepEqual(c.cta, { label: 'Open Trip Planner', route: '/trip-planner', params: { fare: '6500' } });
  });

  it('show_app_screen only allows known screens', async () => {
    const c = ctx();
    assert.equal(JSON.parse(await runTool('show_app_screen', JSON.stringify({ screen: 'best_card_map' }), c)).ok, true);
    assert.deepEqual(c.cta, { label: 'Open Best Card map', route: '/map' });
    assert.equal(JSON.parse(await runTool('show_app_screen', JSON.stringify({ screen: 'hack' }), c)).ok, false);
  });

  it('resolves card names, including "Diners Black International"', () => {
    assert.equal(resolveCard('Diners Black International')?.id, 'hdfc-diners-black');
    assert.equal(resolveCard('hdfc-infinia')?.id, 'hdfc-infinia');
  });
});

describe('agent loop', () => {
  it('calls a tool, then streams the answer and the CTA', async () => {
    const llm = new ScriptedLLM([
      [{ type: 'tool_calls', calls: [{ id: 't1', name: 'get_best_card', arguments: JSON.stringify({ category: 'DINING', amount: 1500, merchant: 'Swiggy', online: true }) }] }, { type: 'done' }],
      [{ type: 'tool_calls', calls: [{ id: 't2', name: 'show_app_screen', arguments: '{"screen":"best_card_map"}' }] }, { type: 'done' }],
      [{ type: 'text', delta: 'Use HDFC Swiggy: ' }, { type: 'text', delta: '₹150 back.' }, { type: 'done' }],
    ]);
    const events = await collect(runAgent(llm, [{ role: 'user', content: '₹1,500 at Swiggy' }], WALLET));
    const done = events.find((e) => e.type === 'done');
    assert.deepEqual(done, { type: 'done', text: 'Use HDFC Swiggy: ₹150 back.', cta: { label: 'Open Best Card map', route: '/map' } });
    assert.ok(events.some((e) => e.type === 'status'));
    // The tool result was sent back to the model as a tool message.
    const toolMsg = llm.calls[1].messages.find((m) => m.role === 'tool');
    assert.ok(toolMsg && JSON.parse(toolMsg.content).ok);
  });

  it('caps the loop at 4 model calls and forces a text answer on the last', async () => {
    const loop: LLMStreamEvent[] = [{ type: 'tool_calls', calls: [{ id: 'x', name: 'get_user_wallet', arguments: '{}' }] }, { type: 'done' }];
    const llm = new ScriptedLLM([loop, loop, loop, [{ type: 'text', delta: 'Here is what I found.' }, { type: 'done' }]]);
    const events = await collect(runAgent(llm, [{ role: 'user', content: 'my cards' }], WALLET));
    assert.equal(llm.calls.length, 4);
    assert.equal(llm.calls[3].toolChoice, 'none');
    assert.equal(events.at(-1)?.type, 'done');
  });

  it('turns a busy model into a friendly error', async () => {
    const llm = new ScriptedLLM([new LLMBusyError()]);
    const events = await collect(runAgent(llm, [{ role: 'user', content: 'hi' }], WALLET));
    assert.deepEqual(events, [{ type: 'error', code: 'busy', message: 'Aura is busy, please try again in a moment.' }]);
  });

  it('puts the system prompt first and keeps only the conversation after it', async () => {
    const llm = new ScriptedLLM([[{ type: 'text', delta: 'Hi' }, { type: 'done' }]]);
    await collect(runAgent(llm, [{ role: 'user', content: 'hello' }], WALLET, { today: '2026-10-19' }));
    assert.equal(llm.calls[0].messages[0].role, 'system');
    assert.match(llm.calls[0].messages[0].content, /2026-10-19/);
    assert.match(llm.calls[0].messages[0].content, /I don't have verified info on this card yet/);
  });
});

describe('chat request validation', () => {
  it('keeps the last 6 turns and drops bad messages', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
    messages.push({ role: 'user', content: 'last' });
    const parsed = parseChatRequest({ userId: 'u1', messages: [...messages, { role: 'system', content: 'x' }], wallet: { cards: [{ catalogId: 'hdfc-infinia', points: '500' }] } });
    assert.ok(typeof parsed !== 'string');
    assert.equal(parsed.conversation.length, 12);
    assert.equal(parsed.conversation.at(-1)?.content, 'last');
    assert.deepEqual(parsed.wallet.cards, [{ catalogId: 'hdfc-infinia', points: 500 }]);
  });

  it('rejects requests without a user message or userId', () => {
    assert.equal(typeof parseChatRequest({ userId: 'u', messages: [{ role: 'assistant', content: 'hi' }] }), 'string');
    assert.equal(typeof parseChatRequest({ messages: [{ role: 'user', content: 'hi' }] }), 'string');
  });
});

describe('POST /aura/chat', () => {
  const llm = new ScriptedLLM([[{ type: 'text', delta: 'Hello ' }, { type: 'text', delta: 'there.' }, { type: 'done' }]]);
  const server = createServer((req, res) => handleAuraChat(req, res, { llm }));
  after(() => server.close());

  it('streams newline-delimited JSON events', async () => {
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/aura/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u1', messages: [{ role: 'user', content: 'hi' }], wallet: WALLET }),
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /ndjson/);
    const events = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(events.filter((e) => e.type === 'text').map((e) => e.delta), ['Hello ', 'there.']);
    assert.deepEqual(events.at(-1), { type: 'done', text: 'Hello there.', cta: null });
  });

  it('rejects bad requests with 400', async () => {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/aura/chat`, { method: 'POST', body: '{"messages":[]}' });
    assert.equal(res.status, 400);
  });
});

describe('card mention detection', () => {
  it('finds known cards by name', () => {
    assert.deepEqual(detectCardMention('Tell me about Diners Black International'), { kind: 'known', cardIds: ['hdfc-diners-black'] });
    assert.deepEqual(detectCardMention('What is the annual fee of HDFC Infinia?'), { kind: 'known', cardIds: ['hdfc-infinia'] });
    assert.deepEqual(detectCardMention('Amazon Pay ICICI card rewards'), { kind: 'known', cardIds: ['icici-amazon-pay'] });
  });
  it('flags a card name that is not in the catalog', () => {
    assert.equal(detectCardMention('Tell me about the Zorbit Platinum Ultra card').kind, 'unknown');
  });
  it('treats general questions as no card', () => {
    assert.equal(detectCardMention('What is the minimum amount due?').kind, 'none');
    assert.equal(detectCardMention('which card is good?').kind, 'none');
  });
});

describe('RAG', () => {
  it('parses front matter and chunks by section with card context', () => {
    const { data, body } = parseFrontMatter('---\ncardId: x\ncardName: X Card\n---\n# X Card\nIntro\n\n## Fees\n- ₹500\n\n## Rewards\n- 5%\n');
    assert.equal(data.cardId, 'x');
    const chunks = chunkMarkdown(body, { cardId: 'x', cardName: 'X Card', bank: 'B', last_updated: '2026-10-19', source: 's' });
    assert.deepEqual(chunks.map((c) => c.section), ['Overview', 'Fees', 'Rewards']);
    assert.match(chunks[1].text, /^X Card \(B\) — Fees/);
  });

  it('splits long sections into pieces under ~500 tokens', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} ${'word '.repeat(30)}`).join('\n\n');
    const chunks = chunkMarkdown(`## Rewards\n${long}`, { cardId: 'x', cardName: 'X', bank: 'B', last_updated: 'd', source: 's' });
    assert.ok(chunks.length > 1);
    for (const c of chunks) assert.ok(estimateTokens(c.text) < 520);
  });

  it('builds documents for every catalog card plus the seed and general docs', () => {
    const chunks = collectChunks();
    const cards = new Set(chunks.map((c) => c.meta.cardId));
    assert.ok(cards.size >= 280);
    assert.ok(cards.has('general'));
    const diners = chunks.filter((c) => c.meta.cardId === 'hdfc-diners-black');
    assert.ok(diners.some((c) => /Diners Black International/.test(c.text)));
    assert.ok(diners.every((c) => c.meta.last_updated === '2026-10-11'));
  });

  it('returns no_confident_match below the score threshold', async () => {
    setEmbedderForTests(async (texts) => texts.map(() => [1, 0]));
    const meta = { cardId: 'hdfc-infinia', cardName: 'Infinia', bank: 'HDFC Bank', section: 'Fees', last_updated: '2026-10-15', source: 's' };
    setQueryForTests(async () => [{ id: 'a', text: 'Infinia fees', metadata: meta, score: 0.82 }]);
    const hit = await searchCardKnowledge('infinia annual fee');
    assert.equal(hit.ok && hit.status, 'match');
    setQueryForTests(async () => [{ id: 'a', text: 'unrelated', metadata: meta, score: 0.1 }]);
    const miss = await searchCardKnowledge('some unknown card');
    assert.equal(miss.ok && miss.status, 'no_confident_match');
    setQueryForTests(async () => {
      throw new Error('ECONNREFUSED');
    });
    const down = await searchCardKnowledge('anything');
    assert.equal(!down.ok && down.error, 'knowledge_unavailable');
    setQueryForTests(null);
    setEmbedderForTests(null);
  });
});
