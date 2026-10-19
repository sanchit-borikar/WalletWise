/**
 * Tools Aura can call. Each wraps existing WalletWise engine logic (../../src/engine),
 * so every number Aura says comes from the same code the app uses on screen.
 * Tools never throw: errors come back as { ok: false, error, message } for the model to explain.
 */
import { catalog } from '../../../src/data/catalog';
import {
  CATEGORY_LABELS,
  cardChanges,
  planRedemption,
  planTripPayment,
  pointsValue,
  rankCardsForPurchase,
  searchCards,
  walletValue,
} from '../../../src/engine';
import type { Card, Category, Experience, UserProfile } from '../../../src/engine';
import type { ToolDefinition } from '../llm/index.ts';
import { searchCardKnowledge } from '../rag/search.ts';

/** What the app sends about the user's wallet. Card numbers are never sent. */
export type WalletContext = {
  cards: { catalogId: string; points: number; label?: string }[];
  profile?: Partial<Pick<UserProfile, 'experience' | 'repayment' | 'monthlySpend'>>;
};

export type Cta = { label: string; route: string; params?: Record<string, string> };

export type ToolContext = {
  wallet: WalletContext;
  /** Set by show_app_screen; sent to the app with the answer. */
  setCta: (cta: Cta) => void;
};

type ToolResult = Record<string, unknown>;
type Tool = ToolDefinition & { run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult> | ToolResult };

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const round = (n: number) => Math.round(n);
const fail = (error: string, message: string): ToolResult => ({ ok: false, error, message });

function walletCards(ctx: ToolContext) {
  return ctx.wallet.cards
    .map((h) => ({ holding: h, card: catalog.byId.get(h.catalogId) }))
    .filter((x): x is { holding: WalletContext['cards'][number]; card: Card } => !!x.card);
}

function experience(ctx: ToolContext): Experience {
  return ctx.wallet.profile?.experience ?? 'SOME';
}

/** Finds a card by catalog id or by name ("Infinia", "Diners Black"). */
export function resolveCard(idOrName: string): Card | null {
  const exact = catalog.byId.get(idOrName.trim().toLowerCase());
  if (exact) return exact;
  const cleaned = idOrName.replace(/\b(credit|card|bank|international|metal|edition)\b/gi, ' ').trim();
  return searchCards(catalog, cleaned, 1)[0] ?? null;
}

function cardSummary(card: Card) {
  return {
    cardId: card.id,
    name: card.name,
    issuer: card.issuer,
    network: card.network,
    annual_fee_inr: card.annualFee,
    fee_waiver_spend_inr: card.feeWaiverSpend,
    top_rates: [...card.rewards]
      .sort((a, b) => b.ratePct - a.ratePct)
      .slice(0, 4)
      .map((r) => ({ category: CATEGORY_LABELS[r.category], value_back_pct: r.ratePct, monthly_cap_inr: r.capRs, only_at: r.merchantsText })),
    last_updated: card.lastChanged,
  };
}

// ── Screens the app can open (whitelist) ─────────────────
const SCREENS: Record<string, { label: string; route: string }> = {
  best_card_map: { label: 'Open Best Card map', route: '/map' },
  trip_planner: { label: 'Open Trip Planner', route: '/trip-planner' },
  find_my_card: { label: 'Open Find My Card', route: '/find-card' },
  wallet: { label: 'Open my Wallet', route: '/wallet' },
  add_card: { label: 'Add a card', route: '/add-card' },
  card_details: { label: 'Open card details', route: '/card-detail' },
};

export const TOOLS: Tool[] = [
  {
    name: 'get_user_wallet',
    description: "List the cards the user holds, with points balance, point value range and each card's best reward rates. Call this before answering anything about 'my cards'.",
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: (_args, ctx) => {
      const cards = walletCards(ctx);
      if (cards.length === 0) return fail('empty_wallet', 'The user has not added any cards yet.');
      return {
        ok: true,
        cards: cards.map(({ holding, card }) => {
          const value = pointsValue(catalog, card, holding.points);
          return { ...cardSummary(card), points: holding.points, points_value_inr: { low: value.low, high: value.high } };
        }),
      };
    },
  },
  {
    name: 'get_best_card',
    description:
      'Rank the cards the user holds for one purchase and return rupees back and points earned for each. Use for "which card for X", "how much will I earn at Y". Never calculate rewards yourself.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES, description: 'Spend category. DEFAULT means everyday/other spends.' },
        amount: { type: 'number', description: 'Purchase amount in INR' },
        merchant: { type: 'string', description: 'Merchant or brand if known, e.g. Swiggy, Amazon, BPCL, DMart' },
        online: { type: 'boolean', description: 'Paid online or in an app' },
        upi: { type: 'boolean', description: 'Paid through UPI (only RuPay credit cards can)' },
        international: { type: 'boolean', description: 'Paid in a foreign currency' },
      },
      required: ['category', 'amount'],
      additionalProperties: false,
    },
    run: (args, ctx) => {
      const amount = Number(args.amount);
      if (!(amount > 0)) return fail('invalid_amount', 'Amount must be a positive number of rupees.');
      const category = CATEGORIES.includes(args.category as Category) ? (args.category as Category) : 'DEFAULT';
      const cards = walletCards(ctx);
      if (cards.length === 0) return fail('empty_wallet', 'The user has not added any cards yet.');
      const ranked = rankCardsForPurchase(
        catalog,
        cards.map((c) => c.card),
        {
          amount,
          category,
          merchant: typeof args.merchant === 'string' ? args.merchant : undefined,
          online: args.online === true || category === 'ONLINE_SHOPPING',
          channel: args.upi === true ? 'UPI' : 'CARD',
          international: args.international === true || category === 'INTERNATIONAL',
        },
        { experience: experience(ctx) },
      );
      if (ranked.length === 0) return fail('no_usable_card', 'None of the user\'s cards can be used for this payment (UPI needs a RuPay credit card).');
      return {
        ok: true,
        amount_inr: amount,
        category: CATEGORY_LABELS[category],
        ranking: ranked.slice(0, 3).map((r, i) => ({
          rank: i + 1,
          cardId: r.card.id,
          card: r.card.name,
          rupees_back: r.safeValue,
          rupees_back_if_points_transferred: r.bestValue,
          points_earned: r.pointsEarned,
          reward_unit: r.rewardUnit,
          forex_cost_inr: r.forexCost,
          reason: r.reason,
          warnings: r.warnings,
          confidence: r.confidence,
        })),
      };
    },
  },
  {
    name: 'get_points_value',
    description: "What the user's points are worth and the best way to redeem them (cash/portal vs airline or hotel transfer). Optionally for one card.",
    parameters: {
      type: 'object',
      properties: { cardId: { type: 'string', description: 'Card id or name from the user wallet. Omit for all cards.' } },
      additionalProperties: false,
    },
    run: (args, ctx) => {
      let cards = walletCards(ctx);
      if (cards.length === 0) return fail('empty_wallet', 'The user has not added any cards yet.');
      if (typeof args.cardId === 'string' && args.cardId) {
        const card = resolveCard(args.cardId);
        cards = cards.filter((c) => c.card.id === card?.id);
        if (cards.length === 0) return fail('card_not_in_wallet', `The user does not hold "${args.cardId}".`);
      }
      return {
        ok: true,
        cards: cards.map(({ holding, card }) => {
          const plan = planRedemption(catalog, card, holding.points, { experience: experience(ctx) });
          const value = pointsValue(catalog, card, holding.points);
          return {
            cardId: card.id,
            card: card.name,
            points: holding.points,
            value_inr: { low: value.low, high: value.high },
            recommended_route: plan.recommended.label,
            recommended_value_inr: plan.valueRs,
            reason: plan.reason,
            alternatives: plan.alternatives.map((r) => ({ route: r.label, rupees_per_point: Math.round(r.rupeesPerPoint * 100) / 100, confidence: r.confidence })),
          };
        }),
      };
    },
  },
  {
    name: 'get_card_updates',
    description: 'Recent and upcoming changes (devaluations, fee changes, improvements) for the user\'s cards, or for one named card (any Indian card).',
    parameters: {
      type: 'object',
      properties: { cardId: { type: 'string', description: 'Card id or name. Omit for all cards in the wallet.' } },
      additionalProperties: false,
    },
    run: (args, ctx) => {
      if (typeof args.cardId === 'string' && args.cardId) return updatesFor([args.cardId]);
      const ids = ctx.wallet.cards.map((c) => c.catalogId);
      if (ids.length === 0) return fail('empty_wallet', 'The user has not added any cards yet.');
      return updatesFor(ids);
    },
  },
  {
    name: 'plan_trip',
    description:
      'Plan paying for a trip: the best card to pay the cash fare, how far the user\'s points cover it, and months of normal spending to cover the rest. "spend" is the total fare or trip cost in INR.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Where the user is going, e.g. Goa' },
        spend: { type: 'number', description: 'Total fare or trip cost in INR' },
      },
      required: ['destination', 'spend'],
      additionalProperties: false,
    },
    run: (args, ctx) => {
      const spend = Number(args.spend);
      if (!(spend > 0)) return fail('invalid_amount', 'Trip cost must be a positive number of rupees.');
      const cards = walletCards(ctx);
      if (cards.length === 0) return fail('empty_wallet', 'The user has not added any cards yet.');
      const profile: UserProfile = {
        monthlySpend: ctx.wallet.profile?.monthlySpend ?? {},
        repayment: ctx.wallet.profile?.repayment ?? 'ALWAYS_FULL',
        experience: experience(ctx),
      };
      const monthly = walletValue(catalog, cards.map((c) => c.card), profile).annualReward / 12;
      const plan = planTripPayment(
        catalog,
        cards.map((c) => ({ card: c.card, points: c.holding.points })),
        spend,
        { experience: experience(ctx), monthlyRewardRs: monthly > 0 ? monthly : undefined },
      );
      ctx.setCta({ label: 'Open Trip Planner', route: '/trip-planner', params: { fare: String(round(spend)) } });
      return {
        ok: true,
        destination: String(args.destination ?? ''),
        trip_cost_inr: spend,
        pay_cash_with: plan.payCash ? { card: plan.payCash.card.name, rupees_back: plan.payCash.netValue, points_earned: plan.payCash.pointsEarned, reason: plan.payCash.reason } : null,
        points_plan: plan.pointsMix.map((p) => ({ card: p.cardName, route: p.route, points_used: p.pointsUsed, value_inr: p.valueRs, rupees_per_point: p.rupeesPerPoint, confidence: p.confidence })),
        covered_by_points_inr: plan.coveredRs,
        shortfall_inr: plan.shortfallRs,
        months_to_cover_shortfall: plan.monthsToCover,
        notes: plan.notes,
      };
    },
  },
  {
    name: 'search_card_knowledge',
    description:
      'Search verified card documents (fees, reward rates, caps, lounge access, redemption, exclusions, recent changes) for any Indian credit card or general credit-card basics. Use for "tell me about <card>" and any factual question. Returns chunks with card name and last_updated, or status "no_confident_match".',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The question in plain English words, including the card names. Always English, even if the user writes in Hindi or another language.' },
        cardIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional card ids or names to search. For a comparison pass every card, e.g. ["Axis Atlas", "Axis Magnus"].',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    run: async (args) => {
      const query = String(args.query ?? '').trim();
      if (!query) return fail('invalid_query', 'Query is empty.');
      // Accept a list, or one string that names several cards ("Atlas, Magnus", "Atlas vs Magnus").
      const raw = [
        ...(Array.isArray(args.cardIds) ? args.cardIds : []),
        ...(typeof args.cardId === 'string' ? [args.cardId] : []),
      ]
        .flatMap((v) => String(v).split(/,|;|\/|&|\band\b|\bvs\.?(?=\s|$)|\bversus\b/i))
        .map((v) => v.trim())
        .filter(Boolean);
      const ids = [...new Set(raw.map((v) => resolveCard(v)?.id).filter((id): id is string => !!id))];
      // Names the model passed that match nothing: let the search read the card names from the question instead.
      return searchCardKnowledge(query, ids.length ? ids : undefined);
    },
  },
  {
    name: 'show_app_screen',
    description: 'Show a button under your answer that opens a WalletWise screen when one fits (for example the Best Card map after a purchase question). Call at most once per answer.',
    parameters: {
      type: 'object',
      properties: {
        screen: { type: 'string', enum: Object.keys(SCREENS) },
        cardId: { type: 'string', description: 'Required for card_details: a card id from the user wallet' },
      },
      required: ['screen'],
      additionalProperties: false,
    },
    run: (args, ctx) => {
      const screen = SCREENS[String(args.screen)];
      if (!screen) return fail('unknown_screen', 'That screen does not exist.');
      if (args.screen === 'card_details') {
        const card = typeof args.cardId === 'string' ? resolveCard(args.cardId) : null;
        const held = card && ctx.wallet.cards.find((c) => c.catalogId === card.id);
        if (!held) return fail('card_not_in_wallet', 'Card details can only open for a card in the wallet.');
        ctx.setCta({ label: `Open ${card.name}`, route: screen.route, params: { catalogId: card.id } });
      } else {
        ctx.setCta(screen);
      }
      return { ok: true, shown: screen.label };
    },
  },
];

function updatesFor(idsOrNames: string[]): ToolResult {
  const out = [];
  for (const idOrName of idsOrNames) {
    const card = resolveCard(idOrName);
    if (!card) {
      out.push({ requested: idOrName, error: 'card_not_found' });
      continue;
    }
    const { upcoming, recent } = cardChanges(catalog, card.id);
    const fmt = (e: (typeof upcoming)[number]) => ({ date: e.date, title: e.title, direction: e.direction, magnitude: e.magnitude, now: e.after });
    out.push({ cardId: card.id, card: card.name, upcoming: upcoming.map(fmt), recent_180_days: recent.slice(0, 6).map(fmt) });
  }
  return { ok: true, source: `CardAdvisor change data, snapshot ${catalog.meta.asOf.changes}`, cards: out };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters }));

/** Runs one tool call and always returns a JSON string for the model. */
export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return JSON.stringify(fail('unknown_tool', `No tool named ${name}.`));
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return JSON.stringify(fail('invalid_arguments', 'Arguments were not valid JSON.'));
  }
  try {
    return JSON.stringify(await tool.run(args, ctx));
  } catch (error) {
    return JSON.stringify(fail('tool_failed', error instanceof Error ? error.message : String(error)));
  }
}
