# Auction App - Setup Guide

## Overview
Auction is a comprehensive mobile auction management app built with React Native (Expo Router) for iOS and Android. It enables real-time player and team auctions with multiple bidding formats.

## Prerequisites
- Node.js 18+ installed
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- Google Cloud Console account (for Google Sign-In)
- Apple Developer account (for Apple Sign-In, iOS only)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** → Enable Google and Apple Sign-In
   - **Realtime Database** → Create database in test mode
   - **Storage** → Create storage bucket
   - **Analytics** (optional)
   - **Cloud Functions** (for advanced features)

#### Configure Firebase
1. Copy your Firebase config from Project Settings → General → Your apps
2. Update `services/firebase.config.ts` with your Firebase credentials:
```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 3. Google Sign-In Setup

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Create OAuth 2.0 Client IDs for:
   - **Web Client** (required)
   - **iOS Client** (for iOS app)
   - **Android Client** (for Android app)

#### Update Config
Update `services/firebase.config.ts`:
```typescript
export const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID";
export const GOOGLE_IOS_CLIENT_ID = "YOUR_IOS_CLIENT_ID";
export const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID";
```

### 4. Apple Sign-In Setup (iOS only)
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Update `app.json` with your bundle identifier
4. In Firebase Console → Authentication → Sign-in method → Apple
5. Follow Firebase instructions to configure Apple Sign-In

### 5. Update App Configuration
Update `app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.auction"
  },
  "android": {
    "package": "com.yourcompany.auction"
  }
}
```

### 6. Firebase Security Rules

#### Realtime Database Rules
Go to Firebase Console → Realtime Database → Rules:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "auctions": {
      "$auctionId": {
        ".read": "auth != null",
        ".write": "data.child('ownerId').val() === auth.uid"
      }
    }
  }
}
```

#### Storage Rules
Go to Firebase Console → Storage → Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /auctions/{auctionId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## Running the App

### Development
```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web (limited functionality)
npm run web
```

### Build for Production

#### Using EAS Build (Recommended)
1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure EAS:
```bash
eas build:configure
```

4. Build for iOS:
```bash
eas build --platform ios
```

5. Build for Android:
```bash
eas build --platform android
```

## Project Structure

```
auction/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── search.tsx     # Search auctions
│   │   └── settings.tsx   # Settings
│   ├── auction/           # Auction-related screens
│   └── auth.tsx           # Authentication screen
├── components/            # Reusable components
├── constants/            # App constants (colors, etc.)
├── contexts/             # React contexts (Auth, Theme)
├── services/             # Firebase services
├── types/                # TypeScript types
└── utils/                # Helper functions
```

## Key Features Implemented

✅ **Phase 1 - Foundation** (Current)
- Firebase JS SDK integration
- Google & Apple Sign-In authentication
- Tab navigation (Dashboard, Search, Settings)
- Dark/Light theme support
- User profile management
- Auction service layer
- Type-safe TypeScript definitions

⏳ **Phase 2 - Core Auction Features** (Next)
- Create auction flow
- Auction details screen
- Add teams and players
- Live bidding (3 auction types)
- Real-time updates
- Share & referral codes

⏳ **Phase 3 - Advanced Features**
- In-app purchases & subscriptions
- Push notifications
- PDF report generation
- Offline support with SQLite
- Lottie animations
- Deep linking

## Environment Variables
Create a `.env` file (not tracked in git):
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
# ... other Firebase credentials
```

## Troubleshooting

### Common Issues

1. **Firebase not initializing**
   - Verify all Firebase credentials in `firebase.config.ts`
   - Check Firebase project is properly set up

2. **Google Sign-In not working**
   - Verify OAuth client IDs are correct
   - Check bundle ID matches your app configuration

3. **Apple Sign-In not working** (iOS)
   - Ensure capability is enabled in Xcode
   - Verify Apple Sign-In is configured in Firebase

4. **Build errors**
   - Clear cache: `npx expo start --clear`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

## Next Steps
1. Complete Firebase configuration
2. Test authentication flow
3. Proceed with auction creation and management features
4. Implement live bidding functionality
5. Add In-App Purchases
6. Set up push notifications

## Support
For issues and questions, please refer to:
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## License
Proprietary - All rights reserved
