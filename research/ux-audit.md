# WalletWise screen audit (2026-10-19)

Goal: a person who knows nothing about credit cards can (1) pick the right card to apply for, (2) know which card to swipe where and what it earns, (3) turn points into trips and other value, and (4) stay safe from interest and devaluations. Every element below is judged against that goal. "Fix" is what this pass changes.

Reference studied: PointsFly screenshots (for the jobs it solves, not its look) and Skyscanner (cash fare search).
PointsFly jobs worth solving our own way: rank all wallet cards for a place and an amount, show points and rupees, mark cards "not eligible" for a spend, show transfer partners with ₹ per point, let the user edit balances, combine points across cards for a flight, and teach through expert videos.

| Screen | Element | Problem | Fix |
|---|---|---|---|
| Home | "Good evening, Veer" | Hard-coded name | Neutral greeting |
| Home | Total balance ₹24,500, +₹2,450 | Fake bank balance; WalletWise is not a bank | Replace with real "your points are worth ₹X–₹Y" from the engine |
| Home | Quick actions: Add Money, Transfer, Pay, History | Do nothing; payment-app actions that do not fit the goal | Replace with Find My Card, Trip Planner, Best Card Nearby, Add a Card |
| Home | Rewards Optimizer | Fixed to Dining ₹5,000 | Interactive: pick a category and amount, see the best wallet card and points |
| Home | Aura pills | Do nothing | Open Aura with that question |
| Home | Recent activity (mock transfers) | Fake and irrelevant | Replace with "Updates on your cards" (devaluations and changes with dates) |
| Home | Best card opportunity | Was hard-coded; now engine-based | Keep, link to Find My Card |
| Home | — | No learning content on the main screen | Add a swipeable expert video rail (verified YouTube videos) |
| Best Card | Search a place | Moves the map only; no card answer for that place | Selecting a place opens a panel: amount, UPI or card, every wallet card ranked with points and ₹, "not eligible" reasons |
| Best Card | Category chips | Missing fuel, travel, pharmacy, entertainment | Add them |
| Best Card | Dream Goal / Max Value / Cashback | Visual only | Max Value ranks by best value, Cashback by guaranteed value, Dream Goal opens Trip Planner |
| Best Card | Scan, Store Alert buttons | Do nothing | Remove; add Trip Planner entry instead (store alerts need background location, later) |
| Best Card | Nearby list | Shows one card, fixed ₹2,000 | Tap a place to open the full ranking panel |
| Wallet | + button | Does nothing, so users cannot test with their own cards | Add Card screen: search 280 cards, enter last 4 digits and points |
| Wallet | "≈ 1 return flight Pune → Goa" | Invented | Computed from wallet value, labelled estimate |
| Wallet | Redeem → on expiry banner | Does nothing | Opens the card's Redeem tab |
| Card detail | Balances | Cannot edit; cannot remove a card | Edit points and last 4 digits, remove card |
| Card detail | Artwork | Unknown cards fell back to the Infinia image | Generated card face for any of the 280 cards |
| Learn | Topic pages | Only travel had artwork | Generated faces for all; real images only with permission (see note) |
| Learn | One video | Thin | Video library by level (beginner, rewards, travel) |
| Learn | Progress 68%, academy ticks | Fake progress | Neutral "Start here" lessons |
| Aura | Groq LLM with key in the app bundle | Key exposed; numbers depended on an outside model | On-device Aura built on the engine; no API key |
| Everywhere | Sample balances | Users may think they are real | Label demo data; Add Card replaces it |

Card images: bank card artwork is the issuers' copyrighted material. Downloading images for all cards from random websites risks wrong or broken images and rights issues, so this pass generates a consistent card face for every card. Real images can be added per card later from the issuers' own pages, with your go-ahead.
