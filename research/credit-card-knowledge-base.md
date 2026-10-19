# WalletWise Research Knowledge Base

Compiled 2026-10-19. Purpose: ground the recommendation algorithm in evidence.

Scope note: this is a curated first pass, not "the whole internet". Each section lists sources. Figures from blogs and news are marked **(secondary)**. Anything marked **(verify)** must be checked against the issuer or RBI before it goes into the app. All text here is summarised in our own words.

---

## 1. India market facts

- Card count: about 119 million credit cards outstanding in April 2026, up 8.2% year on year. Monthly spend is roughly ₹2 lakh crore (₹1.97 trn in Apr 2026, about ₹2.08 lakh crore in Jul 2026). **(secondary: RBI data via news)**
- E-commerce is the biggest channel, about 62% of spend by value in May 2026. This is why online-shopping reward rows matter most in the algorithm. **(secondary)**
- Credit card transactions grew from about 216 crore (2021) to about 570 crore (2025) while debit card use fell. **(secondary)**
- RuPay credit cards can be linked to UPI. RuPay-UPI credit spend roughly doubled year on year. Whether a card earns rewards on UPI is a per-card fact we must model as a payment-channel flag. **(secondary)**
- Gap: we found no solid study on financial literacy and credit card use in India. We should say so in the app's claims and avoid inventing statistics.

Sources: [Angel One on RBI April 2026 data](https://www.angelone.in/news/economy/india-s-credit-card-spends-rise-7-to-1-97-trillion-in-april-2026-rbi-data), [Free Press Journal](https://www.freepressjournal.in/business/where-are-people-spending-the-most-through-credit-cards-rbi-data-may-surprise-you), [Kiwi on RBI/NPCI data](https://gokiwi.in/blog/rbi-and-npci-data), [Tribune](https://www.tribuneindia.com/news/business/credit-card-spending-rises-2-6-in-may-june-seen-stable-at-rs-2-0-2-1-trillion-report/)

## 2. Regulation (RBI)

- Base rules: RBI Master Direction on credit and debit cards, April 2022, amended March 2024. The 2024 amendment lets the cardholder change the billing cycle date and limits excessive interest and penal charges.
- 2025 consolidation: RBI issued new "Credit Cards and Debit Cards: Issuance and Conduct" Directions for commercial banks on 28 Nov 2025. Summaries say they gather existing rules as-is. Key cardholder points: explicit consent for issuing a card, no unsolicited or unilateral upgrades, clear disclosure of charges and APR, timely closure of unused cards, and board-approved public policies on interest ceilings and charges.
- Reference: RBI/DOR/2025-26/155. **(verify exact obligations in the RBI text; we only read third-party summaries)**
- App implication: the interest-free period, billing date and APR are regulated user-facing facts. The app should teach "pay the full bill" as rule zero.

Sources: [RBI Master Directions page](https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=12300), [Cyril Amarchand note on 2024 amendments](https://www.cyrilshroff.com/wp-content/uploads/2024/04/Recent-Amendments-to-Master-Directions-on-Credit-and-Debit-Card.pdf), [RBI 2025 commercial banks directions](https://website.rbi.org.in/documents/d/rbi/28rbi-commercial-banks-credit-cards-and-debit-cards-issuance-and-conduct-directions-2025), [Probe42 summary](https://resources.probe42.in/regulatory-updates/rbi-circulars/rbi-commercial-banks-credit-debit-cards/)

## 3. Point valuation in India

- A point is not a rupee. CardAdvisor's index values 237 cards. The median point is about 25 paise, and the mean is about 50 paise, pulled up by a few premium travel cards. Values range from 10 paise to ₹5.00. About 22% of valued cards reach ₹1 or more in typical use. **(secondary, publisher's own estimates)**
- The same point has several values depending on how it is redeemed:
  - Statement credit or cash: floor, about ₹0.20–0.30.
  - Bank portal or vouchers: sometimes below cash, about 1 card in 10.
  - Airline or hotel transfer: highest. Example: an HSBC point is about 25 paise as cash and about ₹2 sent 1:1 to Accor, roughly 8 times more.
- The card matters more than the issuer. Axis EDGE Miles range from 20 paise (cash) to as much as ₹5 (transfer).
- Only about 1 card in 5 has a real transfer route. Their best route averages 1.8x their typical value.
- PointsFly's rule of thumb: below ₹1 per point is poor, ₹1–3 is good, above ₹3 is great. Vouchers and cashback are about ₹0.20–0.25. **(secondary)**
- Transfer bonuses are promotions run by the destination programme, typically 20–30% extra. Value a transfer at the standing ratio, never at the bonus. Do not wait for a bonus.
- Example standing routes in 2026 per CardAdvisor: HSBC TravelOne to Accor 1:1 (about ₹2 per source point); HDFC Infinia, Diners Black and Regalia Gold to Accor 2:1 (about ₹1); Amex to Marriott 1:1 (about ₹0.60). Axis restored Accor in Sept 2026; one source says Axis dropped it in April 2026. These sources conflict and routes change without notice. **(verify before showing)**
- Voucher route: HDFC SmartBuy sells vouchers via GyFTR with accelerated points on some brands, but caps and limits change often (reported cuts to Amazon Fresh and Zomato limits). Modelled value needs a "last verified" date and a cap field.

Sources: [CardAdvisor real point value index](https://cardadvisor.in/articles/real-point-value-index-india-2026), [CardAdvisor transfer bonuses](https://cardadvisor.in/articles/credit-card-points-transfer-bonuses-india-2026), [CardAdvisor points in rupees](https://cardadvisor.in/articles/what-your-credit-card-points-are-worth-in-rupees-2026), [Cardtrail Amex values](https://cardtrail.in/news/amex-reward-points-value-india-2026/), [HDFC SmartBuy offer example](https://www.hdfc.bank.in/ps/offers/indian-gifts-portal-igp-5x-reward-points-on-e-voucher-purchase-911881), [GyFTR](https://www.gyftr.com/instantvouchers/reliance-smart-gift-vouchers), [Live From A Lounge on SmartBuy cuts](https://livefromalounge.com/?p=44360), [PointsFly](https://pointsfly.ai/)

## 4. Global programmes (for ideas, not for India numbers)

- US currencies (Chase Ultimate Rewards, Amex Membership Rewards, Citi ThankYou, Capital One miles) are valued by bloggers at roughly 1.8–2.2 cents when transferred to a good partner, and 1.0–1.5 cents through the portal. Transfer partners and ratios matter more than the headline.
- Valuation methods in use: The Points Guy uses a trimmed average of observed award redemptions, collected with a browser extension; NerdWallet compares cash and award prices across many dates and cities and takes the median; Point Hacks weights by partner ratios and award availability.
- Takeaway for us: value a point by the best realistic redemption, say how it was measured, and show the portal and transfer values side by side. Valuation is partly subjective, so show a range, not one number.
- Gap: airline award charts versus dynamic pricing. Not covered by these searches. Needs a follow-up before we model flight award costs.

Sources: [ShopBack comparison of UR/MR/TY](https://www.shopback.com/blog/finance/us-chase-ur-vs-amex-mr-vs-citi-ty-point-valuations-2026), [TPG transfer partners](https://thepointsguy.com/credit-cards/credit-card-transfer-partners/), [TPG valuation methodology](https://thepointsguy.com/preview/points-miles-valuations-methodology), [NerdWallet valuations](https://www.nerdwallet.com/article/travel/airline-miles-and-hotel-points-valuations?lv=true), [Point Hacks](https://pointhacks.com.au/?p=11138), [Prince of Travel](https://princeoftravel.com/?p=967)

## 5. Research and patents on reward optimisation

Honest summary: we found little peer-reviewed work on choosing which card to swipe. Most prior art is patents and product pages.

- A 2025 Springer article applies machine learning to reward-point allocation from the issuer's side and reports a very high fit (R² 0.99). It is issuer-side, so it informs how banks set rewards, not how a user should choose. [Springer 2025](https://link.springer.com/article/10.1007/s44196-025-00899-0)
- Patents describe rule-based ranking of cards at checkout by yield, and a model that scores cards using estimated category spend and approval likelihood. Patents are not evidence of what works. [US 2021/0049638](https://patents.justia.com/patent/20210049638), [US11315179B1](https://patents.google.com/patent/US11315179), [US 2011/0153402](https://patents.justia.com/patent/20110153402)
- A Malaysian paper models redeeming loyalty points as a knapsack problem. It is not about cards but is a useful template for our redemption planner. [UniMAP journal](https://ejournal.unimap.edu.my/index.php/amci/article/download/179/146/1445)
- CardSavvy (commercial) claims to use linear programming to maximise value across a wallet. Product claim only. [CardSavvy](https://card-savvy.com/press)
- A multi-stakeholder recommender for cashback offers balances bank, customer and merchant goals. [PaperGuide listing](https://paperguide.ai/papers/dc6ee294-f9d9-4e6e-abbb-d968d5ccce40-a-multi-stakeholder-recommender-system-for-rewards-recommendations)
- Not found: an academic paper that directly solves "which card at which merchant". This means our algorithm can be original, but we must validate it ourselves.

## 6. Behavioural research: rewards change spending

This is critical for a beginner-focused app.

- A 2026 Journal of Banking and Finance study on a large US bank's accounts found that joining a 1% cash-back programme raised card spending by about 32% and debt by about 8%, and the effect lasted. It was stronger for people with tight liquidity and lower financial literacy. [Lingnan University record](https://scholars.ln.edu.hk/en/publications/cash-back-rewards-effects-on-spending-and-debt-accumulation/)
- A 2010 Chicago Fed working paper by related authors found an average $25 reward went with about $79 more monthly spend and $191 more monthly debt in the first quarter. [EconPapers](https://econpapers.repec.org/paper/fipfedhwp/wp-2010-19.htm)
- MIT Sloan (Banker and Prelec) found card payment seems to push buying through reward-system activation, not by removing the pain of paying. [MIT Sloan](https://mitsloan.mit.edu/node/28153)
- Thaler's "decoupling" idea: when payment is separated from purchase, people attend less to cost.
- App implications (design rules, not just features):
  1. Never recommend spending more to earn rewards. Optimise only the spend the user already plans.
  2. Show net value after interest. A single month of revolving balance at card APRs wipes out years of rewards. Show an interest-risk warning for users who may not pay in full.
  3. Treat milestone bonuses and fee waivers as "only if you would spend this anyway".
  4. Beginners and low-liquidity users get a conservative profile by default (no-fee or low-fee cards, cashback over complex travel strategies).

## 7. Data we already hold (`datasets/`)

- 280 cards, 15 reward categories (DEFAULT, ONLINE_SHOPPING, UTILITY_BILLS, TRAVEL, DINING, GROCERY, INSURANCE, INTERNATIONAL, GOVERNMENT, EDUCATION, FUEL, RENT, OTT_SUBSCRIPTIONS, WALLET, EMI), 348 reward rows with monthly caps, 197 with merchant lists, reward types: points, cashback, airline miles, hotel points.
- Perks: milestone bonuses (221), fuel waiver (192), lounge access (176), movie tickets (79), insurance, concierge, golf, hotel membership.
- Valuations (paise per point per programme), about 160 transfer routes with ratio, cap and speed, 170 lounge records, about 1,800 change events.
- Licence CC BY 4.0, attribution required.
- Missing from the data: card-specific rules for UPI, wallet loads and rent exclusions are partly present; merchant-level exclusions and live offers are not. No user spend data.

## 8. How this feeds the algorithm

| Finding | Algorithm decision |
|---|---|
| A point has several values (cash vs portal vs transfer) | Every recommendation returns a safe value and a best value, never one number |
| Caps and category rates exist per card | Spend allocator must respect monthly caps, spilling excess to the next-best card |
| Fees and waivers | Compare cards on annual net value after fee and the chance of hitting the waiver |
| Rewards raise spending and debt | Add an interest-risk guard and a "do not change your spending" rule |
| Beginners | Default to simple, low-fee, high-certainty value; unlock transfer strategies later |
| Devaluations are frequent | Penalise cards with recent negative changes; show a "last verified" date |
| Sources disagree | Carry a confidence level and source on every value; show ranges |
| Redemption is a knapsack-like choice | Goal planner picks routes to reach a target with minimum cost in points |

## 9. Open items (need more research)

1. Airline award pricing: fixed charts versus dynamic (affects the "free vacation" planner).
2. Exact RBI 2025 text on interest ceilings and reward-point treatment.
3. Gifter's voucher catalogue and discount structure (user named it; not yet reviewed).
4. India-specific financial literacy evidence by income segment.
5. Per-bank rules on UPI, rent and wallet exclusions, and tax and GST on fees.
6. Real transaction data to calibrate typical spend mixes by income level (survey or synthetic).

---

# Update 2 (2026-10-19): devaluations, vouchers, award pricing

## 10. Devaluations (latest)

Primary source: CardAdvisor `changes` dataset, snapshot 2026-10-11 (`datasets/changes.csv`, 1,799 change events, one per affected card). 1,273 are devaluations, 150 are revaluations (improvements), 376 are neutral. Devaluations from 1 Jul 2026 onward, including already-announced future dates, are extracted in `research/recent-devaluations-extract.csv` (248 rows, 43 take effect after today). Each row has before/after text, confidence and a verification link.

Biggest recent events (one change applied across many cards):
- 2026-07-01: fuel fair-usage terms tightened, trigger halved (23 cards).
- 2026-08-28, a block of Axis-family changes across about 30 cards: new top late-payment slab of ₹1,300 above ₹50,000; tolls and road fees stop earning rewards and gift cards become their own category; dynamic currency conversion markup rises to 3.5%; Priority Pass stops working at Indian domestic lounges (7 cards).
- 2026-09-22: Club ITC removed as a transfer partner; Flying Blue, Air India and Qantas moved into the smaller "Group A" transfer cap (10 cards each).
- 2026-09-30: a Reward Multiplier programme discontinued (5 cards).
- 2026-10-26: IDFC FIRST Classic and related cards: international spends stop earning rewards (9 cards).
- 2026-11-01: a movie offer will need ₹25,000 spend in the previous 3 months (5 cards).
- 2026-11-15: Amex Membership Rewards points held separately per card, not pooled (7 cards); complimentary memberships renew only if you opt in; late payment fee computed on total amount due.

Issuer league from the frozen September 2026 devaluation index (cuts per active card): IndusInd about 1.3, ICICI 1.12, YES 1.08, HDFC 1.05, IDFC 1.05, AU 0.91, BOB 0.88, Amex 0.86, Kotak 0.57, SBI 0.5, Axis 0.47. The counting rule matters: the dataset counts per affected card (1,799 events) versus 791 distinct changes.

Secondary sources (PointsMax tracker, marked last updated 3 Jul 2026 but listing later dates; verify each with the issuer):
- **Axis (Apr 2026):** Marriott Bonvoy, Accor and Qatar removed as transfer partners on Magnus, Atlas, Horizon, Olympus; Magnus and Atlas ratio halved from 5:4 to 5:2 (Magnus Burgundy Private keeps 5:4); monthly milestone ended; yearly transfer caps (Group A 1 lakh points, Group B 4 lakh). Estimated effective transfer return fell from about 3% to about 1.2%. CardAdvisor reports Accor restored in Sept 2026 with ratios varying by card.
- **HDFC:** from 1 Jul 2026 a 3,000-point monthly cap on SmartBuy voucher purchases for Infinia, Diners Black, BizBlack, Regalia Gold (Infinia's voucher sweet spot fell from about ₹1.12 lakh to about ₹22,500 monthly spend; the page says it may be temporary). Feb 2026: Infinia retention needs ₹18 lakh annual spend or a ₹50 lakh banking relationship, plus monthly redemption caps. Jan 2026: Turkish Miles&Smiles and Avianca LifeMiles moved from 1:1 to 2:1. Another source reports 25 to 35% lower rewards on several non-premium HDFC cards from 15 May 2026, with Infinia, Infinia Metal and Diners Black unaffected. **(scope conflicts: verify)**
- **Amex:** Platinum Travel milestones changed repeatedly (sweet spot moved from ₹4 lakh to ₹7 lakh in Mar 2026; further change dated 10 Sep 2026); Etihad dropped; Virgin Atlantic and Hilton ratios improved Aug 2026.
- **SBI:** SBI Cashback online cashback is capped (sources conflict: ₹2,000 per month vs ₹4,000 per cycle). Gaming and some utility and government payments excluded.
- **ICICI:** 1% fee on third-party wallet loads above ₹5,000; accelerated rewards removed on iShop vouchers; rent, education and government payments excluded from rewards. **(secondary)**
- Press: Business Standard ran a piece in April 2026 on the "devaluation spree" (page blocked to our fetch, headline only).

Sources: [CardAdvisor data](https://cardadvisor.in/data), [PointsMax tracker](https://www.pointsmax.in/blog/credit-card-devaluation-tracker-india-2026), [Business Standard](https://www.business-standard.com/finance/personal-finance/credit-cards-on-a-devaluation-spree-how-to-still-maximise-benefits-126040900489_1.html), [Monzy](https://blog.monzy.co/credit-card-news/indian-credit-card-devaluation-2026), [TradeBrains](https://tradebrains.in/money/list-of-major-credit-cards-in-india-devalued-in-2026-airtel-axis-regalia-more/), [MyRupaya on HDFC](https://www.myrupaya.in/post/hdfc-credit-card-reward-devaluation-2026-cashback-reduced-by-25-35-across-multiple-cards-check)

**Staleness warning for our own app:** `src/store/useCardStore.ts` still holds hand-typed values that these changes make wrong or doubtful: Amex Platinum Travel milestones (₹1.9L and ₹4L), HDFC Infinia and Regalia SmartBuy-style claims (now capped monthly), and lounge claims. The recommendation engine's 33% dining and 16.6% travel Infinia rules ignore the 3,000-point monthly voucher cap. These must be replaced by dated, sourced data.

Algorithm implications:
1. Every reward row carries `effectiveFrom`, `lastVerified`, `source` and `confidence`; rows older than about 90 days are downgraded.
2. Announced future changes apply from their effective date, and the app warns ahead ("changes on 15 Nov").
3. Add a `devaluationRisk` per card from recent cut frequency and issuer league; use it as a tie-breaker, not a headline score.
4. Model caps as first-class: voucher caps, transfer caps by group, monthly redemption caps.
5. Re-download datasets on a schedule and diff against the previous copy to raise in-app alerts.

## 11. Gift vouchers (GyFTR and bank portals)

(You wrote "Gifter"; the matching Indian marketplace appears to be GyFTR. Please confirm that is the site you meant.)
- GyFTR lists 300+ brands across food, apparel, electronics, health, grocery, e-commerce, entertainment and travel. Discounts reach about 40% on many brands. Bank-portal offers listed: up to 45% (Axis, AU Rewardz), up to 35% (SBI Card), IndusInd 10% off plus 10X points, HDFC SmartBuy up to 5X points or 5% cashback.
- Only Indian-issued payment instruments are accepted. Delivery by SMS, email or WhatsApp. Validity usually 1 to 12 months; generally non-refundable (the site's refund text is inconsistent).
- Purchase caps by brand and portal change without notice (examples: Flipkart about ₹10,000, Tata Cliq about ₹20,000, Amazon Pay ₹10,000 to ₹50,000).
- Modelling: a voucher route has `discountPct`, `bonusPointsMultiplier`, `monthlyCapRs`, `validityMonths`. Value = discount + points earned × paisa per point, and counts only if the user would shop at that brand anyway.
- Risk: caps and multipliers are cut often (see HDFC SmartBuy above), so voucher value needs a lastVerified date.

Sources: [GyFTR](https://www.gyftr.com/), [GyFTR Reliance Smart page](https://www.gyftr.com/instantvouchers/reliance-smart-gift-vouchers), [GyFTR IndusInd guide](https://www.gyftr.com/blog/get-up-to-20-percent-off-on-gift-vouchers-using-indusind-credit-cards/)

## 12. Airline award pricing (fixed vs dynamic)

- Air India Maharaja Club: major award chart revision on 1 Apr 2026. Air India's release says economy redemptions fell about 30% on average (roughly 80% of domestic and 75% of international routes); premium economy mostly rose; business class was mixed. One source says distance-based pricing was replaced by flat regional tiers. Many online numbers predate this change.
- Singapore KrisFlyer: most award rates cut from 1 Nov 2025, and a dynamically priced "Access" tier added.
- Air France-KLM Flying Blue: semi-dynamic; starting rates by city pair and cabin, rising on some flights.
- Delta (since 2015) and American price awards dynamically with demand; one transatlantic business award ranged from 181,000 to 402,500 miles within four days.
- Implication: the "free vacation" planner cannot use a fixed table. It needs per-programme pricing mode (fixed, tiered, dynamic), a price range with a typical and a worst case, and a handoff to live search for the final price.

Sources: [Air India press release on Maharaja Club changes](https://www.airindia.com/content/dam/air-india/newsroom/press-releases/pdf/Press-Release-Maharaja-Club-Changes-01Apr26.pdf), [CardExpert](https://www.cardexpert.in/air-india-award-redemptions-reduced/), [Magnify.club April 2026 changes](https://magnify.club/guides/maharaja-club-april-2026-all-changes/), [Mainly Miles on KrisFlyer Access](https://mainlymiles.com/2025/08/25/singapore-airlines-introduces-access-awards-the-dawn-of-dynamic-pricing-for-krisflyer/), [TPG on dynamic award pricing](https://thepointsguy.com/loyalty-programs/what-is-dynamic-award-pricing/), [CardAdvisor Maharaja Club guide](https://cardadvisor.in/articles/air-india-maharaja-club-guide)

## 13. Scope of this research

India is the target. Most of the material is Indian: Indian issuers, RBI rules, Indian programmes, rupee values, and India transfer partners (even when the partner is a foreign airline or hotel). Global material is limited to methods and ideas: how US and Australian sites value points, dynamic award pricing trends, and the behavioural-economics studies (mostly US, so they may not transfer to Indian users unchecked). Non-Indian cards are not modelled.

## 14. Remaining gaps

- RBI 2025 Directions: now read in full (section 16). Still unread: the separate 2025 Responsible Business Conduct directions (cardholder liability for unauthorised transactions) and the Small Finance Bank version.
- HDFC non-premium cards 25 to 35% cut (May 2026): scope unconfirmed.
- SBI Cashback cap amount: sources conflict.
- Business Standard devaluation article: blocked, headline only.
- Real spend-mix data by income level: not found.

---

# Update 3 (2026-10-19): UPI charges, RuPay credit on UPI, RBI text status

## 15. UPI charges from 15 October 2026 (what you heard)

Your recollection matches a real change. Per SCC Online's explainer of NPCI's FAQs (dated 15 Sep 2026, updated 6 Oct 2026), a merchant discount rate (MDR) framework for person-to-merchant UPI payments takes effect **15 October 2026**. The article calls it "proposed" in places, so confirm the final status with NPCI.

- **Who pays:** the merchant. Merchants may not pass it on, so the customer pays only the listed price. UPI apps (GPay, PhonePe and others) may not charge a platform fee.
- **Slabs:** nil up to ₹2,000 (NPCI says this is over 95% of merchant transaction volume); 0.40% above ₹2,000; capped at ₹300 from ₹75,000. Flat ₹5 per transaction for railways, telecom, insurance, fuel and other notified categories above ₹2,000. Capital markets 0.02% capped at ₹300. Education gets concessional or capped rates.
- **Exempt:** P2P transfers of any amount; small merchants receiving up to ₹1 lakh a month on QR (zero MDR).
- **Credit on UPI:** SCC Online says RuPay credit cards linked to UPI and pre-sanctioned credit lines are **outside** this MDR framework and keep running under existing credit card rules. A Deccan Herald headline (page blocked) reports the Finance Ministry saying NPCI rules allow only RuPay credit cards on UPI, and denying US pressure.
- **Existing RuPay credit-on-UPI economics (unverified):** one vendor article (Terra Insight, dated 23 Jun 2026, updated 14 Oct 2026) says these payments carry about 2% interchange above ₹2,000 (about 1.5% to the issuer), paid by the merchant, and zero at or below ₹2,000. It cites no primary NPCI text, so treat the numbers as unconfirmed.
- **Cardholder impact:** no extra fee on the cardholder in any of the sources.

### RuPay credit card on UPI: what matters for the app
- Only RuPay credit cards can be linked to UPI (Visa and Mastercard credit cards cannot). Linking is done in the UPI app (GPay, PhonePe, Paytm, BHIM and others) using the card's UPI ID/VPA, not the card number.
- Rewards parity rule (NPCI circular, Aug 2024, effective 1 Sep 2024): RuPay credit card issuers should not give lower rewards or benefits on UPI than on card swipes, except where the issuer earns no interchange. Because UPI payments up to ₹2,000 carry no interchange, issuers can legitimately give little or no reward on small UPI payments. So the reward on UPI can differ by ticket size: small payments may earn nothing, larger ones may earn the normal rate.
- Mar 2026 NPCI circular (via a Paytm exchange filing): the UPI app fee on RuPay credit card payments was cut from 8 to 6 basis points (non-industry) and from 4 to 3 basis points (industry). This affects UPI apps, not consumers.
- Examples of UPI rewards on RuPay cards in affiliate comparison pages (unverified, some conflicting): IDFC FIRST Select RuPay 3X on UPI above ₹2,000; Tata Neu RuPay with NeuCoins on UPI; YES Kiwi and Klick with UPI cashback; Kotak UPI RuPay. Check each issuer's terms.
- Debit card or bank-account UPI payments: no charge to the customer in these sources, and they earn no card rewards.

Sources: [SCC Online on NPCI UPI MDR FAQs](https://www.scconline.com/blog/post/2026/09/16/npci-released-upi-mdr-faqs-explained/), [Deccan Herald (page blocked, headline only)](https://www.deccanherald.com/india/no-us-pressure-in-upi-mdr-decision-npci-circular-offers-no-advantage-to-foreign-credit-cards-finance-ministry-4149342), [Terra Insight on RuPay credit on UPI](https://www.terra-insight.com/insights/rupay-credit-card-on-upi-2-percent-surcharge-india/), [Live From A Lounge on NPCI rewards parity](https://livefromalounge.com/npci-mandates-rewards-parity/), [NPCI operating circular, Oct 2022](https://www.npci.org.in/PDF/npci/rupay/2022/Operating-circular-for-RuPay-Credit-Cards-linked-to-UPI.pdf), [Paytm exchange filing, 11 Mar 2026](https://nsearchives.nseindia.com/corporate/PAYTM_11032026091337_SEDisclosure.pdf), [Outlook Business on zero charge up to ₹2,000](https://www.outlookbusiness.com/amp/story/news/no-charge-for-rupay-credit-card-use-on-upi-for-transaction-up-to-rs-2-000-npci-news-227737)

Algorithm implications:
1. Add a **payment channel** dimension to every reward row: card swipe/online, UPI (RuPay only), wallet load, bank transfer. Each has its own rate and exclusions.
2. Add a **ticket-size** dimension at ₹2,000, because UPI reward eligibility can change there.
3. Recommend UPI-linked RuPay cards only for users who hold one; never suggest linking a Visa or Mastercard credit card.
4. Teach the beginner that UPI itself costs the customer nothing, and that the MDR is the merchant's cost.

## 16. RBI Credit Cards and Debit Cards: Issuance and Conduct Directions, 2025 (read in full)

Source file: `research/sources/RBI-Credit-Debit-Card-Directions-2025.pdf` (34 pages, RBI/DOR/2025-26/155, dated 28 Nov 2025, "updated as on 1 October 2026"). Extracted text is in `research/sources/rbi-text.txt`. Paragraph numbers below are the Directions' own. This is a plain-language summary for app design, not legal advice.

**Who it covers:** commercial banks and SBI only. Small Finance Banks, Payments Banks and Local Area Banks are excluded (para 3). SFBs have a parallel set of directions. In our dataset AU (23 cards) is a small finance bank, so its rules come from the SFB version, which we have not read.

**Rewards (the part that matters most to us).** The Directions do not set reward rates, caps, expiry or devaluation limits.
- Para 5(7) defines reward programmes as points, coupons, discounts or cashback with monetary value.
- Para 72: benefits must be offered transparently, including their source; the issuer must keep verifiable books and publish detailed information on its website and give a copy to the cardholder.
- So banks are free to cut rewards. The protections are about notice and exit (below).

**Changes and devaluations (para 23(7), 76, 79).**
- Changes in charges apply only prospectively, with at least one month's prior notice (23(7)).
- A cardholder who wants to surrender the card because of a change to their disadvantage may do so without any extra closure charge, once dues are paid (23(7)).
- Terms may be altered with 30 days' notice; the cardholder who has not withdrawn in that period is deemed to accept (79). Changes must go through all available channels.
- No charge may be levied that was not disclosed at issue and consented to, except statutory taxes (76).
- Para 34: no unilateral upgrades or limit increases; explicit consent is needed for any change in terms.
- App use: show "notice period" on every announced change and tell the user they can close the card free of extra charge if a change hurts them.

**Interest, billing, late fees (paras 22–31).**
- Issuers must quote APR for each situation (purchase, cash advance, late payment and so on), show APR and annual fee with equal prominence, and illustrate how finance charges work on part payment (22, 23(1)).
- Minimum amount due must be set so there is no negative amortization; no interest or charges may be levied on unpaid taxes (23(2)). Statements must carry the warning about paying only the minimum, and the MITC must say the interest-free period is suspended if the previous month's balance is unpaid (23(3)).
- An account is reported past due or penal charges are levied only if it stays past due for more than three days (23(5)).
- Late payment and related charges apply only on the outstanding amount after the due date, not on the total amount due (23(5), 23(6)). Interest is levied only on the outstanding amount, adjusted for payments, refunds and reversals; when the full amount is not paid, the interest-free period is lost and interest may run from the transaction date (23(6)).
- Each issuer must set an interest rate ceiling in its Board-approved policy (22, as amended from 1 Oct 2026). Differential rates by payment history must be transparent.
- Billing: at least about a fortnight to pay before interest starts (24); bill disputes answered with evidence within 30 days (25); no charges on transactions disputed as fraud until resolved (27); the cardholder can change the billing cycle date at least once (29).
- Refunds before the due date are adjusted against the payment due (30). For refunds after payment, consent is needed above a cut-off of 1% of the limit or ₹5,000, whichever is lower; without consent the money goes to the bank account, and the cardholder can ask for it any time (31).

**Closing and unused cards.**
- Closure requests must be honoured within seven working days once dues are paid; a delay costs the issuer ₹500 per calendar day, payable to the cardholder (19). Closure must be possible through several channels, not only by post.
- A card unused for over a year gets a notice; if there is no reply in 30 days the issuer closes it (20). Statement generation, PIN change or changing transaction controls count as use.
- A card not activated within 30 days needs OTP consent; without it the account is closed free within seven working days, and CIC reporting is withdrawn (11(6), 11(7)).
- Credit balance left after closure goes to the cardholder's bank account (21).

**Consent and protection.**
- No unsolicited cards or upgrades; explicit consent required (11(4), 11(8), 34, 71). If billed for an unsolicited card, the issuer reverses the charges and pays a penalty of twice the amount (11(4)). Losses from misuse of unsolicited cards fall on the issuer (11(5)).
- Over-limit use needs prior explicit consent, with an on/off control; no consent means no overlimit fee (12(5)).
- EMI conversions must show principal, interest and any upfront discount; interest-bearing EMIs cannot be called "zero-interest" or "no-cost" (12(3)).
- Issuers must consider total credit available to the customer when setting limits (12(2)).
- Convenience fees must be shown before the transaction (77). Failed-transaction reversal timelines and compensation must be in the terms (78).
- Key Fact Statement on one page with the application, and a written reason if rejected (11(1)). MITC to be provided in English, Hindi and the local language, minimum font Arial 12 (11(2), 92).
- Lost card: block immediately on being told; 24x7 reporting channels (68, 69). Cardholder liability for unauthorised transactions is governed by a separate 2025 Responsible Business Conduct direction (91(6)(iii)), which we have not read.
- Grievances: approach the issuer first; if no reply within 30 days or the reply is unsatisfactory, go to the RBI Ombudsman at cms.rbi.org.in (85).
- Customer data may not be shared without explicit consent (86, 89). Co-brand partners cannot access transaction data (62, 87).

**Co-branded cards (paras 54–63).** The issuer remains liable for the partner's cashback and offers being delivered on time (60). Revenue sharing between issuer and partner must be shown to the cardholder and on the issuer's website (58). Partners may market and distribute but cannot hold transaction data (61, 62).

**Not in the document.** Reward expiry or forfeiture rules; limits on devaluations; UPI-specific rules (UPI and card interchange are in other directions, para 82 points to payment-system and FEMA instructions); the actual interest ceiling number (each bank sets it).

**One thing to verify.** CardAdvisor's change data lists a late-fee change effective 15 Nov 2026 described as "set on the total amount due" on four cards. Para 23(5)–(6) says late payment charges apply to the outstanding amount after the due date and not the total amount due. The wording may be a data-labelling difference (the dataset says "total amount due" while the rule uses "outstanding amount"), so check the issuer's notice before showing this to users.

**Design implications for WalletWise.**
1. Teach the user the interest-free-period rule: pay the total amount due in full or the grace period is lost on that bill (23(3), 23(6)). Make this the first lesson.
2. For every devaluation alert, show "effective date, notice given, you may close without extra charge".
3. Warn users about unsolicited cards and fake upgrade offers, since the rules forbid them.
4. Remind users to change the billing cycle date to match their salary date (para 29).
5. Do not imply the RBI limits devaluations; it does not.
6. Our model must carry an "issuer type" flag (commercial bank vs small finance bank) because different directions apply.

## 17. Business Standard devaluation article: status

Fetched a second time; the site still returns 403, and searches did not surface the article text. Substitutes used instead: the CardAdvisor devaluation tracker ([article](https://cardadvisor.in/articles/credit-card-devaluation-tracker-india-2025-2026)), [CardTrail's roundup](https://www.cardtrail.in/rewards/reward-devaluation-hdfc-axis-icici-2025/), and a user forum post on [DesiDime](https://www.desidime.com/news/axis-bank-credit-cards-devalued-atlas-magnus-ace-and-many-more). The forum post (low reliability) says that from April 2026 the SBI Cashback Card has online and offline cashback caps and a limit on statement-credit redemptions, and an Airtel Axis card needs ₹25,000 of other spend before utility cashback unlocks. CardTrail's roundup says nearly every major Indian bank cut rewards between mid-2025 and early 2026: HDFC capped Infinia redemptions, SBI added exclusions, Axis tightened lounge access, and ICICI raised bonus thresholds.
