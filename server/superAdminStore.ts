import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { JOB_CATEGORIES } from '../shared/jobCategories';

const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_FILES = {
  admins: path.join(DATA_DIR, 'admins.json'),
  adminSessions: path.join(DATA_DIR, 'admin_sessions.json'),
  adminResetTokens: path.join(DATA_DIR, 'admin_reset_tokens.json'),
  applications: path.join(DATA_DIR, 'applications.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  auditLogs: path.join(DATA_DIR, 'audit_logs.json'),
  authHistory: path.join(DATA_DIR, 'auth_history.json'),
  emailLogs: path.join(DATA_DIR, 'email_logs.json'),
  siteSettings: path.join(DATA_DIR, 'site_settings.json'),
  marketplaceConfig: path.join(DATA_DIR, 'marketplace_config.json'),
  monetization: path.join(DATA_DIR, 'monetization.json'),
  trash: path.join(DATA_DIR, 'trash.json'),
  systemErrors: path.join(DATA_DIR, 'system_errors.json'),
  users: path.join(DATA_DIR, 'users.json'),
  jobs: path.join(DATA_DIR, 'jobs.json')
};

export type AdminRole = 'owner' | 'super_admin' | 'moderator' | 'support' | 'content_manager';

export const ALL_PERMISSIONS = [
  'overview',
  'users',
  'employers',
  'jobs',
  'auth_settings',
  'emails',
  'reports',
  'cms',
  'analytics',
  'monetization',
  'marketplace',
  'admin_roles',
  'security',
  'emergency'
] as const;

export type AdminPermission = typeof ALL_PERMISSIONS[number] | '*';

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isOwner: boolean;
  status: 'active' | 'suspended';
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'email';
  twoFactorSecret?: string;
  failedAttempts: number;
  lockoutUntil: number | null;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSessionRecord {
  id: string;
  tokenHash: string;
  adminId: string;
  rememberMe: boolean;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
  revoked: boolean;
}

export interface AdminResetTokenRecord {
  tokenHash: string;
  adminId: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip: string;
}

export interface JobApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  applicantUserId?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantWhatsapp: string;
  currentCountry: string;
  currentCity: string;
  iqamaStatus: string;
  yearsExperience: string;
  coverNote: string;
  resumeFileName?: string;
  appliedAt: string;
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected';
}

export interface ReportRecord {
  id: string;
  targetType: 'job' | 'employer' | 'user';
  targetId: string;
  targetTitle: string;
  targetOwnerId?: string;
  reason: string;
  category: 'scam_fraud' | 'visa_fee' | 'spam' | 'fake_job' | 'harassment' | 'inappropriate' | 'auto_flagged' | 'other';
  details: string;
  reporterName: string;
  reporterEmail: string;
  reporterIp: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  actionTaken?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface AuthHistoryRecord {
  id: string;
  actorType: 'user' | 'employer' | 'admin';
  actorId?: string;
  emailOrUsername: string;
  event: 'register' | 'login_success' | 'login_failed' | 'logout' | 'password_reset' | 'lockout' | '2fa_failed';
  success: boolean;
  ip: string;
  userAgent: string;
  reason?: string;
  suspicious: boolean;
  createdAt: string;
}

export interface EmailLogRecord {
  id: string;
  recipient: string;
  subject: string;
  category: 'verification' | 'password_reset' | 'welcome' | 'announcement' | 'security_alert' | 'admin_reset' | 'system';
  provider: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  triggeredBy?: string;
  createdAt: string;
}

export interface SystemErrorRecord {
  id: string;
  level: 'error' | 'warning' | 'security';
  source: string;
  message: string;
  details?: string;
  createdAt: string;
}

export interface TrashItemRecord {
  trashId: string;
  itemType: 'user' | 'job' | 'report';
  originalId: string;
  label: string;
  deletedBy: string;
  deletedAt: string;
  payload: any;
}

export interface SiteSettings {
  registration: {
    allowJobSeekerRegistration: boolean;
    allowEmployerRegistration: boolean;
    emailVerificationMode: 'automatic' | 'required_for_badge' | 'optional';
    spamProtectionEnabled: boolean;
    captchaEnabled: boolean;
    captchaProvider: 'turnstile' | 'hcaptcha' | 'builtin_challenge';
    maxFailedLoginAttempts: number;
    lockoutDurationMinutes: number;
    userSessionTimeoutMinutes: number;
    adminSessionTimeoutMinutes: number;
    blockedDomains: string[];
    blockedKeywords: string[];
  };
  emailConfig: {
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
    verificationSubject: string;
    verificationHeading: string;
    verificationBody: string;
    resetSubject: string;
    resetHeading: string;
    resetBody: string;
    welcomeEmailEnabled: boolean;
    welcomeSubject: string;
    welcomeBody: string;
  };
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
    promoBanners: Array<{
      id: string;
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaUrl: string;
      active: boolean;
    }>;
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
  emergency: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    emergencyShutdown: boolean;
    emergencyShutdownMessage: string;
    hideAllPublicJobs: boolean;
    disableNewJobPublishing: boolean;
    restrictedFeatures: string[];
    updatedAt: string;
    updatedBy: string;
  };
}

export interface MarketplaceConfig {
  countries: Array<{
    id: string;
    name: string;
    nameAr: string;
    flag: string;
    code: string;
    currency: string;
    currencyCode: string;
    phoneCode: string;
    topCities: string[];
    capital: string;
    tagline: string;
    enabled: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    nameAr: string;
    iconName: string;
    description: string;
    popularRoles: string[];
    enabled: boolean;
  }>;
  employmentTypes: Array<{ id: string; label: string; enabled: boolean }>;
  experienceLevels: Array<{ id: string; label: string; enabled: boolean }>;
  salaryRules: {
    showSalaryRange: boolean;
    allowNegotiable: boolean;
    requireSalaryForFeatured: boolean;
    defaultCurrency: string;
  };
}

export interface MonetizationConfig {
  paymentCollectionEnabled: boolean;
  paymentGatewayProvider: 'none' | 'stripe' | 'moyasar' | 'hyperpay';
  currency: string;
  plans: Array<{
    id: string;
    name: string;
    slug: 'standard' | 'featured' | 'sponsored' | 'employer_pro';
    priceMonthly: number;
    durationDays: number;
    description: string;
    features: string[];
    active: boolean;
  }>;
  transactions: Array<{
    id: string;
    userId: string;
    userEmail: string;
    companyName?: string;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'refunded' | 'failed';
    paymentMethod: string;
    createdAt: string;
    refundedAt?: string;
  }>;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[SuperAdminStore] Error reading ${path.basename(filePath)}:`, err);
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[SuperAdminStore] Error writing ${path.basename(filePath)}:`, err);
  }
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  registration: {
    allowJobSeekerRegistration: true,
    allowEmployerRegistration: true,
    emailVerificationMode: 'automatic',
    spamProtectionEnabled: true,
    captchaEnabled: false,
    captchaProvider: 'builtin_challenge',
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    userSessionTimeoutMinutes: 1440,
    adminSessionTimeoutMinutes: 15,
    blockedDomains: ['tempmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com'],
    blockedKeywords: ['pay for visa', 'visa fee advance', 'send money western union', 'processing fee upfront']
  },
  emailConfig: {
    senderName: 'Gulfaro Official',
    senderEmail: process.env.RESEND_FROM_EMAIL || 'security@gulfaro.com',
    replyToEmail: 'admingulfaro@gmail.com',
    verificationSubject: 'Verify Your Employer Corporate Email - Gulfaro',
    verificationHeading: 'Official Employer Verification Gateway',
    verificationBody: 'Please confirm ownership of your corporate email address using the 6-digit code or instant verification link below.',
    resetSubject: 'Reset Your Gulfaro Password',
    resetHeading: 'Account Security & Password Recovery',
    resetBody: 'We received a request to reset the password associated with your Gulfaro account. Use the single-use link below within 1 hour.',
    welcomeEmailEnabled: true,
    welcomeSubject: 'Welcome to Gulfaro GCC Job Marketplace',
    welcomeBody: 'Your Gulfaro account is now active. Browse direct GCC vacancies or publish job advertisements immediately.'
  },
  cms: {
    siteName: 'Gulfaro',
    tagline: 'GCC Job Classifieds Marketplace',
    logoUrl: '/assets/aistudio/Gulfaro_logo_white_clean.png',
    faviconUrl: '/favicon-g-emblem.png',
    heroTitle: 'Direct Job Classifieds Across Saudi Arabia, UAE & The Gulf',
    heroSubtitle: 'Browse verified vacancies across KSA, UAE, Qatar, Kuwait, Bahrain & Oman. Contact employers and recruiters directly through WhatsApp, direct phone call, or email.',
    announcementBanner: {
      enabled: false,
      text: 'Welcome to Gulfaro – Direct GCC Job Classifieds across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman.',
      variant: 'info',
      linkLabel: '',
      linkUrl: ''
    },
    promoBanners: [],
    footerDescription: 'Gulfaro is a modern GCC job marketplace connecting skilled expatriate and national talent with verified employers across the Arabian Gulf, making recruitment simpler, faster, and more reliable.',
    footerContactEmail: 'admingulfaro@gmail.com',
    footerCopyright: '© 2026 GULFARO. All rights reserved. GCC Job Classifieds Marketplace.',
    aboutUsContent: 'Gulfaro connects skilled expatriate and national professionals with verified direct employers and licensed recruiters across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman. Employers can publish vacancies instantly, and candidates connect directly via WhatsApp, phone, or in-app profile submission.',
    contactUsEmail: 'admingulfaro@gmail.com',
    contactUsPhone: '+966 50 000 0000',
    contactUsAddress: 'Riyadh, Kingdom of Saudi Arabia · Serving all 6 GCC Nations',
    faqs: [
      {
        id: 'faq-1',
        question: 'Is Gulfaro free for Job Seekers?',
        answer: 'Yes. Job seekers can browse all vacancies, contact employers via WhatsApp or phone, and submit CVs completely free of charge. Never pay any money for visas or interviews.'
      },
      {
        id: 'faq-2',
        question: 'How quickly do Employer job ads go live?',
        answer: 'Registered employers publish job vacancies automatically and immediately after submitting the form and passing automated security and anti-spam checks.'
      },
      {
        id: 'faq-3',
        question: 'How does automatic account verification work?',
        answer: 'All registered Job Seeker and Employer accounts on Gulfaro are automatically verified upon registration, with immediate dashboard access and Verified account status.'
      }
    ],
    termsContent: 'Employers and agencies are strictly prohibited from demanding recruitment fees, visa charges, or interview processing payments from candidates. All listings must reflect genuine vacancies.',
    privacyContent: 'Gulfaro protects user personal data in compliance with Saudi PDPL, UAE Federal Decree-Law No. 45/2021, and GCC privacy standards.'
  },
  adsense: {
    enabled: true,
    publisherId: 'ca-pub-0000000000000000',
    autoAdsEnabled: false,
    testMode: true,
    slots: {
      headerLeaderboard: '1234567890',
      inFeedClassified: '2345678901',
      sidebarRectangle: '3456789012',
      jobDetailBottom: '4567890123'
    }
  },
  emergency: {
    maintenanceMode: false,
    maintenanceMessage: 'Gulfaro is currently undergoing scheduled platform maintenance to improve performance. We will be back online shortly.',
    emergencyShutdown: false,
    emergencyShutdownMessage: 'Public platform access is temporarily paused for urgent security maintenance.',
    hideAllPublicJobs: false,
    disableNewJobPublishing: false,
    restrictedFeatures: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system'
  }
};

export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  countries: [
    {
      id: 'saudi-arabia',
      name: 'Saudi Arabia',
      nameAr: 'المملكة العربية السعودية',
      flag: '🇸🇦',
      code: 'SA',
      currency: 'SAR',
      currencyCode: 'SAR',
      phoneCode: '+966',
      topCities: ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina', 'Jubail', 'Yanbu', 'Tabuk', 'Al-Ahsa'],
      capital: 'Riyadh',
      tagline: 'Kingdom of Saudi Arabia · Vision 2030 Hub',
      enabled: true
    },
    {
      id: 'uae',
      name: 'United Arab Emirates',
      nameAr: 'الإمارات العربية المتحدة',
      flag: '🇦🇪',
      code: 'AE',
      currency: 'AED',
      currencyCode: 'AED',
      phoneCode: '+971',
      topCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'],
      capital: 'Abu Dhabi',
      tagline: 'UAE · Global Business & Innovation Hub',
      enabled: true
    },
    {
      id: 'qatar',
      name: 'Qatar',
      nameAr: 'دولة قطر',
      flag: '🇶🇦',
      code: 'QA',
      currency: 'QAR',
      currencyCode: 'QAR',
      phoneCode: '+974',
      topCities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Lusail', 'Al Khor', 'Umm Salal'],
      capital: 'Doha',
      tagline: 'Qatar · Energy, Infrastructure & World Trade',
      enabled: true
    },
    {
      id: 'kuwait',
      name: 'Kuwait',
      nameAr: 'دولة الكويت',
      flag: '🇰🇼',
      code: 'KW',
      currency: 'KWD',
      currencyCode: 'KWD',
      phoneCode: '+965',
      topCities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Al Ahmadi', 'Farwaniya', 'Al Jahra'],
      capital: 'Kuwait City',
      tagline: 'Kuwait · High Value & Strategic Commerce',
      enabled: true
    },
    {
      id: 'bahrain',
      name: 'Bahrain',
      nameAr: 'مملكة البحرين',
      flag: '🇧🇭',
      code: 'BH',
      currency: 'BHD',
      currencyCode: 'BHD',
      phoneCode: '+973',
      topCities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'Seef', 'Juffair'],
      capital: 'Manama',
      tagline: 'Bahrain · Financial Gateway of the Gulf',
      enabled: true
    },
    {
      id: 'oman',
      name: 'Oman',
      nameAr: 'سلطنة عُمان',
      flag: '🇴🇲',
      code: 'OM',
      currency: 'OMR',
      currencyCode: 'OMR',
      phoneCode: '+968',
      topCities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Seeb', 'Barka'],
      capital: 'Muscat',
      tagline: 'Sultanate of Oman · Maritime & Industrial Hub',
      enabled: true
    }
  ],
  categories: JOB_CATEGORIES.map(c => ({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr,
    iconName: c.iconName,
    description: c.description,
    popularRoles: c.popularRoles,
    enabled: c.enabled
  })),
  employmentTypes: [
    { id: 'full-time', label: 'Full-Time', enabled: true },
    { id: 'contract', label: 'Contract / Project-Based', enabled: true },
    { id: 'part-time', label: 'Part-Time', enabled: true },
    { id: 'walk-in', label: 'Walk-In Interview', enabled: true },
    { id: 'remote', label: 'Remote', enabled: true }
  ],
  experienceLevels: [
    { id: 'fresher', label: 'Fresher (0 - 1 Yr)', enabled: true },
    { id: '1-3-years', label: '1 to 3 Years', enabled: true },
    { id: '3-5-years', label: '3 to 5 Years', enabled: true },
    { id: '5-10-years', label: '5 to 10 Years', enabled: true },
    { id: '10-plus-years', label: '10+ Years (Senior)', enabled: true }
  ],
  salaryRules: {
    showSalaryRange: true,
    allowNegotiable: true,
    requireSalaryForFeatured: false,
    defaultCurrency: 'SAR'
  }
};

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  paymentCollectionEnabled: false,
  paymentGatewayProvider: 'none',
  currency: 'USD',
  plans: [
    {
      id: 'plan-standard',
      name: 'Standard Classified',
      slug: 'standard',
      priceMonthly: 0,
      durationDays: 30,
      description: 'Instant 30-day listing with direct WhatsApp, phone, and email inquiries.',
      features: ['Instant Publishing', '30-Day Active Listing', 'Direct WhatsApp Button'],
      active: true
    },
    {
      id: 'plan-featured',
      name: 'Featured Job Boost',
      slug: 'featured',
      priceMonthly: 29,
      durationDays: 30,
      description: 'Priority placement above standard jobs with amber Featured highlight badge.',
      features: ['Priority Search Ranking', 'Featured Highlight Badge', '30-Day Active Listing'],
      active: true
    },
    {
      id: 'plan-sponsored',
      name: 'Sponsored GCC Spotlight',
      slug: 'sponsored',
      priceMonthly: 79,
      durationDays: 45,
      description: 'Top-of-feed pinned visibility across all 6 GCC portals.',
      features: ['Top Feed Placement', '45-Day Extended Lifecycle', 'Urgent + Featured Badges'],
      active: true
    }
  ],
  transactions: []
};

const INITIAL_APPLICATION: JobApplicationRecord = {
  id: 'app-101',
  jobId: 'GF-901',
  jobTitle: 'Senior Civil Site Engineer – High-Rise & Infrastructure',
  companyName: 'Al-Bawani Contracting Co.',
  applicantUserId: 'user-seeker-1',
  applicantName: 'Zaid Al-Mansoor',
  applicantEmail: 'zaid.almansoor@example.com',
  applicantPhone: '+966 50 123 4567',
  applicantWhatsapp: '+966501234567',
  currentCountry: 'saudi-arabia',
  currentCity: 'Riyadh',
  iqamaStatus: 'transferable',
  yearsExperience: '5 years',
  coverNote: 'Dear Hiring Team, I am an SCE-registered Civil Engineer with 5 years of site execution experience in Riyadh. My Iqama is transferable immediately via Qiwa.',
  resumeFileName: 'Zaid_AlMansoor_Civil_Engineer_CV.pdf',
  appliedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  status: 'shortlisted'
};

/**
 * Ensures the protected Owner Super Admin account exists on boot.
 * Password is always hashed with bcrypt (cost 12) and never stored in plaintext.
 */
export function ensureOwnerAdminSeeded(): AdminAccount[] {
  const admins = readJson<AdminAccount[]>(DB_FILES.admins, []);
  const hasOwner = admins.some(a => a.isOwner || a.username.toLowerCase() === 'haroon555');

  if (!hasOwner) {
    const now = new Date().toISOString();
    const initialPassword = process.env.SUPER_ADMIN_INITIAL_PASSWORD || '@Haroon15607';
    const passwordHash = bcrypt.hashSync(initialPassword, 12);

    const ownerAccount: AdminAccount = {
      id: 'sa-owner-1',
      username: 'Haroon555',
      email: 'admingulfaro@gmail.com',
      fullName: 'Muhammad Haroon (Founder & Owner)',
      passwordHash,
      role: 'owner',
      permissions: ['*'],
      isOwner: true,
      status: 'active',
      twoFactorEnabled: false,
      twoFactorMethod: 'totp',
      failedAttempts: 0,
      lockoutUntil: null,
      createdAt: now,
      updatedAt: now
    };

    admins.unshift(ownerAccount);
    writeJson(DB_FILES.admins, admins);
  }

  return admins;
}

export function initializeSuperAdminStores(): void {
  ensureOwnerAdminSeeded();
  readJson<AdminSessionRecord[]>(DB_FILES.adminSessions, []);
  readJson<AdminResetTokenRecord[]>(DB_FILES.adminResetTokens, []);
  readJson<JobApplicationRecord[]>(DB_FILES.applications, [INITIAL_APPLICATION]);
  readJson<ReportRecord[]>(DB_FILES.reports, []);
  readJson<AuditLogRecord[]>(DB_FILES.auditLogs, []);
  readJson<AuthHistoryRecord[]>(DB_FILES.authHistory, []);
  readJson<EmailLogRecord[]>(DB_FILES.emailLogs, []);
  readJson<SiteSettings>(DB_FILES.siteSettings, DEFAULT_SITE_SETTINGS);
  readJson<MarketplaceConfig>(DB_FILES.marketplaceConfig, DEFAULT_MARKETPLACE_CONFIG);
  readJson<MonetizationConfig>(DB_FILES.monetization, DEFAULT_MONETIZATION_CONFIG);
  readJson<TrashItemRecord[]>(DB_FILES.trash, []);
  readJson<SystemErrorRecord[]>(DB_FILES.systemErrors, []);
}

export function readAdmins(): AdminAccount[] {
  return ensureOwnerAdminSeeded();
}
export function writeAdmins(admins: AdminAccount[]): void {
  writeJson(DB_FILES.admins, admins);
}

export function readAdminSessions(): AdminSessionRecord[] {
  return readJson<AdminSessionRecord[]>(DB_FILES.adminSessions, []);
}
export function writeAdminSessions(sessions: AdminSessionRecord[]): void {
  writeJson(DB_FILES.adminSessions, sessions);
}

export function readAdminResetTokens(): AdminResetTokenRecord[] {
  return readJson<AdminResetTokenRecord[]>(DB_FILES.adminResetTokens, []);
}
export function writeAdminResetTokens(tokens: AdminResetTokenRecord[]): void {
  writeJson(DB_FILES.adminResetTokens, tokens);
}

export function readApplications(): JobApplicationRecord[] {
  return readJson<JobApplicationRecord[]>(DB_FILES.applications, [INITIAL_APPLICATION]);
}
export function writeApplications(apps: JobApplicationRecord[]): void {
  writeJson(DB_FILES.applications, apps);
}

export function readReports(): ReportRecord[] {
  return readJson<ReportRecord[]>(DB_FILES.reports, []);
}
export function writeReports(reports: ReportRecord[]): void {
  writeJson(DB_FILES.reports, reports);
}

export function readAuditLogs(): AuditLogRecord[] {
  return readJson<AuditLogRecord[]>(DB_FILES.auditLogs, []);
}
export function appendAuditLog(entry: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
  const logs = readAuditLogs();
  const item: AuditLogRecord = {
    ...entry,
    id: `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  logs.unshift(item);
  if (logs.length > 2000) logs.length = 2000;
  writeJson(DB_FILES.auditLogs, logs);
  return item;
}

export function readAuthHistory(): AuthHistoryRecord[] {
  return readJson<AuthHistoryRecord[]>(DB_FILES.authHistory, []);
}
export function appendAuthHistory(entry: Omit<AuthHistoryRecord, 'id' | 'createdAt'>): AuthHistoryRecord {
  const history = readAuthHistory();
  const item: AuthHistoryRecord = {
    ...entry,
    id: `auth-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  history.unshift(item);
  if (history.length > 2500) history.length = 2500;
  writeJson(DB_FILES.authHistory, history);
  return item;
}

export function readEmailLogs(): EmailLogRecord[] {
  return readJson<EmailLogRecord[]>(DB_FILES.emailLogs, []);
}
export function appendEmailLog(entry: Omit<EmailLogRecord, 'id' | 'createdAt'>): EmailLogRecord {
  const logs = readEmailLogs();
  const item: EmailLogRecord = {
    ...entry,
    id: `eml-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  logs.unshift(item);
  if (logs.length > 2000) logs.length = 2000;
  writeJson(DB_FILES.emailLogs, logs);
  return item;
}

export function readSiteSettings(): SiteSettings {
  const saved = readJson<Partial<SiteSettings>>(DB_FILES.siteSettings, DEFAULT_SITE_SETTINGS);
  return {
    registration: { ...DEFAULT_SITE_SETTINGS.registration, ...(saved.registration || {}) },
    emailConfig: { ...DEFAULT_SITE_SETTINGS.emailConfig, ...(saved.emailConfig || {}) },
    cms: {
      ...DEFAULT_SITE_SETTINGS.cms,
      ...(saved.cms || {}),
      announcementBanner: {
        ...DEFAULT_SITE_SETTINGS.cms.announcementBanner,
        ...(saved.cms?.announcementBanner || {})
      }
    },
    adsense: {
      ...DEFAULT_SITE_SETTINGS.adsense,
      ...(saved.adsense || {}),
      slots: { ...DEFAULT_SITE_SETTINGS.adsense.slots, ...(saved.adsense?.slots || {}) }
    },
    emergency: { ...DEFAULT_SITE_SETTINGS.emergency, ...(saved.emergency || {}) }
  };
}
export function writeSiteSettings(settings: SiteSettings): void {
  writeJson(DB_FILES.siteSettings, settings);
}

export function syncMarketplaceCategories(savedCategories?: MarketplaceConfig['categories']): MarketplaceConfig['categories'] {
  const savedById = new Map((savedCategories || []).map(c => [c.id, c]));
  return DEFAULT_MARKETPLACE_CONFIG.categories.map(def => {
    const existing = savedById.get(def.id);
    return existing ? { ...def, enabled: existing.enabled } : def;
  });
}

export function readMarketplaceConfig(): MarketplaceConfig {
  const saved = readJson<Partial<MarketplaceConfig>>(DB_FILES.marketplaceConfig, DEFAULT_MARKETPLACE_CONFIG);
  const categories = syncMarketplaceCategories(Array.isArray(saved.categories) ? saved.categories : undefined);
  return {
    countries: Array.isArray(saved.countries) && saved.countries.length ? saved.countries : DEFAULT_MARKETPLACE_CONFIG.countries,
    categories,
    employmentTypes: Array.isArray(saved.employmentTypes) && saved.employmentTypes.length ? saved.employmentTypes : DEFAULT_MARKETPLACE_CONFIG.employmentTypes,
    experienceLevels: Array.isArray(saved.experienceLevels) && saved.experienceLevels.length ? saved.experienceLevels : DEFAULT_MARKETPLACE_CONFIG.experienceLevels,
    salaryRules: { ...DEFAULT_MARKETPLACE_CONFIG.salaryRules, ...(saved.salaryRules || {}) }
  };
}
export function writeMarketplaceConfig(cfg: MarketplaceConfig): void {
  writeJson(DB_FILES.marketplaceConfig, cfg);
}

export function readMonetization(): MonetizationConfig {
  const saved = readJson<Partial<MonetizationConfig>>(DB_FILES.monetization, DEFAULT_MONETIZATION_CONFIG);
  return {
    ...DEFAULT_MONETIZATION_CONFIG,
    ...saved,
    plans: Array.isArray(saved.plans) && saved.plans.length ? saved.plans : DEFAULT_MONETIZATION_CONFIG.plans,
    transactions: Array.isArray(saved.transactions) ? saved.transactions : []
  };
}
export function writeMonetization(cfg: MonetizationConfig): void {
  writeJson(DB_FILES.monetization, cfg);
}

export function readTrash(): TrashItemRecord[] {
  return readJson<TrashItemRecord[]>(DB_FILES.trash, []);
}
export function writeTrash(items: TrashItemRecord[]): void {
  writeJson(DB_FILES.trash, items);
}

export function readSystemErrors(): SystemErrorRecord[] {
  return readJson<SystemErrorRecord[]>(DB_FILES.systemErrors, []);
}
export function appendSystemError(entry: Omit<SystemErrorRecord, 'id' | 'createdAt'>): void {
  const items = readSystemErrors();
  items.unshift({
    ...entry,
    id: `err-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    createdAt: new Date().toISOString()
  });
  if (items.length > 500) items.length = 500;
  writeJson(DB_FILES.systemErrors, items);
}

// =========================================================================
// RFC 6238 TOTP (Google Authenticator / Authy compatible) - Pure Node Crypto
// =========================================================================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += BASE32_CHARS[bytes[i] % 32];
  }
  return out;
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTotpAt(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const clean = (token || '').replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  // Allow +/- 1 time step window (30s drift)
  for (let w = -1; w <= 1; w++) {
    const candidate = generateTotpAt(secret, step + w);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
      return true;
    }
  }
  return false;
}
