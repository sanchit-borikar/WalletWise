# WalletWise

WalletWise is an intelligent, React Native / Expo mobile application designed to optimize your credit card rewards. Using an on-device recommendation engine built on open data for 280 Indian cards, and location-based mapping (via Mapbox), WalletWise recommends the best card to use for any given purchase based on your specific location or merchant category, maximizing your cashback and points.

## Features

- 📍 **Location-Based Recommendations:** Identifies nearby merchants using Mapbox and suggests the best card for maximum rewards.
- 💳 **Card Wallet:** Add and manage your credit cards, tracking individual benefits and reward categories.
- 🤖 **Aura Assistant:** Answers which card to use, how to use points, whether a new card is worth it, and how cards work. Runs on the device using the WalletWise engine; no API key needed.
- 🧭 **Find My Card:** Picks the best one or two cards for your spending after fees, or tells you none is worth it.
- ✈️ **Trip Planner:** Check fares on Skyscanner, then compare paying cash with your best card versus using points.
- 📚 **Learn Hub:** Curated topics and educational materials on travel miles, lounge access, credit scores, and more.
- 🎨 **Premium UI/UX:** Built with a modern, dark-themed, glassmorphic aesthetic using React Native Reanimated.

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) or [bun](https://bun.sh/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A [Mapbox Access Token](https://docs.mapbox.com/help/getting-started/access-tokens/) for maps and location search.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanchit-borikar/WalletWise.git
   cd WalletWise
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy the `.env.example` file to create a new `.env` file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and replace the placeholder values with your actual API keys:
     ```env
     EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
     ```

4. **Run the App:**
   ```bash
   npx expo start
   ```
   - Press `i` to open in an iOS simulator (Requires a Mac).
   - Press `a` to open in an Android emulator (Requires Android Studio).
   - Or, scan the QR code using the **Expo Go** app on your physical device.

## Technologies Used

- React Native & Expo
- Expo Router (File-based navigation)
- React Native Reanimated (Fluid animations and gestures)
- React Native Maps & Mapbox (Geospatial data and map rendering)
- Zustand (Global state management)
- WalletWise engine (src/engine): card ranking, wallet optimiser, redemption and trip planning
- Card data: CardAdvisor open data (cardadvisor.in/data), CC BY 4.0

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/sanchit-borikar/WalletWise/issues).
