# WalletWise Recommendation Algorithm: Specification v0.1

Date: 2026-10-19. Status: design draft, nothing implemented. Evidence base: `research/credit-card-knowledge-base.md` (section numbers cited as KB §n). Data: `datasets/` (CardAdvisor, CC BY 4.0).

## 0. Goal and principles

Goal: for any user, from a first-time cardholder to a points enthusiast, answer four questions with numbers they can trust:
1. **Which card should I swipe here?** (per purchase)
2. **Which cards should I carry?** (portfolio, including "should I get a card at all?")
3. **How should I use my points?** (redemption)
4. **Can I reach a goal (a trip) and when?** (planner)

Principles, each traceable to research:
- **P1 Value is net and honest.** Rupees after fees, caps and exclusions, never headline rates (KB §3, CardAdvisor method).
- **P2 Two values, not one.** Every output carries a *safe value* (cash, statement credit, vouchers) and a *best value* (transfer). The best value is labelled conditional (KB §3).
- **P3 Never encourage extra spending.** Optimise spend the user already plans. Rewards raise spending and debt, most for low-liquidity and low-literacy users (KB §6).
- **P4 Interest beats rewards.** One revolving month wipes out a year of rewards, so the app checks repayment behaviour first (KB §2, §6, §16).
- **P5 Facts expire.** Every number carries source, confidence and date; stale or contested numbers are shown as ranges or flagged (KB §10).
- **P6 Explain every answer.** Each recommendation returns a plain-language reason and the assumptions used.
- **P7 Beginner first, depth on demand.** Default profile is simple; transfer strategies unlock later.

## 1. Data model

Source files and what each feeds:

| Source | Used for |
|---|---|
| `cards.json` | Fees, waiver spend, forex markup, APR, eligibility, `rewards[]` rows, `perks[]` |
| `valuations.json` | `typicalPaisaPerPoint` per card; programme default routes |
| `transfers.json` | Transfer graph: ratio, caps, speed, confidence |
| `lounges.json` | Lounge visits per year, spend gates |
| `changes.json` | Devaluation history and announced future changes |
| Our own files | Merchant lists, voucher routes, UPI behaviour, user spend profiles, lifestyle values |

Row semantics from the dataset's field dictionary: a reward row's `ratePct` is already the **effective cash return** (points per ₹1 × `pointValuePaisa`), comparable across points and cashback cards. `monthlyCapRs` is the cap on spend that earns that row's rate (we must confirm whether it caps spend or reward by sampling cards before launch). `merchants` scopes a row (portal and co-brand rows are marked). `lastVerified` is a change stamp, not a re-check date, so we must keep our own `verifiedAt`.

Normalised tables (build step converts files to typed JSON bundled in the app):

```
Card            id, issuer, issuerType(COMMERCIAL|SFB|NBFC), network, tier, annualFee, joiningFee,
                feeWaiverSpend, forexPct, aprMonthlyPct, minIncome, rewardsProgramme, perks[]
RewardRow       cardId, category, channel(CARD|UPI|WALLET|RENT|...), merchants?, ratePct, monthlyCapSpend?,
                minTicket?, maxTicket?, pointsPerRs?, paisaPerPoint, exclusions[],
                effectiveFrom, effectiveTo?, source, confidence, verifiedAt
Programme       id, kind(BANK|AIRLINE|HOTEL), name, pricingMode(FIXED|TIERED|DYNAMIC)
TransferEdge    from, to, ratioNum, ratioDen, cap?, group?, speed, confidence, verifiedAt
ValueRoute      cardOrProgramme, routeType(CASH|VOUCHER|PORTAL|TRANSFER), paisaPerPoint(typical,best), cap?, confidence
Change          cardId, effectiveDate, type, direction, magnitude, before, after, noticeGiven?, source
VoucherRoute    brand, portal, discountPct, bonusMultiplier, monthlyCap, validityMonths, verifiedAt
UserProfile     see §2
```

New fields we must add because the dataset lacks them: payment **channel** and **ticket-size** rules (KB §15), `issuerType` (KB §16), voucher routes (KB §11), `pricingMode` of airline awards (KB §12).

Data hygiene rules at build time:
1. Reject rows with missing rate or card, and flag rate outliers above a sanity bound (for example effective return above 40%) for manual review.
2. A row older than 90 days since `verifiedAt` gets a staleness penalty in confidence (§6).
3. Apply announced `Change` rows from their effective date to produce the "current" rows and the "upcoming" rows. The app shows both.
4. Record the dataset `asOf` date in the app and show the CC BY 4.0 attribution on the About screen.

## 2. User model

Collected progressively, never all at once:

```
UserProfile
  cards[]            owned cards (from a picker; last four digits optional)
  monthlySpend{cat}  rough monthly spend by category (sliders or presets; defaults by income band)
  incomeBand         <25k, 25-50k, 50k-1L, 1-2L, 2L+ per month
  repayment          ALWAYS_FULL | SOMETIMES_MINIMUM | UNSURE   (drives the safety gate)
  experience         NEW | SOME | ENTHUSIAST
  goals[]            trip target (destination, cabin, date), or "cashback", or "lounges"
  channels           UPI-heavy, online-heavy, offline-heavy, travels abroad (yes/no)
  brandAffinity      brands they already use (Amazon, Swiggy, BPCL...)
```

Presets keep the cold start workable: income band picks a typical category mix. These presets need real calibration data (KB §9 open item 6); until then they are labelled "typical" and the user is invited to adjust.

## 3. Module A: Per-purchase scoring (swipe advisor)

Input: amount `a`, category `c`, merchant `m` (optional), channel `h` (card, UPI, wallet), the user's cards.

### 3.1 Row selection
For card `k`, choose the most specific applicable `RewardRow` in this order: merchant-scoped row, then category row, then DEFAULT. A row applies only if channel `h` and ticket size `a` are within its limits and no exclusion matches (rent, wallet load, fuel surcharge, government, gift cards, tolls, and similar exclusions come from rows or our exclusion list).

### 3.2 Cap handling
Let `used_k,row` be spend already earned on that row this month (user-reported or tracked; 0 if unknown). Spend that earns the row rate is `earn_a = max(0, min(a, cap − used))`. The rest, `a − earn_a`, falls back to the next-best applicable row (usually DEFAULT) on the same card. Expected value is the sum of the two parts.

### 3.3 Base value
```
safeValue(k)  = Σ over parts  ( part_spend × rate_safe )
bestValue(k)  = Σ over parts  ( part_spend × rate_best )
```
- `rate_safe` is the dataset's effective `ratePct` (typical point value, mostly cash or portal).
- `rate_best` replaces `pointValuePaisa` with the best realistic route (transfer) when a card has a transfer route with confidence of at least MEDIUM and the user's experience is not NEW; otherwise `rate_best = rate_safe`.
- Voucher route (§3.5) can raise `rate_safe` for a brand if the user would buy that brand anyway.

### 3.4 Adjustments
```
netValue(k) = safeValue(k) × reliability(k) − marginalFeeShare(k) − forexCost(k)
```
- `reliability(k)` is in 0.7–1.0: confidence of the used row (§6) and a devaluation-risk haircut from `changes` (recent cut frequency for that card and issuer). It is an adjustment to ranking, never shown as a precise percentage.
- `marginalFeeShare(k)` is 0 for a card already owned (sunk fee) when ranking at the point of sale. It is used in the portfolio module (§4), not here.
- `forexCost(k)` applies only to foreign-currency purchases: `a × forexMarkupPct × 1.18` (the markup carries 18% GST per the dataset note). It is a real cost, so a card with 2% markup can lose to a 3.5% card even if it earns less.

### 3.5 Voucher and portal routes (optional boost)
If merchant `m` is on a voucher route for card `k` (for example GyFTR via a bank portal), then
`voucherValue = discountPct + bonusMultiplier × pointValue` per rupee spent, limited by `monthlyCap`. Show it only if the user plans to spend at that brand; warn that voucher spend is not usable elsewhere and expires.

### 3.6 UPI channel
When the user pays by UPI: only a RuPay credit card linked to the UPI app qualifies. Use the UPI row if present. Below ₹2,000 assume no reward unless the row says otherwise (issuers earn no interchange there; KB §15). Never rank a non-RuPay card for UPI.

### 3.7 Ranking and output
Rank by `netValue` (CardAdvisor weights net annual value at 70%; we use value directly at purchase level). Break ties in this order: fewer headaches (no cap hit this month), lower devaluation risk, higher `bestValue`. Output:

```
winner: card, netValue (₹), safeValue, bestValue (labelled "if transferred"),
reasonText, assumptions[], warnings[] (cap nearly reached, upcoming change, UPI under ₹2,000),
runnerUp, "why not X" for the user's most-used card
```

## 4. Module B: Portfolio optimiser ("which cards should I carry")

Used for the beginner journey and for the "gap analysis" of an existing wallet.

### 4.1 Annual value of a single card for a user
For each category `c` with monthly spend `s_c` (12 months):
```
annualReward(k) = Σ_c  12 × [ min(s_c, cap_c) × rate_c  +  max(0, s_c − cap_c) × rate_default ]
annualValue(k)  = annualReward(k) + perkValue(k) − netFee(k) − expectedInterestCost
netFee(k)       = annualFee(k) if annual spend < feeWaiverSpend(k) else 0   (plus joining fee in year 1)
perkValue(k)    = Σ perks the user would actually use (lounge visits × ₹ per visit × usage probability, milestone bonuses only if the user's spend would reach them anyway)
```
Use the **safe** rate for beginners and the **best** rate only for enthusiasts. Perk rupee values are our own editorial numbers and must be tagged as estimates (the dataset does not publish them).

### 4.2 Wallet of N cards (N ≤ 3 for most users)
Allocate each category's spend to the card with the highest rate, respecting caps (spill-over to the next card). This is a small assignment problem and is solved exactly by greedy allocation with cap-aware sorting for ordinary sizes; for N ≤ 3 and about 12 categories we can also enumerate all combinations of cards from the top 30 candidates and take the best, which is exact and cheap.
```
walletValue(S) = Σ_c allocate(c, S) − Σ_{k∈S} netFee(k) − cognitiveCost(|S|)
```
`cognitiveCost` is a small penalty per extra card (default ₹1,500 a year) so the app does not recommend five cards to someone saving ₹800 more. Also penalise cards on the same bank's already-owned limit.

### 4.3 Eligibility filter
Discard cards where the user's income band is below `minSalaryRs` or the age is outside range. Mark "confidence of approval" as LOW when income is within 20% of the minimum, since the dataset only lists stated minimums. Do not claim approval.

### 4.4 The safety gate (applies before any ranking)
```
if repayment != ALWAYS_FULL:
    restrict to: lifetime-free or low-fee cards, cashback, no milestone chasing
    show: interest warning with a worked example from the card's APR (aprMonthlyPct),
          RBI rules on grace period (KB §16: grace period is lost if previous balance unpaid)
    do not show: transfer strategies, spend-to-unlock offers
```
A user who revolves a balance at the dataset's typical monthly APR loses far more than any reward earns; the app must say so in rupees.

### 4.5 "Should I get a card at all?"
Return NO when expected annual value after fees is below a small threshold (default ₹500) or when `repayment` is not ALWAYS_FULL and the user has no emergency buffer indicator. Return a lifetime-free card otherwise. This honesty is part of the product's trust claim.

## 5. Module C: Redemption planner

Inputs: a points balance (programme), a target (flight, hotel, voucher, cash), travel date range.

### 5.1 Route enumeration
Using `transfers` and `valuations`, list all routes from the programme balance: CASH, VOUCHER, PORTAL, and TRANSFER to each partner. For each route compute:
```
routeValueRs = pointsUsed × ratio × partnerPointValueRs      (best-case from valuation tables)
costInPartnerUnits = estimate from award pricing (range, §5.3)
feasible = balance ≥ needed  and  cap_remaining ≥ transferAmount  and  timing ok
```
Respect group caps (for example Axis Group A / B annual caps), minimum transfer multiples, and transfer speed. Prefer INSTANT or within-72-hours routes when the trip is near.

### 5.2 Choosing the route
Maximise `routeValueRs` subject to feasibility, then show the safe alternative beside it. If the best route beats the safe route by less than 20%, recommend the safe route (less risk, no lock-in). Never transfer on the strength of a bonus alone; value at the standing ratio (KB §3).

### 5.3 Award price model
Each programme carries `pricingMode`:
- FIXED / TIERED (for example Air India Maharaja Club after 1 Apr 2026): use the published chart; keep `chartDate`.
- DYNAMIC (for example Delta-style, KrisFlyer Access): model as a range, `[p10, median, p90]` in partner units, from observed samples; show the median and the worst case, and always hand off to the live search for the final price.
Because dynamic programmes can differ by 2x within days, the plan reports a range and a "book soon / can wait" hint.

### 5.4 Redeem or hold
If a card's programme has a recent or announced devaluation (from `changes`), advise using points before the effective date when a good route exists. If points are within 60 days of expiry, rank routes by expiry safety first.

## 6. Confidence and freshness

Each value gets a confidence label: HIGH, MEDIUM, LOW.
- Start from the dataset's `confidence` or `provenanceTier` (programme-published = highest).
- Downgrade one level if `verifiedAt` is older than 90 days, or if two sources disagree (KB §10 shows several such conflicts).
- LOW-confidence values are shown as ranges and never used to win a ranking by themselves.
- Contested figures (for example the SBI Cashback cap) take the **less favourable** value in `rate_safe` and the other in `rate_best`.

`reliability(k)` in §3.4 is the confidence factor times (1 − devaluationRisk). `devaluationRisk(k)` blends: number of devaluing changes on the card in the last 12 months, the issuer's cuts per card (frozen September 2026 index), and any announced upcoming cut. Cap the haircut at 0.3 so a noisy history cannot bury a good card.

## 7. Goal planner (the "free vacation" feature)

Input: target trip (origin, destination, cabin, dates), user profile, wallet.
1. Convert the trip to a points requirement per programme using §5.3 (range).
2. Compute the user's expected annual points per card from §4.1 using the allocation in §4.2.
3. `monthsToGoal = (requiredPoints − currentPoints) / monthlyPointsRate`, reported as a range from the p10 and p90 price.
4. Suggest the cheapest *behaviour change that keeps spend constant*: moving a category's spend to a better card, never raising total spend (P3). If the goal needs more spend than the user's budget, say it is out of reach rather than suggest overspending.
5. Show the cash alternative (what the trip costs in rupees) so the user sees the real saving.

## 8. Alerts and the "what's new" feed

- **Devaluation alert:** when a `Change` matches a user's card and is within 45 days of effective date (or announced), notify with before and after, effective date, notice rule and the free-closure right (KB §16).
- **Cap alert:** at 80% of a monthly cap.
- **Expiry alert:** points near expiry.
- **Opportunity alert:** a better card for the user's top category, with a rupee gain.
- **Feed:** curated explainers (grace period, minimum due, billing date, UPI vs card, how transfers work). Each item cites a source and has a date.

## 9. Safety, compliance and honesty rules

1. No personalised investment advice; the app presents card information and estimates, not financial advice (include a short disclaimer).
2. Never recommend spending more; never use language that frames debt as a cost-free tool.
3. Show "estimates, not guarantees" wherever a value depends on a transfer, a voucher or a dynamic award price.
4. Do not claim an approval chance; say "likely meets stated minimums".
5. Affiliate links, if ever used, are disclosed and never change ranking.
6. CardAdvisor attribution on the About screen (CC BY 4.0). Our own derived values are labelled as such.
7. Privacy: keep profile and spends on-device by default; do not send card details to the AI model beyond what a question needs, and do not log API keys in the client (the app currently ships keys in the bundle, which must change before release).

## 10. How Aura (the AI assistant) fits

Aura must not invent numbers. It calls the same engine through tools:
- `rank_cards_for_spend(amount, category, merchant?, channel?)` → Module A output.
- `portfolio_advice(profile)` → Module B.
- `plan_redemption(balance, target)` → Module C.
- `explain_change(cardId)` → latest relevant `Change` rows.
The model only rewords tool output and explains concepts. If a tool returns LOW confidence, Aura says so. This replaces the current mock multiplier table in `aura.tsx`.

## 11. Worked example (illustrative, numbers not from live data)

User: salaried, ₹60,000 a month income band, spends ₹6,000 online shopping, ₹4,000 dining, ₹3,000 groceries, ₹2,000 fuel, ₹5,000 bills; repayment ALWAYS_FULL; owns two cards.
1. Module B builds `s_c`, filters cards by income, computes `annualValue` per card using safe rates, applies caps and fees.
2. Suppose Card A earns 5% on online shopping up to ₹12,500 a month and 1% elsewhere, fee ₹500 waived above ₹1.2 lakh spend (the user spends about ₹2.4 lakh a year, so fee waived). Annual reward ≈ 12 × (6,000 × 5% + 14,000 × 1%) = 12 × (300 + 140) = ₹5,280.
3. Card B earns 4% on dining and groceries (cap ₹5,000) and 1% elsewhere with no fee. Reward ≈ 12 × (7,000 × 4% capped at 5,000 → 200 + 2,000 spill at 1% → 20, plus 13,000 × 1% = 130) = ₹4,200.
4. Module B's best pair allocates online shopping to A and dining and groceries to B, giving about ₹7,000 to ₹7,500 a year, minus any fees, versus about ₹5,300 for A alone. The cognitive-cost penalty (₹1,500) leaves the second card worth it by about ₹300 to ₹700 a year, so the app shows it as optional.
5. At the till (Module A) the app says: "Swipe Card B at the restaurant: ₹X back, 4% on dining. Card A would give 1%."

## 12. Evaluation plan

Offline:
- **Unit tests** on row selection, cap spill-over, forex cost, UPI rules, fee waiver thresholds, and eligibility filters, with hand-computed expected values.
- **Property tests:** value never negative from fee-free cards; more spend never lowers total reward; rankings stable when rows are shuffled.
- **Backtest on synthetic users** (income bands × spend mixes): compare our pick to (a) best single card by headline rate, (b) CardAdvisor's public ranking (spot-check), (c) a random card. Report the rupee gap and how often we disagree with CardAdvisor and why.
- **Sensitivity:** vary point value ±30%, cap interpretation (spend vs reward), and devaluation haircut; list rankings that flip.
- **Staleness test:** run with a dataset 90 days old versus current and measure ranking drift.

Online (after launch, with consent):
- Did the user follow the recommendation? Did reported reward match the estimate?
- Calibration: compare predicted and actual rewards per card per month.
- Safety: share of users in the restricted (non-full-repayment) path who saw the warning.

Targets for v1: top-1 agreement with a hand-checked answer on 50 curated scenarios; zero recommendations of ineligible or UPI-incompatible cards; every output has a reason and a confidence label.

## 13. Implementation plan

Order of work (each step small and testable):
1. **Data build script** (`scripts/build-data.ts`): read `datasets/*.json`, apply hygiene rules, write typed bundles to `src/data/`. Include attribution and `asOf`.
2. **Types and loaders** in `src/data/` replacing the hardcoded `useCardStore` cards.
3. **Engine** in `src/engine/`: `selectRow`, `applyCaps`, `scorePurchase` (Module A), then `allocateWallet` and `annualValue` (Module B), then `routes` and `planRedemption` (Module C). Pure functions, no UI, fully unit-tested.
4. **Wire Aura tools** to the engine (§10).
5. **Replace mock data in screens:** Wallet, Best Card map, Home.
6. **Alerts and feed** (§8).
7. **Server proxy** for the AI key and a scheduled data refresh job with a diff report.

### Implementation status (2026-10-19)

Built and tested (28 tests, `npm run test:engine`):
- `scripts/build-data.mjs` → `src/data/generated/*.json` (run `npm run build:data` after refreshing `datasets/`).
- `src/engine/`: `purchase.ts` (Module A), `portfolio.ts` (Module B, safety gate, "no card" verdict, topic rankings), `redemption.ts` (Module C and goal planner), `devaluation.ts` (risk and alerts), `partnerValues.ts` (editorial partner point values).
- Wired into the app: card store (live catalog data), Best Card map, Home optimizer and best-card opportunity, Learn calculator and topic rankings, card detail (Earn, Transfers, Updates tabs), and Aura tools (`src/utils/auraTools.ts`).

Decisions taken while building:
- `monthlyCapRs` is a cap on the **reward in rupees**, not on spend. Checked against issuer terms: Infinia SmartBuy vouchers 3,000 points; Octane fuel 2,500 points at 25p = ₹625; Millennia ₹1,000.
- On equal rates, the more specific row (merchant, then category) wins so its cap applies.
- A "per card" transfer ratio uses the published (best) ratio only for super-premium cards; others get the worst ratio in the label.
- Exclusion-prone categories without an explicit row count as ₹0 in safe value and are never counted in yearly portfolio value.
- Redemption routes are cached per card; a full two-card recommendation over 280 cards runs in about 15 ms.

Open design decisions (need your call):
- Default perk rupee values for lounges, movie tickets, memberships (editorial; need a method).
- Whether to include debit cards and RuPay credit-on-UPI as first-class channels in v1.
- Whether the beginner "which card to get" flow ships before the planner.
- How strict the safety gate is for users who say "sometimes minimum".

## 14. Known limits

- Dataset gives reward rates but not merchant exclusions in detail or live offers. Some merchants will fall back to category rates.
- Point values are estimates and programmes change; transfer routes can vanish within days (KB §10).
- Award prices for dynamic programmes cannot be known without live search.
- Presets for spend mix by income band are uncalibrated until we get real data.
- Interest cost modelling uses dataset APR, which may be null for some cards.
- This spec has not been tested; every threshold above (₹500, ₹1,500, 20%, 0.3, 90 days) is a starting value to be tuned by the evaluation plan.
