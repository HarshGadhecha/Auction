import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth, database } from './firebase';
import { ref, set, get, update } from 'firebase/database';
import { User } from '@/types';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from './firebase.config';

class AuthService {
  // Google Sign-In
  async signInWithGoogle(): Promise<User | null> {
    try {
      const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      });

      const result = await promptAsync();

      if (result.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);

        return await this.createOrUpdateUser(userCredential.user, 'google');
      }

      return null;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  // Apple Sign-In
  async signInWithApple(): Promise<User | null> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: identityToken,
      });

      const userCredential = await signInWithCredential(auth, authCredential);
      return await this.createOrUpdateUser(userCredential.user, 'apple');
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      throw error;
    }
  }

  // Create or update user in database
  private async createOrUpdateUser(
    firebaseUser: FirebaseUser,
    provider: 'google' | 'apple'
  ): Promise<User> {
    const userRef = ref(database, `users/${firebaseUser.uid}`);
    const snapshot = await get(userRef);

    const now = Date.now();

    if (!snapshot.exists()) {
      // Create new user
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        provider,
        subscription: null,
        createdAt: now,
        updatedAt: now,
      };

      await set(userRef, newUser);
      return newUser;
    } else {
      // Update existing user
      const updates = {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        updatedAt: now,
      };

      await update(userRef, updates);
      return { ...snapshot.val(), ...updates };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const userRef = ref(database, `users/${firebaseUser.uid}`);
    const snapshot = await get(userRef);

    return snapshot.exists() ? snapshot.val() : null;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  // Check subscription status
  async checkSubscription(uid: string): Promise<boolean> {
    const userRef = ref(database, `users/${uid}/subscription`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return false;

    const subscription = snapshot.val();
    if (!subscription.isActive) return false;

    // Check if subscription is expired
    if (subscription.expiresAt && subscription.expiresAt < Date.now()) {
      // Update subscription status
      await update(userRef, { isActive: false });
      return false;
    }

    return true;
  }
}

export default new AuthService();
