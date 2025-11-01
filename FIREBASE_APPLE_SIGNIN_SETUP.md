# Firebase Apple Sign-In Configuration Fix

## Problem
The error `The audience in ID Token [com.harsh-gadhecha.auction] does not match the expected audience AuctionX` occurs because of a mismatch between:
- The iOS app bundle identifier: `com.harsh-gadhecha.auction`
- The Firebase expected audience: `AuctionX`

## Solution

### Step 1: Update Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Apple** in the providers list and click on it
5. You'll see a field for **Service ID**

### Step 2: Fix the Service ID

**Option A: Use the Bundle Identifier (Recommended for simple setup)**
- Set the Service ID to: `com.harsh-gadhecha.auction`
- This matches your iOS bundle identifier from `app.json`

**Option B: Use a Custom Service ID (For production)**
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Create a new **Service ID** (if you haven't already)
4. Use this Service ID in Firebase Console
5. Make sure the Service ID is associated with your App ID

### Step 3: Verify Apple Developer Configuration

1. In Apple Developer Console, go to your **App ID**
2. Enable **Sign In with Apple** capability
3. If using a Service ID:
   - Create a Service ID
   - Configure it with your bundle identifier
   - Add domains and return URLs

### Step 4: Update Firebase Console

After creating/verifying your Service ID in Apple Developer:
1. In Firebase Console → Authentication → Apple provider
2. Enter the **Service ID** you created
3. Save the changes

### Step 5: Test the Integration

1. Clean and rebuild your app
2. Try Apple Sign-In again
3. Check for any errors in the console

## Code Changes Made

The code has been updated to include:
- **Nonce generation** for enhanced security
- **Proper credential handling** with `rawNonce`
- **Enhanced logging** for debugging

## Additional Notes

- The bundle identifier in `app.json` is: `com.harsh-gadhecha.auction`
- This should match the Service ID in Firebase Console
- If you continue to see errors, check the Firebase Console logs for more details

## Still Having Issues?

If you still see the error after updating Firebase:
1. Check that you saved the changes in Firebase Console
2. Verify the Service ID matches exactly (case-sensitive)
3. Ensure Apple Sign-In is enabled in your Apple Developer account
4. Try signing out and back in to Firebase Console
5. Wait a few minutes for Firebase configuration to propagate
