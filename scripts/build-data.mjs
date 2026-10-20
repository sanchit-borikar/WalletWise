/**
 * Builds the compact, typed-friendly data bundle the app ships with.
 *
 * Input:  datasets/*.json (CardAdvisor open data, CC BY 4.0)
 *         datasets/overrides/extra-cards.json (cards added by hand from issuer pages)
 *         datasets/overrides/inclusion.json (hand-checked FD-backed and UPI facts per card)
 * Output: src/data/generated/*.json
 *
 * Run: npm run build:data (offline: reads local files only)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inDir = join(root, 'datasets');
const outDir = join(root, 'src', 'data', 'generated');

const read = (name) => JSON.parse(readFileSync(join(inDir, name), 'utf8'));
const readOptional = (name, fallback) => (existsSync(join(inDir, name)) ? read(name) : fallback);
const write = (name, data) => writeFileSync(join(outDir, name), JSON.stringify(data));

// Banks covered by the RBI Small Finance Bank directions rather than the
// commercial bank directions (see research/credit-card-knowledge-base.md §16).
const SMALL_FINANCE_BANKS = new Set(['AU', 'UTKARSH', 'UNITY', 'SLICE']);

// Rows whose merchant scope means "buy through the bank's portal / voucher store".
const PORTAL_PATTERN = /smartbuy|voucher|portal|gyftr|woohoo|travel ?edge|ishop|shopwise|reward multiplier|grab ?deals|emall/i;

// Sanity bound for an effective cash return. Higher rows are kept but flagged.
const RATE_OUTLIER_PCT = 40;

const warnings = [];

function splitMerchants(text) {
  if (!text) return null;
  // A bracketed list describes sub-services ("Swiggy app (Food, Instamart)") and is
  // dropped so generic words like "food" do not match. A single bracketed word is an
  // alias ("Bharat Petroleum (BPCL)") and is kept.
  const outer = text.replace(/\(([^)]*)\)/g, (_, group) => (group.includes(',') ? '' : `, ${group}`));
  const tokens = outer
    .split(/,|\band\b|&|\//i)
    .map((t) => t.replace(/\b(app|and other select online|other select online|select)\b/gi, '').trim().toLowerCase())
    .filter((t) => t.length > 1);
  return [...new Set(tokens)];
}

function parseRatios(label, fromUnits, toUnits) {
  const values = [...String(label).matchAll(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/g)].map(
    (m) => Number(m[2]) / Number(m[1]),
  );
  const given = toUnits / fromUnits;
  if (values.length === 0) values.push(given);
  return {
    given,
    worst: Math.min(...values, given),
    best: Math.max(...values, given),
    perCard: /per card/i.test(String(label)),
  };
}

// ── Cards ──────────────────────────────────────────────
const cardsRaw = read('cards.json');
// Hand-added cards (public-sector banks the CardAdvisor data does not cover). Each has its own source and date.
const extraRaw = readOptional('overrides/extra-cards.json', { cards: [] });
const inclusionRaw = readOptional('overrides/inclusion.json', { cards: {} });
const knownKeys = new Set(cardsRaw.cards.map((c) => c.cardKey));
for (const c of extraRaw.cards) {
  if (knownKeys.has(c.cardKey)) throw new Error(`extra-cards.json repeats an existing card: ${c.cardKey}`);
  if (!c.source || !c.verifiedAt) throw new Error(`extra-cards.json card without source or verifiedAt: ${c.cardKey}`);
  knownKeys.add(c.cardKey);
}
for (const [key, inc] of Object.entries(inclusionRaw.cards)) {
  if (!knownKeys.has(key)) throw new Error(`inclusion.json names an unknown card: ${key}`);
  if (!inc.source || !inc.verifiedAt) throw new Error(`inclusion.json entry without source or verifiedAt: ${key}`);
}
const allCards = [...cardsRaw.cards, ...extraRaw.cards];
const valuationsRaw = read('valuations.json');
const transfersRaw = read('transfers.json');
const loungesRaw = read('lounges.json');
const changesRaw = read('changes.json');

const nodeByName = new Map(transfersRaw.nodes.map((n) => [n.name.toLowerCase(), n]));
const nodeById = new Map(transfersRaw.nodes.map((n) => [n.id, n]));
// Co-branded cards earn the partner's own currency.
const PROGRAMME_ALIASES = {
  'lufthansa miles & more award miles': 'MILES_AND_MORE',
  'marriott bonvoy points': 'MARRIOTT_BONVOY',
  'emirates skywards miles': 'EMIRATES_SKYWARDS',
  'avios (british airways executive club / qatar privilege club)': 'BA_EXECUTIVE_CLUB',
};
const findNode = (programName) => {
  const key = programName.toLowerCase();
  return nodeByName.get(key) ?? nodeById.get(PROGRAMME_ALIASES[key]);
};
const valuationByCard = new Map(valuationsRaw.cards.map((v) => [v.cardKey, v]));
const loungeByCard = new Map(loungesRaw.cards.map((l) => [l.cardKey, l]));

function inclusionFor(i) {
  return {
    secured: i.secured,
    minFdRs: i.minFdRs ?? null,
    noIncomeProof: i.noIncomeProof ?? null,
    upi: i.upi
      ? {
          earnsRewards: i.upi.earnsRewards,
          ratePct: i.upi.ratePct ?? null,
          capRs: i.upi.capRs ?? null,
          ...(i.upi.scanAndPayOnly ? { scanAndPayOnly: true, onlineRatePct: i.upi.onlineRatePct ?? null } : {}),
          notes: i.upi.notes ?? null,
        }
      : null,
    ...(i.existingCustomersOnly ? { existingCustomersOnly: true } : {}),
    source: i.source,
    verifiedAt: i.verifiedAt,
  };
}

function loungeSummary(l) {
  if (!l) return null;
  const visits = (unlimited, perYear, perQuarter, present) => {
    if (unlimited) return 'UNLIMITED';
    if (perYear != null) return perYear;
    if (perQuarter != null) return perQuarter * 4;
    return present ? null : 0;
  };
  return {
    domestic: visits(l.domesticUnlimited, l.domesticVisitsPerYear, l.domesticPerQuarter, l.domesticPresent),
    international: visits(
      l.internationalUnlimited,
      l.internationalVisitsPerYear,
      l.internationalPerQuarter,
      l.internationalPresent,
    ),
    spendGateRs: l.spendGateAmountRs ?? null,
    spendGateWindow: l.spendGateWindow ?? null,
    programmes: l.programmes ?? [],
    upcomingChangeFrom: l.upcomingChangeFrom ?? null,
    upcomingChangeText: l.upcomingChangeText ?? null,
  };
}

const cards = allCards.map((c) => {
  const valuation = valuationByCard.get(c.cardKey);
  const node = valuation ? findNode(valuation.programName) : undefined;
  if (valuation && !node) warnings.push(`No transfer node for programme "${valuation.programName}" (${c.cardKey})`);

  const rewards = c.rewards
    .filter((r) => {
      if (r.ratePct == null) {
        warnings.push(`Dropped reward row without rate: ${c.cardKey} ${r.category}`);
        return false;
      }
      return true;
    })
    .map((r) => {
      if (r.ratePct > RATE_OUTLIER_PCT) warnings.push(`Rate outlier ${r.ratePct}%: ${c.cardKey} ${r.category}`);
      return {
        category: r.category,
        type: r.rewardType,
        ratePct: r.ratePct,
        // The dataset's monthly cap is on the reward earned in rupees, not on spend.
        // Checked against issuer terms: HDFC Infinia SmartBuy vouchers (3,000 RP),
        // SBI BPCL Octane fuel (2,500 RP x 25p = Rs 625), HDFC Millennia (Rs 1,000).
        capRs: r.monthlyCapRs,
        pointPaisa: r.pointValuePaisa,
        merchantsText: r.merchants,
        merchants: splitMerchants(r.merchants),
        portal: r.merchants ? PORTAL_PATTERN.test(r.merchants) : false,
      };
    });

  return {
    id: c.cardKey,
    name: c.name,
    issuer: c.issuer,
    issuerType: SMALL_FINANCE_BANKS.has(c.issuer) ? 'SFB' : 'COMMERCIAL',
    network: c.network,
    tier: c.tier,
    annualFee: c.annualFeeRs,
    joiningFee: c.joiningFeeRs,
    lifetimeFree: c.lifetimeFree,
    feeWaiverSpend: c.feeWaiverSpendRs,
    forexPct: c.forexMarkupPct,
    aprMonthlyPct: c.aprMonthlyPct,
    minMonthlyIncome: c.minSalaryRs,
    minAge: c.minAgeYears,
    maxAge: c.maxAgeYears,
    rateMinPct: c.rewardRateMinPct,
    rateMaxPct: c.rewardRateMaxPct,
    lastChanged: c.lastVerified,
    url: c.url,
    programme: valuation
      ? {
          id: node?.id ?? null,
          name: valuation.programName,
          type: valuation.rewardType,
          typicalPaisa: valuation.typicalPaisaPerPoint,
        }
      : null,
    rewards,
    perks: c.perks.map((p) => p.perkType),
    lounge: loungeSummary(loungeByCard.get(c.cardKey)),
    ...(c.source ? { source: c.source, verifiedAt: c.verifiedAt } : {}),
    ...(inclusionRaw.cards[c.cardKey] ? { inclusion: inclusionFor(inclusionRaw.cards[c.cardKey]) } : {}),
  };
});

// ── Transfer graph ─────────────────────────────────────
const nodes = transfersRaw.nodes.map((n) => ({ id: n.id, kind: n.kind, name: n.name, verifiedAt: n.lastVerified }));
const edges = transfersRaw.edges.map((e) => {
  const ratios = parseRatios(e.ratio, e.fromUnits, e.toUnits);
  return {
    from: e.from,
    to: e.to,
    ratioLabel: e.ratio,
    ratioGiven: ratios.given,
    ratioWorst: ratios.worst,
    ratioBest: ratios.best,
    perCard: ratios.perCard,
    minTier: e.minTier,
    minTransfer: e.minTransfer,
    cap: e.cap,
    transferTime: e.transferTime,
    speed: e.speed,
    confidence: e.confidence,
    provenance: e.provenanceTier,
    issuerControlled: e.issuerControlled,
    source: e.sourceUrl,
    verifiedAt: e.lastVerified,
  };
});

// ── Changes (devaluations and improvements) ───────────
// Twelve months of history is enough for risk scoring and alerts.
const CHANGE_SINCE = '2025-10-01';
const changes = changesRaw.events
  .filter((e) => e.date >= CHANGE_SINCE && e.status !== 'superseded' && e.status !== 'reversed')
  .map((e) => ({
    cardId: e.cardKey,
    date: e.date,
    announced: e.announced,
    type: e.type,
    direction: e.direction,
    magnitude: e.magnitude || 'minor',
    title: e.title,
    before: e.before,
    after: e.after,
    confidence: e.confidence,
    source: e.verificationUrl,
  }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

// ── Write ──────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });
write('cards.json', cards);
write('transfers.json', { nodes, edges });
write('changes.json', changes);
write('meta.json', {
  generatedAt: new Date().toISOString(),
  source: 'CardAdvisor open data (https://cardadvisor.in/data)',
  license: 'CC BY 4.0',
  attribution: 'Card data: CardAdvisor (cardadvisor.in/data), licensed CC BY 4.0. Public-sector bank cards and FD/UPI facts were checked by WalletWise on issuer websites. Values derived by WalletWise are estimates.',
  asOf: {
    cards: cardsRaw.asOf,
    ...(extraRaw.asOf ? { extraCards: extraRaw.asOf } : {}),
    ...(inclusionRaw.asOf ? { inclusion: inclusionRaw.asOf } : {}),
    valuations: valuationsRaw.asOf,
    transfers: transfersRaw.asOf,
    lounges: loungesRaw.asOf,
    changes: changesRaw.asOf,
  },
  counts: { cards: cards.length, extraCards: extraRaw.cards.length, inclusion: Object.keys(inclusionRaw.cards).length, edges: edges.length, changes: changes.length },
});

console.log(`Wrote ${cards.length} cards, ${edges.length} transfer routes, ${changes.length} change events to src/data/generated/`);
if (warnings.length) {
  console.log(`\n${warnings.length} data warnings:`);
  for (const w of warnings) console.log(`  - ${w}`);
}
