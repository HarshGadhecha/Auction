import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Colors from '@/constants/Colors';
import auctionService from '@/services/auction.service';
import { Auction, Team, Player } from '@/types';
import { formatCurrency, getOrderedPlayers, getOrderedTeams } from '@/utils/helpers';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';

type PlayerListType = 'sold' | 'unsold' | 'available';

export default function LiveAuctionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const colors = isDark ? Colors.dark : Colors.light;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [showPlayerList, setShowPlayerList] = useState<PlayerListType | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    loadAuction();
    startAuction();
  }, [id]);

  const loadAuction = () => {
    const unsubscribe = auctionService.onAuctionChange(id as string, (updatedAuction) => {
      setAuction(updatedAuction);

      // Update current player for player and number-wise auctions
      if (updatedAuction.auctionType !== 'teamBid') {
        const players = getOrderedPlayers(updatedAuction.players);
        const availablePlayers = players.filter((p) => p.status === 'available');
        if (availablePlayers.length > 0) {
          setCurrentPlayer(availablePlayers[updatedAuction.currentAuction.currentPlayerIndex] || null);
        }
      }

      // Update current team for team and number-wise auctions
      if (updatedAuction.auctionType !== 'playerBid') {
        const teams = getOrderedTeams(updatedAuction.teams);
        setCurrentTeam(teams[updatedAuction.currentAuction.currentTeamIndex % teams.length] || null);
      }
    });

    return unsubscribe;
  };

  const startAuction = async () => {
    try {
      await auctionService.startAuction(id as string);
    } catch (error) {
      console.error('Start auction error:', error);
    }
  };

  const handleBid = async (teamId: string) => {
    if (!auction || !currentPlayer) return;

    const newBidAmount =
      auction.currentAuction.currentBidAmount === 0
        ? currentPlayer.basePrice
        : auction.currentAuction.currentBidAmount + auction.minBidIncrement;

    try {
      await auctionService.placeBid({
        auctionId: auction.id,
        teamId,
        playerId: currentPlayer.id,
        amount: newBidAmount,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Bid error:', error);
      Alert.alert('Error', 'Failed to place bid');
    }
  };

  const handleSold = async () => {
    if (!auction || !currentPlayer) return;

    const biddingTeam = auction.currentAuction.currentBiddingTeam;
    if (!biddingTeam) {
      Alert.alert('Error', 'No team has bid on this player');
      return;
    }

    try {
      await auctionService.markPlayerSold(
        auction.id,
        currentPlayer.id,
        biddingTeam,
        auction.currentAuction.currentBidAmount
      );
    } catch (error) {
      console.error('Mark sold error:', error);
      Alert.alert('Error', 'Failed to mark player as sold');
    }
  };

  const handleUnsold = async () => {
    if (!auction || !currentPlayer) return;

    try {
      await auctionService.markPlayerUnsold(auction.id, currentPlayer.id);
    } catch (error) {
      console.error('Mark unsold error:', error);
      Alert.alert('Error', 'Failed to mark player as unsold');
    }
  };

  const handlePlayerSelection = async (player: Player) => {
    if (!auction || !currentTeam) return;

    try {
      await auctionService.markPlayerSold(auction.id, player.id, currentTeam.id, 0);
      setShowPlayerPicker(false);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Player selection error:', error);
      Alert.alert('Error', 'Failed to assign player');
    }
  };

  const handleComplete = () => {
    Alert.alert('Complete Auction', 'Are you sure you want to end this auction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await auctionService.completeAuction(id as string);
            router.replace(`/auction/${id}`);
          } catch (error) {
            Alert.alert('Error', 'Failed to complete auction');
          }
        },
      },
    ]);
  };

  if (!auction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  const teams = getOrderedTeams(auction.teams);
  const players = getOrderedPlayers(auction.players);
  const availablePlayers = players.filter((p) => p.status === 'available');
  const soldPlayers = players.filter((p) => p.status === 'sold');
  const unsoldPlayers = players.filter((p) => p.status === 'unsold');

  const currentBiddingTeam = auction.currentAuction.currentBiddingTeam
    ? auction.teams[auction.currentAuction.currentBiddingTeam]
    : null;

  const renderPlayerAuction = () => (
    <View style={styles.auctionContainer}>
      {/* Current Player */}
      {currentPlayer && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.playerSection, { backgroundColor: colors.card }]}
        >
          {currentPlayer.imageUrl ? (
            <Image source={{ uri: currentPlayer.imageUrl }} style={styles.playerImage} />
          ) : (
            <View style={[styles.playerImagePlaceholder, { backgroundColor: colors.surface }]}>
              <IconSymbol name="person.fill" size={80} color={colors.textSecondary} />
            </View>
          )}
          <Text style={[styles.playerName, { color: colors.text }]}>{currentPlayer.name}</Text>
          {currentPlayer.position && (
            <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
              {currentPlayer.position}
            </Text>
          )}
          <Text style={[styles.basePrice, { color: colors.textSecondary }]}>
            Base: {formatCurrency(currentPlayer.basePrice)}
          </Text>

          {/* Current Bid */}
          {auction.currentAuction.currentBidAmount > 0 && (
            <Animated.View entering={SlideInUp} style={styles.currentBidBox}>
              <Text style={[styles.currentBidLabel, { color: colors.textSecondary }]}>
                Current Bid
              </Text>
              <Text style={[styles.currentBidAmount, { color: colors.success }]}>
                {formatCurrency(auction.currentAuction.currentBidAmount)}
              </Text>
              {currentBiddingTeam && (
                <View style={styles.biddingTeam}>
                  <View
                    style={[styles.teamColorDot, { backgroundColor: currentBiddingTeam.color }]}
                  />
                  <Text style={[styles.biddingTeamName, { color: colors.text }]}>
                    {currentBiddingTeam.name}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* Teams Bidding */}
      <View style={styles.teamsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Teams</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamBidCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                currentBiddingTeam?.id === team.id && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleBid(team.id)}
            >
              <View style={[styles.teamColorBar, { backgroundColor: team.color }]} />
              <Text style={[styles.teamBidName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={[styles.teamBidCredits, { color: colors.textSecondary }]}>
                {formatCurrency(team.remainingCredits)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={handleSold}
        >
          <Text style={styles.actionButtonText}>Sold</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={handleUnsold}
        >
          <Text style={styles.actionButtonText}>Unsold</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTeamAuction = () => (
    <View style={styles.auctionContainer}>
      {/* Current Team's Turn */}
      {currentTeam && (
        <View style={[styles.currentTeamSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Turn</Text>
          <View style={[styles.currentTeamCard, { borderColor: currentTeam.color }]}>
            <View style={[styles.teamColorBar, { backgroundColor: currentTeam.color }]} />
            <Text style={[styles.currentTeamName, { color: colors.text }]}>
              {currentTeam.name}
            </Text>
            <Text style={[styles.currentTeamCredits, { color: colors.textSecondary }]}>
              {formatCurrency(currentTeam.remainingCredits)} remaining
            </Text>
          </View>
        </View>
      )}

      {/* Player Selection */}
      <TouchableOpacity
        style={[styles.selectPlayerButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowPlayerPicker(true)}
      >
        <IconSymbol name="person.badge.plus" size={24} color="#FFFFFF" />
        <Text style={styles.selectPlayerButtonText}>Select Player</Text>
      </TouchableOpacity>

      {/* Selected Player Preview */}
      {selectedPlayer && (
        <View style={[styles.selectedPlayerCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.selectedPlayerLabel, { color: colors.textSecondary }]}>
            Selected Player
          </Text>
          <Text style={[styles.selectedPlayerName, { color: colors.text }]}>
            {selectedPlayer.name}
          </Text>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.success }]}
            onPress={() => selectedPlayer && handlePlayerSelection(selectedPlayer)}
          >
            <Text style={styles.confirmButtonText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderNumberWiseAuction = () => (
    <View style={styles.auctionContainer}>
      {/* Current Team's Turn */}
      {currentTeam && (
        <View style={[styles.currentTeamSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Turn</Text>
          <View style={[styles.currentTeamCard, { borderColor: currentTeam.color }]}>
            <View style={[styles.teamColorBar, { backgroundColor: currentTeam.color }]} />
            <Text style={[styles.currentTeamName, { color: colors.text }]}>
              {currentTeam.name}
            </Text>
            <Text style={[styles.currentTeamCredits, { color: colors.textSecondary }]}>
              Pick {auction.playersPerTeam - currentTeam.players.length} more players
            </Text>
          </View>
        </View>
      )}

      {/* Available Players */}
      <View style={styles.availablePlayersSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Available Players ({availablePlayers.length})
        </Text>
        <ScrollView>
          {availablePlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={[styles.playerPickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handlePlayerSelection(player)}
            >
              {player.imageUrl ? (
                <Image source={{ uri: player.imageUrl }} style={styles.playerPickImage} />
              ) : (
                <View
                  style={[
                    styles.playerPickImagePlaceholder,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.playerPickInfo}>
                <Text style={[styles.playerPickName, { color: colors.text }]}>
                  {player.name}
                </Text>
                {player.position && (
                  <Text style={[styles.playerPickPosition, { color: colors.textSecondary }]}>
                    {player.position}
                  </Text>
                )}
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{auction.auctionName}</Text>
        <TouchableOpacity onPress={handleComplete}>
          <Text style={[styles.completeText, { color: colors.error }]}>Complete</Text>
        </TouchableOpacity>
      </View>

      {/* Auction Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {auction.auctionType === 'playerBid' && renderPlayerAuction()}
        {auction.auctionType === 'teamBid' && renderTeamAuction()}
        {auction.auctionType === 'numberWise' && renderNumberWiseAuction()}
      </ScrollView>

      {/* Bottom Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => setShowPlayerList('available')}
        >
          <Text style={[styles.statusValue, { color: colors.text }]}>
            {availablePlayers.length}
          </Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => setShowPlayerList('sold')}
        >
          <Text style={[styles.statusValue, { color: colors.success }]}>
            {soldPlayers.length}
          </Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Sold</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => setShowPlayerList('unsold')}
        >
          <Text style={[styles.statusValue, { color: colors.error }]}>
            {unsoldPlayers.length}
          </Text>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Unsold</Text>
        </TouchableOpacity>
      </View>

      {/* Player List Modal */}
      <Modal visible={showPlayerList !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {showPlayerList === 'sold' ? 'Sold Players' : showPlayerList === 'unsold' ? 'Unsold Players' : 'Available Players'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerList(null)}>
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                showPlayerList === 'sold'
                  ? soldPlayers
                  : showPlayerList === 'unsold'
                  ? unsoldPlayers
                  : availablePlayers
              }
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.playerListItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.playerListName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {item.assignedToTeam && (
                    <Text style={[styles.playerListTeam, { color: colors.textSecondary }]}>
                      {auction.teams[item.assignedToTeam]?.name}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Player Picker Modal */}
      <Modal visible={showPlayerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Player</Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availablePlayers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.playerListItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedPlayer(item);
                    setShowPlayerPicker(false);
                  }}
                >
                  <Text style={[styles.playerListName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {item.position && (
                    <Text style={[styles.playerListTeam, { color: colors.textSecondary }]}>
                      {item.position}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  auctionContainer: {
    flex: 1,
  },
  playerSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  playerImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 16,
  },
  playerImagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playerPosition: {
    fontSize: 18,
    marginBottom: 8,
  },
  basePrice: {
    fontSize: 16,
  },
  currentBidBox: {
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  currentBidLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  currentBidAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  biddingTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  biddingTeamName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  teamBidCard: {
    width: 120,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    alignItems: 'center',
  },
  teamColorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  teamBidName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  teamBidCredits: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  currentTeamSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  currentTeamCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
  },
  currentTeamName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentTeamCredits: {
    fontSize: 16,
  },
  selectPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectPlayerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  selectedPlayerCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedPlayerLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectedPlayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  confirmButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  availablePlayersSection: {
    flex: 1,
  },
  playerPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  playerPickImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerPickImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPickInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerPickName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerPickPosition: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  playerListName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerListTeam: {
    fontSize: 14,
  },
});
