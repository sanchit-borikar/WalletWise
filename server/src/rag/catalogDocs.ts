/**
 * Builds a markdown knowledge document for every card in the catalog (280 cards),
 * straight from the bundled CardAdvisor data and the engine's redemption logic.
 * Hand-written seed docs in server/knowledge/cards replace the generated one for
 * their card.
 */
import { catalog } from '../../../src/data/catalog';
import { CATEGORY_LABELS, cardChanges, redemptionRoutes, safeRupeesPerPoint } from '../../../src/engine';
import type { Card } from '../../../src/engine';
import type { DocMeta } from './chunk.ts';

const BANK_NAMES: Record<string, string> = {
  HDFC: 'HDFC Bank',
  SBI: 'SBI Card',
  AXIS: 'Axis Bank',
  ICICI: 'ICICI Bank',
  AMEX: 'American Express',
  KOTAK: 'Kotak Mahindra Bank',
  IDFC: 'IDFC FIRST Bank',
  INDUSIND: 'IndusInd Bank',
  YES: 'YES Bank',
  RBL: 'RBL Bank',
  AU: 'AU Small Finance Bank',
  BOB: 'Bank of Baroda (BOBCARD)',
  SC: 'Standard Chartered',
  HSBC: 'HSBC',
  FEDERAL: 'Federal Bank',
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const PERK_TEXT: Record<string, string> = {
  MILESTONE_BONUS: 'milestone bonuses on yearly spend',
  FUEL_WAIVER: '1% fuel surcharge waiver',
  LOUNGE_ACCESS: 'airport lounge access',
  MOVIE_TICKET: 'movie ticket offers',
  INSURANCE: 'complimentary insurance cover',
  CONCIERGE: 'concierge service',
  GOLF: 'golf benefits',
  HOTEL_MEMBERSHIP: 'hotel membership benefits',
  COBRANDED_OTT: 'OTT subscription benefits',
};

export function bankName(card: Card) {
  return BANK_NAMES[card.issuer] ?? card.issuer;
}

export function cardDocument(card: Card): { meta: DocMeta; markdown: string } {
  const lines: string[] = [`# ${card.name}`, '', `Issued by ${bankName(card)} on the ${card.network} network. Tier: ${card.tier.toLowerCase().replace('_', ' ')}.`, ''];

  lines.push('## Fees and eligibility');
  if (card.lifetimeFree || card.annualFee === 0) lines.push('- Lifetime free: no annual fee.');
  else if (card.annualFee != null) lines.push(`- Annual fee ${inr(card.annualFee)} + GST.`);
  if (card.joiningFee) lines.push(`- Joining fee ${inr(card.joiningFee)} + GST.`);
  if (card.feeWaiverSpend) lines.push(`- Annual fee waived on ${inr(card.feeWaiverSpend)} spend in a year.`);
  lines.push(card.forexPct != null ? `- Forex markup ${card.forexPct}% + GST.` : '- Forex markup not published.');
  if (card.aprMonthlyPct != null) lines.push(`- Interest on unpaid balance: ${card.aprMonthlyPct}% a month.`);
  if (card.minMonthlyIncome) lines.push(`- Stated minimum income ${inr(card.minMonthlyIncome)} a month.`);
  if (card.minAge || card.maxAge) lines.push(`- Age ${card.minAge ?? '?'} to ${card.maxAge ?? '?'}.`);
  lines.push('');

  lines.push('## Reward rates');
  lines.push('Rates are value back as a percentage of spend at the typical redemption value.');
  for (const r of [...card.rewards].sort((a, b) => b.ratePct - a.ratePct)) {
    const where = r.merchantsText ? `on ${r.merchantsText}` : r.category === 'DEFAULT' ? 'on everyday spends' : `on ${CATEGORY_LABELS[r.category].toLowerCase()}`;
    const cap = r.capRs != null ? `, capped at ${inr(r.capRs)} of reward value a month` : '';
    lines.push(`- ${r.ratePct}% ${where}${cap}.`);
  }
  lines.push('');

  const l = card.lounge;
  lines.push('## Lounge access');
  if (!l || (!l.domestic && !l.international)) {
    lines.push(l?.programmes.length ? `Lounge programmes listed: ${l.programmes.join(', ')}; visit counts not published.` : 'No airport lounge access is listed.');
  } else {
    const part = (v: number | 'UNLIMITED' | null, kind: string) => (v === 'UNLIMITED' ? `unlimited ${kind}` : v ? `${v} ${kind} visits a year` : null);
    lines.push(`- ${[part(l.domestic, 'domestic'), part(l.international, 'international')].filter(Boolean).join(', ')}.`);
    if (l.spendGateRs) lines.push(`- Needs ${inr(l.spendGateRs)} spend${l.spendGateWindow ? ` in the ${l.spendGateWindow.replace('-', ' ')}` : ''}.`);
    if (l.programmes.length) lines.push(`- Programmes: ${l.programmes.join(', ')}.`);
  }
  lines.push('');

  lines.push('## Redemption and transfer partners');
  const isCashback = card.rewards.every((r) => r.type === 'CASHBACK');
  if (isCashback) lines.push('Cashback is credited to the card statement.');
  else {
    lines.push(`- ${card.programme?.name ?? 'Reward points'}: about ₹${safeRupeesPerPoint(card).toFixed(2)} per point on the default route.`);
    const transfers = redemptionRoutes(catalog, card).filter((r) => r.kind === 'TRANSFER');
    if (transfers.length) {
      lines.push(`- Transfer partners (${transfers.length}): ${transfers.slice(0, 15).map((r) => `${r.label.replace('Transfer to ', '')} (${r.ratioLabel ?? 'direct'})`).join('; ')}.`);
      lines.push('- Transfers cannot be reversed; ratios can change. Confirm in the bank portal before transferring.');
    }
  }
  lines.push('');

  const perks = [...new Set(card.perks)].map((p) => PERK_TEXT[p]).filter(Boolean);
  if (perks.length) lines.push('## Perks', `${perks.join(', ')}.`, '');

  const { upcoming, recent } = cardChanges(catalog, card.id, undefined, 365);
  const changes = [...upcoming, ...recent].slice(0, 10);
  if (changes.length) {
    lines.push('## Recent and upcoming changes');
    for (const c of changes) {
      const kind = c.direction === 'devaluation' ? `${c.magnitude} cut` : c.direction === 'revaluation' ? 'improvement' : 'change';
      lines.push(`- ${c.date} (${kind}): ${c.title}.${c.after ? ` Now: ${c.after}.` : ''}`);
    }
    lines.push('');
  }

  return {
    meta: {
      cardId: card.id,
      cardName: card.name,
      bank: bankName(card),
      last_updated: card.lastChanged,
      source: `CardAdvisor open data (CC BY 4.0), snapshot ${catalog.meta.asOf.cards}`,
    },
    markdown: lines.join('\n'),
  };
}
