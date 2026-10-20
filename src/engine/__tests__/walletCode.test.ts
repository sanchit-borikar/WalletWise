/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { encodeWalletCode, MAX_SHARED_CARDS, parseWalletCode } from '../walletCode';

const known = new Set(['hdfc-infinia', 'sbi-cashback', 'axis-ace']);
const cards = [
  { catalogId: 'hdfc-infinia', lastFour: '4920', points: 24000 },
  { catalogId: 'sbi-cashback', lastFour: '', points: 350.4 },
];

describe('encodeWalletCode', () => {
  it('leaves out last 4 digits by default', () => {
    assert.equal(encodeWalletCode(cards, false), 'WALLETWISE1|hdfc-infinia,,24000|sbi-cashback,,350');
  });

  it('includes last 4 digits only when asked', () => {
    assert.equal(encodeWalletCode(cards, true), 'WALLETWISE1|hdfc-infinia,4920,24000|sbi-cashback,,350');
  });

  it('never writes more than 4 digits for a card', () => {
    const code = encodeWalletCode([{ catalogId: 'axis-ace', lastFour: '4111111111111111', points: 0 }], true);
    assert.equal(code, 'WALLETWISE1|axis-ace,,0');
    assert.doesNotMatch(code, /\d{5,}/);
  });
});

describe('parseWalletCode', () => {
  it('round-trips a code', () => {
    const r = parseWalletCode(encodeWalletCode(cards, true), known);
    assert.deepEqual(r, {
      ok: true,
      skipped: 0,
      cards: [
        { catalogId: 'hdfc-infinia', lastFour: '4920', points: 24000 },
        { catalogId: 'sbi-cashback', lastFour: '', points: 350 },
      ],
    });
  });

  it('copes with text and line breaks added by chat apps', () => {
    const r = parseWalletCode('Here is my wallet:\nWALLETWISE1|hdfc-infinia,,24\n000|axis-ace,,0 ', known);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.cards.map((c) => [c.catalogId, c.points]), [['hdfc-infinia', 24000], ['axis-ace', 0]]);
  });

  it('skips unknown cards and counts them', () => {
    const r = parseWalletCode('WALLETWISE1|unknown-card,,5|axis-ace,,10', known);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.skipped, 1);
      assert.equal(r.cards.length, 1);
    }
  });

  it('refuses a code that carries a long number', () => {
    const r = parseWalletCode('WALLETWISE1|axis-ace,4111111111111111,10', known);
    assert.equal(r.ok, false);
  });

  it('refuses text that is not a wallet code', () => {
    assert.equal(parseWalletCode('hello', known).ok, false);
    assert.equal(parseWalletCode('WALLETWISE1|', known).ok, false);
  });

  it('skips negative or broken points', () => {
    const r = parseWalletCode('WALLETWISE1|axis-ace,,-5|sbi-cashback,,abc|hdfc-infinia,,7', known);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.cards.map((c) => c.catalogId), ['hdfc-infinia']);
  });

  it(`stops at ${MAX_SHARED_CARDS} cards`, () => {
    const code = 'WALLETWISE1|' + Array.from({ length: MAX_SHARED_CARDS + 5 }, () => 'axis-ace,,1').join('|');
    const r = parseWalletCode(code, known);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.cards.length, MAX_SHARED_CARDS);
      assert.equal(r.skipped, 5);
    }
  });
});
