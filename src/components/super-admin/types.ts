export type AdminRole = 'owner' | 'super_admin' | 'moderator' | 'support' | 'content_manager';

export type SuperAdminSection =
  | 'overview'
  | 'users'
  | 'employers'
  | 'jobs'
  | 'auth_settings'
  | 'emails'
  | 'reports'
  | 'cms'
  | 'analytics'
  | 'monetization'
  | 'marketplace'
  | 'admin_roles'
  | 'security'
  | 'emergency';

export interface AdminProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions: string[];
  isOwner: boolean;
  status: 'active' | 'suspended';
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'email';
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OverviewPayload {
  kpis: {
    totalUsers: number;
    totalJobSeekers: number;
    totalEmployers: number;
    verifiedEmployers: number;
    suspendedUsers: number;
    totalJobs: number;
    activeJobs: number;
    featuredJobs: number;
    urgentJobs: number;
    hiddenJobs: number;
    closedJobs: number;
    expiredJobs: number;
    totalApplications: number;
    totalJobViews: number;
    totalInquiries: number;
    newRegistrationsToday: number;
    jobsPostedToday: number;
    applicationsToday: number;
    openReportsCount: number;
    totalReportsCount: number;
    suspiciousAlertsCount: number;
    totalRevenue: number;
  };
  timeline14Days: Array<{
    date: string;
    label: string;
    registrations: number;
    jobs: number;
    applications: number;
  }>;
  jobsByCountry: Record<string, number>;
  jobsByCategory: Record<string, number>;
  usersByCountry: Record<string, number>;
  recentAuditLogs: AuditLogItem[];
  recentReports: ReportItem[];
  suspiciousLogins: AuthHistoryItem[];
  emergencyStatus: {
    maintenanceMode: boolean;
    emergencyShutdown: boolean;
    hideAllPublicJobs: boolean;
    disableNewJobPublishing: boolean;
    restrictedFeatures: string[];
  };
}

export interface AuditLogItem {
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

export interface AuthHistoryItem {
  id: string;
  actorType: 'user' | 'employer' | 'admin';
  actorId?: string;
  emailOrUsername: string;
  event: string;
  success: boolean;
  ip: string;
  userAgent: string;
  reason?: string;
  suspicious: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'job' | 'employer' | 'user';
  targetId: string;
  targetTitle: string;
  reason: string;
  category: string;
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

export interface EmailLogItem {
  id: string;
  recipient: string;
  subject: string;
  category: string;
  provider: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  triggeredBy?: string;
  createdAt: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'job_seeker' | 'employer' | 'admin';
  companyName?: string;
  hiringOrgName?: string;
  companyType?: string;
  phone?: string;
  whatsapp?: string;
  country: string;
  city: string;
  headline?: string;
  professionalTitle?: string;
  bio?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  status: 'active' | 'suspended' | 'banned' | 'deactivated' | 'pending_deletion';
  suspensionReason?: string;
  postingRestricted?: boolean;
  isFeaturedEmployer?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  jobsPostedCount: number;
  applicationsCount: number;
  recentLogins: AuthHistoryItem[];
  applicationsList: any[];
  jobsList: any[];
}

export interface TrashItem {
  trashId: string;
  itemType: 'user' | 'job' | 'report';
  originalId: string;
  label: string;
  deletedBy: string;
  deletedAt: string;
  payload: any;
}
