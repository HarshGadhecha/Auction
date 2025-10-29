import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { database } from './firebase';
import { ref, update } from 'firebase/database';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Request permissions error:', error);
      return false;
    }
  }

  // Get push token
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'YOUR_EXPO_PROJECT_ID', // Replace with your Expo project ID
      });

      console.log('Push token:', token.data);

      // Configure channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Get push token error:', error);
      return null;
    }
  }

  // Save token to user profile
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        pushToken: token,
        pushTokenUpdatedAt: Date.now(),
      });
      console.log('Push token saved for user:', userId);
    } catch (error) {
      console.error('Save push token error:', error);
    }
  }

  // Schedule local notification
  async scheduleNotification(
    title: string,
    body: string,
    data: any,
    trigger: Date | number
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger:
          typeof trigger === 'number'
            ? { seconds: trigger }
            : { date: trigger },
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Schedule notification error:', error);
      throw error;
    }
  }

  // Schedule auction reminder (24 hours before)
  async scheduleAuctionReminder(
    auctionId: string,
    auctionName: string,
    auctionDate: number
  ): Promise<string | null> {
    try {
      const now = Date.now();
      const reminderTime = auctionDate - 24 * 60 * 60 * 1000; // 24 hours before

      if (reminderTime <= now) {
        console.log('Auction is too soon to schedule reminder');
        return null;
      }

      const notificationId = await this.scheduleNotification(
        'Auction Reminder',
        `Your auction "${auctionName}" starts tomorrow!`,
        {
          type: 'auction_reminder',
          auctionId,
        },
        new Date(reminderTime)
      );

      return notificationId;
    } catch (error) {
      console.error('Schedule auction reminder error:', error);
      return null;
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Cancel notification error:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Cancel all notifications error:', error);
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Get scheduled notifications error:', error);
      return [];
    }
  }

  // Add notification received listener
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Send immediate notification
  async sendImmediateNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Send immediate notification error:', error);
    }
  }

  // Badge management
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Set badge count error:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Get badge count error:', error);
      return 0;
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Clear badge error:', error);
    }
  }
}

export default new NotificationService();
