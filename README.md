# WalletWise

WalletWise is an intelligent, React Native / Expo mobile application designed to optimize your credit card rewards. By leveraging AI (via Groq) and location-based mapping (via Mapbox), WalletWise recommends the best card to use for any given purchase based on your specific location or merchant category, maximizing your cashback and points.

## Features

- 📍 **Location-Based Recommendations:** Identifies nearby merchants using Mapbox and suggests the best card for maximum rewards.
- 💳 **Card Wallet:** Add and manage your credit cards, tracking individual benefits and reward categories.
- 🤖 **Aura AI Assistant:** Your dedicated AI financial intelligence assistant powered by Groq, providing answers to all your reward, cashback, and finance-related questions.
- 📚 **Learn Hub:** Curated topics and educational materials on travel miles, lounge access, credit scores, and more.
- 🎨 **Premium UI/UX:** Built with a modern, dark-themed, glassmorphic aesthetic using React Native Reanimated.

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) or [bun](https://bun.sh/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A [Groq API Key](https://console.groq.com/keys) for the Aura AI Assistant.
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
     EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
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
- Groq API (Fast LLM inference for the Aura Assistant)

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/sanchit-borikar/WalletWise/issues).
