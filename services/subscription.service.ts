// In-App Purchase service for subscriptions
import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import { database } from './firebase';
import { ref, update } from 'firebase/database';
import { SubscriptionInfo } from '@/types';

export type SubscriptionType = '3day' | '7day' | '1month';

export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  type: SubscriptionType;
}

// Product IDs - Replace with your actual IDs from App Store Connect / Google Play Console
const PRODUCT_IDS = {
  iOS: {
    '3day': 'com.yourcompany.auction.subscription.3day',
    '7day': 'com.yourcompany.auction.subscription.7day',
    '1month': 'com.yourcompany.auction.subscription.1month',
  },
  android: {
    '3day': 'auction_subscription_3day',
    '7day': 'auction_subscription_7day',
    '1month': 'auction_subscription_1month',
  },
};

class SubscriptionService {
  private connected = false;

  // Initialize IAP connection
  async initialize(): Promise<void> {
    try {
      await InAppPurchases.connectAsync();
      this.connected = true;
      console.log('IAP connected successfully');
    } catch (error) {
      console.error('IAP connection error:', error);
      throw error;
    }
  }

  // Disconnect IAP
  async disconnect(): Promise<void> {
    try {
      await InAppPurchases.disconnectAsync();
      this.connected = false;
    } catch (error) {
      console.error('IAP disconnect error:', error);
    }
  }

  // Get available products
  async getProducts(): Promise<Product[]> {
    try {
      if (!this.connected) {
        await this.initialize();
      }

      const platform = Platform.OS as 'iOS' | 'android';
      const productIds = Object.values(PRODUCT_IDS[platform]);

      const { results } = await InAppPurchases.getProductsAsync(productIds);

      const products: Product[] = results.map((product) => {
        const type = this.getSubscriptionType(product.productId);
        return {
          productId: product.productId,
          title: product.title || '',
          description: product.description || '',
          price: product.price || '',
          type,
        };
      });

      return products;
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  }

  // Purchase a subscription
  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.initialize();
      }

      await InAppPurchases.purchaseItemAsync(productId);
      return true;
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  // Restore purchases
  async restorePurchases(): Promise<void> {
    try {
      if (!this.connected) {
        await this.initialize();
      }

      const { results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (results && results.length > 0) {
        // Process the most recent purchase
        const latestPurchase = results[0];
        console.log('Restored purchase:', latestPurchase);
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      throw error;
    }
  }

  // Update user subscription in Firebase
  async updateUserSubscription(
    userId: string,
    purchaseInfo: {
      productId: string;
      purchaseToken: string;
      purchaseTime: number;
      platform: 'ios' | 'android';
    }
  ): Promise<void> {
    try {
      const subscriptionType = this.getSubscriptionType(purchaseInfo.productId);
      const duration = this.getSubscriptionDuration(subscriptionType);
      const expiresAt = purchaseInfo.purchaseTime + duration;

      const subscriptionInfo: SubscriptionInfo = {
        isActive: true,
        type: subscriptionType,
        expiresAt,
        purchaseToken: purchaseInfo.purchaseToken,
        platform: purchaseInfo.platform,
      };

      const userRef = ref(database, `users/${userId}/subscription`);
      await update(userRef, subscriptionInfo);

      console.log('User subscription updated:', subscriptionInfo);
    } catch (error) {
      console.error('Update subscription error:', error);
      throw error;
    }
  }

  // Get subscription type from product ID
  private getSubscriptionType(productId: string): SubscriptionType {
    if (productId.includes('3day')) return '3day';
    if (productId.includes('7day')) return '7day';
    if (productId.includes('1month')) return '1month';
    return '3day'; // default
  }

  // Get subscription duration in milliseconds
  private getSubscriptionDuration(type: SubscriptionType): number {
    switch (type) {
      case '3day':
        return 3 * 24 * 60 * 60 * 1000;
      case '7day':
        return 7 * 24 * 60 * 60 * 1000;
      case '1month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 3 * 24 * 60 * 60 * 1000;
    }
  }

  // Check if subscription is still valid
  async checkSubscriptionValidity(userId: string): Promise<boolean> {
    try {
      const userRef = ref(database, `users/${userId}/subscription`);
      const { get } = await import('firebase/database');
      const snapshot = await get(userRef);

      if (!snapshot.exists()) return false;

      const subscription: SubscriptionInfo = snapshot.val();

      if (!subscription.isActive) return false;

      // Check if expired
      if (subscription.expiresAt && subscription.expiresAt < Date.now()) {
        // Update as inactive
        await update(userRef, { isActive: false });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Check subscription validity error:', error);
      return false;
    }
  }

  // Listen to purchase updates
  setPurchaseListener(
    callback: (purchase: InAppPurchases.InAppPurchase) => void
  ): () => void {
    const subscription = InAppPurchases.setPurchaseListener(({ responseCode, results }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        results?.forEach((purchase) => {
          if (!purchase.acknowledged) {
            callback(purchase);
          }
        });
      }
    });

    return () => subscription.remove();
  }

  // Finish a transaction
  async finishTransaction(purchase: InAppPurchases.InAppPurchase): Promise<void> {
    try {
      await InAppPurchases.finishTransactionAsync(purchase, true);
    } catch (error) {
      console.error('Finish transaction error:', error);
    }
  }
}

export default new SubscriptionService();
