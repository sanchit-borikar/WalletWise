/**
 * Aura's on-device brain. It reads the question, works out what the user wants
 * (which card to use, how to use points, whether to get a card, a trip, card news,
 * or a concept), and answers with numbers from the WalletWise engine.
 * No API key and no network call: every figure comes from src/engine.
 */
import { catalog } from '../data/catalog';
import {
  cardChanges,
  CATEGORY_LABELS,
  interestExample,
  planRedemption,
  planTripPayment,
  rankCardsForPurchase,
  recommendCards,
  searchCards,
  walletAlerts,
  walletValue,
} from '../engine';
import type { Card, Category, UserProfile } from '../engine';
import type { CardData } from '../store/useCardStore';

export type AuraAction = { label: string; route: string; params?: Record<string, string> };
export type AuraReply = { text: string; actions?: AuraAction[] };
export type AuraContext = { cards: CardData[]; profile: UserProfile; profileSaved: boolean; isDemo: boolean };

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ── Understanding the question ─────────────────────────

type MerchantHint = { name: string; category: Category; online: boolean };

// Popular Indian merchants and how cards usually code them.
const MERCHANTS: [RegExp, MerchantHint][] = [
  [/\bamazon\b/, { name: 'Amazon', category: 'ONLINE_SHOPPING', online: true }],
  [/\bflipkart\b/, { name: 'Flipkart', category: 'ONLINE_SHOPPING', online: true }],
  [/\bmyntra\b/, { name: 'Myntra', category: 'ONLINE_SHOPPING', online: true }],
  [/\bajio\b/, { name: 'Ajio', category: 'ONLINE_SHOPPING', online: true }],
  [/\bnykaa\b/, { name: 'Nykaa', category: 'ONLINE_SHOPPING', online: true }],
  [/\btata ?cliq\b/, { name: 'Tata CLiQ', category: 'ONLINE_SHOPPING', online: true }],
  [/\btata ?neu\b/, { name: 'Tata Neu', category: 'ONLINE_SHOPPING', online: true }],
  [/\bswiggy\b/, { name: 'Swiggy', category: 'DINING', online: true }],
  [/\bzomato\b/, { name: 'Zomato', category: 'DINING', online: true }],
  [/\bstarbucks\b/, { name: 'Starbucks', category: 'DINING', online: false }],
  [/\b(mcdonald'?s?|dominos|domino's|kfc|pizza hut|burger king)\b/, { name: 'Restaurant', category: 'DINING', online: false }],
  [/\bblinkit\b/, { name: 'Blinkit', category: 'GROCERY', online: true }],
  [/\bzepto\b/, { name: 'Zepto', category: 'GROCERY', online: true }],
  [/\bbig ?basket\b/, { name: 'BigBasket', category: 'GROCERY', online: true }],
  [/\binstamart\b/, { name: 'Swiggy', category: 'GROCERY', online: true }],
  [/\bd-?mart\b/, { name: 'DMart', category: 'GROCERY', online: false }],
  [/\breliance (smart|fresh)\b/, { name: 'Reliance Smart', category: 'GROCERY', online: false }],
  [/\b(bpcl|bharat petroleum)\b/, { name: 'BPCL', category: 'FUEL', online: false }],
  [/\b(hpcl|hindustan petroleum)\b/, { name: 'HPCL', category: 'FUEL', online: false }],
  [/\b(iocl|indian ?oil)\b/, { name: 'IndianOil', category: 'FUEL', online: false }],
  [/\bcroma\b/, { name: 'Croma', category: 'DEFAULT', online: false }],
  [/\breliance digital\b/, { name: 'Reliance Digital', category: 'DEFAULT', online: false }],
  [/\b(makemytrip|mmt)\b/, { name: 'MakeMyTrip', category: 'TRAVEL', online: true }],
  [/\b(goibibo|cleartrip|ixigo|easemytrip|agoda)\b/, { name: 'Cleartrip', category: 'TRAVEL', online: true }],
  [/\birctc\b/, { name: 'IRCTC', category: 'TRAVEL', online: true }],
  [/\b(indigo|air india|akasa|spicejet)\b/, { name: 'Airline', category: 'TRAVEL', online: true }],
  [/\b(uber|ola|rapido)\b/, { name: 'Uber', category: 'DEFAULT', online: true }],
  [/\b(bookmyshow|pvr|inox)\b/, { name: 'BookMyShow', category: 'DEFAULT', online: true }],
  [/\b(netflix|hotstar|prime video|spotify|sonyliv)\b/, { name: 'Netflix', category: 'OTT_SUBSCRIPTIONS', online: true }],
  [/\b(apollo|pharmeasy|1mg|netmeds)\b/, { name: 'Pharmacy', category: 'DEFAULT', online: true }],
  [/\b(airtel|jio|vi|vodafone)\b/, { name: 'Airtel', category: 'UTILITY_BILLS', online: true }],
  [/\blic\b/, { name: 'LIC', category: 'INSURANCE', online: true }],
];

const CATEGORY_WORDS: [RegExp, Category][] = [
  [/\b(dining|restaurant|dinner|lunch|food|cafe|eat|swiggy|zomato)\b/, 'DINING'],
  [/\b(grocer(y|ies)|supermarket|kirana|vegetables)\b/, 'GROCERY'],
  [/\b(fuel|petrol|diesel|gas station|petrol pump)\b/, 'FUEL'],
  [/\b(flight|flights|hotel|hotels|travel|trip|train|bus ticket)\b/, 'TRAVEL'],
  [/\b(online shopping|shopping online|e-?commerce)\b/, 'ONLINE_SHOPPING'],
  [/\b(electricity|utility|utilities|bill payment|recharge|broadband|water bill|gas bill)\b/, 'UTILITY_BILLS'],
  [/\b(insurance|premium)\b/, 'INSURANCE'],
  [/\b(rent)\b/, 'RENT'],
  [/\b(school|college|tuition|education|fees)\b/, 'EDUCATION'],
  [/\b(abroad|international|foreign|forex|usd|dollars|overseas)\b/, 'INTERNATIONAL'],
  [/\b(ott|subscription|netflix)\b/, 'OTT_SUBSCRIPTIONS'],
  [/\b(shopping|clothes|electronics|mobile|laptop|phone)\b/, 'DEFAULT'],
];

export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, '');
  const m =
    t.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac|l)?\b/) ??
    t.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)\b/) ??
    t.match(/(\d+(?:\.\d+)?)\s*(rupees|rs|inr)\b/) ??
    t.match(/\b(\d{3,7})\b/);
  if (!m) return null;
  let n = Number(m[1]);
  const unit = m[2];
  if (unit === 'k' || unit === 'thousand') n *= 1000;
  if (unit === 'lakh' || unit === 'lac' || unit === 'l') n *= 100000;
  return n > 0 ? n : null;
}

function findMerchant(t: string): MerchantHint | null {
  for (const [re, hint] of MERCHANTS) if (re.test(t)) return hint;
  return null;
}

function findCategory(t: string): Category | null {
  for (const [re, cat] of CATEGORY_WORDS) if (re.test(t)) return cat;
  return null;
}

function findHolding(t: string, cards: CardData[]): CardData | null {
  return (
    cards.find((c) => t.includes(c.cardName.toLowerCase())) ??
    cards.find((c) => {
      const words = c.cardName.toLowerCase().split(' ').filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => t.includes(w));
    }) ??
    null
  );
}

const has = (t: string, re: RegExp) => re.test(t);

// ── Concepts every beginner needs (summarised from RBI rules and our research) ──

const CONCEPTS: { match: RegExp; title: string; text: string; route?: string }[] = [
  {
    match: /interest[- ]free|grace period|how many days free/,
    title: 'Interest-free period',
    text: 'You get free credit from the day you spend until the bill due date, usually 20 to 50 days. It works only if you pay the total amount due by the due date. If any part of the last bill is unpaid, new purchases start charging interest from the day you make them.',
  },
  {
    match: /minimum (amount )?due|min due|pay minimum/,
    title: 'Minimum amount due',
    text: 'The minimum due only keeps your account from being marked late. Interest still runs on everything you have not paid, at about 3 to 4% a month (roughly 40% a year), and you lose the interest-free period on new spends. Always pay the total amount due.',
  },
  {
    match: /billing cycle|statement date|due date|bill date/,
    title: 'Billing cycle',
    text: 'Your card collects a month of spends, then the bank makes a statement. You then have at least about two weeks to pay before the due date. RBI rules let you change your billing date at least once, so you can set it a few days after your salary arrives.',
  },
  {
    match: /cibil|credit score|credit report/,
    title: 'Credit score',
    text: 'Your CIBIL score (300 to 900) shows lenders how reliably you repay. It rises when you pay every bill on time and use less than about 30% of your limit. Late payments hurt it most. A score above 750 usually gets the best cards and loans.',
  },
  {
    match: /annual fee|joining fee|fee waiver|renewal fee/,
    title: 'Annual fee',
    text: 'Many cards charge a yearly fee plus 18% GST, but waive it if you spend a set amount in a year. A card is worth paying for only if its extra rewards beat the fee at your normal spending. Find My Card does this maths for you.',
    route: '/find-card',
  },
  {
    match: /forex|foreign currency|markup|abroad/,
    title: 'Forex markup',
    text: 'When you pay in a foreign currency, most cards add a 2 to 3.5% markup plus 18% GST. On a ₹50,000 trip that can be ₹2,000 or more, often more than the rewards you earn. Use a low-forex card for international spends.',
  },
  {
    match: /lounge/,
    title: 'Airport lounges',
    text: 'Many cards give free airport lounge visits, but more and more now require a minimum spend in the previous quarter before you can use them. Check your card on the Wallet screen for its lounge rules.',
  },
  {
    match: /(what|how).*(points|reward points).*(work|worth|value)|points vs cashback|cashback vs points/,
    title: 'Points versus cashback',
    text: 'Cashback is money back on your bill. Points are worth whatever you redeem them for: the median Indian card point is worth about 25 paise, while some premium cards reach ₹1 or more, and transfers to airlines can be worth more again. Beginners usually do best with simple cashback.',
  },
  {
    match: /transfer partner|airline miles|miles|transfer (my )?points/,
    title: 'Transferring points',
    text: 'Some cards let you move points to airline or hotel programmes, often worth more than cash. Transfers cannot be reversed and ratios change often, so find the award seat first, then transfer only what you need. Your card page shows each partner and its estimated value.',
  },
  {
    match: /devaluation|devalued|nerf|reward cut/,
    title: 'Devaluations',
    text: 'Banks often cut rewards, add caps or remove partners. RBI rules require at least a month of notice, and if a change hurts you, you can close the card without an extra closure charge once dues are paid. WalletWise tracks these changes for your cards.',
  },
  {
    match: /upi|rupay|gpay|google pay|phonepe|paytm/,
    title: 'Credit cards on UPI',
    text: 'Only RuPay credit cards can be linked to UPI apps like Google Pay or PhonePe. You pay nothing extra; the merchant bears any charge. Payments up to ₹2,000 often earn no reward on credit-card UPI, so check your card terms.',
  },
  {
    match: /no[- ]cost emi|emi/,
    title: 'EMI and no-cost EMI',
    text: 'An EMI splits a purchase into monthly instalments, usually with interest and a processing fee. "No-cost" EMI means the discount covers the interest. RBI rules say interest-bearing EMIs cannot be called no-cost, so check the principal, interest and fee shown before you convert.',
  },
  {
    match: /cash (withdrawal|advance)|atm/,
    title: 'Cash from a credit card',
    text: 'Avoid it. Cash withdrawals carry a fee of about 2.5% and interest from day one, with no interest-free period.',
  },
  {
    match: /credit limit|utili[sz]ation/,
    title: 'Credit limit',
    text: 'Your limit is the most you can owe at once. Using less than about 30% of it helps your credit score. Banks cannot raise your limit or upgrade your card without your explicit consent.',
  },
  {
    match: /close (my )?card|closing (a )?card|cancel (my )?card/,
    title: 'Closing a card',
    text: 'Banks must close a card within seven working days of your request once dues are paid, or pay you ₹500 a day for the delay. Closing an old card can lower your score a little because it reduces your total limit and credit history.',
  },
  {
    match: /how (does|do) (a )?credit cards? work|what is a credit card|new to credit/,
    title: 'How a credit card works',
    text: 'A credit card lets you spend the bank\'s money now and pay it back by the due date with no interest. Pay the full bill every month and the card is free money: rewards, cashback and protection. Pay late or only the minimum and interest of about 40% a year wipes out every reward.',
    route: '/find-card',
  },
];

// ── Answers ────────────────────────────────────────────

function purchaseAnswer(t: string, ctx: AuraContext): AuraReply {
  const merchant = findMerchant(t);
  const category = merchant?.category ?? findCategory(t) ?? 'DEFAULT';
  const amountParsed = parseAmount(t);
  const amount = amountParsed ?? 2000;
  const upi = has(t, /\b(upi|gpay|google pay|phonepe|paytm)\b/);
  const international = category === 'INTERNATIONAL' || has(t, /\b(abroad|international|foreign)\b/);
  const engineCards = ctx.cards.map((c) => catalog.byId.get(c.catalogId)).filter((c): c is Card => !!c);
  if (engineCards.length === 0) {
    return { text: 'Add your cards first and I can tell you which one to use.', actions: [{ label: 'Add a card', route: '/add-card' }] };
  }
  const ranked = rankCardsForPurchase(catalog, engineCards, {
    amount,
    category: international ? 'INTERNATIONAL' : category,
    merchant: merchant?.name,
    online: merchant?.online ?? has(t, /\bonline|app\b/),
    channel: upi ? 'UPI' : 'CARD',
    international,
  });
  if (ranked.length === 0) {
    return { text: 'None of your cards can be used here. UPI payments need a RuPay credit card linked to your UPI app.' };
  }
  const where = merchant ? `at ${merchant.name}` : `on ${CATEGORY_LABELS[international ? 'INTERNATIONAL' : category].toLowerCase()}`;
  const best = ranked[0];
  const holding = ctx.cards.find((c) => c.catalogId === best.card.id);
  const unit = best.rewardUnit === 'CASHBACK' ? '' : ` (${best.pointsEarned.toLocaleString('en-IN')} ${best.rewardUnit === 'MILES' ? 'miles' : 'points'})`;
  const lines = [
    `For ${inr(amount)} ${where}${upi ? ' over UPI' : ''}, use ${holding ? `${holding.bankName} ${holding.cardName}` : best.card.name}.`,
    `You get about ${inr(best.netValue)} back${unit}. ${best.reason}`,
  ];
  if (best.warnings[0]) lines.push(`Note: ${best.warnings[0]}`);
  const others = ranked.slice(1, 3).map((r) => {
    const h = ctx.cards.find((c) => c.catalogId === r.card.id);
    return `${h ? h.cardName : r.card.name}: ${inr(r.netValue)}`;
  });
  if (others.length) lines.push(`Next best: ${others.join(', ')}.`);
  if (!amountParsed) lines.push('I assumed ₹2,000. Tell me the amount for an exact answer.');
  return { text: lines.join('\n'), actions: [{ label: 'Open Best Card map', route: '/map' }] };
}

function redemptionAnswer(t: string, ctx: AuraContext): AuraReply {
  const holding = findHolding(t, ctx.cards);
  const targets = holding ? [holding] : ctx.cards.filter((c) => c.points > 0);
  if (targets.length === 0) {
    return { text: 'You have no points recorded yet. Open a card in your Wallet and enter its points balance.', actions: [{ label: 'Open Wallet', route: '/wallet' }] };
  }
  const prefer = has(t, /hotel|stay/) ? 'HOTEL' : has(t, /flight|fly|airline|miles/) ? 'AIRLINE' : undefined;
  const lines = targets.slice(0, 4).map((c) => {
    const card = catalog.byId.get(c.catalogId)!;
    const plan = planRedemption(catalog, card, c.points, { partnerKind: prefer, experience: ctx.profile.experience });
    return `${c.bankName} ${c.cardName}: ${c.points.toLocaleString('en-IN')} points. Best use: ${plan.recommended.label}, about ${inr(plan.valueRs)}. ${plan.reason}`;
  });
  const total = targets.reduce((a, c) => a + c.lowValue, 0);
  if (!holding && targets.length > 1) lines.push(`Together your points are worth at least ${inr(total)}.`);
  return {
    text: lines.join('\n\n'),
    actions: [{ label: 'Plan a trip with points', route: '/trip-planner' }, ...(holding ? [{ label: 'Open card', route: '/card-detail', params: { id: holding.id } }] : [])],
  };
}

function newCardAnswer(ctx: AuraContext): AuraReply {
  const advice = recommendCards(catalog, ctx.profile, {
    ownedIds: ctx.isDemo ? [] : ctx.cards.map((c) => c.catalogId),
    maxNew: 2,
    candidateLimit: 15,
  });
  const lines: string[] = [];
  if (!ctx.profileSaved) lines.push('I used a typical spending pattern. Answer a few questions in Find My Card for a personal answer.');
  if (advice.verdict === 'NONE') {
    lines.push(advice.explanation);
  } else {
    lines.push(advice.explanation);
    for (const p of advice.picks) lines.push(`${p.card.name}: about ${inr(p.gainPerYear)} a year extra. ${p.why.slice(0, 2).join('. ')}.`);
  }
  if (advice.warnings.length) lines.push(advice.warnings[0]);
  return { text: lines.join('\n\n'), actions: [{ label: 'Find My Card', route: '/find-card' }] };
}

function tripAnswer(t: string, ctx: AuraContext): AuraReply {
  const fare = parseAmount(t);
  const holdings = ctx.cards.map((c) => ({ card: catalog.byId.get(c.catalogId)!, points: c.points })).filter((h) => h.card);
  if (!fare) {
    const total = ctx.cards.reduce((a, c) => a + c.lowValue, 0);
    const high = ctx.cards.reduce((a, c) => a + c.highValue, 0);
    return {
      text: `Your points are worth about ${inr(total)} to ${inr(high)} towards travel. Tell me the fare (for example "flight to Goa for ₹6,500") or use the Trip Planner to compare paying cash versus points.`,
      actions: [{ label: 'Open Trip Planner', route: '/trip-planner' }],
    };
  }
  const monthly = walletValue(catalog, holdings.map((h) => h.card), ctx.profile).annualReward / 12;
  const plan = planTripPayment(catalog, holdings, fare, { experience: ctx.profile.experience, monthlyRewardRs: monthly });
  const lines = [`For a ${inr(fare)} fare:`];
  if (plan.payCash) lines.push(`Paying cash: use ${plan.payCash.card.name} and earn about ${inr(plan.payCash.netValue)} back.`);
  if (plan.pointsMix.length) {
    lines.push(`Paying with points: ${plan.pointsMix.map((p) => `${p.pointsUsed.toLocaleString('en-IN')} pts from ${p.cardName} (${inr(p.valueRs)})`).join(', ')}.`);
  }
  lines.push(
    plan.shortfallRs > 0
      ? `Points cover ${inr(plan.coveredRs)}. You are ${inr(plan.shortfallRs)} short${plan.monthsToCover ? `, about ${plan.monthsToCover} months of your normal spending` : ''}.`
      : 'Your points can cover the whole fare.',
  );
  if (plan.notes[0]) lines.push(plan.notes[0]);
  return { text: lines.join('\n'), actions: [{ label: 'Open Trip Planner', route: '/trip-planner', params: { fare: String(fare) } }] };
}

function changesAnswer(t: string, ctx: AuraContext): AuraReply {
  const holding = findHolding(t, ctx.cards);
  const ids = holding ? [holding.catalogId] : ctx.cards.map((c) => c.catalogId);
  const alerts = walletAlerts(catalog, ids, undefined, 90);
  const lines: string[] = [];
  if (alerts.length) {
    lines.push('Coming up on your cards:');
    for (const a of alerts.slice(0, 5)) lines.push(`• ${a.message}`);
  }
  for (const id of ids.slice(0, 3)) {
    const recent = cardChanges(catalog, id).recent.filter((c) => c.direction === 'devaluation').slice(0, 2);
    if (recent.length) lines.push(`${catalog.byId.get(id)?.name}, recent cuts: ${recent.map((c) => `${c.title} (${c.date})`).join('; ')}.`);
  }
  if (lines.length === 0) lines.push('No recent or upcoming changes found for your cards.');
  lines.push(`Source: CardAdvisor change data, snapshot ${catalog.meta.asOf.changes}.`);
  return { text: lines.join('\n') };
}

function cardFactsAnswer(card: Card): AuraReply {
  const top = [...card.rewards].sort((a, b) => b.ratePct - a.ratePct).slice(0, 3);
  const fee = card.lifetimeFree || card.annualFee === 0 ? 'no annual fee' : `annual fee ${inr(card.annualFee ?? 0)} + GST${card.feeWaiverSpend ? `, waived on ${inr(card.feeWaiverSpend)} yearly spend` : ''}`;
  const lines = [
    `${card.name} (${card.network}): ${fee}.`,
    `Best rates: ${top.map((r) => `${r.ratePct}% ${r.merchantsText ? `on ${r.merchantsText}` : CATEGORY_LABELS[r.category].toLowerCase()}${r.capRs ? ` (up to ${inr(r.capRs)}/month)` : ''}`).join('; ')}.`,
  ];
  if (card.forexPct != null) lines.push(`Forex markup ${card.forexPct}% + GST.`);
  if (card.minMonthlyIncome) lines.push(`Stated minimum income ${inr(card.minMonthlyIncome)} a month.`);
  const { upcoming } = cardChanges(catalog, card.id);
  if (upcoming[0]) lines.push(`Upcoming change: ${upcoming[0].title} from ${upcoming[0].date}.`);
  return { text: lines.join('\n') };
}

function compareAnswer(ctx: AuraContext): AuraReply {
  if (ctx.cards.length === 0) return { text: 'You have no cards yet.', actions: [{ label: 'Add a card', route: '/add-card' }] };
  const lines = ctx.cards.map((c) => `${c.bankName} ${c.cardName}: best for ${c.intelligence.bestCategory.toLowerCase()}; ${c.rewardHeadline}; ${c.annualFee}.`);
  return { text: lines.join('\n'), actions: [{ label: 'Open Wallet', route: '/wallet' }] };
}

const HELP =
  'I can help with:\n• Which card to use: "Which card for ₹1,500 at Swiggy?"\n• Using points: "How should I use my Infinia points?"\n• New cards: "Is a new card worth it for me?"\n• Trips: "Flight to Goa for ₹6,500"\n• Card news: "Any changes to my cards?"\n• Basics: "What is the minimum amount due?"';

const DOMAIN = /card|credit|debit|point|reward|cashback|mile|lounge|fee|interest|bill|emi|cibil|score|redeem|transfer|spend|swipe|pay|upi|rupay|devalu|flight|hotel|trip|travel|holiday|vacation|bank|limit|forex|statement|due|offer|voucher|₹|\brs\b|rupee/;

/** Answers one message from the user. */
export function answerAura(message: string, ctx: AuraContext): AuraReply {
  const t = message.toLowerCase().trim();
  if (!t) return { text: HELP };
  if (/^(hi|hello|hey|namaste|help|what can you do)\b/.test(t)) return { text: `Hi! ${HELP}` };

  const merchant = findMerchant(t);
  const amount = parseAmount(t);
  if (!DOMAIN.test(t) && !merchant && !amount && !findCategory(t)) {
    return { text: "I'm Aura, WalletWise's credit card assistant. I can only help with credit cards, rewards, spending and related money topics." };
  }

  const asksConcept = /\b(what is|what's|what are|explain|meaning|how does|how do|why|should i pay|is it safe)\b/.test(t);
  const wantsCard = /\b(which card|what card|best card|use (for|at|on)|swipe|pay (for|at|with)|card for|card to use)\b/.test(t);
  const wantsNew = /\b(new card|get a card|apply|first card|should i get|recommend (a |me a )?card|best card for me|worth getting|which card should i (get|take|apply))\b/.test(t);
  const wantsRedeem = /\b(redeem|use (my )?([\w-]+ ){0,2}points|my ([\w-]+ ){0,2}points|points worth|point value|what can my points|burn)\b/.test(t);
  const wantsTrip = /\b(flight|fly|trip|vacation|holiday|hotel stay|book a hotel|goa|dubai|thailand|singapore)\b/.test(t);
  const wantsChanges = /\b(devalu|changes|change to|news|updates?|cut|nerf)\b/.test(t);
  const wantsCompare = /\bcompare my cards|my cards\b/.test(t);

  if (wantsNew) return newCardAnswer(ctx);
  if (wantsChanges && !asksConcept) return changesAnswer(t, ctx);
  if (wantsRedeem && !wantsCard) return redemptionAnswer(t, ctx);
  if (wantsTrip && !wantsCard && !merchant) return tripAnswer(t, ctx);
  if (wantsCard || merchant || (amount && findCategory(t))) return purchaseAnswer(t, ctx);
  if (wantsCompare) return compareAnswer(ctx);

  const concept = CONCEPTS.find((c) => c.match.test(t));
  if (concept) {
    const extra = concept.title === 'Minimum amount due' ? `\n\n${interestExample(null).message}` : '';
    return { text: `${concept.title}\n${concept.text}${extra}`, actions: concept.route ? [{ label: 'Find My Card', route: concept.route }] : undefined };
  }

  // A card name: give its facts.
  const named = searchCards(catalog, t.replace(/\b(tell me about|about|card|credit|details|the|of|what|is)\b/g, ' '), 1)[0];
  if (named) return cardFactsAnswer(named);

  return { text: `I'm not sure I understood. ${HELP}` };
}

export const AURA_SUGGESTIONS = [
  'Which card for ₹1,500 at Swiggy?',
  'How should I use my points?',
  'Is a new card worth it for me?',
  'What is the minimum amount due?',
];
