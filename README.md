# Auction - Real-Time Sports Player Auction App

**Turn Every Sports Draft Into An Epic Live Auction Experience**

Real-time sports player auctions. Build teams, bid live, manage tournaments.

---

## 📱 About

Auction is a comprehensive mobile auction management app built with React Native (Expo Router) for iOS and Android. It enables organizers to create thrilling real-time player auctions with multiple bidding formats, team management, and live spectator engagement.

### Key Features

- ⚡ **Multiple Auction Types**
  - Player Auction: Teams bid on individual players
  - Team Auction: Teams bid for picks, then select players
  - Number-wise: Organized round-robin player selection

- 🎯 **Core Features**
  - Real-time bidding with live updates across all devices
  - Smart team & budget management with credit allocation
  - Referral-based spectator access
  - Multiple sports support (Cricket, Football, Basketball, etc.)
  - Offline mode support
  - Push notifications for auction reminders
  - Professional tournament analytics

- 👥 **Built For**
  - Fantasy leagues, Corporate tournaments
  - School competitions, Professional sports drafts

## 🏗️ Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Navigation:** Expo Router v6
- **Language:** TypeScript
- **Backend:** Firebase (Auth, Realtime DB, Storage, Analytics)
- **Authentication:** Google & Apple Sign-In
- **Offline Storage:** SQLite
- **Animations:** Reanimated 4, Lottie
- **Notifications:** Expo Notifications (FCM + APNs)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Firebase account
- Google/Apple Developer accounts for authentication

### Installation

```bash
# Install dependencies
npm install

# Configure Firebase
# Update services/firebase.config.ts with your credentials

# Start development server
npm start

# Run on device
npm run ios      # iOS (Mac only)
npm run android  # Android
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Authentication (Google & Apple)
3. Create Realtime Database
4. Set up Storage bucket
5. Copy config to `services/firebase.config.ts`

See `SETUP.md` for detailed configuration instructions.

## 📂 Project Structure

```
auction/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Dashboard, Search, Settings
│   ├── auction/           # Auction CRUD & live bidding
│   └── auth.tsx           # Authentication
├── services/              # Firebase services
├── contexts/              # React contexts (Auth, Theme)
├── types/                 # TypeScript definitions
└── utils/                 # Helper functions
```

## 🎮 Quick Guide

### Create an Auction
1. Tap "+" button on Dashboard
2. Fill auction details (name, date, venue, credits, etc.)
3. Choose auction type (Player/Team/Number-wise)
4. Add image (optional)

### Add Teams & Players
1. Open auction → Teams/Players tab
2. Tap "Add Team" or "Add Player"
3. Fill details and upload images

### Start Bidding
1. Ensure minimum requirements met
2. Tap "Start" → Begin live auction
3. Teams bid in real-time
4. Mark players as Sold/Unsold

## 🏗️ Development Phases

### ✅ Phase 1 - Foundation (Complete)
- Firebase integration
- Google & Apple authentication
- Navigation & theme support

### ✅ Phase 2 - Core Features (Complete)
- Create auction flow
- Team & player management
- Live bidding (all 3 types)
- Real-time sync
- Share & referral system

### ⏳ Phase 3 - Advanced (Next)
- In-app purchases
- Push notifications
- PDF reports
- Offline support
- Animations

## 🐛 Troubleshooting

**Firebase errors?**
- Verify credentials in `services/firebase.config.ts`

**Build issues?**
```bash
rm -rf node_modules && npm install
npx expo start --clear
```

**Auth not working?**
- Check OAuth client IDs
- Verify bundle identifiers match

## 📄 License

Proprietary - All rights reserved

---

Made with ❤️ for sports enthusiasts | Version 1.0.0
