/**
 * "Share my wallet": turns the wallet into a short text code that can be copied to another phone, and back.
 * The code is plain text so anyone can read what is in it. It holds only catalog card ids, an optional
 * last 4 digits and a points balance: never a full card number, CVV, PIN, expiry date or name.
 * Pure TypeScript (no React Native), unit-tested in Node.
 */

export const WALLET_CODE_PREFIX = 'WALLETWISE1';

export type SharedCard = { catalogId: string; lastFour: string; points: number };

export type ParseResult =
  | { ok: true; cards: SharedCard[]; skipped: number }
  | { ok: false; error: string };

/** Cards in one code. Keeps a pasted code from flooding the wallet. */
export const MAX_SHARED_CARDS = 30;

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** Builds the code. Last 4 digits are left out unless `includeLastFour` is true. */
export function encodeWalletCode(cards: SharedCard[], includeLastFour: boolean): string {
  const parts = cards.slice(0, MAX_SHARED_CARDS).map((c) => {
    const lastFour = includeLastFour && /^\d{4}$/.test(c.lastFour) ? c.lastFour : '';
    return `${c.catalogId},${lastFour},${Math.max(0, Math.round(c.points) || 0)}`;
  });
  return [WALLET_CODE_PREFIX, ...parts].join('|');
}

/**
 * Reads a code pasted from another phone. Cards the catalog does not know are skipped and counted.
 * `knownIds` is the set of catalog card ids on this phone.
 */
export function parseWalletCode(text: string, knownIds: ReadonlySet<string>): ParseResult {
  // Messaging apps sometimes wrap long text or add spaces; remove all whitespace before reading.
  const compact = text.replace(/\s+/g, '');
  const start = compact.indexOf(WALLET_CODE_PREFIX);
  if (start < 0) return { ok: false, error: 'This is not a WalletWise wallet code. It should start with WALLETWISE1.' };
  const [, ...parts] = compact.slice(start).split('|');
  const cards: SharedCard[] = [];
  let skipped = 0;
  for (const part of parts) {
    if (!part) continue;
    const fields = part.split(',');
    const [catalogId, lastFour = '', pointsText = '0'] = fields;
    // A long digit run in any field could be a full card number: refuse the whole code rather than store it.
    if (/\d{5,}/.test(lastFour) || fields.length > 3) {
      return { ok: false, error: 'This code has an unexpected format. Ask for a fresh code from WalletWise.' };
    }
    const points = Number(pointsText);
    if (
      !ID_PATTERN.test(catalogId) ||
      !knownIds.has(catalogId) ||
      !/^\d{0,4}$/.test(lastFour) ||
      !Number.isFinite(points) ||
      points < 0
    ) {
      skipped++;
      continue;
    }
    if (cards.length >= MAX_SHARED_CARDS) {
      skipped++;
      continue;
    }
    cards.push({ catalogId, lastFour: lastFour.length === 4 ? lastFour : '', points: Math.round(points) });
  }
  if (cards.length === 0) return { ok: false, error: 'No cards in this code match the WalletWise card list.' };
  return { ok: true, cards, skipped };
}
