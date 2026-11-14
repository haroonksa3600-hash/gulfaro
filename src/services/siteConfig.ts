export interface PublicPlatformConfig {
  cms: {
    siteName: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    heroTitle: string;
    heroSubtitle: string;
    announcementBanner: {
      enabled: boolean;
      text: string;
      variant: 'info' | 'warning' | 'urgent';
      linkLabel?: string;
      linkUrl?: string;
    };
    footerDescription: string;
    footerContactEmail: string;
    footerCopyright: string;
    aboutUsContent: string;
    contactUsEmail: string;
    contactUsPhone: string;
    contactUsAddress: string;
    faqs: Array<{ id: string; question: string; answer: string }>;
    termsContent: string;
    privacyContent: string;
  };
  adsense: {
    enabled: boolean;
    publisherId: string;
    autoAdsEnabled: boolean;
    testMode: boolean;
    slots: {
      headerLeaderboard: string;
      inFeedClassified: string;
      sidebarRectangle: string;
      jobDetailBottom: string;
    };
  };
  registration: {
    allowJobSeekerRegistration: boolean;
    allowEmployerRegistration: boolean;
    emailVerificationMode: string;
    captchaEnabled: boolean;
  };
  emergency: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    emergencyShutdown: boolean;
    emergencyShutdownMessage: string;
    hideAllPublicJobs: boolean;
    disableNewJobPublishing: boolean;
    restrictedFeatures: string[];
  };
  countries?: Array<{ id: string; enabled: boolean; topCities: string[] }>;
  categories?: Array<{ id: string; name: string; enabled: boolean }>;
}

export async function fetchPublicPlatformConfig(): Promise<PublicPlatformConfig | null> {
  try {
    const res = await fetch('/api/public/config', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PublicPlatformConfig;
  } catch {
    return null;
  }
}
