import { partnerValue } from './partnerValues';
import type { Card, Catalog, Confidence, Experience, TransferEdge } from './types';

const TIER_RANK: Record<string, number> = { ENTRY: 0, MID: 1, PREMIUM: 2, SUPER_PREMIUM: 3 };

export type RedemptionRoute = {
  kind: 'CASH' | 'TRANSFER';
  label: string;
  partnerId?: string;
  partnerKind?: 'AIRLINE' | 'HOTEL';
  /** Partner units per source point used for this card. */
  ratio: number;
  ratioLabel?: string;
  /** Rupees per source point at a realistic redemption. */
  rupeesPerPoint: number;
  /** Rupees per source point at a good premium redemption. */
  rupeesPerPointCeiling: number;
  confidence: Confidence;
  speed: string | null;
  cap: string | null;
  minTransfer: string | null;
  notes: string[];
};

function edgeConfidence(edge: TransferEdge, partnerConf: Confidence): Confidence {
  if (edge.confidence === 'UNVERIFIED' || edge.confidence === 'LOW' || partnerConf === 'LOW') return 'LOW';
  if (edge.confidence === 'MEDIUM' || partnerConf === 'MEDIUM') return 'MEDIUM';
  return 'HIGH';
}

/**
 * The ratio this card gets on a route. When the ratio varies "per card", only
 * super-premium cards are assumed to get the published (best) ratio; other cards
 * get the worst ratio in the label. Conservative on purpose.
 */
function ratioForCard(edge: TransferEdge, card: Card): number {
  if (!edge.perCard) return edge.ratioGiven;
  return card.tier === 'SUPER_PREMIUM' ? edge.ratioGiven : edge.ratioWorst;
}

/** Rupees per point on the card's default route (cash, statement credit or portal). */
export function safeRupeesPerPoint(card: Card): number {
  if (card.programme) return card.programme.typicalPaisa / 100;
  const row = card.rewards.find((r) => r.category === 'DEFAULT') ?? card.rewards[0];
  return row ? row.pointPaisa / 100 : 0;
}

// Routes depend only on the catalog and the card, and scoring calls them for every
// row of every card, so they are computed once per card.
const routeCache = new WeakMap<Catalog, Map<string, RedemptionRoute[]>>();

/** All ways to use this card's points, best realistic value first. */
export function redemptionRoutes(catalog: Catalog, card: Card): RedemptionRoute[] {
  let cache = routeCache.get(catalog);
  if (!cache) {
    cache = new Map();
    routeCache.set(catalog, cache);
  }
  const hit = cache.get(card.id);
  if (hit) return hit;
  const routes = computeRoutes(catalog, card);
  cache.set(card.id, routes);
  return routes;
}

function computeRoutes(catalog: Catalog, card: Card): RedemptionRoute[] {
  const isCashback = card.rewards.length > 0 && card.rewards.every((r) => r.type === 'CASHBACK');
  const cash: RedemptionRoute = {
    kind: 'CASH',
    label: isCashback ? 'Cashback to statement' : 'Default route (statement credit, vouchers or portal)',
    ratio: 1,
    rupeesPerPoint: safeRupeesPerPoint(card),
    rupeesPerPointCeiling: safeRupeesPerPoint(card),
    confidence: 'HIGH',
    speed: null,
    cap: null,
    minTransfer: null,
    notes: [],
  };
  const routes: RedemptionRoute[] = [cash];
  const nodeId = card.programme?.id;
  if (!nodeId || isCashback) return routes;

  const node = catalog.nodes.get(nodeId);
  // Co-branded cards earn the partner currency directly.
  if (node && node.kind !== 'BANK') {
    const pv = partnerValue(node.id, node.kind);
    routes.push({
      kind: 'TRANSFER',
      label: `Use ${node.name} directly`,
      partnerId: node.id,
      partnerKind: node.kind,
      ratio: 1,
      rupeesPerPoint: pv.typical,
      rupeesPerPointCeiling: pv.best,
      confidence: pv.confidence,
      speed: 'INSTANT',
      cap: null,
      minTransfer: null,
      notes: pv.note ? [pv.note] : [],
    });
  }

  for (const edge of catalog.edgesFrom.get(nodeId) ?? []) {
    if (edge.minTier && TIER_RANK[card.tier] < (TIER_RANK[edge.minTier] ?? 0)) continue;
    const partner = catalog.nodes.get(edge.to);
    if (!partner || partner.kind === 'BANK') continue;
    const pv = partnerValue(partner.id, partner.kind);
    const ratio = ratioForCard(edge, card);
    const notes: string[] = [];
    if (edge.perCard) notes.push(`Ratio varies by card (${edge.ratioLabel}); assumed ${formatRatio(ratio)}.`);
    if (pv.note) notes.push(pv.note);
    routes.push({
      kind: 'TRANSFER',
      label: `Transfer to ${partner.name}`,
      partnerId: partner.id,
      partnerKind: partner.kind,
      ratio,
      ratioLabel: edge.ratioLabel,
      rupeesPerPoint: ratio * pv.typical,
      rupeesPerPointCeiling: ratio * pv.best,
      confidence: edgeConfidence(edge, pv.confidence),
      speed: edge.speed,
      cap: edge.cap,
      minTransfer: edge.minTransfer,
      notes,
    });
  }

  return routes.sort((a, b) => b.rupeesPerPoint - a.rupeesPerPoint);
}

function formatRatio(r: number): string {
  return r >= 1 ? `1:${round2(r)}` : `${round2(1 / r)}:1`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Rupees per point for the "best value" figure. Only routes with at least MEDIUM
 * confidence count, and beginners always get the safe value (spec P7).
 */
export function bestRupeesPerPoint(catalog: Catalog, card: Card, experience: Experience = 'SOME'): number {
  const safe = safeRupeesPerPoint(card);
  if (experience === 'NEW') return safe;
  const best = redemptionRoutes(catalog, card).find((r) => r.kind === 'TRANSFER' && r.confidence !== 'LOW');
  return best ? Math.max(safe, best.rupeesPerPoint) : safe;
}

export type PointsValue = { low: number; high: number; bestRoute: RedemptionRoute; safeRoute: RedemptionRoute };

/** Value range of a points balance: safe route to best realistic route. */
export function pointsValue(catalog: Catalog, card: Card, points: number): PointsValue {
  const routes = redemptionRoutes(catalog, card);
  const safeRoute = routes.find((r) => r.kind === 'CASH') ?? routes[0];
  const bestRoute = routes.find((r) => r.confidence !== 'LOW') ?? safeRoute;
  const low = Math.round(points * safeRoute.rupeesPerPoint);
  const high = Math.round(points * Math.max(bestRoute.rupeesPerPoint, safeRoute.rupeesPerPoint));
  return { low, high, bestRoute, safeRoute };
}

export type RedemptionPlan = {
  recommended: RedemptionRoute;
  alternatives: RedemptionRoute[];
  valueRs: number;
  reason: string;
};

/**
 * Picks a redemption route for a balance. A transfer is recommended only if it beats
 * the safe route by at least 20% (transfers are one-way and lock points into a
 * programme with its own rules). Spec §5.2.
 */
export function planRedemption(
  catalog: Catalog,
  card: Card,
  points: number,
  options: { partnerKind?: 'AIRLINE' | 'HOTEL'; experience?: Experience } = {},
): RedemptionPlan {
  const routes = redemptionRoutes(catalog, card);
  const safe = routes.find((r) => r.kind === 'CASH') ?? routes[0];
  const candidates = routes.filter(
    (r) =>
      r.kind === 'TRANSFER' &&
      r.confidence !== 'LOW' &&
      (!options.partnerKind || r.partnerKind === options.partnerKind),
  );
  const best = candidates[0];

  if (options.experience === 'NEW' || !best || best.rupeesPerPoint < safe.rupeesPerPoint * 1.2) {
    return {
      recommended: safe,
      alternatives: candidates.slice(0, 3),
      valueRs: Math.round(points * safe.rupeesPerPoint),
      reason: best
        ? `${best.label} is not clearly better than the default route, so keep it simple.`
        : 'No reliable transfer route for this card; use the default route.',
    };
  }
  return {
    recommended: best,
    alternatives: [safe, ...candidates.slice(1, 3)],
    valueRs: Math.round(points * best.rupeesPerPoint),
    reason: `${best.label} gives about ₹${round2(best.rupeesPerPoint)} per point versus ₹${round2(
      safe.rupeesPerPoint,
    )} on the default route. Transfer only for a booking you have already found, because transfers cannot be reversed.`,
  };
}

export type GoalPlan = {
  cardId: string;
  route: RedemptionRoute;
  sourcePointsNeeded: [number, number];
  monthsToGoal: [number, number] | null;
};

/**
 * "Free vacation" planner. `partnerPointsNeeded` is a [low, high] range because many
 * award prices are dynamic (spec §5.3); the plan returns a range of months.
 * `monthlyPointsByCard` comes from the user's normal spend (portfolio module), never extra spend.
 */
export function planGoal(
  catalog: Catalog,
  partnerId: string,
  partnerPointsNeeded: [number, number],
  holdings: { cardId: string; points: number; monthlyPoints: number }[],
): GoalPlan[] {
  const plans: GoalPlan[] = [];
  for (const h of holdings) {
    const card = catalog.byId.get(h.cardId);
    if (!card) continue;
    const route = redemptionRoutes(catalog, card).find((r) => r.partnerId === partnerId);
    if (!route) continue;
    const need: [number, number] = [
      Math.ceil(partnerPointsNeeded[0] / route.ratio),
      Math.ceil(partnerPointsNeeded[1] / route.ratio),
    ];
    const months: [number, number] | null =
      h.monthlyPoints > 0
        ? [
            Math.max(0, Math.ceil((need[0] - h.points) / h.monthlyPoints)),
            Math.max(0, Math.ceil((need[1] - h.points) / h.monthlyPoints)),
          ]
        : null;
    plans.push({ cardId: h.cardId, route, sourcePointsNeeded: need, monthsToGoal: months });
  }
  return plans.sort((a, b) => (a.monthsToGoal?.[0] ?? Infinity) - (b.monthsToGoal?.[0] ?? Infinity));
}
