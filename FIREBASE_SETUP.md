# Firebase Configuration Guide

This document provides detailed instructions for configuring Firebase services for the Auction app.

## Table of Contents
1. [Firebase Security Rules](#firebase-security-rules)
2. [Firebase Cloud Functions](#firebase-cloud-functions)
3. [Firebase Storage Setup](#firebase-storage-setup)
4. [Push Notifications Setup](#push-notifications-setup)

---

## Firebase Security Rules

### Realtime Database Rules

Go to Firebase Console → Realtime Database → Rules and paste the following:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('auctions').child($auctionId).child('ownerId').val() === auth.uid",
        ".write": "$uid === auth.uid",
        "subscription": {
          ".write": "auth != null && (auth.uid === $uid || root.child('cloudFunctions').child('subscriptionValidator').val() === true)"
        }
      }
    },
    "auctions": {
      ".read": "auth != null",
      "$auctionId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('ownerId').val() === auth.uid
        )",
        ".validate": "newData.hasChildren(['auctionName', 'ownerId', 'auctionType', 'auctionDate', 'referralCode'])",
        "ownerId": {
          ".validate": "newData.val() === auth.uid"
        },
        "teams": {
          "$teamId": {
            ".write": "root.child('auctions').child($auctionId).child('ownerId').val() === auth.uid"
          }
        },
        "players": {
          "$playerId": {
            ".write": "root.child('auctions').child($auctionId).child('ownerId').val() === auth.uid"
          }
        },
        "currentAuction": {
          ".write": "root.child('auctions').child($auctionId).child('ownerId').val() === auth.uid"
        }
      }
    },
    "referralCodes": {
      ".read": "auth != null",
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### Enable Firebase Storage

**IMPORTANT:** Before using image uploads, you must enable Firebase Storage:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Build → Storage** in the left sidebar
4. Click **Get Started**
5. Choose **Start in production mode** (we'll configure rules next)
6. Select your Cloud Storage location (choose one close to your users)
7. Click **Done**

Your storage bucket will be created with a URL like: `your-project-id.appspot.com`

### Verify Environment Variables

Ensure your `.env` file has the correct storage bucket:

```env
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

⚠️ **Note:** If `FIREBASE_STORAGE_BUCKET` is empty or incorrect, image uploads will fail with a "storage/unknown" error.

### Storage Rules

After enabling Storage, go to Firebase Console → Storage → Rules and paste the following:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to read any file
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }

    // Auction images
    match /auctions/{userId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024 // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }

    // Team icons
    match /teams/{auctionId}/{fileName} {
      allow write: if request.auth != null
                   && request.resource.size < 2 * 1024 * 1024 // 2MB limit
                   && request.resource.contentType.matches('image/.*');
    }

    // Player images
    match /players/{auctionId}/{fileName} {
      allow write: if request.auth != null
                   && request.resource.size < 3 * 1024 * 1024 // 3MB limit
                   && request.resource.contentType.matches('image/.*');
    }

    // PDF reports
    match /reports/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Firebase Cloud Functions

### Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Cloud Functions:
```bash
firebase init functions
```

### Function 1: Subscription Validator

Create `functions/src/subscriptionValidator.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface SubscriptionPurchase {
  userId: string;
  productId: string;
  purchaseToken: string;
  platform: 'ios' | 'android';
}

export const validateSubscription = functions.https.onCall(
  async (data: SubscriptionPurchase, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userId, productId, purchaseToken, platform } = data;

    try {
      // Validate with Apple/Google APIs
      const isValid = platform === 'ios'
        ? await validateAppleReceipt(purchaseToken)
        : await validateGoogleReceipt(purchaseToken, productId);

      if (isValid) {
        // Calculate expiration
        const duration = getSubscriptionDuration(productId);
        const expiresAt = Date.now() + duration;

        // Update user subscription in database
        await admin.database().ref(`users/${userId}/subscription`).update({
          isActive: true,
          type: getSubscriptionType(productId),
          expiresAt,
          purchaseToken,
          platform,
          validatedAt: Date.now(),
        });

        return { success: true, expiresAt };
      } else {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid purchase token'
        );
      }
    } catch (error) {
      console.error('Validation error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to validate subscription'
      );
    }
  }
);

async function validateAppleReceipt(receiptData: string): Promise<boolean> {
  // Implement Apple receipt validation
  // Use https://buy.itunes.apple.com/verifyReceipt
  // For production: https://buy.itunes.apple.com/verifyReceipt
  // For sandbox: https://sandbox.itunes.apple.com/verifyReceipt
  return true; // Placeholder
}

async function validateGoogleReceipt(
  purchaseToken: string,
  productId: string
): Promise<boolean> {
  // Implement Google Play validation
  // Use Google Play Developer API
  return true; // Placeholder
}

function getSubscriptionDuration(productId: string): number {
  if (productId.includes('3day')) return 3 * 24 * 60 * 60 * 1000;
  if (productId.includes('7day')) return 7 * 24 * 60 * 60 * 1000;
  if (productId.includes('1month')) return 30 * 24 * 60 * 60 * 1000;
  return 3 * 24 * 60 * 60 * 1000;
}

function getSubscriptionType(productId: string): '3day' | '7day' | '1month' {
  if (productId.includes('3day')) return '3day';
  if (productId.includes('7day')) return '7day';
  if (productId.includes('1month')) return '1month';
  return '3day';
}
```

### Function 2: Auction Reminder Scheduler

Create `functions/src/auctionReminder.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const scheduleAuctionReminders = functions.database
  .ref('/auctions/{auctionId}')
  .onCreate(async (snapshot, context) => {
    const auction = snapshot.val();
    const auctionId = context.params.auctionId;

    const auctionDate = auction.auctionDate;
    const reminderTime = auctionDate - 24 * 60 * 60 * 1000; // 24 hours before

    if (reminderTime > Date.now()) {
      // Get owner's push token
      const ownerSnapshot = await admin
        .database()
        .ref(`users/${auction.ownerId}`)
        .once('value');
      const owner = ownerSnapshot.val();

      if (owner && owner.pushToken) {
        // Schedule notification
        const message = {
          notification: {
            title: 'Auction Reminder',
            body: `Your auction "${auction.auctionName}" starts tomorrow!`,
          },
          data: {
            auctionId,
            type: 'auction_reminder',
          },
          token: owner.pushToken,
        };

        // You would typically use a job scheduler like Cloud Tasks
        // For now, this is a placeholder
        console.log('Scheduled reminder for auction:', auctionId);
      }
    }

    return null;
  });

export const sendAuctionNotifications = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = Date.now();
    const reminderWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Get auctions that need reminders
    const auctionsSnapshot = await admin
      .database()
      .ref('auctions')
      .orderByChild('auctionDate')
      .startAt(now)
      .endAt(now + reminderWindow)
      .once('value');

    const promises: Promise<any>[] = [];

    auctionsSnapshot.forEach((snapshot) => {
      const auction = snapshot.val();
      const auctionId = snapshot.key;

      // Check if reminder already sent
      if (!auction.reminderSent) {
        promises.push(sendReminder(auctionId, auction));
      }
    });

    await Promise.all(promises);
    return null;
  });

async function sendReminder(auctionId: string, auction: any) {
  try {
    const ownerSnapshot = await admin
      .database()
      .ref(`users/${auction.ownerId}`)
      .once('value');
    const owner = ownerSnapshot.val();

    if (owner && owner.pushToken) {
      await admin.messaging().send({
        notification: {
          title: 'Auction Reminder',
          body: `Your auction "${auction.auctionName}" starts tomorrow!`,
        },
        data: {
          auctionId,
          type: 'auction_reminder',
        },
        token: owner.pushToken,
      });

      // Mark reminder as sent
      await admin
        .database()
        .ref(`auctions/${auctionId}`)
        .update({ reminderSent: true });
    }
  } catch (error) {
    console.error('Send reminder error:', error);
  }
}
```

### Function 3: Referral Code Generator

Create `functions/src/referralCodeGenerator.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateReferralCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const code = generateCode();

  // Store code mapping
  await admin.database().ref(`referralCodes/${code}`).set({
    auctionId: data.auctionId,
    createdAt: Date.now(),
    expiresAt: data.auctionDate + 2 * 24 * 60 * 60 * 1000, // 2 days after auction
  });

  return { code };
});

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

### Deploy Functions

```bash
firebase deploy --only functions
```

---

## Push Notifications Setup

### iOS APNs Configuration

1. Go to Apple Developer Portal
2. Create an APNs Key:
   - Certificates, Identifiers & Profiles → Keys
   - Create a new key with APNs enabled
   - Download the .p8 file

3. In Firebase Console:
   - Project Settings → Cloud Messaging → iOS app configuration
   - Upload APNs authentication key
   - Enter Key ID and Team ID

### Android FCM Configuration

1. Firebase automatically configures FCM
2. Ensure `google-services.json` is in your project
3. In Firebase Console → Project Settings → Cloud Messaging
4. Note the Server Key (for backend if needed)

### Testing Notifications

Use Firebase Console → Cloud Messaging → Send test message

Or use the Expo push notification tool:
```bash
expo push:android:upload --api-key <your-fcm-api-key>
```

---

## Environment Variables

Create `.env` file (add to `.gitignore`):

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_DATABASE_URL=your_database_url
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

GOOGLE_WEB_CLIENT_ID=your_web_client_id
GOOGLE_IOS_CLIENT_ID=your_ios_client_id
GOOGLE_ANDROID_CLIENT_ID=your_android_client_id

EXPO_PROJECT_ID=your_expo_project_id
```

---

## Testing Checklist

- [ ] Authentication (Google & Apple Sign-In)
- [ ] Database read/write permissions
- [ ] Image uploads to Storage
- [ ] Subscription validation
- [ ] Push notifications
- [ ] Referral code generation
- [ ] PDF report generation
- [ ] Deep linking

---

## Troubleshooting

**Security Rules errors:**
- Check user is authenticated
- Verify ownership conditions
- Test with Firebase Rules Playground

**Cloud Functions not triggering:**
- Check function logs in Firebase Console
- Verify function deployment
- Check billing account is set up

**Push notifications not working:**
- Verify device token is saved
- Check APNs/FCM configuration
- Test with Firebase Console first

**Storage upload fails (`storage/unknown` error):**
- **Most common cause:** Firebase Storage is not enabled in Firebase Console
  - Go to Firebase Console → Build → Storage and click "Get Started"
- Verify `FIREBASE_STORAGE_BUCKET` is set correctly in `.env` file
- Check that the storage bucket exists (should be `your-project-id.appspot.com`)
- Ensure Storage Rules are published (see Storage Rules section above)
- Verify you're authenticated before uploading
- Check file size limits (5MB for auction images)
- Verify content type is an image (`image/*`)
- Check user permissions in Storage Rules

---

For more help, see:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Firebase](https://rnfirebase.io/)
