import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import authService from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  hasSubscription: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[AuthContext] State changed:', {
      hasUser: !!user,
      userId: user?.uid,
      loading,
      hasSubscription,
    });
  }, [user, loading, hasSubscription]);

  useEffect(() => {
    console.log('[AuthContext] Component mounted, initializing auth listener');

    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      console.log('[AuthContext] Auth state changed:', {
        hasUser: !!user,
        userId: user?.uid,
        userEmail: user?.email,
        userName: user?.displayName,
      });

      setUser(user);
      console.log('[AuthContext] Setting loading to false after auth state change');
      setLoading(false);

      if (user) {
        console.log('[AuthContext] User exists, checking subscription status');
        // Check subscription status
        const subStatus = await authService.checkSubscription(user.uid);
        console.log('[AuthContext] Subscription status:', subStatus);
        setHasSubscription(subStatus);
      } else {
        console.log('[AuthContext] No user, setting hasSubscription to false');
        setHasSubscription(false);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] signInWithGoogle called, setting loading to true');
      setLoading(true);
      console.log('[AuthContext] Calling authService.signInWithGoogle()');
      await authService.signInWithGoogle();
      console.log('[AuthContext] authService.signInWithGoogle() completed');
    } catch (error) {
      console.error('[AuthContext] Google Sign-In Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] signInWithGoogle finally block - NOT setting loading to false (will be set by onAuthStateChange)');
      // DO NOT set loading to false here - let onAuthStateChange handle it
      // setLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('[AuthContext] signInWithApple called, setting loading to true');
      setLoading(true);
      console.log('[AuthContext] Calling authService.signInWithApple()');
      await authService.signInWithApple();
      console.log('[AuthContext] authService.signInWithApple() completed');
    } catch (error) {
      console.error('[AuthContext] Apple Sign-In Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] signInWithApple finally block - NOT setting loading to false (will be set by onAuthStateChange)');
      // DO NOT set loading to false here - let onAuthStateChange handle it
      // setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext] signOut called, setting loading to true');
      setLoading(true);
      console.log('[AuthContext] Calling authService.signOut()');
      await authService.signOut();
      console.log('[AuthContext] authService.signOut() completed, clearing user state');
      setUser(null);
      setHasSubscription(false);
      console.log('[AuthContext] User and subscription state cleared');
    } catch (error) {
      console.error('[AuthContext] Sign Out Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] signOut finally block, setting loading to false');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithApple,
        signOut,
        hasSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
