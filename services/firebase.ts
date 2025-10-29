import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebase.config';

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firebase Realtime Database
export const database = getDatabase(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Analytics (only on web)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app };
