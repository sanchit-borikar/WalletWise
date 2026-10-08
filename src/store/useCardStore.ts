import { create } from 'zustand';

export type CardData = {
  id: string;
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

interface CardStore {
  cards: CardData[];
}

export const useCardStore = create<CardStore>(() => ({
  cards: [
    {
      id: '1',
      bankName: 'HDFC BANK',
      cardName: 'Infinia',
      lastFour: '4920',
      points: 24000,
      lowValue: 12000,
      highValue: 24000,
      annualFee: '₹10,000 + GST',
      renewalFee: '₹10,000 + GST (Waived on ₹10L spend)',
      currencyName: 'Reward Points',
      forexMarkup: '2.0%',
      rewardHeadline: '3.3% Base ROS',
      translatorExample: '₹24,000 worth of flights via SmartBuy',
      benefits: ['Unlimited Golf Games', 'Club Marriott First Year Membership', '1% Fuel Surcharge Waiver'],
      milestones: ['12,500 Reward Points on joining & renewal'],
      rewardCategories: ['Travel', 'Dining', 'Shopping'],
      loungeAccess: 'Unlimited Domestic & International via Priority Pass',
      intelligence: {
        bestFor: 'Premium Travel & SmartBuy',
        bestCategory: 'Flights & Hotels',
        recommended: 'Yes',
        potentialAnnualValue: 120000,
      }
    },
    {
      id: '2',
      bankName: 'SBI CARD',
      cardName: 'BPCL Octane',
      lastFour: '8821',
      points: 4200,
      expiryDays: 18,
      lowValue: 1050,
      highValue: 1050,
      annualFee: '₹1,499 + GST',
      renewalFee: '₹1,499 + GST (Waived on ₹2L spend)',
      currencyName: 'Reward Points',
      forexMarkup: '3.5%',
      rewardHeadline: 'Fuel: 1 pt/₹100 spent (25.9L accelerated at BPCL pumps)',
      translatorExample: '₹1,050 worth of fuel at BPCL',
      benefits: ['7.25% Value back on BPCL fuel', '1% Fuel Surcharge Waiver'],
      milestones: ['6,000 Bonus Points on joining'],
      rewardCategories: ['Fuel', 'Dining', 'Groceries'],
      loungeAccess: '4 Domestic Airport Lounge Visits per year',
      intelligence: {
        bestFor: 'Fuel Savings',
        bestCategory: 'BPCL Gas Stations',
        recommended: 'No',
        potentialAnnualValue: 18000,
      }
    },
    {
      id: '3',
      bankName: 'AMERICAN EXPRESS',
      cardName: 'Platinum Travel',
      lastFour: '1234',
      points: 15000,
      lowValue: 4500,
      highValue: 7500,
      annualFee: '₹3,500 + GST',
      renewalFee: '₹5,000 + GST',
      currencyName: 'Membership Rewards',
      forexMarkup: '3.5%',
      rewardHeadline: 'Milestone: 15k points at ₹1.9L spend',
      translatorExample: '1 night at Taj Vivanta',
      benefits: ['Taj Vouchers on Milestones', '24x7 Platinum Assist', 'Zero Lost Card Liability'],
      milestones: ['Spend ₹1.9L -> 15k MR Points', 'Spend ₹4L -> 25k MR Points + ₹10k Taj Voucher'],
      rewardCategories: ['Milestone Spending', 'Travel'],
      loungeAccess: '8 Domestic Airport Lounge Visits per year',
      intelligence: {
        bestFor: 'Milestone Rewards',
        bestCategory: 'General Spend (up to 4L)',
        recommended: 'Yes',
        potentialAnnualValue: 48000,
      }
    },
    {
      id: '4',
      bankName: 'HDFC BANK',
      cardName: 'Regalia Gold',
      lastFour: '5678',
      points: 32000,
      lowValue: 16000,
      highValue: 32000,
      annualFee: '₹10,000 + GST',
      renewalFee: '₹10,000 + GST (Waived on ₹5L spend)',
      currencyName: 'Reward Points',
      forexMarkup: '2.0%',
      rewardHeadline: '3.3% Base ROS (up to 33% on SmartBuy)',
      translatorExample: '₹32,000 worth of Business Class flights',
      benefits: ['Forbes, Amazon Prime, Swiggy One annual memberships', '6 Golf Games per quarter'],
      milestones: ['10,000 Reward Points on joining & renewal'],
      rewardCategories: ['Travel', 'Dining', 'International'],
      loungeAccess: 'Unlimited Domestic & International Lounges',
      intelligence: {
        bestFor: 'Lifestyle & Travel',
        bestCategory: 'Dining & SmartBuy',
        recommended: 'Yes',
        potentialAnnualValue: 85000,
      }
    },
    {
      id: '5',
      bankName: 'HDFC BANK',
      cardName: 'Marriott Bonvoy',
      lastFour: '9012',
      points: 18000,
      lowValue: 5400,
      highValue: 9000,
      annualFee: '₹3,000 + GST',
      renewalFee: '₹3,000 + GST',
      currencyName: 'Bonvoy Points',
      forexMarkup: '3.5%',
      rewardHeadline: '2 Bonvoy points/₹150 spent',
      translatorExample: '1 free night at Courtyard by Marriott',
      benefits: ['Silver Elite Status', '1 Free Night Award annually'],
      milestones: ['10 Elite Night Credits on joining'],
      rewardCategories: ['Hotels', 'Travel'],
      loungeAccess: '12 Domestic Airport Lounge Visits per year',
      intelligence: {
        bestFor: 'Hotel Stays',
        bestCategory: 'Marriott Properties',
        recommended: 'Yes',
        potentialAnnualValue: 35000,
      }
    },
  ],
}));
