/**
 * Default image URLs stored in Firebase Storage
 * These images are used when users don't upload custom images
 *
 * IMPORTANT: These are placeholder paths. The actual URLs will be fetched from Firebase Storage.
 * Make sure you have uploaded Tournament.png, Team.png, and Player.png to the root of your Firebase Storage.
 */

export const DEFAULT_IMAGE_PATHS = {
  TOURNAMENT: 'images/Tournament.png',
  TEAM: 'images/Team.png',
  PLAYER: 'images/Player.png',
};

/**
 * Helper function to get default image path by type
 */
export const getDefaultImagePath = (type: 'tournament' | 'team' | 'player'): string => {
  switch (type) {
    case 'tournament':
      return DEFAULT_IMAGE_PATHS.TOURNAMENT;
    case 'team':
      return DEFAULT_IMAGE_PATHS.TEAM;
    case 'player':
      return DEFAULT_IMAGE_PATHS.PLAYER;
    default:
      return DEFAULT_IMAGE_PATHS.TOURNAMENT;
  }
};
