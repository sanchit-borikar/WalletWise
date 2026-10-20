/**
 * What a RuPay card earns on UPI when its UPI terms were checked on the issuer's page
 * (card.inclusion.upi). Shared by the swipe advisor (scorePurchase) and the yearly
 * wallet value (walletValue), so both rank UPI spend the same way.
 */
import type { Card, Category } from './types';

/** Spend usually paid by scanning a shop's QR code. Everything else on UPI is an online payment. */
const SCAN_AND_PAY_CATEGORIES: ReadonlySet<Category> = new Set<Category>(['DINING', 'GROCERY', 'FUEL', 'DEFAULT']);

export type UpiEarning = {
  ratePct: number;
  /** Monthly cap on the UPI reward in rupees, shared by scan-and-pay and online UPI. */
  capRs: number | null;
  /** Cap usage key, the same in CapUsage everywhere. */
  capKey: string;
  label: string;
};

export const upiCapKey = (cardId: string) => `${cardId}:upi`;

/**
 * The checked UPI rate for this spend, or null when the card's normal rates apply
 * (UPI terms not checked, or the bank says UPI earns like the card).
 */
export function verifiedUpiEarning(card: Card, category: Category, online: boolean): UpiEarning | null {
  const upi = card.inclusion?.upi;
  if (!upi) return null;
  const capRs = upi.capRs ?? null;
  const capKey = upiCapKey(card.id);
  if (!upi.earnsRewards) return { ratePct: 0, capRs: null, capKey, label: 'no reward on UPI' };
  if (upi.ratePct == null) return null;
  const scanAndPay = !online && SCAN_AND_PAY_CATEGORIES.has(category);
  if (upi.scanAndPayOnly && !scanAndPay) {
    return upi.onlineRatePct != null ? { ratePct: upi.onlineRatePct, capRs, capKey, label: 'online UPI rate from the bank' } : null;
  }
  return { ratePct: upi.ratePct, capRs, capKey, label: upi.scanAndPayOnly ? 'UPI scan-and-pay rate from the bank' : 'UPI rate from the bank' };
}
