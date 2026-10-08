import { CardData } from '../store/useCardStore';
import { MerchantCategory } from './merchantClassifier';

export type RecommendationResult = {
  card: CardData;
  score: number;
  estimatedValue: number;
  reason: string;
};

/**
 * Calculates a composite score for a card based on actual reward structures, category, and merchant.
 */
export function calculateCardScore(card: CardData, merchantName: string, category: MerchantCategory, spendAmount: number = 2000): RecommendationResult {
  let score = 0;
  let estimatedValue = 0;
  let reason = 'Good base rewards';

  const lowerCard = card.cardName.toLowerCase();
  const lowerBank = card.bankName.toLowerCase();
  const lowerCat = category.toLowerCase();
  const normMerchant = merchantName.toLowerCase();

  // BASE SCORE: Use potentialAnnualValue as a baseline weight, normalized
  score += card.intelligence.potentialAnnualValue / 10000;

  // RULE ENGINE
  
  // 1. Exact Merchant Match Rules
  if (normMerchant === 'bpcl' && lowerCard.includes('octane')) {
    score += 100;
    estimatedValue = spendAmount * 0.0725; // 7.25% at BPCL
    reason = '7.25% Value back on BPCL Fuel';
  }
  else if (normMerchant === 'marriott' && lowerCard.includes('marriott')) {
    score += 100;
    estimatedValue = spendAmount * 0.15; // High perceived value of points
    reason = 'Accelerated Bonvoy Points';
  }
  else if (normMerchant === 'taj' && lowerCard.includes('platinum travel')) {
    score += 80;
    estimatedValue = spendAmount * 0.10; 
    reason = 'Excellent for Taj milestone redemptions';
  }

  // 2. Category Match Rules
  else if (lowerCat === 'fuel') {
    if (lowerCard.includes('octane')) {
      score += 50;
      estimatedValue = spendAmount * 0.025; // Base fuel rewards if not BPCL
      reason = 'Great fuel card (Use at BPCL for 7.25%)';
    } else if (card.benefits.some(b => b.toLowerCase().includes('fuel surcharge waiver'))) {
      score += 20;
      estimatedValue = spendAmount * 0.01;
      reason = '1% Fuel Surcharge Waiver';
    }
  }
  
  else if (lowerCat === 'dining' || lowerCat === 'food') {
    if (lowerCard.includes('infinia')) {
      score += 60;
      estimatedValue = spendAmount * 0.33; // 33% via SmartBuy/Swiggy/Zomato vouchers
      reason = 'Up to 33.3% via SmartBuy Vouchers';
    } else if (lowerCard.includes('diners')) {
      score += 50;
      estimatedValue = spendAmount * 0.10; // Diners typically has 10x dining programs
      reason = '10X points on dining partners';
    }
  }
  
  else if (lowerCat === 'travel' || lowerCat === 'flight' || lowerCat === 'hotel') {
    if (lowerCard.includes('atlas')) {
      score += 70;
      estimatedValue = spendAmount * 0.10;
      reason = 'Accelerated EDGE Miles on Travel';
    } else if (lowerCard.includes('infinia') || lowerCard.includes('diners')) {
      score += 65;
      estimatedValue = spendAmount * 0.16; // 16.6% to 33% on smartbuy travel
      reason = '16.6% - 33.3% return via SmartBuy';
    }
  }

  else if (lowerCat === 'shopping' || lowerCat === 'electronics') {
    if (lowerCard.includes('infinia')) {
      score += 40;
      estimatedValue = spendAmount * 0.16;
      reason = '16.6% via SmartBuy Apple Imagine / Amazon';
    } else if (lowerCard.includes('regalia')) {
      score += 30;
      estimatedValue = spendAmount * 0.05;
      reason = '5% via SmartBuy';
    }
  }

  // 3. Fallback Base Rates (if no specific rule matched)
  if (estimatedValue === 0) {
    if (lowerCard.includes('infinia') || lowerCard.includes('diners')) {
      estimatedValue = spendAmount * 0.033; // 3.3% Base
      reason = '3.3% Base Reward Rate';
    } else if (lowerCard.includes('atlas')) {
      estimatedValue = spendAmount * 0.02; // 2% Base
      reason = '2% Base EDGE Miles';
    } else {
      estimatedValue = spendAmount * 0.015; // 1.5% generic
      reason = 'Standard Reward Points';
    }
  }

  score += estimatedValue; // Higher estimated value boosts score

  return {
    card,
    score,
    estimatedValue,
    reason
  };
}

export function getRankedRecommendations(merchantName: string, category: MerchantCategory, cards: CardData[]): RecommendationResult[] {
  if (!cards || cards.length === 0) return [];
  
  const scored = cards.map(card => calculateCardScore(card, merchantName, category));
  return scored.sort((a, b) => b.score - a.score);
}
