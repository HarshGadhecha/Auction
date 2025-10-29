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

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // Check subscription status
        const subStatus = await authService.checkSubscription(user.uid);
        setHasSubscription(subStatus);
      } else {
        setHasSubscription(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setLoading(true);
      await authService.signInWithApple();
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setUser(null);
      setHasSubscription(false);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    } finally {
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
