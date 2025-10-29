import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Colors from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SettingsScreen() {
  const { user, signOut, hasSubscription } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const colors = isDark ? Colors.dark : Colors.light;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleThemeChange = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        {user?.photoURL && (
          <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
        )}
        <Text style={[styles.profileName, { color: colors.text }]}>
          {user?.displayName || 'User'}
        </Text>
        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>

        {hasSubscription && (
          <View style={[styles.subscriptionBadge, { backgroundColor: colors.success + '20' }]}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <Text style={[styles.subscriptionText, { color: colors.success }]}>
              Premium Active
            </Text>
          </View>
        )}
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PREFERENCES
        </Text>

        {/* Dark Mode Toggle */}
        <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
          <View style={styles.settingInfo}>
            <IconSymbol
              name={isDark ? 'moon.fill' : 'sun.max.fill'}
              size={24}
              color={colors.text}
            />
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeChange}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ACCOUNT
        </Text>

        {!hasSubscription && (
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={() => Alert.alert('Subscription', 'Subscription feature coming soon!')}
          >
            <View style={styles.settingInfo}>
              <IconSymbol name="crown.fill" size={24} color={colors.warning} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Upgrade to Premium
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={handleSignOut}
        >
          <View style={styles.settingInfo}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.error} />
            <Text style={[styles.settingLabel, { color: colors.error }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
          Auction v1.0.0
        </Text>
        <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
          Made with ❤️ for sports enthusiasts
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
  },
});
