/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { catalog } from '../../data/catalog';
import type { UserProfile } from '../../engine';
import type { CardData } from '../../store/useCardStore';
import { answerAura, parseAmount } from '../auraBrain';

// Minimal view models for the test wallet; the brain reads catalog data by catalogId.
function holding(id: string, catalogId: string, cardName: string, points: number): CardData {
  return {
    id,
    catalogId,
    bankName: catalog.byId.get(catalogId)!.issuer,
    cardName,
    lastFour: '0000',
    points,
    lowValue: points * 0.25,
    highValue: points * 0.5,
    annualFee: '',
    renewalFee: '',
    currencyName: '',
    forexMarkup: '',
    rewardHeadline: '',
    translatorExample: '',
    benefits: [],
    milestones: [],
    rewardCategories: [],
    loungeAccess: '',
    intelligence: { bestFor: '', bestCategory: 'Dining', recommended: 'Yes', potentialAnnualValue: 0 },
  };
}

const profile: UserProfile = {
  monthlySpend: { ONLINE_SHOPPING: 8000, DINING: 4000, GROCERY: 5000, DEFAULT: 6000 },
  repayment: 'ALWAYS_FULL',
  experience: 'NEW',
};
const ctx = {
  cards: [holding('1', 'hdfc-swiggy', 'Swiggy', 0), holding('2', 'sbi-bpcl-octane', 'BPCL Octane', 4000), holding('3', 'hdfc-infinia', 'Infinia', 20000)],
  profile,
  profileSaved: true,
  isDemo: false,
};

describe('Aura brain', () => {
  it('parses Indian amounts', () => {
    assert.equal(parseAmount('which card for ₹1,500 at swiggy'), 1500);
    assert.equal(parseAmount('spend 5k on dining'), 5000);
    assert.equal(parseAmount('a 2 lakh trip'), 200000);
    assert.equal(parseAmount('rs. 750'), 750);
  });

  it('picks the Swiggy card for Swiggy', () => {
    const r = answerAura('Which card for ₹1,500 at Swiggy?', ctx);
    assert.match(r.text, /use HDFC Swiggy/);
    assert.match(r.text, /₹150/);
  });

  it('picks Octane for BPCL fuel', () => {
    const r = answerAura('I am filling petrol at BPCL for 2000', ctx);
    assert.match(r.text, /BPCL Octane/);
  });

  it('plans points redemption', () => {
    const r = answerAura('How should I use my Infinia points?', ctx);
    assert.match(r.text, /20,000 points/);
  });

  it('answers beginner concepts', () => {
    assert.match(answerAura('What is the minimum amount due?', ctx).text, /Minimum amount due/);
    assert.match(answerAura('explain interest free period', ctx).text, /Interest-free period/);
  });

  it('plans a trip with points', () => {
    const r = answerAura('Flight to Goa for ₹6,500', ctx);
    assert.match(r.text, /₹6,500 fare/);
  });

  it('recommends new cards', () => {
    const r = answerAura('Should I get a new card?', ctx);
    assert.ok(r.actions?.some((a) => a.route === '/find-card'));
  });

  it('refuses off-topic questions', () => {
    assert.match(answerAura('What is the capital of France?', ctx).text, /only help with credit cards/);
  });

  it('looks up any card by name', () => {
    assert.match(answerAura('tell me about SBI Cashback', ctx).text, /SBI/);
  });
});
