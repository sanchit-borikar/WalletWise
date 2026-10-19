import type { Confidence } from './types';

/**
 * Rupee value of one airline mile or hotel point, by programme.
 *
 * These are WalletWise editorial estimates, not dataset values: the open dataset
 * publishes ratios but not partner valuations. Ranges come from the research in
 * research/credit-card-knowledge-base.md §3 and §12:
 *  - Accor ALL is a fixed-value currency (about ₹2 per point).
 *  - Marriott Bonvoy is about ₹0.60 per point.
 *  - Airline miles: roughly ₹0.30-0.60 in economy and ₹0.80-2.00 in premium cabins.
 * `typical` is a realistic economy or standard redemption; `best` is a good premium redemption.
 * Review these every quarter and after any programme change.
 */
export type PartnerValue = { typical: number; best: number; confidence: Confidence; note?: string };

const AIRLINE_DEFAULT: PartnerValue = { typical: 0.5, best: 1.0, confidence: 'LOW' };
const HOTEL_DEFAULT: PartnerValue = { typical: 0.4, best: 0.6, confidence: 'LOW' };

export const PARTNER_VALUES: Record<string, PartnerValue> = {
  ACCOR_ALL: { typical: 1.8, best: 2.0, confidence: 'MEDIUM', note: 'Fixed value: 2,000 points = €40' },
  MARRIOTT_BONVOY: { typical: 0.5, best: 0.7, confidence: 'MEDIUM' },
  HILTON_HONORS: { typical: 0.25, best: 0.4, confidence: 'LOW' },
  IHG_ONE_REWARDS: { typical: 0.35, best: 0.5, confidence: 'LOW' },
  WYNDHAM_REWARDS: { typical: 0.6, best: 0.9, confidence: 'LOW' },
  RADISSON_REWARDS: { typical: 0.2, best: 0.35, confidence: 'LOW' },
  CLUB_ITC: { typical: 0.6, best: 0.9, confidence: 'LOW' },
  SHANGRI_LA_CIRCLE: { typical: 0.6, best: 1.0, confidence: 'LOW' },
  KRISFLYER: { typical: 0.7, best: 1.8, confidence: 'MEDIUM' },
  FLYING_BLUE: { typical: 0.7, best: 1.6, confidence: 'MEDIUM' },
  AIR_INDIA_MAHARAJA: { typical: 0.7, best: 1.5, confidence: 'MEDIUM', note: 'Award chart revised 1 Apr 2026' },
  BA_EXECUTIVE_CLUB: { typical: 0.7, best: 1.6, confidence: 'MEDIUM' },
  QATAR_PRIVILEGE_CLUB: { typical: 0.7, best: 1.8, confidence: 'MEDIUM' },
  TURKISH_MILES_SMILES: { typical: 0.8, best: 2.0, confidence: 'LOW' },
  ETIHAD_GUEST: { typical: 0.6, best: 1.4, confidence: 'LOW' },
  EMIRATES_SKYWARDS: { typical: 0.5, best: 1.2, confidence: 'LOW' },
  UNITED_MILEAGEPLUS: { typical: 0.7, best: 1.6, confidence: 'LOW', note: 'Dynamic pricing' },
  AEROPLAN: { typical: 0.7, best: 1.6, confidence: 'LOW' },
  ASIA_MILES: { typical: 0.6, best: 1.6, confidence: 'LOW' },
  JAL_MILEAGE_BANK: { typical: 0.7, best: 1.8, confidence: 'LOW' },
  VIRGIN_ATLANTIC: { typical: 0.6, best: 1.5, confidence: 'LOW' },
  MILES_AND_MORE: { typical: 0.5, best: 1.2, confidence: 'LOW' },
  QANTAS_FREQUENT_FLYER: { typical: 0.5, best: 1.2, confidence: 'LOW' },
  LIFEMILES: { typical: 0.6, best: 1.5, confidence: 'LOW' },
  INDIGO_BLUCHIP: { typical: 0.8, best: 1.0, confidence: 'LOW' },
  AIRASIA_REWARDS: { typical: 0.3, best: 0.5, confidence: 'LOW' },
  SPICEJET_SPICECLUB: { typical: 0.3, best: 0.5, confidence: 'LOW' },
};

export function partnerValue(nodeId: string, kind: 'AIRLINE' | 'HOTEL' | 'BANK'): PartnerValue {
  return PARTNER_VALUES[nodeId] ?? (kind === 'HOTEL' ? HOTEL_DEFAULT : AIRLINE_DEFAULT);
}
