import { database, storage } from './firebase';
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Auction,
  CreateAuctionInput,
  AddTeamInput,
  AddPlayerInput,
  Player,
  Team,
  BidAction
} from '@/types';
import { generateReferralCode } from '@/utils/helpers';

class AuctionService {
  // Create a new auction
  async createAuction(
    userId: string,
    userName: string,
    input: CreateAuctionInput
  ): Promise<string> {
    try {
      const auctionRef = push(ref(database, 'auctions'));
      const auctionId = auctionRef.key!;

      const auction: Auction = {
        id: auctionId,
        ownerId: userId,
        ownerName: userName,
        ...input,
        referralCode: generateReferralCode(),
        players: {},
        teams: {},
        currentAuction: {
          currentPlayerIndex: 0,
          currentTeamIndex: 0,
          currentBiddingTeam: null,
          currentBidAmount: 0,
          isActive: false,
          startedAt: null,
          completedAt: null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'draft',
      };

      await set(auctionRef, auction);
      return auctionId;
    } catch (error) {
      console.error('Create Auction Error:', error);
      throw error;
    }
  }

  // Get auction by ID
  async getAuction(auctionId: string): Promise<Auction | null> {
    try {
      const auctionRef = ref(database, `auctions/${auctionId}`);
      const snapshot = await get(auctionRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Get Auction Error:', error);
      throw error;
    }
  }

  // Get auctions by owner
  async getAuctionsByOwner(userId: string): Promise<Auction[]> {
    try {
      const auctionsRef = ref(database, 'auctions');
      const auctionsQuery = query(
        auctionsRef,
        orderByChild('ownerId'),
        equalTo(userId)
      );

      const snapshot = await get(auctionsQuery);
      if (!snapshot.exists()) return [];

      const auctions: Auction[] = [];
      snapshot.forEach((child) => {
        auctions.push(child.val());
      });

      return auctions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Get Auctions by Owner Error:', error);
      throw error;
    }
  }

  // Get auction by referral code
  async getAuctionByReferralCode(referralCode: string): Promise<Auction | null> {
    try {
      const auctionsRef = ref(database, 'auctions');
      const auctionsQuery = query(
        auctionsRef,
        orderByChild('referralCode'),
        equalTo(referralCode)
      );

      const snapshot = await get(auctionsQuery);
      if (!snapshot.exists()) return null;

      let auction: Auction | null = null;
      snapshot.forEach((child) => {
        auction = child.val();
      });

      return auction;
    } catch (error) {
      console.error('Get Auction by Referral Code Error:', error);
      throw error;
    }
  }

  // Update auction
  async updateAuction(auctionId: string, updates: Partial<Auction>): Promise<void> {
    try {
      const auctionRef = ref(database, `auctions/${auctionId}`);
      await update(auctionRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Update Auction Error:', error);
      throw error;
    }
  }

  // Delete auction
  async deleteAuction(auctionId: string): Promise<void> {
    try {
      const auctionRef = ref(database, `auctions/${auctionId}`);
      await remove(auctionRef);
    } catch (error) {
      console.error('Delete Auction Error:', error);
      throw error;
    }
  }

  // Add team to auction
  async addTeam(auctionId: string, teamInput: AddTeamInput): Promise<string> {
    try {
      const auction = await this.getAuction(auctionId);
      if (!auction) throw new Error('Auction not found');

      const teamId = push(ref(database, `auctions/${auctionId}/teams`)).key!;

      const team: Team = {
        id: teamId,
        ...teamInput,
        totalCredits: auction.totalCreditsPerTeam,
        remainingCredits: auction.totalCreditsPerTeam,
        status: 'available',
        finalPrice: 0,
        players: [],
        order: Object.keys(auction.teams || {}).length,
      };

      await set(ref(database, `auctions/${auctionId}/teams/${teamId}`), team);
      return teamId;
    } catch (error) {
      console.error('Add Team Error:', error);
      throw error;
    }
  }

  // Add player to auction
  async addPlayer(auctionId: string, playerInput: AddPlayerInput): Promise<string> {
    try {
      const auction = await this.getAuction(auctionId);
      if (!auction) throw new Error('Auction not found');

      const playerId = push(ref(database, `auctions/${auctionId}/players`)).key!;

      const player: Player = {
        id: playerId,
        ...playerInput,
        status: 'available',
        assignedToTeam: null,
        finalPrice: 0,
        order: Object.keys(auction.players || {}).length,
      };

      await set(ref(database, `auctions/${auctionId}/players/${playerId}`), player);
      return playerId;
    } catch (error) {
      console.error('Add Player Error:', error);
      throw error;
    }
  }

  // Start auction
  async startAuction(auctionId: string): Promise<void> {
    try {
      await update(ref(database, `auctions/${auctionId}`), {
        status: 'live',
        'currentAuction/isActive': true,
        'currentAuction/startedAt': Date.now(),
      });
    } catch (error) {
      console.error('Start Auction Error:', error);
      throw error;
    }
  }

  // Place bid
  async placeBid(bidAction: BidAction): Promise<void> {
    try {
      const { auctionId, teamId, playerId, amount } = bidAction;

      const updates: any = {
        'currentAuction/currentBiddingTeam': teamId,
        'currentAuction/currentBidAmount': amount,
        updatedAt: Date.now(),
      };

      await update(ref(database, `auctions/${auctionId}`), updates);
    } catch (error) {
      console.error('Place Bid Error:', error);
      throw error;
    }
  }

  // Mark player as sold
  async markPlayerSold(
    auctionId: string,
    playerId: string,
    teamId: string,
    finalPrice: number
  ): Promise<void> {
    try {
      // Update player status
      await update(ref(database, `auctions/${auctionId}/players/${playerId}`), {
        status: 'sold',
        assignedToTeam: teamId,
        finalPrice,
      });

      // Add player to team
      const teamRef = ref(database, `auctions/${auctionId}/teams/${teamId}`);
      const teamSnapshot = await get(teamRef);
      const team: Team = teamSnapshot.val();

      await update(teamRef, {
        players: [...team.players, playerId],
        remainingCredits: team.remainingCredits - finalPrice,
      });

      // Move to next player
      const auctionRef = ref(database, `auctions/${auctionId}`);
      const auctionSnapshot = await get(auctionRef);
      const auction: Auction = auctionSnapshot.val();

      await update(auctionRef, {
        'currentAuction/currentPlayerIndex': auction.currentAuction.currentPlayerIndex + 1,
        'currentAuction/currentBiddingTeam': null,
        'currentAuction/currentBidAmount': 0,
      });
    } catch (error) {
      console.error('Mark Player Sold Error:', error);
      throw error;
    }
  }

  // Mark player as unsold
  async markPlayerUnsold(auctionId: string, playerId: string): Promise<void> {
    try {
      await update(ref(database, `auctions/${auctionId}/players/${playerId}`), {
        status: 'unsold',
      });

      // Move to next player
      const auctionRef = ref(database, `auctions/${auctionId}`);
      const auctionSnapshot = await get(auctionRef);
      const auction: Auction = auctionSnapshot.val();

      await update(auctionRef, {
        'currentAuction/currentPlayerIndex': auction.currentAuction.currentPlayerIndex + 1,
        'currentAuction/currentBiddingTeam': null,
        'currentAuction/currentBidAmount': 0,
      });
    } catch (error) {
      console.error('Mark Player Unsold Error:', error);
      throw error;
    }
  }

  // Complete auction
  async completeAuction(auctionId: string): Promise<void> {
    try {
      await update(ref(database, `auctions/${auctionId}`), {
        status: 'completed',
        'currentAuction/isActive': false,
        'currentAuction/completedAt': Date.now(),
      });
    } catch (error) {
      console.error('Complete Auction Error:', error);
      throw error;
    }
  }

  // Upload image
  async uploadImage(uri: string, path: string): Promise<string> {
    try {
      // Check if storage is initialized
      if (!storage) {
        throw new Error(
          'Firebase Storage is not configured. Please enable Firebase Storage in the Firebase Console and ensure FIREBASE_STORAGE_BUCKET is set in your environment variables.'
        );
      }

      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Invalid image data');
      }

      const imageRef = storageRef(storage, path);
      await uploadBytes(imageRef, blob);

      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Upload Image Error:', error);

      // Provide more helpful error messages
      if (error.code === 'storage/unknown') {
        throw new Error(
          'Firebase Storage error. Please ensure:\n' +
          '1. Firebase Storage is enabled in Firebase Console\n' +
          '2. Storage rules are properly configured\n' +
          '3. Storage bucket name is correct in your configuration'
        );
      } else if (error.code === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload images. Please check Firebase Storage rules.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Image upload was canceled');
      } else if (error.code === 'storage/retry-limit-exceeded') {
        throw new Error('Upload failed due to network issues. Please check your connection and try again.');
      }

      throw error;
    }
  }

  // Listen to auction changes
  onAuctionChange(auctionId: string, callback: (auction: Auction) => void): () => void {
    const auctionRef = ref(database, `auctions/${auctionId}`);

    const listener = onValue(auctionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });

    return () => off(auctionRef, 'value', listener);
  }
}

export default new AuctionService();
