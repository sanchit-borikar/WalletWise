/**
 * Module B: which cards to carry, and "should I get a card at all?".
 * Spec: research/algorithm-spec.md §4.
 */
import { CATEGORY_LABELS } from './categories';
import { devaluationRisk, todayIso } from './devaluation';
import { earnSegments, GST, UPI_SMALL_TICKET } from './purchase';
import type { CapUsage, Card, Catalog, Category, Experience, Purchase, UserProfile } from './types';

/** Annual "hassle" cost per extra card so the app does not push a card that adds little. */
export const COGNITIVE_COST_PER_CARD = 1500;
/** Below this yearly gain a new card is not recommended. */
export const MIN_WORTHWHILE_GAIN = 500;
/** Editorial value of one airport lounge visit, in rupees (LOW confidence). */
export const LOUNGE_VISIT_VALUE = 800;
/** Common monthly cap on the fuel surcharge waiver, in rupees. */
const FUEL_WAIVER_CAP_MONTH = 250;
/** Fee and safety thresholds for users who do not always pay the full bill. */
const SAFE_PATH_MAX_FEE = 500;

export type CategoryAllocation = {
  category: Category;
  cardId: string;
  spend: number;
  reward: number;
  rowText: string;
  /** How this slice of spend is paid. Absent means by card. */
  channel?: 'CARD' | 'UPI';
};

/**
 * How a card earns on UPI:
 * - NOT_ON_UPI: only RuPay credit cards can be linked to UPI.
 * - VERIFIED: the issuer's page gives a UPI rate, or says UPI earns nothing (card.inclusion.upi).
 * - SAME_AS_CARD: the issuer's page says UPI earns at the card's normal rates.
 * - ASSUMED: a RuPay card whose UPI terms were not checked; its normal rates are used.
 */
export type UpiRule = 'NOT_ON_UPI' | 'VERIFIED' | 'SAME_AS_CARD' | 'ASSUMED';

export function upiRule(card: Card): UpiRule {
  if (card.network !== 'RUPAY') return 'NOT_ON_UPI';
  const upi = card.inclusion?.upi;
  if (!upi) return 'ASSUMED';
  return upi.earnsRewards && upi.ratePct == null ? 'SAME_AS_CARD' : 'VERIFIED';
}

/** UPI cannot pay in a foreign currency, so international spend always goes on a card. */
const UPI_EXCLUDED: ReadonlySet<Category> = new Set(['INTERNATIONAL']);

const clampShare = (n: number | undefined) => (n == null || !Number.isFinite(n) ? 0 : Math.min(1, Math.max(0, n)));

export type CardYear = {
  cardId: string;
  annualSpend: number;
  annualReward: number;
  /** Annual fee including GST, 0 if waived by spend. */
  fee: number;
  feeWaived: boolean;
  perks: number;
};

export type WalletValue = {
  /** Rewards + perks - fees, per year, steady state. */
  net: number;
  annualReward: number;
  annualFees: number;
  perks: number;
  /** Joining fees (with GST) in year one for the given new cards. */
  firstYearJoiningFees: number;
  allocations: CategoryAllocation[];
  perCard: CardYear[];
};

const feeWithGst = (fee: number | null) => (fee ?? 0) * (1 + GST);

function purchaseFor(category: Category, amount: number, experience: Experience): Purchase {
  return {
    amount,
    category,
    online: category === 'ONLINE_SHOPPING',
    international: category === 'INTERNATIONAL',
    // Portal rates (SmartBuy and similar) only count for users who already use portals.
    allowPortal: experience === 'ENTHUSIAST',
  };
}

/**
 * Allocates each category's monthly spend across the wallet, filling the highest
 * marginal rate first and respecting each row's monthly reward cap. Beginners are
 * valued at safe rates, others at the best realistic redemption rate.
 */
export function walletValue(
  catalog: Catalog,
  cards: Card[],
  profile: UserProfile,
  options: { newCardIds?: string[]; today?: string } = {},
): WalletValue {
  const experience = profile.experience;
  const useBest = experience !== 'NEW';
  const usage: CapUsage = {};
  const allocations: CategoryAllocation[] = [];
  const spendByCard = new Map<string, number>();
  const rewardByCard = new Map<string, number>();
  const fuelByCard = new Map<string, number>();

  // Spend paid by UPI can only go on RuPay cards, so each category is split by channel.
  const upiShare = clampShare(profile.upiShare);
  const entries: [Category, number, 'CARD' | 'UPI'][] = [];
  for (const [category, monthly] of Object.entries(profile.monthlySpend) as [Category, number][]) {
    if (!(monthly > 0)) continue;
    const upi = UPI_EXCLUDED.has(category) ? 0 : monthly * upiShare;
    if (monthly - upi > 0) entries.push([category, monthly - upi, 'CARD']);
    if (upi > 0) entries.push([category, upi, 'UPI']);
  }
  entries.sort((a, b) => b[1] - a[1]);

  type Pick = { card: Card; rate: number; capacity: number; capKey: string | null; ratePct: number; rowText: string };
  // Earning on UPI for a card whose UPI terms were checked: one flat rate, with its own monthly cap.
  const verifiedUpiPick = (card: Card): Pick | null => {
    const upi = card.inclusion?.upi;
    if (!upi) return null;
    const ratePct = upi.earnsRewards ? (upi.ratePct ?? 0) : 0;
    const capKey = upi.capRs != null ? `${card.id}:upi` : null;
    const capLeft = upi.capRs != null ? Math.max(0, upi.capRs - (usage[`${card.id}:upi`] ?? 0)) : Infinity;
    const capacity = capLeft === Infinity || ratePct === 0 ? Infinity : (capLeft * 100) / ratePct;
    if (capacity <= 0) return null;
    return { card, rate: ratePct, capacity, capKey, ratePct, rowText: ratePct > 0 ? 'UPI rate from the bank' : 'no reward on UPI' };
  };

  for (const [category, monthly, channel] of entries) {
    let remaining = monthly;
    for (let guard = 0; remaining > 0.5 && guard < 12; guard++) {
      const p = purchaseFor(category, remaining, experience);
      let pick: Pick | null = null;
      for (const card of cards) {
        let candidate: Pick | null;
        const rule = channel === 'UPI' ? upiRule(card) : null;
        if (rule === 'NOT_ON_UPI') continue;
        if (rule === 'VERIFIED') {
          candidate = verifiedUpiPick(card);
        } else {
          // Spend in a category the card may exclude is never counted in yearly value.
          const seg = earnSegments(catalog, card, p, usage, experience).find((s) => s.capacitySpend > 0 && !s.excluded);
          candidate = seg
            ? {
                card,
                rate: useBest ? seg.bestRatePct : seg.ratePct,
                capacity: seg.capacitySpend,
                capKey: seg.row.capRs != null ? `${card.id}:${seg.rowIndex}` : null,
                ratePct: seg.ratePct,
                rowText: seg.row.merchantsText ?? (seg.row.category === 'DEFAULT' ? 'base rate' : CATEGORY_LABELS[seg.row.category]),
              }
            : null;
        }
        if (candidate && (!pick || candidate.rate > pick.rate)) pick = candidate;
      }
      if (!pick) break;
      const spend = Math.min(remaining, pick.capacity);
      const reward = (spend * pick.rate) / 100;
      if (pick.capKey != null) {
        usage[pick.capKey] = (usage[pick.capKey] ?? 0) + (spend * pick.ratePct) / 100;
      }
      allocations.push({
        category,
        cardId: pick.card.id,
        spend,
        reward,
        rowText: channel === 'UPI' && !pick.rowText.includes('UPI') ? `${pick.rowText}, paid by UPI` : pick.rowText,
        ...(channel === 'UPI' ? { channel } : {}),
      });
      spendByCard.set(pick.card.id, (spendByCard.get(pick.card.id) ?? 0) + spend);
      rewardByCard.set(pick.card.id, (rewardByCard.get(pick.card.id) ?? 0) + reward);
      if (category === 'FUEL') fuelByCard.set(pick.card.id, (fuelByCard.get(pick.card.id) ?? 0) + spend);
      remaining -= spend;
    }
  }

  // Lounge visits are counted once across the wallet, best card first.
  let visitsLeft = profile.loungeVisitsPerYear ?? 0;
  const perCard: CardYear[] = cards.map((card) => {
    const annualSpend = (spendByCard.get(card.id) ?? 0) * 12;
    const annualReward = (rewardByCard.get(card.id) ?? 0) * 12;
    const waived = card.lifetimeFree || card.annualFee === 0 || (card.feeWaiverSpend != null && annualSpend >= card.feeWaiverSpend);
    const fee = waived ? 0 : feeWithGst(card.annualFee);

    let perks = 0;
    const fuelMonthly = fuelByCard.get(card.id) ?? 0;
    if (card.perks.includes('FUEL_WAIVER') && fuelMonthly > 0) {
      perks += Math.min(fuelMonthly * 0.01, FUEL_WAIVER_CAP_MONTH) * 12;
    }
    const lounge = card.lounge;
    if (visitsLeft > 0 && lounge && lounge.domestic) {
      const gateOk = lounge.spendGateRs == null || annualSpend / 4 >= lounge.spendGateRs;
      if (gateOk) {
        const available = lounge.domestic === 'UNLIMITED' ? visitsLeft : Math.min(visitsLeft, lounge.domestic);
        perks += available * LOUNGE_VISIT_VALUE;
        visitsLeft -= available;
      }
    }
    return { cardId: card.id, annualSpend, annualReward, fee, feeWaived: waived, perks };
  });

  const annualReward = perCard.reduce((a, c) => a + c.annualReward, 0);
  const annualFees = perCard.reduce((a, c) => a + c.fee, 0);
  const perks = perCard.reduce((a, c) => a + c.perks, 0);
  const newIds = new Set(options.newCardIds ?? []);
  const firstYearJoiningFees = cards.filter((c) => newIds.has(c.id)).reduce((a, c) => a + feeWithGst(c.joiningFee), 0);

  return {
    net: round(annualReward + perks - annualFees),
    annualReward: round(annualReward),
    annualFees: round(annualFees),
    perks: round(perks),
    firstYearJoiningFees: round(firstYearJoiningFees),
    allocations,
    perCard,
  };
}

export type Eligibility = { eligible: boolean; confidence: 'HIGH' | 'LOW' | 'UNKNOWN'; reason?: string };

/** Checks stated minimums only. It never predicts approval. */
export function checkEligibility(card: Card, profile: UserProfile): Eligibility {
  if (profile.age != null) {
    if (card.minAge != null && profile.age < card.minAge) return { eligible: false, confidence: 'HIGH', reason: `Minimum age ${card.minAge}` };
    if (card.maxAge != null && profile.age > card.maxAge) return { eligible: false, confidence: 'HIGH', reason: `Maximum age ${card.maxAge}` };
  }
  if (card.minMonthlyIncome == null || profile.monthlyIncome == null) return { eligible: true, confidence: 'UNKNOWN' };
  if (profile.monthlyIncome < card.minMonthlyIncome) {
    return { eligible: false, confidence: 'HIGH', reason: `Stated minimum income ₹${card.minMonthlyIncome.toLocaleString('en-IN')} a month` };
  }
  return { eligible: true, confidence: profile.monthlyIncome < card.minMonthlyIncome * 1.2 ? 'LOW' : 'HIGH' };
}

/** Cards a user who sometimes pays only the minimum can hold safely: no or low fee. */
function passesSafetyGate(card: Card): boolean {
  return card.lifetimeFree || (card.annualFee ?? Infinity) <= SAFE_PATH_MAX_FEE;
}

/** Interest on a revolving balance for one month, to show in rupees why rewards do not cover it. */
export function interestExample(card: Card | null, balance = 10000) {
  const monthlyPct = card?.aprMonthlyPct ?? 3.75;
  const monthly = (balance * monthlyPct) / 100;
  return {
    monthlyPct,
    balance,
    interestPerMonth: round(monthly),
    message:
      `If ₹${balance.toLocaleString('en-IN')} stays unpaid, interest at about ${monthlyPct}% a month costs ₹${round(monthly).toLocaleString('en-IN')} every month, plus GST. ` +
      'Paying only the minimum also cancels the interest-free period on new purchases until the bill is cleared.',
  };
}

export type CardPick = { card: Card; gainPerYear: number; eligibility: Eligibility; why: string[] };

export type PortfolioAdvice = {
  /** "none" means do not get a new card now. */
  verdict: 'ADD_CARDS' | 'NONE';
  picks: CardPick[];
  current: WalletValue;
  after: WalletValue;
  /** Best single cards to compare, gain per year over the current wallet. */
  alternatives: CardPick[];
  warnings: string[];
  explanation: string;
};

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), size - 1)) out.push([item, ...rest]);
  });
  return out;
}

/**
 * Recommends up to `maxNew` cards to add to the user's wallet (or a first card).
 * Exhaustive over the top candidates, so the pair found is the best pair, not a greedy guess.
 */
export function recommendCards(
  catalog: Catalog,
  profile: UserProfile,
  options: { ownedIds?: string[]; maxNew?: number; candidateLimit?: number; today?: string } = {},
): PortfolioAdvice {
  const { ownedIds = [], maxNew = 2, candidateLimit = 20, today = todayIso() } = options;
  const owned = ownedIds.map((id) => catalog.byId.get(id)).filter((c): c is Card => !!c);
  const warnings: string[] = [];

  const safePath = profile.repayment !== 'ALWAYS_FULL';
  if (safePath) {
    warnings.push(interestExample(owned[0] ?? null).message);
    warnings.push('Only no-fee or low-fee cards are shown until you pay the full bill every month.');
  }
  if (clampShare(profile.upiShare) > 0) {
    warnings.push(
      `Your UPI spend is counted only on RuPay cards. UPI payments up to ₹${UPI_SMALL_TICKET.toLocaleString('en-IN')} often earn no reward, and paying by UPI on a credit card makes it easy to spend more than you planned.`,
    );
  }

  const ownedSet = new Set(ownedIds);
  const eligible = catalog.cards
    .filter((c) => !ownedSet.has(c.id))
    .map((c) => ({ card: c, eligibility: checkEligibility(c, profile) }))
    .filter(({ card, eligibility }) => eligibility.eligible && (!safePath || passesSafetyGate(card)))
    .filter(({ card }) => !profile.preferCashback || card.rewards.every((r) => r.type === 'CASHBACK'));

  const current = walletValue(catalog, owned, profile, { today });

  const singleGain = (card: Card) => {
    const after = walletValue(catalog, [...owned, card], profile, { newCardIds: [card.id], today });
    // Risk haircut on points cards: rewards may be cut before they are redeemed.
    const isPoints = card.rewards.some((r) => r.type !== 'CASHBACK');
    const risk = isPoints ? devaluationRisk(catalog, card.id, today).risk : 0;
    const extraReward = after.annualReward - current.annualReward;
    return after.net - current.net - extraReward * risk - COGNITIVE_COST_PER_CARD;
  };

  const ranked = eligible
    .map((e) => ({ ...e, gain: singleGain(e.card) }))
    .sort((a, b) => b.gain - a.gain);
  const candidates = ranked.slice(0, candidateLimit);

  let bestCombo: typeof candidates = [];
  let bestGain = 0;
  for (let size = 1; size <= maxNew; size++) {
    for (const combo of combinations(candidates, size)) {
      const cards = combo.map((c) => c.card);
      const after = walletValue(catalog, [...owned, ...cards], profile, { newCardIds: cards.map((c) => c.id), today });
      const extraReward = after.annualReward - current.annualReward;
      const riskCost = cards.reduce((acc, c) => {
        const isPoints = c.rewards.some((r) => r.type !== 'CASHBACK');
        return acc + (isPoints ? devaluationRisk(catalog, c.id, today).risk * (extraReward / cards.length) : 0);
      }, 0);
      const gain = after.net - current.net - riskCost - COGNITIVE_COST_PER_CARD * size;
      if (gain > bestGain) {
        bestGain = gain;
        bestCombo = combo;
      }
    }
  }

  const toPick = (e: (typeof candidates)[number], gain: number, afterValue: WalletValue): CardPick => {
    const allocs = afterValue.allocations.filter((a) => a.cardId === e.card.id);
    const why = allocs
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 3)
      .map((a) => `${CATEGORY_LABELS[a.category]}: ₹${round(a.reward * 12).toLocaleString('en-IN')} a year (${a.rowText})`);
    const yearCard = afterValue.perCard.find((c) => c.cardId === e.card.id);
    if (yearCard) {
      why.push(yearCard.feeWaived ? 'Annual fee waived at your spend.' : `Annual fee ₹${round(yearCard.fee).toLocaleString('en-IN')} including GST.`);
    }
    if (e.eligibility.confidence === 'LOW') why.push('Your income is close to the stated minimum.');
    if (e.eligibility.confidence === 'UNKNOWN') why.push('The issuer does not publish an income minimum.');
    return { card: e.card, gainPerYear: round(gain), eligibility: e.eligibility, why };
  };

  const alternatives = candidates.slice(0, 5).map((e) => {
    const after = walletValue(catalog, [...owned, e.card], profile, { newCardIds: [e.card.id], today });
    return toPick(e, e.gain, after);
  });

  if (bestCombo.length === 0 || bestGain < MIN_WORTHWHILE_GAIN) {
    return {
      verdict: 'NONE',
      picks: [],
      current,
      after: current,
      alternatives,
      warnings,
      explanation:
        owned.length === 0
          ? 'No card adds enough value at your current spending to be worth it. That is a fine answer: a card only helps if it pays more than its fees and you pay the bill in full.'
          : 'Your current cards already cover your spending well. No new card adds at least ₹500 a year after fees.',
    };
  }

  const after = walletValue(catalog, [...owned, ...bestCombo.map((c) => c.card)], profile, {
    newCardIds: bestCombo.map((c) => c.card.id),
    today,
  });
  return {
    verdict: 'ADD_CARDS',
    picks: bestCombo.map((e) => toPick(e, bestGain / bestCombo.length, after)),
    current,
    after,
    alternatives,
    warnings,
    explanation: `Adding ${bestCombo.map((c) => c.card.name).join(' and ')} raises your yearly value from ₹${round(current.net).toLocaleString('en-IN')} to ₹${round(after.net).toLocaleString('en-IN')} after fees, using the spend you already have.`,
  };
}

/** Top cards for one category, for the Learn > topic screens. Uses a typical spend mix weighted to that category. */
export function topCardsForCategory(
  catalog: Catalog,
  category: Category,
  options: { monthlyCategorySpend?: number; monthlyOtherSpend?: number; experience?: Experience; limit?: number } = {},
) {
  const { monthlyCategorySpend = 10000, monthlyOtherSpend = 15000, experience = 'SOME', limit = 10 } = options;
  const profile: UserProfile = {
    monthlySpend: { [category]: monthlyCategorySpend, DEFAULT: monthlyOtherSpend },
    repayment: 'ALWAYS_FULL',
    experience,
  };
  return catalog.cards
    .map((card) => ({ card, value: walletValue(catalog, [card], profile) }))
    .sort((a, b) => b.value.net - a.value.net)
    .slice(0, limit);
}

const round = (n: number) => Math.round(n);
