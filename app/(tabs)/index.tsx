import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Colors from '@/constants/Colors';
import auctionService from '@/services/auction.service';
import { Auction } from '@/types';
import { formatDateTime } from '@/utils/helpers';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    loadAuctions();
  }, [user]);

  const loadAuctions = async () => {
    if (!user) return;

    try {
      const userAuctions = await auctionService.getAuctionsByOwner(user.uid);
      setAuctions(userAuctions);
    } catch (error) {
      console.error('Error loading auctions:', error);
      Alert.alert('Error', 'Failed to load auctions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAuctions();
  };

  const handleCreateAuction = () => {
    router.push('/auction/create');
  };

  const handleAuctionPress = (auctionId: string) => {
    router.push(`/auction/${auctionId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return colors.error;
      case 'scheduled':
        return colors.warning;
      case 'completed':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderAuctionItem = ({ item }: { item: Auction }) => {
    const teamCount = Object.keys(item.teams || {}).length;
    const playerCount = Object.keys(item.players || {}).length;

    return (
      <TouchableOpacity
        style={[styles.auctionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleAuctionPress(item.id)}
      >
        <View style={styles.auctionHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.auctionImage} />
          ) : (
            <View style={[styles.auctionImagePlaceholder, { backgroundColor: colors.surface }]}>
              <IconSymbol name="trophy.fill" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.auctionInfo}>
            <Text style={[styles.auctionName, { color: colors.text }]} numberOfLines={1}>
              {item.auctionName}
            </Text>
            <Text style={[styles.auctionDate, { color: colors.textSecondary }]}>
              {formatDateTime(item.auctionDate)}
            </Text>
            <View style={styles.auctionStats}>
              <View style={styles.stat}>
                <IconSymbol name="person.2.fill" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {teamCount} teams
                </Text>
              </View>
              <View style={styles.stat}>
                <IconSymbol name="sportscourt.fill" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {playerCount} players
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.auctionFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={[styles.referralCode, { color: colors.textSecondary }]}>
            Code: {item.referralCode}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="hammer.fill" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Auctions Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create your first auction to get started
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.displayName || 'User'}
          </Text>
        </View>
        {user?.photoURL && (
          <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
        )}
      </View>

      {/* Auctions List */}
      <FlatList
        data={auctions}
        renderItem={renderAuctionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Auction Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={handleCreateAuction}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  welcomeText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  auctionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  auctionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  auctionImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  auctionImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auctionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  auctionName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  auctionDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  auctionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  auctionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  referralCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
