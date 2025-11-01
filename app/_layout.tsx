import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null; // Keep splash screen visible while checking auth state
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{headerShown:false}}>
        {!user ? (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auction/[id]" options={{ headerShown: true, title: 'Auction Details' }} />
            <Stack.Screen name="auction/create" options={{ headerShown: false }} />
            <Stack.Screen name="auction/live/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="subscription" options={{ headerShown: true, title: 'Premium Subscription', presentation: 'modal' }} />
          </>
        )}
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
