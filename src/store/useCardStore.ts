import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { catalog } from '../data/catalog';
import {
  CATEGORY_LABELS,
  devaluationRisk,
  pointsValue,
  redemptionRoutes,
  walletValue,
} from '../engine';
import type { Card, UserProfile } from '../engine';
import { shortCardName } from '../components/CardFace';

export type CardData = {
  id: string;
  /** Card key in the CardAdvisor catalog (src/data/generated/cards.json). */
  catalogId: string;
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  expiryDays?: number;
  lowValue: number;
  highValue: number;
  annualFee: string;
  renewalFee: string;
  currencyName: string;
  forexMarkup: string;
  rewardHeadline: string;
  translatorExample: string;
  benefits: string[];
  milestones: string[];
  rewardCategories: string[];
  loungeAccess: string;
  intelligence: {
    bestFor: string;
    bestCategory: string;
    recommended: 'Yes' | 'No';
    potentialAnnualValue: number;
  };
};

/** What the user holds. Card facts come from the catalog, not from here. */
export type Holding = {
  id: string;
  catalogId: string;
  /** Short names used by the card artwork (components/CardArt.tsx). */
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  expiryDays?: number;
};

/** Typical monthly spend used for "potential annual value" until the user enters their own. */
export const DEFAULT_PROFILE: UserProfile = {
  monthlySpend: { ONLINE_SHOPPING: 8000, DINING: 4000, GROCERY: 5000, UTILITY_BILLS: 3000, FUEL: 2000, TRAVEL: 3000, DEFAULT: 6000 },
  repayment: 'ALWAYS_FULL',
  experience: 'SOME',
};

const PERK_LABELS: Record<string, string> = {
  MILESTONE_BONUS: 'Milestone bonus on annual spend',
  FUEL_WAIVER: '1% fuel surcharge waiver',
  LOUNGE_ACCESS: 'Airport lounge access',
  MOVIE_TICKET: 'Movie ticket offers',
  INSURANCE: 'Complimentary insurance cover',
  CONCIERGE: 'Concierge service',
  GOLF: 'Golf benefits',
  HOTEL_MEMBERSHIP: 'Hotel membership benefits',
  COBRANDED_OTT: 'OTT subscription benefits',
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function feeText(fee: number | null, lifetimeFree: boolean) {
  if (lifetimeFree || fee === 0) return 'Lifetime free';
  if (fee == null) return 'Not published';
  return `${inr(fee)} + GST`;
}

function loungeText(card: Card) {
  const l = card.lounge;
  if (!l) return 'No lounge access listed';
  const part = (v: number | 'UNLIMITED' | null, label: string) =>
    v === 'UNLIMITED' ? `Unlimited ${label}` : v ? `${v} ${label} visits a year` : null;
  const parts = [part(l.domestic, 'domestic'), part(l.international, 'international')].filter(Boolean);
  if (parts.length === 0) return 'No lounge access listed';
  const gate = l.spendGateRs ? ` (needs ${inr(l.spendGateRs)} spend${l.spendGateWindow ? ` per ${l.spendGateWindow}` : ''})` : '';
  return parts.join(', ') + gate;
}

function bestCategory(card: Card) {
  const top = [...card.rewards].filter((r) => r.category !== 'DEFAULT').sort((a, b) => b.ratePct - a.ratePct)[0];
  return top ? { label: CATEGORY_LABELS[top.category], detail: top.merchantsText ?? CATEGORY_LABELS[top.category] } : null;
}

/** Builds the view model the screens use from a holding plus live catalog data. */
export function toCardData(h: Holding): CardData {
  const card = catalog.byId.get(h.catalogId);
  if (!card) throw new Error(`Unknown card ${h.catalogId}`);
  const value = pointsValue(catalog, card, h.points);
  const isCashback = card.rewards.every((r) => r.type === 'CASHBACK');
  const top = bestCategory(card);
  const bestRoute = redemptionRoutes(catalog, card).find((r) => r.kind === 'TRANSFER' && r.confidence !== 'LOW');
  const annual = walletValue(catalog, [card], DEFAULT_PROFILE);
  const { risk } = devaluationRisk(catalog, card.id);

  return {
    id: h.id,
    catalogId: card.id,
    bankName: h.bankName,
    cardName: h.cardName,
    lastFour: h.lastFour,
    points: h.points,
    expiryDays: h.expiryDays,
    lowValue: value.low,
    highValue: value.high,
    annualFee: feeText(card.annualFee, card.lifetimeFree),
    renewalFee:
      card.feeWaiverSpend != null
        ? `${feeText(card.annualFee, card.lifetimeFree)} (waived on ${inr(card.feeWaiverSpend)} yearly spend)`
        : feeText(card.annualFee, card.lifetimeFree),
    currencyName: isCashback ? 'Cashback' : card.programme?.name ?? 'Reward Points',
    forexMarkup: card.forexPct != null ? `${card.forexPct}% + GST` : 'Not published',
    rewardHeadline:
      card.rateMinPct != null && card.rateMaxPct != null && card.rateMaxPct > card.rateMinPct
        ? `${card.rateMinPct}% to ${card.rateMaxPct}% value back`
        : `${card.rateMinPct ?? card.rewards[0]?.ratePct ?? 0}% value back`,
    translatorExample: bestRoute
      ? `${inr(value.low)} on the default route, or about ${inr(h.points * bestRoute.rupeesPerPoint)} via ${bestRoute.label}`
      : `${inr(value.low)} on the default route`,
    benefits: card.perks.filter((p) => p !== 'MILESTONE_BONUS').map((p) => PERK_LABELS[p] ?? p),
    milestones: card.perks.includes('MILESTONE_BONUS') ? ['Milestone bonuses on yearly spend (check current issuer terms)'] : [],
    rewardCategories: [...new Set(card.rewards.filter((r) => r.category !== 'DEFAULT').map((r) => CATEGORY_LABELS[r.category]))],
    loungeAccess: loungeText(card),
    intelligence: {
      bestFor: top?.label ?? 'Everyday spends',
      bestCategory: top?.detail ?? 'Everyday spends',
      recommended: annual.net > 0 && risk < 0.15 ? 'Yes' : 'No',
      potentialAnnualValue: Math.max(0, annual.net),
    },
  };
}

// Demo wallet. Point balances are sample values until the user enters their own.
const DEMO_HOLDINGS: Holding[] = [
  { id: '1', catalogId: 'hdfc-infinia', bankName: 'HDFC BANK', cardName: 'Infinia', lastFour: '4920', points: 24000 },
  { id: '2', catalogId: 'sbi-bpcl-octane', bankName: 'SBI CARD', cardName: 'BPCL Octane', lastFour: '8821', points: 4200, expiryDays: 18 },
  { id: '3', catalogId: 'amex-platinum-travel', bankName: 'AMERICAN EXPRESS', cardName: 'Platinum Travel', lastFour: '1234', points: 15000 },
  { id: '4', catalogId: 'hdfc-regalia-gold', bankName: 'HDFC BANK', cardName: 'Regalia Gold', lastFour: '5678', points: 32000 },
  { id: '5', catalogId: 'hdfc-marriott-bonvoy', bankName: 'HDFC BANK', cardName: 'Marriott Bonvoy', lastFour: '9012', points: 18000 },
];

/** Random id for this install. Sent to the Aura server only for rate limiting. */
const newUserId = () => `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface CardStore {
  userId: string;
  holdings: Holding[];
  cards: CardData[];
  profile: UserProfile;
  /** True until the user adds or edits a card; the wallet then holds only their own cards. */
  isDemo: boolean;
  /** Set once the user has answered the Find My Card questions. */
  profileSaved: boolean;
  setProfile: (profile: UserProfile) => void;
  addCard: (catalogId: string, lastFour: string, points: number) => void;
  updateHolding: (id: string, changes: Partial<Pick<Holding, 'lastFour' | 'points' | 'expiryDays'>>) => void;
  removeHolding: (id: string) => void;
  clearDemo: () => void;
  /** Aura reply language. Missing means English. */
  auraLanguage?: 'en' | 'hi';
  /** Aura gives one number and one action in short sentences. */
  auraSimple?: boolean;
  /** Plain surfaces, no autoplay or heavy animation, list before map. */
  liteMode?: boolean;
  /** Set once the intro video has played (or was skipped). */
  introSeen?: boolean;
  setAuraLanguage: (language: 'en' | 'hi') => void;
  setAuraSimple: (simple: boolean) => void;
  setLiteMode: (lite: boolean) => void;
  setIntroSeen: () => void;
}

const derive = (holdings: Holding[]) => holdings.flatMap((h) => (catalog.byId.has(h.catalogId) ? [toCardData(h)] : []));

/** Holding for a catalog card, with short display names for the card art. */
export function newHolding(catalogId: string, lastFour: string, points: number): Holding {
  const card = catalog.byId.get(catalogId);
  if (!card) throw new Error(`Unknown card ${catalogId}`);
  return {
    id: `${catalogId}-${Date.now()}`,
    catalogId,
    bankName: card.issuer === 'AMEX' ? 'AMERICAN EXPRESS' : `${card.issuer} BANK`,
    cardName: shortCardName(card.name, card.issuer) || card.name,
    lastFour,
    points,
  };
}

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      userId: newUserId(),
      holdings: DEMO_HOLDINGS,
      cards: derive(DEMO_HOLDINGS),
      profile: DEFAULT_PROFILE,
      isDemo: true,
      profileSaved: false,
      setProfile: (profile) => set({ profile, profileSaved: true }),
      addCard: (catalogId, lastFour, points) =>
        set((s) => {
          // The first real card replaces the demo wallet.
          const base = s.isDemo ? [] : s.holdings;
          const holdings = [...base, newHolding(catalogId, lastFour, points)];
          return { holdings, cards: derive(holdings), isDemo: false };
        }),
      updateHolding: (id, changes) =>
        set((s) => {
          const holdings = s.holdings.map((h) => (h.id === id ? { ...h, ...changes } : h));
          return { holdings, cards: derive(holdings) };
        }),
      removeHolding: (id) =>
        set((s) => {
          const holdings = s.holdings.filter((h) => h.id !== id);
          return { holdings, cards: derive(holdings) };
        }),
      clearDemo: () => set({ holdings: [], cards: [], isDemo: false }),
      setAuraLanguage: (auraLanguage) => set({ auraLanguage }),
      setAuraSimple: (auraSimple) => set({ auraSimple }),
      setLiteMode: (liteMode) => set({ liteMode }),
      setIntroSeen: () => set({ introSeen: true }),
    }),
    {
      name: 'walletwise-wallet',
      storage: createJSONStorage(() => AsyncStorage),
      // Card facts always come from the bundled catalog, so only the user's own data is saved.
      partialize: (s) => ({ userId: s.userId, holdings: s.holdings, profile: s.profile, isDemo: s.isDemo, profileSaved: s.profileSaved,
        auraLanguage: s.auraLanguage, auraSimple: s.auraSimple, liteMode: s.liteMode, introSeen: s.introSeen }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CardStore>;
        const holdings = saved.holdings ?? current.holdings;
        return { ...current, ...saved, holdings, cards: derive(holdings) };
      },
    },
  ),
);
