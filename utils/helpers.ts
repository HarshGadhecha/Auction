import * as Crypto from 'expo-crypto';

// Generate 8-digit alphanumeric referral code
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const randomBytes = Crypto.getRandomBytes(8);

  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }

  return code;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Format time
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// Format date and time
export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

// Calculate remaining time
export function getRemainingTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Validate team count based on subscription
export function canAddTeam(currentTeamCount: number, hasSubscription: boolean): boolean {
  if (hasSubscription) return true;
  return currentTeamCount < 3;
}

// Check if referral code is valid (within 2 days after auction)
export function isReferralCodeValid(auctionDate: number): boolean {
  const now = Date.now();
  const twoDaysAfter = auctionDate + (2 * 24 * 60 * 60 * 1000);
  return now <= twoDaysAfter;
}

// Get player order array from players object
export function getOrderedPlayers<T extends { order: number }>(
  playersObj: Record<string, T>
): T[] {
  return Object.values(playersObj).sort((a, b) => a.order - b.order);
}

// Get team order array from teams object
export function getOrderedTeams<T extends { order: number }>(
  teamsObj: Record<string, T>
): T[] {
  return Object.values(teamsObj).sort((a, b) => a.order - b.order);
}

// Calculate total spent by team
export function calculateTeamSpent(totalCredits: number, remainingCredits: number): number {
  return totalCredits - remainingCredits;
}

// Validate auction can start
export function canStartAuction(
  playersCount: number,
  teamsCount: number,
  playersPerTeam: number
): { valid: boolean; message?: string } {
  if (teamsCount === 0) {
    return { valid: false, message: 'Add at least one team' };
  }

  if (playersCount === 0) {
    return { valid: false, message: 'Add at least one player' };
  }

  const requiredPlayers = teamsCount * playersPerTeam;
  if (playersCount < requiredPlayers) {
    return {
      valid: false,
      message: `Need ${requiredPlayers} players (${playersPerTeam} per team × ${teamsCount} teams)`,
    };
  }

  return { valid: true };
}

// Generate share message
export function generateShareMessage(auctionName: string, referralCode: string): string {
  return `Join my auction "${auctionName}"! Use referral code: ${referralCode}\n\nDownload Auction app to participate.`;
}

// Generate deep link
export function generateDeepLink(referralCode: string): string {
  return `auction://auction/${referralCode}`;
}
