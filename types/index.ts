// Core type definitions for Auction app

export type AuctionType = 'playerBid' | 'teamBid' | 'numberWise';
export type SportType = 'cricket' | 'football' | 'basketball' | 'other';
export type PlayerStatus = 'available' | 'sold' | 'unsold';
export type TeamStatus = 'available' | 'sold';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'apple';
  subscription: SubscriptionInfo | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionInfo {
  isActive: boolean;
  type: '3day' | '7day' | '1month' | null;
  expiresAt: number | null;
  purchaseToken: string | null;
  platform: 'ios' | 'android' | null;
}

export interface Player {
  id: string;
  name: string;
  position?: string;
  imageUrl?: string;
  basePrice: number;
  status: PlayerStatus;
  assignedToTeam: string | null;
  finalPrice: number;
  order: number; // Order in which player appears in auction
}

export interface Team {
  id: string;
  name: string;
  iconUrl?: string;
  color: string;
  sponsorName?: string;
  totalCredits: number;
  remainingCredits: number;
  status: TeamStatus;
  finalPrice: number; // For team auctions
  players: string[]; // Array of player IDs
  order: number; // For number-wise auctions
}

export interface CurrentAuction {
  currentPlayerIndex: number;
  currentTeamIndex: number; // For team auctions
  currentBiddingTeam: string | null;
  currentBidAmount: number;
  isActive: boolean;
  startedAt: number | null;
  completedAt: number | null;
}

export interface Auction {
  id: string;
  ownerId: string;
  ownerName: string;
  auctionName: string;
  sportType: SportType;
  auctionType: AuctionType;
  totalCreditsPerTeam: number;
  playersPerTeam: number;
  minBidIncrement: number;
  auctionDate: number; // timestamp
  venue: string;
  imageUrl?: string;
  referralCode: string; // 8-digit alphanumeric
  players: Record<string, Player>;
  teams: Record<string, Team>;
  currentAuction: CurrentAuction;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
}

export interface CreateAuctionInput {
  auctionName: string;
  sportType: SportType;
  auctionType: AuctionType;
  totalCreditsPerTeam: number;
  playersPerTeam: number;
  minBidIncrement: number;
  auctionDate: number;
  venue: string;
  imageUrl?: string;
}

export interface AddTeamInput {
  name: string;
  iconUrl?: string;
  color: string;
  sponsorName?: string;
}

export interface AddPlayerInput {
  name: string;
  position?: string;
  imageUrl?: string;
  basePrice: number;
}

export interface BidAction {
  auctionId: string;
  teamId: string;
  playerId?: string; // For player auctions
  amount: number;
  timestamp: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}
