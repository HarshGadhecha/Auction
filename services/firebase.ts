import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
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

// Initialize Firebase Storage with error handling
let storage: any = null;
try {
  // Only initialize storage if bucket is configured
  if (firebaseConfig.storageBucket && firebaseConfig.storageBucket !== '') {
    storage = getStorage(app);
    console.log('Firebase Storage initialized successfully');
  } else {
    console.warn('Firebase Storage bucket not configured. Image uploads will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Storage:', error);
  console.warn('Image uploads will be disabled. Please check Firebase Storage configuration.');
}

export { storage };

// Initialize Firebase Analytics (only on web)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app };
