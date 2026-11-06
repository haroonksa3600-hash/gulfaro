export interface AdSenseSlots {
  headerLeaderboard: string;
  inFeedClassified: string;
  sidebarRectangle: string;
  jobDetailBottom: string;
}

export interface AdSenseConfig {
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  testMode: boolean;
  slots: AdSenseSlots;
}

export const DEFAULT_ADSENSE_CONFIG: AdSenseConfig = {
  enabled: true,
  publisherId: 'ca-pub-0000000000000000',
  autoAdsEnabled: false,
  testMode: true, // Default to demo preview mode so user can see ad placements immediately!
  slots: {
    headerLeaderboard: '1234567890',
    inFeedClassified: '2345678901',
    sidebarRectangle: '3456789012',
    jobDetailBottom: '4567890123'
  }
};
