import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Colors, { TeamColors } from '@/constants/Colors';
import auctionService from '@/services/auction.service';
import { Auction, Team, Player, AddTeamInput, AddPlayerInput } from '@/types';
import { formatDateTime, canStartAuction, generateShareMessage, canAddTeam } from '@/utils/helpers';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';

type TabType = 'teams' | 'players';

export default function AuctionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, hasSubscription } = useAuth();
  const { isDark } = useTheme();

  const colors = isDark ? Colors.dark : Colors.light;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Team form
  const [teamForm, setTeamForm] = useState<AddTeamInput>({
    name: '',
    color: TeamColors[0],
    sponsorName: '',
  });
  const [teamImageUri, setTeamImageUri] = useState<string | null>(null);

  // Player form
  const [playerForm, setPlayerForm] = useState<AddPlayerInput>({
    name: '',
    position: '',
    basePrice: 0,
  });
  const [playerImageUri, setPlayerImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadAuction();
  }, [id]);

  const loadAuction = async () => {
    try {
      setLoading(true);
      const auctionData = await auctionService.getAuction(id as string);
      if (auctionData) {
        setAuction(auctionData);

        // Listen to real-time updates
        const unsubscribe = auctionService.onAuctionChange(id as string, (updatedAuction) => {
          setAuction(updatedAuction);
        });

        return unsubscribe;
      }
    } catch (error) {
      console.error('Load auction error:', error);
      Alert.alert('Error', 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!teamForm.name.trim()) {
      Alert.alert('Error', 'Please enter team name');
      return;
    }

    if (!canAddTeam(Object.keys(auction?.teams || {}).length, hasSubscription)) {
      Alert.alert(
        'Upgrade Required',
        'You need a premium subscription to add more than 3 teams.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') },
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // Upload team icon if selected
      let iconUrl = undefined;
      if (teamImageUri) {
        const imagePath = `teams/${id}/${Date.now()}.jpg`;
        iconUrl = await auctionService.uploadImage(teamImageUri, imagePath);
      }

      await auctionService.addTeam(id as string, {
        ...teamForm,
        iconUrl,
      });

      setTeamForm({ name: '', color: TeamColors[0], sponsorName: '' });
      setTeamImageUri(null);
      setShowAddTeamModal(false);
      Alert.alert('Success', 'Team added successfully');
    } catch (error) {
      console.error('Add team error:', error);
      Alert.alert('Error', 'Failed to add team');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!playerForm.name.trim()) {
      Alert.alert('Error', 'Please enter player name');
      return;
    }

    if (playerForm.basePrice < 0) {
      Alert.alert('Error', 'Base price cannot be negative');
      return;
    }

    try {
      setLoading(true);

      // Upload player image if selected
      let imageUrl = undefined;
      if (playerImageUri) {
        const imagePath = `players/${id}/${Date.now()}.jpg`;
        imageUrl = await auctionService.uploadImage(playerImageUri, imagePath);
      }

      await auctionService.addPlayer(id as string, {
        ...playerForm,
        imageUrl,
      });

      setPlayerForm({ name: '', position: '', basePrice: 0 });
      setPlayerImageUri(null);
      setShowAddPlayerModal(false);
      Alert.alert('Success', 'Player added successfully');
    } catch (error) {
      console.error('Add player error:', error);
      Alert.alert('Error', 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (type: 'team' | 'player') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'team') {
          setTeamImageUri(result.assets[0].uri);
        } else {
          setPlayerImageUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const handleStartAuction = () => {
    if (!auction) return;

    const teams = Object.values(auction.teams || {});
    const players = Object.values(auction.players || {});

    const validation = canStartAuction(players.length, teams.length, auction.playersPerTeam);

    if (!validation.valid) {
      Alert.alert('Cannot Start', validation.message);
      return;
    }

    Alert.alert(
      'Start Auction',
      'Are you sure you want to start this auction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => router.push(`/auction/live/${id}`),
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!auction) return;

    try {
      const message = generateShareMessage(auction.auctionName, auction.referralCode);
      await Share.share({
        message,
        title: 'Join my auction!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Auction',
      'Are you sure you want to delete this auction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await auctionService.deleteAuction(id as string);
              Alert.alert('Success', 'Auction deleted');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete auction');
            }
          },
        },
      ]
    );
  };

  if (loading || !auction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  const teams = Object.values(auction.teams || {});
  const players = Object.values(auction.players || {});
  const isOwner = user?.uid === auction.ownerId;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          {auction.imageUrl && (
            <Image source={{ uri: auction.imageUrl }} style={styles.headerImage} />
          )}
          <View style={styles.headerInfo}>
            <Text style={[styles.auctionName, { color: colors.text }]}>
              {auction.auctionName}
            </Text>
            <View style={styles.infoRow}>
              <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {formatDateTime(auction.auctionDate)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {auction.venue}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{teams.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Teams</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{players.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {auction.totalCreditsPerTeam}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credits</Text>
              </View>
            </View>
            <View style={[styles.referralBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.referralLabel, { color: colors.textSecondary }]}>
                Referral Code
              </Text>
              <Text style={[styles.referralCode, { color: colors.primary }]}>
                {auction.referralCode}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isOwner && auction.status !== 'completed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleStartAuction}
            >
              <IconSymbol name="play.fill" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleShare}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={handleDelete}
            >
              <IconSymbol name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'teams' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('teams')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'teams' ? colors.primary : colors.textSecondary },
              ]}
            >
              Teams ({teams.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'players' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('players')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'players' ? colors.primary : colors.textSecondary },
              ]}
            >
              Players ({players.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'teams' ? (
            <View>
              {teams.map((team) => (
                <View
                  key={team.id}
                  style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.teamHeader}>
                    {team.iconUrl ? (
                      <Image source={{ uri: team.iconUrl }} style={styles.teamIcon} />
                    ) : (
                      <View style={[styles.teamIconPlaceholder, { backgroundColor: team.color }]} />
                    )}
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                      {team.sponsorName && (
                        <Text style={[styles.teamSponsor, { color: colors.textSecondary }]}>
                          {team.sponsorName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.teamStats}>
                    <Text style={[styles.teamStatText, { color: colors.textSecondary }]}>
                      {team.players.length} players • {team.remainingCredits} credits left
                    </Text>
                  </View>
                </View>
              ))}
              {isOwner && (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowAddTeamModal(true)}
                >
                  <IconSymbol name="plus.circle" size={24} color={colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Team</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {players.map((player) => (
                <View
                  key={player.id}
                  style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {player.imageUrl ? (
                    <Image source={{ uri: player.imageUrl }} style={styles.playerImage} />
                  ) : (
                    <View style={[styles.playerImagePlaceholder, { backgroundColor: colors.surface }]}>
                      <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
                    {player.position && (
                      <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
                        {player.position}
                      </Text>
                    )}
                    <Text style={[styles.playerPrice, { color: colors.primary }]}>
                      Base: {player.basePrice}
                    </Text>
                  </View>
                  <View style={[styles.playerStatus, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.playerStatusText, { color: colors.success }]}>
                      {player.status}
                    </Text>
                  </View>
                </View>
              ))}
              {isOwner && (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowAddPlayerModal(true)}
                >
                  <IconSymbol name="plus.circle" size={24} color={colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Player</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Team Modal */}
      <Modal visible={showAddTeamModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Team</Text>
              <TouchableOpacity onPress={() => setShowAddTeamModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <TouchableOpacity style={styles.imagePicker} onPress={() => handlePickImage('team')}>
                {teamImageUri ? (
                  <Image source={{ uri: teamImageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                    <IconSymbol name="photo" size={32} color={colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                      Add Team Icon
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Team Name *"
                placeholderTextColor={colors.placeholder}
                value={teamForm.name}
                onChangeText={(text) => setTeamForm({ ...teamForm, name: text })}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Sponsor Name (optional)"
                placeholderTextColor={colors.placeholder}
                value={teamForm.sponsorName}
                onChangeText={(text) => setTeamForm({ ...teamForm, sponsorName: text })}
              />

              <Text style={[styles.modalLabel, { color: colors.text }]}>Team Color</Text>
              <View style={styles.colorPicker}>
                {TeamColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      teamForm.color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setTeamForm({ ...teamForm, color })}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddTeam}
              >
                <Text style={styles.modalButtonText}>Add Team</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Player Modal */}
      <Modal visible={showAddPlayerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Player</Text>
              <TouchableOpacity onPress={() => setShowAddPlayerModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <TouchableOpacity style={styles.imagePicker} onPress={() => handlePickImage('player')}>
                {playerImageUri ? (
                  <Image source={{ uri: playerImageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                    <IconSymbol name="person.fill" size={32} color={colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                      Add Player Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Player Name *"
                placeholderTextColor={colors.placeholder}
                value={playerForm.name}
                onChangeText={(text) => setPlayerForm({ ...playerForm, name: text })}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Position (optional)"
                placeholderTextColor={colors.placeholder}
                value={playerForm.position}
                onChangeText={(text) => setPlayerForm({ ...playerForm, position: text })}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Base Price *"
                placeholderTextColor={colors.placeholder}
                value={playerForm.basePrice.toString()}
                onChangeText={(text) => setPlayerForm({ ...playerForm, basePrice: parseInt(text) || 0 })}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.modalButtonText}>Add Player</Text>
              </TouchableOpacity>
            </ScrollView>
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
    padding: 20,
  },
  headerImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerInfo: {},
  auctionName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  referralBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  referralLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  teamCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
  },
  teamSponsor: {
    fontSize: 14,
    marginTop: 2,
  },
  teamStats: {},
  teamStatText: {
    fontSize: 14,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  playerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  playerImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerPosition: {
    fontSize: 14,
    marginTop: 2,
  },
  playerPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  playerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  playerStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
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
  imagePicker: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
