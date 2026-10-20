/**
 * First-card path: for people with no credit card or credit history (students,
 * homemakers, gig workers, people in their first job). Three routes, ranked for
 * the user's own spend, and never a fee-heavy card.
 */
import { CATEGORY_LABELS } from './categories';
import { checkEligibility, interestExample, walletValue } from './portfolio';
import { GST } from './purchase';
import type { Card, Catalog, UserProfile } from './types';

/** Highest yearly fee (before GST, after any waiver at the user's spend) a first card may carry. */
export const FIRST_CARD_MAX_FEE = 500;
/** Highest joining fee (before GST) a first card may carry. */
export const FIRST_CARD_MAX_JOINING_FEE = 500;
/** An unsecured entry card counts as "low income minimum" at or below this monthly income. */
export const FIRST_CARD_MAX_STATED_INCOME = 25000;
/** How many cards each route lists. */
const OPTIONS_PER_ROUTE = 3;

export type FirstCardRouteKind = 'FD_BACKED' | 'ADD_ON' | 'ENTRY';

export type FirstCardOption = {
  card: Card;
  /** Rewards minus fees per year at the user's spend (steady state, fees with GST). */
  valuePerYear: number;
  /** Annual fee with GST the user would pay at their spend (0 if free or waived). */
  feePerYear: number;
  /** Joining fee with GST, paid once. */
  joiningFee: number;
  minFdRs: number | null;
  /** Issuer page the FD and income facts come from, and when it was checked. */
  source: string | null;
  verifiedAt: string | null;
  why: string[];
};

export type FirstCardRoute = {
  kind: FirstCardRouteKind;
  title: string;
  summary: string;
  /** Things to know before choosing this route. */
  points: string[];
  options: FirstCardOption[];
};

export type FirstCardPlan = {
  /** Best route first for this user. */
  routes: FirstCardRoute[];
  warnings: string[];
};

const withGst = (n: number | null) => Math.round((n ?? 0) * (1 + GST));
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function option(catalog: Catalog, card: Card, profile: UserProfile): FirstCardOption | null {
  const value = walletValue(catalog, [card], profile, { newCardIds: [card.id] });
  const year = value.perCard[0];
  // Fee gate: a first card must stay cheap at the user's own spend.
  if (year.fee > withGst(FIRST_CARD_MAX_FEE)) return null;
  if ((card.joiningFee ?? 0) > FIRST_CARD_MAX_JOINING_FEE) return null;
  if (card.annualFee == null && !card.lifetimeFree) return null;

  const why: string[] = [];
  const top = value.allocations.slice().sort((a, b) => b.reward - a.reward)[0];
  if (value.annualReward > 0 && top) {
    const where = `${CATEGORY_LABELS[top.category].toLowerCase()}${top.channel === 'UPI' ? ' paid by UPI' : ''}`;
    why.push(`About ${inr(value.annualReward)} a year in rewards, mostly from ${where}.`);
  }
  if (card.lifetimeFree || card.annualFee === 0) why.push('No annual fee.');
  else if (year.feeWaived) why.push('Annual fee waived at your spend.');
  else why.push(`Annual fee ${inr(year.fee)} including GST.`);
  if ((card.joiningFee ?? 0) > 0) why.push(`Joining fee ${inr(withGst(card.joiningFee))} including GST, paid once.`);
  const inc = card.inclusion;
  if (inc?.secured && inc.minFdRs != null) why.push(`Needs a fixed deposit of at least ${inr(inc.minFdRs)} with the bank.`);
  if (inc?.noIncomeProof) why.push('The bank says no income proof is needed.');
  if (card.network === 'RUPAY') why.push('RuPay, so it can be linked to UPI.');

  return {
    card,
    valuePerYear: value.net,
    feePerYear: Math.round(year.fee),
    joiningFee: withGst(card.joiningFee),
    minFdRs: inc?.minFdRs ?? null,
    source: inc?.source ?? card.source ?? null,
    verifiedAt: inc?.verifiedAt ?? card.verifiedAt ?? null,
    why,
  };
}

const byValue = (a: FirstCardOption, b: FirstCardOption) =>
  b.valuePerYear - a.valuePerYear || (a.minFdRs ?? 0) - (b.minFdRs ?? 0) || a.card.name.localeCompare(b.card.name);

function ageOk(card: Card, profile: UserProfile) {
  if (profile.age == null) return true;
  return (card.minAge == null || profile.age >= card.minAge) && (card.maxAge == null || profile.age <= card.maxAge);
}

/**
 * Builds the three first-card routes for a user with no card or credit history.
 * FD-backed cards use only facts checked on the issuer's page (card.inclusion).
 */
export function recommendFirstCard(catalog: Catalog, profile: UserProfile): FirstCardPlan {
  const fdOptions = catalog.cards
    .filter((c) => c.inclusion?.secured && ageOk(c, profile))
    .map((c) => option(catalog, c, profile))
    .filter((o): o is FirstCardOption => o !== null)
    .sort(byValue)
    .slice(0, OPTIONS_PER_ROUTE);

  const entryOptions = catalog.cards
    .filter(
      (c) =>
        !c.inclusion?.secured &&
        !c.inclusion?.existingCustomersOnly &&
        (c.tier === 'ENTRY' || c.tier === 'MID') &&
        (c.minMonthlyIncome == null || c.minMonthlyIncome <= FIRST_CARD_MAX_STATED_INCOME) &&
        checkEligibility(c, profile).eligible,
    )
    .map((c) => option(catalog, c, profile))
    .filter((o): o is FirstCardOption => o !== null)
    .sort(byValue)
    .slice(0, OPTIONS_PER_ROUTE);

  const noProof = profile.incomeProof === false;

  const fd: FirstCardRoute = {
    kind: 'FD_BACKED',
    title: 'A card against a fixed deposit',
    summary:
      'You open a fixed deposit (FD) with the bank and get a credit card with a limit close to the FD amount. Approval is almost certain, and no salary slip or credit history is needed.',
    points: [
      'Your FD keeps earning interest. The bank only holds it as security while the card is open.',
      'If you do not pay the bill, the bank can take the money from your FD.',
      'Paying the full bill on time every month builds your CIBIL score, just like any other card.',
    ],
    options: fdOptions,
  };

  const addOn: FirstCardRoute = {
    kind: 'ADD_ON',
    title: 'An add-on card on a family member’s card',
    summary:
      'A parent, spouse or sibling who has a credit card can ask their bank for an add-on card in your name. It shares their credit limit and their bill.',
    points: [
      'The main cardholder pays the bill and is responsible for everything you spend.',
      'An add-on card usually does not build your own credit score, because the account is in their name.',
      'Ask for a spending limit on the add-on card, and never share OTPs.',
    ],
    options: [],
  };

  const entry: FirstCardRoute = {
    kind: 'ENTRY',
    title: 'A free or low-fee entry card',
    summary: `Cards with no annual fee (or up to ${inr(FIRST_CARD_MAX_FEE)} plus GST) and a low or no stated income minimum.`,
    points: [
      'The bank checks your income and credit history, so a first application can be turned down.',
      'Apply for one card at a time. Many applications close together lower your score.',
      'Some of these cards are offered first to people who already bank with the issuer.',
    ],
    options: entryOptions,
  };

  // FD-backed first unless the user can show income and already has a credit history.
  const routes = profile.incomeProof === true && profile.hasCreditHistory !== false ? [entry, fd, addOn] : [fd, entry, addOn];

  const warnings: string[] = [];
  if (noProof) warnings.push('Without income proof, most banks will only give an FD-backed card or an add-on card.');
  if (profile.repayment === 'SOMETIMES_MINIMUM') {
    warnings.push(
      `Paying only part of the bill costs about ${interestExample(null).monthlyPct}% a month in interest (a typical rate), and it hurts your CIBIL score. Start with a small limit you can always pay in full.`,
    );
  }
  return { routes, warnings };
}
