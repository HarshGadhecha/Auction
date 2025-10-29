import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import Colors from '@/constants/Colors';
import auctionService from '@/services/auction.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SearchScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const handleSearch = async () => {
    if (!referralCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    try {
      setLoading(true);
      const auction = await auctionService.getAuctionByReferralCode(
        referralCode.trim().toUpperCase()
      );

      if (auction) {
        router.push(`/auction/${auction.id}`);
        setReferralCode('');
      } else {
        Alert.alert('Not Found', 'No auction found with this referral code');
      }
    } catch (error) {
      console.error('Search Error:', error);
      Alert.alert('Error', 'Failed to search for auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <IconSymbol name="magnifyingglass.circle.fill" size={80} color={colors.primary} />

        <Text style={[styles.title, { color: colors.text }]}>Search Auction</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter the 8-digit referral code to view an auction
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Enter referral code"
          placeholderTextColor={colors.placeholder}
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
          maxLength={8}
        />

        <TouchableOpacity
          style={[
            styles.searchButton,
            { backgroundColor: colors.primary },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  searchButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
