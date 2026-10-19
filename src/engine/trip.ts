/**
 * Trip planner: pay a flight or hotel fare in cash with the best card, or cover it
 * with points from the cards the user holds. Fares come from the user (for example
 * from a Skyscanner search); award seat prices are not modelled, so the points side
 * values each point at its realistic route value and is labelled an estimate.
 */
import { scorePurchase } from './purchase';
import { redemptionRoutes } from './redemption';
import type { Card, Catalog, Experience, PurchaseResult } from './types';

export type TripHolding = { card: Card; points: number };

export type PointsUse = {
  cardId: string;
  cardName: string;
  route: string;
  rupeesPerPoint: number;
  pointsUsed: number;
  valueRs: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type TripPlan = {
  fareRs: number;
  /** Best card to pay the fare in cash (travel spend, portal allowed for non-beginners). */
  payCash: PurchaseResult | null;
  /** Points from each card, best value per point first, until the fare is covered. */
  pointsMix: PointsUse[];
  coveredRs: number;
  shortfallRs: number;
  /** Months of normal spending to earn the shortfall, if monthly reward value is known. */
  monthsToCover: number | null;
  notes: string[];
};

export function planTripPayment(
  catalog: Catalog,
  holdings: TripHolding[],
  fareRs: number,
  options: { experience?: Experience; monthlyRewardRs?: number; kind?: 'FLIGHT' | 'HOTEL'; today?: string } = {},
): TripPlan {
  const { experience = 'SOME', monthlyRewardRs, kind = 'FLIGHT', today } = options;
  const notes: string[] = [];

  const cashResults = holdings
    .map((h) =>
      scorePurchase(catalog, h.card, { amount: fareRs, category: 'TRAVEL', online: true, allowPortal: experience !== 'NEW' }, { experience, today }),
    )
    .filter((r): r is PurchaseResult => r !== null)
    .sort((a, b) => b.score - a.score);
  const payCash = cashResults[0] ?? null;

  // Best usable route per card for this kind of trip.
  const wrongKind = kind === 'FLIGHT' ? 'HOTEL' : 'AIRLINE';
  const options_ = holdings
    .filter((h) => h.points > 0)
    .map((h) => {
      const routes = redemptionRoutes(catalog, h.card).filter(
        (r) => r.partnerKind !== wrongKind && (experience === 'NEW' ? r.kind === 'CASH' : r.confidence !== 'LOW'),
      );
      const route = routes[0];
      return route ? { h, route } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.route.rupeesPerPoint > 0)
    .sort((a, b) => b.route.rupeesPerPoint - a.route.rupeesPerPoint);

  let remaining = fareRs;
  const pointsMix: PointsUse[] = [];
  for (const { h, route } of options_) {
    if (remaining <= 0) break;
    const needed = Math.ceil(remaining / route.rupeesPerPoint);
    const pointsUsed = Math.min(needed, h.points);
    const valueRs = Math.min(remaining, pointsUsed * route.rupeesPerPoint);
    pointsMix.push({
      cardId: h.card.id,
      cardName: h.card.name,
      route: route.label,
      rupeesPerPoint: Math.round(route.rupeesPerPoint * 100) / 100,
      pointsUsed,
      valueRs: Math.round(valueRs),
      confidence: route.confidence,
    });
    remaining -= valueRs;
  }

  const coveredRs = Math.round(fareRs - Math.max(0, remaining));
  const shortfallRs = Math.max(0, Math.round(remaining));
  const monthsToCover = shortfallRs > 0 && monthlyRewardRs && monthlyRewardRs > 0 ? Math.ceil(shortfallRs / monthlyRewardRs) : shortfallRs > 0 ? null : 0;

  if (pointsMix.some((p) => p.route.startsWith('Transfer'))) {
    notes.push('Transfers are one-way and award seats can disappear. Find the seat on the airline or hotel site first, then transfer only what you need.');
  }
  if (pointsMix.some((p) => p.confidence !== 'HIGH')) {
    notes.push('Point values for transfers are WalletWise estimates. Real award prices vary by date and route.');
  }
  if (payCash?.usesPortal) notes.push(`Paying cash earns most when booked through ${payCash.row?.merchantsText ?? "the bank's travel portal"}.`);

  return { fareRs, payCash, pointsMix, coveredRs, shortfallRs, monthsToCover, notes };
}

/** Skyscanner search link for the user to check real cash fares (YYMMDD date slug). */
export function skyscannerUrl(from: string, to: string, dateIso: string, adults = 1, cabin: 'economy' | 'premiumeconomy' | 'business' | 'first' = 'economy') {
  const [y, m, d] = dateIso.split('-');
  const slug = `${y.slice(2)}${m}${d}`;
  return `https://www.skyscanner.co.in/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/${slug}/?adultsv2=${adults}&cabinclass=${cabin}`;
}
