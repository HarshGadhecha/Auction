import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Colors from '@/constants/Colors';
import subscriptionService, { Product } from '@/services/subscription.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Platform } from 'react-native';

const FEATURES = [
  'Unlimited teams per auction',
  'Priority support',
  'Advanced analytics',
  'Custom branding',
  'Export detailed reports',
  'Ad-free experience',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, hasSubscription } = useAuth();
  const { isDark } = useTheme();

  const colors = isDark ? Colors.dark : Colors.light;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    setupPurchaseListener();

    return () => {
      subscriptionService.disconnect();
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const availableProducts = await subscriptionService.getProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const setupPurchaseListener = () => {
    const unsubscribe = subscriptionService.setPurchaseListener(async (purchase) => {
      if (user && purchase.productId) {
        try {
          await subscriptionService.updateUserSubscription(user.uid, {
            productId: purchase.productId,
            purchaseToken: purchase.transactionReceipt || '',
            purchaseTime: Date.now(),
            platform: Platform.OS as 'ios' | 'android',
          });

          await subscriptionService.finishTransaction(purchase);

          Alert.alert(
            'Success',
            'Your subscription has been activated!',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } catch (error) {
          console.error('Purchase processing error:', error);
          Alert.alert('Error', 'Failed to activate subscription');
        }
      }
      setPurchasing(null);
    });

    return unsubscribe;
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(productId);
      await subscriptionService.purchaseSubscription(productId);
    } catch (error: any) {
      console.error('Purchase error:', error);
      setPurchasing(null);

      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Failed to complete purchase');
      }
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await subscriptionService.restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully');
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case '3day':
        return '3-Day Pass';
      case '7day':
        return '7-Day Premium';
      case '1month':
        return '1-Month Premium';
      default:
        return 'Premium';
    }
  };

  const getSubscriptionDescription = (type: string) => {
    switch (type) {
      case '3day':
        return 'Perfect for weekend tournaments';
      case '7day':
        return 'Best for weekly leagues';
      case '1month':
        return 'Most popular - Best value!';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading subscriptions...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <IconSymbol name="crown.fill" size={64} color={colors.warning} />
          <Text style={[styles.title, { color: colors.text }]}>
            Upgrade to Premium
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock unlimited teams and premium features
          </Text>
        </View>

        {/* Current Status */}
        {hasSubscription && (
          <View style={[styles.statusCard, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <IconSymbol name="checkmark.circle.fill" size={32} color={colors.success} />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: colors.success }]}>
                Premium Active
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                You're enjoying all premium features
              </Text>
            </View>
          </View>
        )}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>
            Premium Features
          </Text>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Subscription Plans */}
        <View style={styles.plansSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Choose Your Plan
          </Text>
          {products.map((product) => (
            <TouchableOpacity
              key={product.productId}
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                product.type === '1month' && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handlePurchase(product.productId)}
              disabled={purchasing !== null}
            >
              {product.type === '1month' && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {getSubscriptionLabel(product.type)}
                </Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {product.price}
                </Text>
              </View>
              <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                {getSubscriptionDescription(product.type)}
              </Text>
              {purchasing === product.productId ? (
                <ActivityIndicator color={colors.primary} style={styles.planButton} />
              ) : (
                <View style={[styles.planButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.planButtonText}>Subscribe</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Subscriptions auto-renew unless cancelled. Cancel anytime in your device settings.
          By subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
  },
  statusText: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
  },
  featuresCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  planButton: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
