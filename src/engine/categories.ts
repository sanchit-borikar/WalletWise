import type { Category } from './types';

/**
 * Categories where many Indian cards give no reward or a reduced one
 * (fuel surcharge rules, rent, wallet loads, government payments, and similar).
 * If a card has no explicit row for one of these, the engine does not assume the
 * base rate applies: the safe value is 0 and the base rate is shown as "possible".
 * Source: research/credit-card-knowledge-base.md §10 (exclusions added during 2025-26).
 */
export const EXCLUSION_PRONE: ReadonlySet<Category> = new Set<Category>([
  'FUEL',
  'RENT',
  'WALLET',
  'GOVERNMENT',
  'EDUCATION',
  'INSURANCE',
  'UTILITY_BILLS',
  'EMI',
]);

export const CATEGORY_LABELS: Record<Category, string> = {
  DEFAULT: 'Everyday spends',
  ONLINE_SHOPPING: 'Online shopping',
  UTILITY_BILLS: 'Bills and utilities',
  TRAVEL: 'Travel',
  DINING: 'Dining and food delivery',
  GROCERY: 'Groceries',
  INSURANCE: 'Insurance',
  INTERNATIONAL: 'International spends',
  GOVERNMENT: 'Government payments',
  EDUCATION: 'Education',
  FUEL: 'Fuel',
  RENT: 'Rent',
  OTT_SUBSCRIPTIONS: 'OTT subscriptions',
  WALLET: 'Wallet loads',
  EMI: 'EMI',
};

/**
 * Maps the app's merchant categories (utils/merchantClassifier.ts) and the
 * Learn/Home UI labels to engine categories.
 */
export function toEngineCategory(appCategory: string, online = false): Category {
  const c = appCategory.toLowerCase();
  if (c.includes('dining') || c.includes('food')) return 'DINING';
  if (c.includes('fuel') || c.includes('gas')) return 'FUEL';
  if (c.includes('grocer')) return 'GROCERY';
  if (c.includes('travel') || c.includes('flight') || c.includes('hotel')) return 'TRAVEL';
  if (c.includes('bill') || c.includes('utilit')) return 'UTILITY_BILLS';
  if (c.includes('insurance')) return 'INSURANCE';
  if (c.includes('rent')) return 'RENT';
  if (c.includes('education')) return 'EDUCATION';
  if (c.includes('ott') || c.includes('subscription')) return 'OTT_SUBSCRIPTIONS';
  if (c.includes('international') || c.includes('forex')) return 'INTERNATIONAL';
  if (c.includes('shopping') || c.includes('electronics')) return online ? 'ONLINE_SHOPPING' : 'DEFAULT';
  return 'DEFAULT';
}

/** Lowercase merchant key used for matching against reward row merchant lists. */
export function merchantKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(com|in|co|net|org)\b/g, ' ')
    .replace(/[^a-z0-9.& ]/g, ' ')
    .replace(/\b(pvt|ltd|private|limited|india|store|stores|outlet|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if a merchant name matches one of a reward row's merchant tokens. */
export function merchantMatches(merchant: string, tokens: string[]): boolean {
  const key = merchantKey(merchant);
  if (!key) return false;
  const keyWords = key.split(' ');
  return tokens.some((token) => {
    if (token === key) return true;
    // "amazon" matches "amazon", "amazon pay"; "tata cliq" matches "tata cliq luxury".
    if (key.startsWith(token + ' ') || token.startsWith(key + ' ')) return true;
    // Single-word brand inside a longer token: "bpcl" in "bharat petroleum (bpcl)".
    const tokenWords = token.split(/\s+/);
    return keyWords.length === 1 && keyWords[0].length >= 3 && tokenWords.includes(keyWords[0]);
  });
}
