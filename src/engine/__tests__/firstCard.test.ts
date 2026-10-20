/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { buildCatalog, recommendCards, recommendFirstCard, upiRule, walletValue } from '../index';
import type { Card, Catalog, Inclusion, RawData, RewardRow, UserProfile } from '../index';

const TODAY = '2026-10-20';

function row(partial: Partial<RewardRow> & Pick<RewardRow, 'category' | 'ratePct'>): RewardRow {
  return { type: 'CASHBACK', capRs: null, pointPaisa: 100, merchantsText: null, merchants: null, portal: false, ...partial };
}

function card(partial: Partial<Card> & Pick<Card, 'id' | 'rewards'>): Card {
  return {
    name: partial.id,
    issuer: 'TEST',
    issuerType: 'COMMERCIAL',
    network: 'VISA',
    tier: 'ENTRY',
    annualFee: 0,
    joiningFee: 0,
    lifetimeFree: true,
    feeWaiverSpend: null,
    forexPct: 3.5,
    aprMonthlyPct: 3.75,
    minMonthlyIncome: null,
    minAge: null,
    maxAge: null,
    rateMinPct: null,
    rateMaxPct: null,
    lastChanged: TODAY,
    url: '',
    programme: null,
    perks: [],
    lounge: null,
    ...partial,
  };
}

const secured = (minFdRs: number, extra: Partial<Inclusion> = {}): Inclusion => ({
  secured: true,
  minFdRs,
  noIncomeProof: true,
  upi: null,
  source: 'https://bank.example/card',
  verifiedAt: TODAY,
  ...extra,
});

function fixtureCatalog(cards: Card[]): Catalog {
  return buildCatalog({
    cards,
    transfers: { nodes: [], edges: [] },
    changes: [],
    meta: { generatedAt: TODAY, source: 'test', license: 'test', attribution: 'test', asOf: {} },
  });
}

const profile = (partial: Partial<UserProfile> = {}): UserProfile => ({
  monthlySpend: { GROCERY: 6000, DEFAULT: 4000 },
  repayment: 'UNSURE',
  experience: 'NEW',
  ...partial,
});

// ── First-card path ───────────────────────────────────
describe('recommendFirstCard', () => {
  const fdFree = card({ id: 'fd-free', rewards: [row({ category: 'DEFAULT', ratePct: 1 })], inclusion: secured(5000) });
  const fdBetter = card({ id: 'fd-better', rewards: [row({ category: 'DEFAULT', ratePct: 2 })], inclusion: secured(20000) });
  const fdFeeHeavy = card({
    id: 'fd-fee',
    rewards: [row({ category: 'DEFAULT', ratePct: 5 })],
    lifetimeFree: false,
    annualFee: 1000,
    feeWaiverSpend: 200000,
    inclusion: secured(10000),
  });
  const entryFree = card({ id: 'entry-free', rewards: [row({ category: 'GROCERY', ratePct: 3 }), row({ category: 'DEFAULT', ratePct: 1 })] });
  const entryHighIncome = card({ id: 'entry-rich', rewards: [row({ category: 'DEFAULT', ratePct: 4 })], minMonthlyIncome: 100000 });
  const premium = card({ id: 'premium', tier: 'PREMIUM', rewards: [row({ category: 'DEFAULT', ratePct: 6 })], lifetimeFree: false, annualFee: 5000 });
  const cat = fixtureCatalog([fdFree, fdBetter, fdFeeHeavy, entryFree, entryHighIncome, premium]);

  it('puts the FD-backed route first for someone without income proof, ranked by value at their spend', () => {
    const plan = recommendFirstCard(cat, profile({ incomeProof: false, hasCreditHistory: false }));
    assert.deepEqual(plan.routes.map((r) => r.kind), ['FD_BACKED', 'ENTRY', 'ADD_ON']);
    const fd = plan.routes[0];
    assert.deepEqual(fd.options.map((o) => o.card.id), ['fd-better', 'fd-free']);
    // ₹10,000 a month at 2% = ₹2,400 a year, no fee.
    assert.equal(fd.options[0].valuePerYear, 2400);
    assert.equal(fd.options[0].minFdRs, 20000);
    assert.equal(fd.options[0].source, 'https://bank.example/card');
    assert.ok(plan.warnings.some((w) => /income proof/.test(w)));
  });

  it('never suggests a fee-heavy card, even an FD-backed one with a high rate', () => {
    const plan = recommendFirstCard(cat, profile());
    const ids = plan.routes.flatMap((r) => r.options.map((o) => o.card.id));
    assert.ok(!ids.includes('fd-fee'));
    assert.ok(!ids.includes('premium'));
  });

  it('allows a card whose fee is waived at the user’s spend', () => {
    const plan = recommendFirstCard(cat, profile({ monthlySpend: { DEFAULT: 20000 } }));
    const fd = plan.routes.find((r) => r.kind === 'FD_BACKED')!;
    assert.equal(fd.options[0].card.id, 'fd-fee');
    assert.equal(fd.options[0].feePerYear, 0);
  });

  it('lists entry cards with a low or no stated income minimum, unsecured only', () => {
    const plan = recommendFirstCard(cat, profile({ incomeProof: true, hasCreditHistory: true }));
    assert.equal(plan.routes[0].kind, 'ENTRY');
    assert.deepEqual(plan.routes[0].options.map((o) => o.card.id), ['entry-free']);
  });

  it('explains the add-on route without ranking a card', () => {
    const addOn = recommendFirstCard(cat, profile()).routes.find((r) => r.kind === 'ADD_ON')!;
    assert.equal(addOn.options.length, 0);
    assert.ok(addOn.points.some((p) => /credit score/.test(p)));
  });

  it('respects the card’s age limits', () => {
    const teen = card({ id: 'fd-21', rewards: [row({ category: 'DEFAULT', ratePct: 9 })], minAge: 21, inclusion: secured(5000) });
    const plan = recommendFirstCard(fixtureCatalog([teen, fdFree]), profile({ age: 19 }));
    assert.deepEqual(plan.routes[0].options.map((o) => o.card.id), ['fd-free']);
  });
});

// ── UPI share ─────────────────────────────────────────
describe('walletValue with UPI spend', () => {
  const visa = card({ id: 'visa', rewards: [row({ category: 'DEFAULT', ratePct: 2 })] });
  const rupay = card({ id: 'rupay', network: 'RUPAY', rewards: [row({ category: 'DEFAULT', ratePct: 1 })] });
  const rupayNone = card({
    id: 'rupay-none',
    network: 'RUPAY',
    rewards: [row({ category: 'DEFAULT', ratePct: 3 })],
    inclusion: { ...secured(5000), upi: { earnsRewards: false, ratePct: null, notes: null } },
  });
  const rupayCapped = card({
    id: 'rupay-capped',
    network: 'RUPAY',
    rewards: [row({ category: 'DEFAULT', ratePct: 0.5 })],
    inclusion: { ...secured(5000), upi: { earnsRewards: true, ratePct: 2, capRs: 100, notes: null } },
  });
  const cat = fixtureCatalog([visa, rupay, rupayNone, rupayCapped]);
  const p = (upiShare: number): UserProfile => ({ monthlySpend: { DEFAULT: 10000 }, repayment: 'ALWAYS_FULL', experience: 'NEW', upiShare });

  it('classifies cards by how they earn on UPI', () => {
    assert.equal(upiRule(visa), 'NOT_ON_UPI');
    assert.equal(upiRule(rupay), 'ASSUMED');
    assert.equal(upiRule(rupayNone), 'VERIFIED');
  });

  it('gives a Visa card nothing for spend paid by UPI', () => {
    assert.equal(walletValue(cat, [visa], p(0)).annualReward, 2400);
    assert.equal(walletValue(cat, [visa], p(0.5)).annualReward, 1200);
    assert.equal(walletValue(cat, [visa], p(1)).annualReward, 0);
  });

  it('counts UPI spend on a RuPay card at its normal rate when its UPI terms are not checked', () => {
    const v = walletValue(cat, [visa, rupay], p(0.5));
    // ₹5,000 by card at 2% + ₹5,000 by UPI at 1%, per month.
    assert.equal(v.annualReward, 1800);
    assert.ok(v.allocations.some((a) => a.channel === 'UPI' && a.cardId === 'rupay'));
  });

  it('uses the verified UPI terms: no reward when the bank says UPI earns nothing', () => {
    assert.equal(walletValue(cat, [rupayNone], p(1)).annualReward, 0);
    assert.equal(walletValue(cat, [rupayNone], p(0)).annualReward, 3600);
  });

  it('uses the card’s normal rates when the bank says UPI earns like any other spend', () => {
    const same = card({
      id: 'rupay-same',
      network: 'RUPAY',
      rewards: [row({ category: 'DEFAULT', ratePct: 1.5 })],
      inclusion: { ...secured(0), secured: false, minFdRs: null, upi: { earnsRewards: true, ratePct: null, notes: null } },
    });
    assert.equal(upiRule(same), 'SAME_AS_CARD');
    assert.equal(walletValue(fixtureCatalog([same]), [same], p(1)).annualReward, 1800);
  });

  it('skips cards the bank gives only to existing customers on the first-card path', () => {
    const addOnOnly = card({
      id: 'existing-only',
      rewards: [row({ category: 'DEFAULT', ratePct: 5 })],
      inclusion: { ...secured(0), secured: false, minFdRs: null, existingCustomersOnly: true },
    });
    const plan = recommendFirstCard(fixtureCatalog([addOnOnly]), { monthlySpend: { DEFAULT: 5000 }, repayment: 'UNSURE', experience: 'NEW' });
    assert.equal(plan.routes.flatMap((r) => r.options).length, 0);
  });

  it('uses the verified UPI rate and its monthly cap, then the next card', () => {
    const v = walletValue(cat, [rupayCapped, rupay], p(1));
    // ₹5,000 at 2% hits the ₹100 cap, the other ₹5,000 goes on the 1% card: ₹150 a month.
    assert.equal(v.annualReward, 1800);
  });

  it('keeps international spend on a card', () => {
    const v = walletValue(cat, [visa], { monthlySpend: { INTERNATIONAL: 1000 }, repayment: 'ALWAYS_FULL', experience: 'NEW', upiShare: 1 });
    assert.equal(v.annualReward, 240);
  });

  it('recommends a RuPay card to a UPI-first user and warns about small UPI payments', () => {
    const advice = recommendCards(fixtureCatalog([visa, rupay]), p(1), { today: TODAY });
    assert.ok(advice.picks.length === 0 || advice.picks[0].card.id === 'rupay');
    assert.ok(advice.alternatives[0].card.id === 'rupay');
    assert.ok(advice.warnings.some((w) => /UPI/.test(w)));
  });
});

// ── Real data ─────────────────────────────────────────
describe('first-card path on real data', () => {
  const dir = join(import.meta.dirname, '..', '..', 'data', 'generated');
  const load = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const raw: RawData = { cards: load('cards.json'), transfers: load('transfers.json'), changes: load('changes.json'), meta: load('meta.json') };
  const cat = buildCatalog(raw);

  it('loads the hand-added public-sector bank cards with a source and date', () => {
    const psu = cat.cards.filter((c) => c.issuer === 'PNB' || c.issuer === 'CANARA');
    assert.ok(psu.length >= 15);
    for (const c of psu) {
      assert.match(c.source!, /^https:\/\/(creditcard\.pnb|www\.canarabank)\.bank\.in\//);
      assert.equal(c.verifiedAt, '2026-10-20');
      assert.ok(c.rewards.some((r) => r.category === 'DEFAULT'), c.id);
    }
  });

  it('scores a public-sector card: Canara RuPay Platinum earns 0.5% and works on UPI', () => {
    const c = cat.byId.get('canara-rupay-platinum')!;
    const profile: UserProfile = { monthlySpend: { DEFAULT: 10000 }, repayment: 'ALWAYS_FULL', experience: 'NEW', upiShare: 1 };
    const v = walletValue(cat, [c], profile);
    assert.equal(v.annualReward, 600);
    // ₹1.2 lakh a year clears the ₹50,000 inactivity threshold, so no fee.
    assert.equal(v.annualFees, 0);
  });

  it('every inclusion entry has a source and date', () => {
    const tagged = cat.cards.filter((c) => c.inclusion);
    assert.ok(tagged.length >= 5);
    for (const c of tagged) {
      assert.match(c.inclusion!.source, /^https:\/\//);
      assert.match(c.inclusion!.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('offers verified FD-backed cards to a student with no income proof', () => {
    const plan = recommendFirstCard(cat, { monthlySpend: { DINING: 2000, ONLINE_SHOPPING: 2000, DEFAULT: 2000 }, repayment: 'UNSURE', experience: 'NEW', age: 19, incomeProof: false, hasCreditHistory: false });
    const fd = plan.routes[0];
    assert.equal(fd.kind, 'FD_BACKED');
    assert.ok(fd.options.length > 0);
    for (const o of plan.routes.flatMap((r) => r.options)) {
      assert.ok(o.feePerYear <= 590, `${o.card.id} fee ${o.feePerYear}`);
      assert.notEqual(o.card.tier, 'PREMIUM');
      assert.notEqual(o.card.tier, 'SUPER_PREMIUM');
    }
    for (const o of fd.options) assert.equal(o.card.inclusion?.secured, true);
  });
});
