import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { dbQuery, isPostgresEnabled, withTransaction } from './db';
import {
  AdminAccount,
  AdminResetTokenRecord,
  AdminSessionRecord,
  AuditLogRecord,
  AuthHistoryRecord,
  DEFAULT_MARKETPLACE_CONFIG,
  DEFAULT_MONETIZATION_CONFIG,
  DEFAULT_SITE_SETTINGS,
  EmailLogRecord,
  JobApplicationRecord,
  MarketplaceConfig,
  MonetizationConfig,
  ReportRecord,
  SiteSettings,
  SystemErrorRecord,
  TrashItemRecord,
  appendAuditLog as appendAuditLogJson,
  appendAuthHistory as appendAuthHistoryJson,
  appendEmailLog as appendEmailLogJson,
  appendSystemError as appendSystemErrorJson,
  readAdminResetTokens as readAdminResetTokensJson,
  readAdminSessions as readAdminSessionsJson,
  readAdmins as readAdminsJson,
  readApplications as readApplicationsJson,
  readAuditLogs as readAuditLogsJson,
  readAuthHistory as readAuthHistoryJson,
  readEmailLogs as readEmailLogsJson,
  readMarketplaceConfig as readMarketplaceConfigJson,
  readMonetization as readMonetizationJson,
  readReports as readReportsJson,
  readSiteSettings as readSiteSettingsJson,
  readSystemErrors as readSystemErrorsJson,
  readTrash as readTrashJson,
  writeAdminResetTokens as writeAdminResetTokensJson,
  writeAdminSessions as writeAdminSessionsJson,
  writeAdmins as writeAdminsJson,
  writeApplications as writeApplicationsJson,
  writeMarketplaceConfig as writeMarketplaceConfigJson,
  writeMonetization as writeMonetizationJson,
  writeReports as writeReportsJson,
  writeSiteSettings as writeSiteSettingsJson,
  writeTrash as writeTrashJson,
  syncMarketplaceCategories,
  DB_FILES
} from './superAdminStore';
import { resolveJobCategoryId } from '../shared/jobCategories';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const TOKENS_FILE = path.join(DATA_DIR, 'reset_tokens.json');
const VERIFICATIONS_FILE = path.join(DATA_DIR, 'verification_codes.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface RepoUserRecord {
  id: string;
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role: 'job_seeker' | 'employer' | 'admin';
  companyName?: string;
  hiringOrgName?: string;
  companyType?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  headline?: string;
  professionalTitle?: string;
  bio?: string;
  iqamaStatus?: string;
  experienceYears?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  accessKeyHash?: string;
  failedAttempts?: number;
  lockoutUntil?: number | null;
  loginFailedAttempts?: number;
  loginLockoutUntil?: number | null;
  status?: 'active' | 'suspended' | 'banned' | 'deactivated' | 'pending_deletion';
  suspensionReason?: string;
  postingRestricted?: boolean;
  isFeaturedEmployer?: boolean;
  forceLogoutBefore?: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

export interface RepoResetTokenRecord {
  tokenHash: string;
  token?: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip?: string;
}

export interface RepoVerificationCodeRecord {
  code: string;
  token?: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip?: string;
}

const INITIAL_JSON_USERS: RepoUserRecord[] = [
  {
    id: 'user-seeker-1',
    name: 'Zaid Al-Mansoor',
    email: 'zaid.almansoor@example.com',
    password: 'password123',
    role: 'job_seeker',
    phone: '+966 50 123 4567',
    whatsapp: '+966501234567',
    country: 'saudi-arabia',
    city: 'Riyadh',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'user-emp-1',
    name: 'Abdulrahman Al-Harbi',
    email: 'hr@albawani-contracting.example.com',
    password: 'password123',
    role: 'employer',
    companyName: 'Al-Bawani Contracting Co.',
    companyType: 'direct-employer',
    phone: '+966 11 498 7700',
    whatsapp: '+966548921104',
    country: 'saudi-arabia',
    city: 'Riyadh',
    createdAt: '2026-08-15T00:00:00Z'
  },
  {
    id: 'user-emp-2',
    name: 'Sarah Jenkins',
    email: 'talent@fingulf-tech.example.com',
    password: 'password123',
    role: 'employer',
    companyName: 'FinGulf Technologies FZ-LLC',
    companyType: 'direct-employer',
    phone: '+971 4 489 3320',
    whatsapp: '+971508219402',
    country: 'uae',
    city: 'Dubai',
    createdAt: '2026-08-20T00:00:00Z'
  },
  {
    id: 'user-admin-1',
    name: 'Gul Faro Official Admin',
    email: 'admingulfaro@gmail.com',
    password: 'password123',
    role: 'admin',
    country: 'saudi-arabia',
    city: 'Riyadh',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

function pbkdf2Hash(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

function extractPhoneDigits(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

function toIsoOrNull(val?: number | string | null): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return new Date(val).toISOString();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toMsOrNull(val?: string | Date | number | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? null : t;
}

function toIsoString(val: string | Date | number | null | undefined, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  return String(val);
}

// =========================================================================
// JSON File Readers / Writers (Fallback & Rollback Layer)
// =========================================================================

export function readUsersJson(): RepoUserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      writeUsersJson(INITIAL_JSON_USERS);
      return INITIAL_JSON_USERS;
    }
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_JSON_USERS;
  } catch {
    return INITIAL_JSON_USERS;
  }
}

export function writeUsersJson(users: RepoUserRecord[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function readJobsJson(): any[] {
  try {
    if (!fs.existsSync(JOBS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeJobsJson(jobs: any[]): void {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

export function readResetTokensJson(): RepoResetTokenRecord[] {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeResetTokensJson(tokens: RepoResetTokenRecord[]): void {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function readVerificationCodesJson(): RepoVerificationCodeRecord[] {
  try {
    if (!fs.existsSync(VERIFICATIONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(VERIFICATIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeVerificationCodesJson(records: RepoVerificationCodeRecord[]): void {
  fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// =========================================================================
// Row Mappers (PostgreSQL <-> Application Domain Types)
// =========================================================================

function mapUserRow(row: any): RepoUserRecord {
  const role = row.role as RepoUserRecord['role'];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    country: row.country || 'saudi-arabia',
    city: row.city || 'Riyadh',
    companyName: row.company_name || undefined,
    hiringOrgName: row.hiring_org_name || undefined,
    companyType: row.company_type || undefined,
    professionalTitle: row.professional_title || undefined,
    headline: role === 'employer' ? (row.emp_headline || row.seeker_headline || undefined) : (row.seeker_headline || row.emp_headline || undefined),
    bio: row.bio || undefined,
    iqamaStatus: row.iqama_status || undefined,
    experienceYears: row.experience_years || undefined,
    emailVerified: Boolean(row.email_verified),
    emailVerifiedAt: row.email_verified_at ? toIsoString(row.email_verified_at) : undefined,
    accessKeyHash: row.access_key_hash || undefined,
    failedAttempts: Number(row.failed_attempts || 0),
    lockoutUntil: toMsOrNull(row.lockout_until),
    loginFailedAttempts: Number(row.login_failed_attempts || 0),
    loginLockoutUntil: toMsOrNull(row.login_lockout_until),
    status: row.status || 'active',
    suspensionReason: row.suspension_reason || undefined,
    postingRestricted: Boolean(row.posting_restricted),
    isFeaturedEmployer: Boolean(row.is_featured_employer),
    forceLogoutBefore: row.force_logout_before !== null && row.force_logout_before !== undefined ? Number(row.force_logout_before) : undefined,
    lastLoginAt: row.last_login_at ? toIsoString(row.last_login_at) : undefined,
    lastLoginIp: row.last_login_ip || undefined,
    createdAt: toIsoString(row.created_at)
  };
}

function mapJobRow(row: any): any {
  const job: any = {
    id: row.id,
    slug: row.slug,
    userId: row.user_id,
    title: row.title,
    company: row.company,
    companyType: row.company_type,
    country: row.country,
    city: row.city,
    district: row.district || undefined,
    category: resolveJobCategoryId(row.category, { title: row.title, subcategory: row.subcategory }),
    subcategory: row.subcategory || undefined,
    employmentType: row.employment_type,
    vacanciesCount: Number(row.vacancies_count || 1),
    workMode: row.work_mode,
    salaryMin: row.salary_min !== null && row.salary_min !== undefined ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max !== null && row.salary_max !== undefined ? Number(row.salary_max) : undefined,
    salaryDisplay: row.salary_display || undefined,
    salaryNegotiable: Boolean(row.salary_negotiable),
    currency: row.currency,
    salaryPeriod: row.salary_period,
    description: row.description,
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    howToApply: 'email',
    contactMethod: row.contact_phone && !row.contact_email ? 'phone' : 'email',
    iqamaRequirement: row.iqama_requirement,
    drivingLicenseRequired: Boolean(row.driving_license_required),
    genderPreference: row.gender_preference,
    educationLevel: row.education_level ?? '',
    experienceLevel: row.experience_level ?? '',
    contactPerson: row.contact_person ?? '',
    contactPhone: row.contact_phone ?? '',
    contactWhatsapp: row.contact_whatsapp ?? '',
    contactEmail: row.contact_email ?? '',
    isFeatured: Boolean(row.is_featured),
    isUrgent: Boolean(row.is_urgent),
    isEmployerVerified: Boolean(row.is_employer_verified),
    status: row.status,
    packageType: row.package_type,
    rejectionReason: row.rejection_reason || undefined,
    viewsCount: Number(row.views_count || 0),
    inquiriesCount: Number(row.inquiries_count || 0),
    postedAt: toIsoString(row.posted_at),
    expiresAt: toIsoString(row.expires_at)
  };
  if (row.walk_in_interview) {
    job.walkInInterview = row.walk_in_interview;
  }
  return job;
}

function mapAdminRow(row: any): AdminAccount {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isOwner: Boolean(row.is_owner),
    status: row.status,
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    twoFactorMethod: row.two_factor_method || 'totp',
    twoFactorSecret: row.two_factor_secret || undefined,
    failedAttempts: Number(row.failed_attempts || 0),
    lockoutUntil: toMsOrNull(row.lockout_until),
    lastLoginAt: row.last_login_at ? toIsoString(row.last_login_at) : undefined,
    lastLoginIp: row.last_login_ip || undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapAdminSessionRow(row: any): AdminSessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    adminId: row.admin_id,
    rememberMe: Boolean(row.remember_me),
    createdAt: toMsOrNull(row.created_at) || Date.now(),
    lastActivityAt: toMsOrNull(row.last_activity_at) || Date.now(),
    expiresAt: toMsOrNull(row.expires_at) || Date.now(),
    ip: row.ip || 'unknown',
    userAgent: row.user_agent || '',
    revoked: Boolean(row.revoked)
  };
}

// =========================================================================
// Transactional Upsert Helpers for PostgreSQL
// =========================================================================

export async function upsertUserPg(client: PoolClient, u: RepoUserRecord): Promise<void> {
  const passwordHash = u.passwordHash || pbkdf2Hash(u.password || 'password123');
  const phoneDigits = extractPhoneDigits(u.phone || u.whatsapp);

  await client.query(
    `INSERT INTO public.users (
      id, name, email, phone, phone_digits, whatsapp, role, country, city,
      password_hash, access_key_hash, failed_attempts, lockout_until,
      login_failed_attempts, login_lockout_until, email_verified, email_verified_at,
      status, suspension_reason, posting_restricted, is_featured_employer,
      force_logout_before, last_login_at, last_login_ip, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,
      $14,$15,$16,$17,
      $18,$19,$20,$21,
      $22,$23,$24,$25,NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      phone_digits = EXCLUDED.phone_digits,
      whatsapp = EXCLUDED.whatsapp,
      role = EXCLUDED.role,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      password_hash = EXCLUDED.password_hash,
      access_key_hash = COALESCE(EXCLUDED.access_key_hash, public.users.access_key_hash),
      failed_attempts = EXCLUDED.failed_attempts,
      lockout_until = EXCLUDED.lockout_until,
      login_failed_attempts = EXCLUDED.login_failed_attempts,
      login_lockout_until = EXCLUDED.login_lockout_until,
      email_verified = EXCLUDED.email_verified,
      email_verified_at = EXCLUDED.email_verified_at,
      status = EXCLUDED.status,
      suspension_reason = EXCLUDED.suspension_reason,
      posting_restricted = EXCLUDED.posting_restricted,
      is_featured_employer = EXCLUDED.is_featured_employer,
      force_logout_before = EXCLUDED.force_logout_before,
      last_login_at = EXCLUDED.last_login_at,
      last_login_ip = EXCLUDED.last_login_ip,
      updated_at = NOW()`,
    [
      u.id,
      u.name,
      u.email.trim().toLowerCase(),
      u.phone || null,
      phoneDigits,
      u.whatsapp || null,
      u.role,
      u.country || 'saudi-arabia',
      u.city || 'Riyadh',
      passwordHash,
      u.accessKeyHash || null,
      Number(u.failedAttempts || 0),
      toIsoOrNull(u.lockoutUntil),
      Number(u.loginFailedAttempts || 0),
      toIsoOrNull(u.loginLockoutUntil),
      Boolean(u.emailVerified),
      toIsoOrNull(u.emailVerifiedAt),
      u.status || 'active',
      u.suspensionReason || null,
      Boolean(u.postingRestricted),
      Boolean(u.isFeaturedEmployer),
      u.forceLogoutBefore ?? null,
      toIsoOrNull(u.lastLoginAt),
      u.lastLoginIp || null,
      toIsoOrNull(u.createdAt) || new Date().toISOString()
    ]
  );

  if (u.role === 'employer') {
    await client.query(
      `INSERT INTO public.employer_profiles (user_id, company_name, hiring_org_name, company_type, headline, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         hiring_org_name = EXCLUDED.hiring_org_name,
         company_type = EXCLUDED.company_type,
         headline = EXCLUDED.headline,
         updated_at = NOW()`,
      [
        u.id,
        u.companyName || u.name,
        u.hiringOrgName || u.companyName || null,
        u.companyType || 'direct-employer',
        u.headline || null
      ]
    );
  } else if (u.role === 'job_seeker') {
    await client.query(
      `INSERT INTO public.job_seeker_profiles (user_id, professional_title, headline, bio, iqama_status, experience_years, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         professional_title = EXCLUDED.professional_title,
         headline = EXCLUDED.headline,
         bio = EXCLUDED.bio,
         iqama_status = EXCLUDED.iqama_status,
         experience_years = EXCLUDED.experience_years,
         updated_at = NOW()`,
      [
        u.id,
        u.professionalTitle || null,
        u.headline || u.professionalTitle || null,
        u.bio || null,
        u.iqamaStatus || null,
        u.experienceYears || null
      ]
    );
  }
}

export async function upsertJobPg(client: PoolClient, j: any): Promise<void> {
  let resolvedUserId: string | null = null;
  const candidateUserId = j.userId ? String(j.userId).trim() : '';
  if (candidateUserId) {
    const userCheck = await client.query('SELECT id FROM public.users WHERE id = $1 LIMIT 1', [candidateUserId]);
    if (userCheck.rows[0]?.id) {
      resolvedUserId = userCheck.rows[0].id;
    }
  }

  await client.query(
    `INSERT INTO public.jobs (
      id, slug, user_id, title, company, company_type, country, city, district,
      category, subcategory, employment_type, vacancies_count, work_mode,
      salary_min, salary_max, salary_display, salary_negotiable, currency, salary_period,
      description, responsibilities, skills, requirements, benefits, walk_in_interview,
      how_to_apply, iqama_requirement, driving_license_required, gender_preference,
      education_level, experience_level, contact_person, contact_phone,
      contact_whatsapp, contact_email, is_featured, is_urgent, is_employer_verified,
      status, package_type, rejection_reason, views_count, inquiries_count,
      posted_at, expires_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,
      $15,$16,$17,$18,$19,$20,
      $21,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb,$26::jsonb,
      'email',$27,$28,$29,
      $30,$31,$32,$33,
      $34,$35,$36,$37,$38,
      $39,$40,$41,$42,$43,
      $44,$45,NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      user_id = COALESCE(EXCLUDED.user_id, public.jobs.user_id),
      title = EXCLUDED.title,
      company = EXCLUDED.company,
      company_type = EXCLUDED.company_type,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      district = EXCLUDED.district,
      category = EXCLUDED.category,
      subcategory = EXCLUDED.subcategory,
      employment_type = EXCLUDED.employment_type,
      vacancies_count = EXCLUDED.vacancies_count,
      work_mode = EXCLUDED.work_mode,
      salary_min = EXCLUDED.salary_min,
      salary_max = EXCLUDED.salary_max,
      salary_display = EXCLUDED.salary_display,
      salary_negotiable = EXCLUDED.salary_negotiable,
      currency = EXCLUDED.currency,
      salary_period = EXCLUDED.salary_period,
      description = EXCLUDED.description,
      responsibilities = EXCLUDED.responsibilities,
      skills = EXCLUDED.skills,
      requirements = EXCLUDED.requirements,
      benefits = EXCLUDED.benefits,
      walk_in_interview = EXCLUDED.walk_in_interview,
      how_to_apply = 'email',
      iqama_requirement = EXCLUDED.iqama_requirement,
      driving_license_required = EXCLUDED.driving_license_required,
      gender_preference = EXCLUDED.gender_preference,
      education_level = EXCLUDED.education_level,
      experience_level = EXCLUDED.experience_level,
      contact_person = EXCLUDED.contact_person,
      contact_phone = EXCLUDED.contact_phone,
      contact_whatsapp = EXCLUDED.contact_whatsapp,
      contact_email = EXCLUDED.contact_email,
      is_featured = EXCLUDED.is_featured,
      is_urgent = EXCLUDED.is_urgent,
      is_employer_verified = EXCLUDED.is_employer_verified,
      status = EXCLUDED.status,
      package_type = EXCLUDED.package_type,
      rejection_reason = EXCLUDED.rejection_reason,
      views_count = EXCLUDED.views_count,
      inquiries_count = EXCLUDED.inquiries_count,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()`,
    [
      j.id,
      j.slug || j.id.toLowerCase(),
      resolvedUserId,
      j.title,
      j.company ?? '',
      j.companyType || 'direct-employer',
      j.country || 'saudi-arabia',
      j.city || 'Riyadh',
      j.district || null,
      resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory }),
      j.subcategory || null,
      j.employmentType || 'full-time',
      Math.max(1, Number(j.vacanciesCount) || 1),
      ['on-site', 'hybrid', 'remote'].includes(j.workMode) ? j.workMode : 'on-site',
      j.salaryMin ?? null,
      j.salaryMax ?? null,
      j.salaryDisplay || null,
      Boolean(j.salaryNegotiable),
      j.currency || 'SAR',
      ['monthly', 'yearly', 'daily'].includes(j.salaryPeriod) ? j.salaryPeriod : 'monthly',
      j.description || '',
      JSON.stringify(Array.isArray(j.responsibilities) ? j.responsibilities : []),
      JSON.stringify(Array.isArray(j.skills) ? j.skills : []),
      JSON.stringify(Array.isArray(j.requirements) ? j.requirements : []),
      JSON.stringify(Array.isArray(j.benefits) ? j.benefits : []),
      j.walkInInterview ? JSON.stringify(j.walkInInterview) : null,
      j.iqamaRequirement || 'any',
      Boolean(j.drivingLicenseRequired),
      ['any', 'male', 'female'].includes(j.genderPreference) ? j.genderPreference : 'any',
      j.educationLevel ?? '',
      j.experienceLevel ?? '',
      j.contactPerson ?? '',
      j.contactPhone ?? '',
      j.contactWhatsapp ?? '',
      j.contactEmail ?? '',
      Boolean(j.isFeatured),
      Boolean(j.isUrgent),
      Boolean(j.isEmployerVerified),
      ['active', 'pending', 'expired', 'rejected', 'hidden', 'closed'].includes(j.status) ? j.status : 'active',
      ['standard', 'featured', 'sponsored'].includes(j.packageType) ? j.packageType : 'standard',
      j.rejectionReason || null,
      Number(j.viewsCount || 0),
      Number(j.inquiriesCount || 0),
      toIsoOrNull(j.postedAt) || new Date().toISOString(),
      toIsoOrNull(j.expiresAt) || new Date(Date.now() + 30 * 86400000).toISOString()
    ]
  );
}

// =========================================================================
// Unified Async Repository API (Postgres OR JSON depending on DB_BACKEND)
// =========================================================================

export async function getUsers(): Promise<RepoUserRecord[]> {
  if (!isPostgresEnabled()) {
    return readUsersJson();
  }
  const res = await dbQuery(
    `SELECT u.*,
            ep.company_name, ep.hiring_org_name, ep.company_type, ep.headline AS emp_headline,
            jp.professional_title, jp.headline AS seeker_headline, jp.bio, jp.iqama_status, jp.experience_years
     FROM public.users u
     LEFT JOIN public.employer_profiles ep ON ep.user_id = u.id
     LEFT JOIN public.job_seeker_profiles jp ON jp.user_id = u.id
     ORDER BY u.created_at DESC`
  );
  return res.rows.map(mapUserRow);
}

export async function findUserByEmail(email: string): Promise<RepoUserRecord | undefined> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isPostgresEnabled()) {
    return readUsersJson().find(u => u.email.toLowerCase() === cleanEmail);
  }
  const res = await dbQuery(
    `SELECT u.*,
            ep.company_name, ep.hiring_org_name, ep.company_type, ep.headline AS emp_headline,
            jp.professional_title, jp.headline AS seeker_headline, jp.bio, jp.iqama_status, jp.experience_years
     FROM public.users u
     LEFT JOIN public.employer_profiles ep ON ep.user_id = u.id
     LEFT JOIN public.job_seeker_profiles jp ON jp.user_id = u.id
     WHERE u.email_normalized = $1
     LIMIT 1`,
    [cleanEmail]
  );
  return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
}

export async function findUserById(id: string): Promise<RepoUserRecord | undefined> {
  if (!isPostgresEnabled()) {
    return readUsersJson().find(u => u.id === id);
  }
  const res = await dbQuery(
    `SELECT u.*,
            ep.company_name, ep.hiring_org_name, ep.company_type, ep.headline AS emp_headline,
            jp.professional_title, jp.headline AS seeker_headline, jp.bio, jp.iqama_status, jp.experience_years
     FROM public.users u
     LEFT JOIN public.employer_profiles ep ON ep.user_id = u.id
     LEFT JOIN public.job_seeker_profiles jp ON jp.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [id]
  );
  return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
}

export async function saveUser(user: RepoUserRecord): Promise<void> {
  if (!isPostgresEnabled()) {
    const users = readUsersJson();
    const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    writeUsersJson(users);
    return;
  }
  await withTransaction(async (client) => {
    await upsertUserPg(client, user);
  });
}

export async function createUserTransactional(user: RepoUserRecord): Promise<void> {
  if (!isPostgresEnabled()) {
    const users = readUsersJson();
    users.push(user);
    writeUsersJson(users);
    return;
  }
  await withTransaction(async (client) => {
    await upsertUserPg(client, user);
  });
}

export async function saveAllUsers(users: RepoUserRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeUsersJson(users);
    return;
  }
  await withTransaction(async (client) => {
    for (const u of users) {
      await upsertUserPg(client, u);
    }
  });
}

export async function deleteUserById(id: string): Promise<boolean> {
  if (!isPostgresEnabled()) {
    const users = readUsersJson();
    const next = users.filter(u => u.id !== id);
    if (next.length === users.length) return false;
    writeUsersJson(next);
    return true;
  }
  const res = await dbQuery('DELETE FROM public.users WHERE id = $1', [id]);
  return (res.rowCount || 0) > 0;
}

export async function forceLogoutAllUsersInStore(cutoffMs: number): Promise<number> {
  if (!isPostgresEnabled()) {
    const users = readUsersJson();
    const updated = users.map(u => ({ ...u, forceLogoutBefore: cutoffMs }));
    writeUsersJson(updated);
    return updated.length;
  }
  const res = await dbQuery('UPDATE public.users SET force_logout_before = $1, updated_at = NOW()', [cutoffMs]);
  return res.rowCount || 0;
}

// --- Jobs ---

export async function getJobs(): Promise<any[]> {
  if (!isPostgresEnabled()) {
    return readJobsJson().map(j => ({
      ...j,
      category: resolveJobCategoryId(j?.category, { title: j?.title, subcategory: j?.subcategory })
    }));
  }
  const res = await dbQuery('SELECT * FROM public.jobs ORDER BY posted_at DESC');
  return res.rows.map(mapJobRow);
}

export async function saveAllJobs(jobs: any[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeJobsJson(jobs);
    return;
  }
  await withTransaction(async (client) => {
    for (const j of jobs) {
      await upsertJobPg(client, j);
    }
  });
}

export async function upsertJob(job: any): Promise<void> {
  if (!isPostgresEnabled()) {
    const jobs = readJobsJson();
    const idx = jobs.findIndex(j => j.id && j.id.toLowerCase() === String(job.id).toLowerCase());
    if (idx >= 0) jobs[idx] = job;
    else jobs.unshift(job);
    writeJobsJson(jobs);
    return;
  }
  await withTransaction(async (client) => {
    await upsertJobPg(client, job);
  });
}

export async function deleteJobById(id: string): Promise<boolean> {
  if (!isPostgresEnabled()) {
    const jobs = readJobsJson();
    const next = jobs.filter(j => !j.id || j.id.toLowerCase() !== id.toLowerCase());
    if (next.length === jobs.length) return false;
    writeJobsJson(next);
    return true;
  }
  const res = await dbQuery('DELETE FROM public.jobs WHERE LOWER(id) = LOWER($1)', [id]);
  return (res.rowCount || 0) > 0;
}

export async function syncEmployerVerifiedOnJobs(userId: string, email: string, verified: boolean): Promise<number> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isPostgresEnabled()) {
    const jobs = readJobsJson();
    let count = 0;
    const updated = jobs.map(j => {
      if (j.userId === userId || (j.contactEmail && j.contactEmail.toLowerCase() === cleanEmail)) {
        count++;
        return { ...j, isEmployerVerified: verified };
      }
      return j;
    });
    if (count > 0) writeJobsJson(updated);
    return count;
  }
  const res = await dbQuery(
    `UPDATE public.jobs
     SET is_employer_verified = $1, updated_at = NOW()
     WHERE user_id = $2 OR LOWER(contact_email) = $3`,
    [verified, userId, cleanEmail]
  );
  return res.rowCount || 0;
}

// --- Verification Codes & Reset Tokens ---

export async function getVerificationCodes(): Promise<RepoVerificationCodeRecord[]> {
  if (!isPostgresEnabled()) return readVerificationCodesJson();
  const res = await dbQuery('SELECT * FROM public.verification_codes ORDER BY created_at DESC');
  return res.rows.map(r => ({
    code: r.code,
    token: r.token || undefined,
    email: r.email,
    expiresAt: toMsOrNull(r.expires_at) || Date.now(),
    used: Boolean(r.used),
    usedAt: toMsOrNull(r.used_at) || undefined,
    createdAt: toMsOrNull(r.created_at) || Date.now(),
    ip: r.ip || undefined
  }));
}

export async function saveVerificationCodes(records: RepoVerificationCodeRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeVerificationCodesJson(records);
    return;
  }
  await withTransaction(async (client) => {
    await client.query('DELETE FROM public.verification_codes');
    for (const r of records) {
      await client.query(
        `INSERT INTO public.verification_codes (email, code, token, expires_at, used, used_at, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          r.email.toLowerCase(),
          r.code,
          r.token || null,
          toIsoOrNull(r.expiresAt) || new Date().toISOString(),
          Boolean(r.used),
          toIsoOrNull(r.usedAt),
          r.ip || null,
          toIsoOrNull(r.createdAt) || new Date().toISOString()
        ]
      );
    }
  });
}

export async function getResetTokens(): Promise<RepoResetTokenRecord[]> {
  if (!isPostgresEnabled()) return readResetTokensJson();
  const res = await dbQuery('SELECT * FROM public.password_reset_tokens ORDER BY created_at DESC');
  return res.rows.map(r => ({
    tokenHash: r.token_hash,
    token: r.token_plain || undefined,
    email: r.email,
    expiresAt: toMsOrNull(r.expires_at) || Date.now(),
    used: Boolean(r.used),
    usedAt: toMsOrNull(r.used_at) || undefined,
    createdAt: toMsOrNull(r.created_at) || Date.now(),
    ip: r.ip || undefined
  }));
}

export async function saveResetTokens(tokens: RepoResetTokenRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeResetTokensJson(tokens);
    return;
  }
  await withTransaction(async (client) => {
    for (const t of tokens) {
      await client.query(
        `INSERT INTO public.password_reset_tokens (token_hash, token_plain, email, expires_at, used, used_at, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (token_hash) DO UPDATE SET
           used = EXCLUDED.used,
           used_at = EXCLUDED.used_at`,
        [
          t.tokenHash,
          t.token || null,
          t.email.toLowerCase(),
          toIsoOrNull(t.expiresAt) || new Date().toISOString(),
          Boolean(t.used),
          toIsoOrNull(t.usedAt),
          t.ip || null,
          toIsoOrNull(t.createdAt) || new Date().toISOString()
        ]
      );
    }
  });
}

// --- Super Admin Accounts, Sessions, Reset Tokens ---

export async function getAdmins(): Promise<AdminAccount[]> {
  if (!isPostgresEnabled()) {
    return readAdminsJson();
  }
  const res = await dbQuery('SELECT * FROM public.admins ORDER BY is_owner DESC, created_at ASC');
  let admins = res.rows.map(mapAdminRow);
  if (!admins.some(a => a.isOwner || a.username.toLowerCase() === 'haroon555')) {
    const now = new Date().toISOString();
    const initialPassword = process.env.SUPER_ADMIN_INITIAL_PASSWORD || '@Haroon15607';
    const passwordHash = bcrypt.hashSync(initialPassword, 12);
    const owner: AdminAccount = {
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
    await saveAdmin(owner);
    admins = [owner, ...admins];
  }
  return admins;
}

export async function saveAdmin(admin: AdminAccount): Promise<void> {
  if (!isPostgresEnabled()) {
    const admins = readAdminsJson();
    const idx = admins.findIndex(a => a.id === admin.id);
    if (idx >= 0) admins[idx] = admin;
    else admins.push(admin);
    writeAdminsJson(admins);
    return;
  }
  await dbQuery(
    `INSERT INTO public.admins (
      id, username, email, full_name, password_hash, role, permissions,
      is_owner, status, two_factor_enabled, two_factor_method, two_factor_secret,
      failed_attempts, lockout_until, last_login_at, last_login_ip, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7::jsonb,
      $8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      status = EXCLUDED.status,
      two_factor_enabled = EXCLUDED.two_factor_enabled,
      two_factor_method = EXCLUDED.two_factor_method,
      two_factor_secret = EXCLUDED.two_factor_secret,
      failed_attempts = EXCLUDED.failed_attempts,
      lockout_until = EXCLUDED.lockout_until,
      last_login_at = EXCLUDED.last_login_at,
      last_login_ip = EXCLUDED.last_login_ip,
      updated_at = EXCLUDED.updated_at`,
    [
      admin.id,
      admin.username,
      admin.email.toLowerCase(),
      admin.fullName,
      admin.passwordHash,
      admin.role,
      JSON.stringify(admin.permissions || []),
      Boolean(admin.isOwner),
      admin.status || 'active',
      Boolean(admin.twoFactorEnabled),
      admin.twoFactorMethod || 'totp',
      admin.twoFactorSecret || null,
      Number(admin.failedAttempts || 0),
      toIsoOrNull(admin.lockoutUntil),
      toIsoOrNull(admin.lastLoginAt),
      admin.lastLoginIp || null,
      toIsoOrNull(admin.createdAt) || new Date().toISOString(),
      toIsoOrNull(admin.updatedAt) || new Date().toISOString()
    ]
  );
}

export async function deleteAdminById(id: string): Promise<void> {
  if (!isPostgresEnabled()) {
    const admins = readAdminsJson().filter(a => a.id !== id);
    writeAdminsJson(admins);
    return;
  }
  await dbQuery('DELETE FROM public.admins WHERE id = $1', [id]);
}

export async function getAdminSessions(): Promise<AdminSessionRecord[]> {
  if (!isPostgresEnabled()) return readAdminSessionsJson();
  const res = await dbQuery('SELECT * FROM public.admin_sessions ORDER BY created_at DESC LIMIT 200');
  return res.rows.map(mapAdminSessionRow);
}

export async function saveAdminSessions(sessions: AdminSessionRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeAdminSessionsJson(sessions);
    return;
  }
  await withTransaction(async (client) => {
    for (const s of sessions) {
      await client.query(
        `INSERT INTO public.admin_sessions (
          id, token_hash, admin_id, remember_me, created_at, last_activity_at, expires_at, ip, user_agent, revoked
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          last_activity_at = EXCLUDED.last_activity_at,
          revoked = EXCLUDED.revoked`,
        [
          s.id,
          s.tokenHash,
          s.adminId,
          Boolean(s.rememberMe),
          toIsoOrNull(s.createdAt) || new Date().toISOString(),
          toIsoOrNull(s.lastActivityAt) || new Date().toISOString(),
          toIsoOrNull(s.expiresAt) || new Date().toISOString(),
          s.ip || 'unknown',
          s.userAgent || '',
          Boolean(s.revoked)
        ]
      );
    }
  });
}

export async function getAdminResetTokens(): Promise<AdminResetTokenRecord[]> {
  if (!isPostgresEnabled()) return readAdminResetTokensJson();
  const res = await dbQuery('SELECT * FROM public.admin_reset_tokens ORDER BY created_at DESC');
  return res.rows.map(r => ({
    tokenHash: r.token_hash,
    adminId: r.admin_id,
    email: r.email,
    expiresAt: toMsOrNull(r.expires_at) || Date.now(),
    used: Boolean(r.used),
    usedAt: toMsOrNull(r.used_at) || undefined,
    createdAt: toMsOrNull(r.created_at) || Date.now(),
    ip: r.ip || 'unknown'
  }));
}

export async function saveAdminResetTokens(tokens: AdminResetTokenRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeAdminResetTokensJson(tokens);
    return;
  }
  await withTransaction(async (client) => {
    await client.query('DELETE FROM public.admin_reset_tokens');
    for (const t of tokens) {
      await client.query(
        `INSERT INTO public.admin_reset_tokens (token_hash, admin_id, email, expires_at, used, used_at, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          t.tokenHash,
          t.adminId,
          t.email,
          toIsoOrNull(t.expiresAt) || new Date().toISOString(),
          Boolean(t.used),
          toIsoOrNull(t.usedAt),
          t.ip || 'unknown',
          toIsoOrNull(t.createdAt) || new Date().toISOString()
        ]
      );
    }
  });
}

// --- Reports, Logs, Trash, Settings, Legacy Applications ---

export async function getReports(): Promise<ReportRecord[]> {
  if (!isPostgresEnabled()) return readReportsJson();
  const res = await dbQuery('SELECT * FROM public.reports ORDER BY created_at DESC');
  return res.rows.map(r => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetTitle: r.target_title,
    targetOwnerId: r.target_owner_id || undefined,
    reason: r.reason,
    category: r.category,
    details: r.details || '',
    reporterName: r.reporter_name,
    reporterEmail: r.reporter_email,
    reporterIp: r.reporter_ip,
    status: r.status,
    actionTaken: r.action_taken || undefined,
    resolvedBy: r.resolved_by || undefined,
    resolvedAt: r.resolved_at ? toIsoString(r.resolved_at) : undefined,
    createdAt: toIsoString(r.created_at)
  }));
}

export async function saveReports(reports: ReportRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeReportsJson(reports);
    return;
  }
  await withTransaction(async (client) => {
    for (const r of reports) {
      await client.query(
        `INSERT INTO public.reports (
          id, target_type, target_id, target_title, target_owner_id, reason, category,
          details, reporter_name, reporter_email, reporter_ip, status, action_taken,
          resolved_by, resolved_at, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          action_taken = EXCLUDED.action_taken,
          resolved_by = EXCLUDED.resolved_by,
          resolved_at = EXCLUDED.resolved_at`,
        [
          r.id,
          r.targetType,
          r.targetId,
          r.targetTitle,
          r.targetOwnerId || null,
          r.reason,
          r.category || 'other',
          r.details || '',
          r.reporterName || 'Anonymous Visitor',
          r.reporterEmail || '',
          r.reporterIp || 'unknown',
          r.status || 'open',
          r.actionTaken || null,
          r.resolvedBy || null,
          toIsoOrNull(r.resolvedAt),
          toIsoOrNull(r.createdAt) || new Date().toISOString()
        ]
      );
    }
  });
}

export async function getAuditLogs(): Promise<AuditLogRecord[]> {
  if (!isPostgresEnabled()) return readAuditLogsJson();
  const res = await dbQuery('SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 2000');
  return res.rows.map(r => ({
    id: r.id,
    adminId: r.admin_id,
    adminUsername: r.admin_username,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id || undefined,
    details: r.details || '',
    ip: r.ip,
    createdAt: toIsoString(r.created_at)
  }));
}

export async function appendAuditLogEntry(entry: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
  if (!isPostgresEnabled()) return appendAuditLogJson(entry);
  const item: AuditLogRecord = {
    ...entry,
    id: `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  await dbQuery(
    `INSERT INTO public.audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [item.id, item.adminId, item.adminUsername, item.action, item.targetType, item.targetId || null, item.details || '', item.ip || 'unknown', item.createdAt]
  );
  return item;
}

export async function getAuthHistory(): Promise<AuthHistoryRecord[]> {
  if (!isPostgresEnabled()) return readAuthHistoryJson();
  const res = await dbQuery('SELECT * FROM public.auth_history ORDER BY created_at DESC LIMIT 2500');
  return res.rows.map(r => ({
    id: r.id,
    actorType: r.actor_type,
    actorId: r.actor_id || undefined,
    emailOrUsername: r.email_or_username,
    event: r.event,
    success: Boolean(r.success),
    ip: r.ip,
    userAgent: r.user_agent || '',
    reason: r.reason || undefined,
    suspicious: Boolean(r.suspicious),
    createdAt: toIsoString(r.created_at)
  }));
}

export async function appendAuthHistoryEntry(entry: Omit<AuthHistoryRecord, 'id' | 'createdAt'>): Promise<AuthHistoryRecord> {
  if (!isPostgresEnabled()) return appendAuthHistoryJson(entry);
  const item: AuthHistoryRecord = {
    ...entry,
    id: `auth-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  await dbQuery(
    `INSERT INTO public.auth_history (id, actor_type, actor_id, email_or_username, event, success, ip, user_agent, reason, suspicious, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      item.id,
      item.actorType,
      item.actorId || null,
      item.emailOrUsername,
      item.event,
      Boolean(item.success),
      item.ip || 'unknown',
      item.userAgent || '',
      item.reason || null,
      Boolean(item.suspicious),
      item.createdAt
    ]
  );
  return item;
}

export async function getEmailLogs(): Promise<EmailLogRecord[]> {
  if (!isPostgresEnabled()) return readEmailLogsJson();
  const res = await dbQuery('SELECT * FROM public.email_logs ORDER BY created_at DESC LIMIT 2000');
  return res.rows.map(r => ({
    id: r.id,
    recipient: r.recipient,
    subject: r.subject,
    category: r.category,
    provider: r.provider,
    status: r.status,
    messageId: r.message_id || undefined,
    error: r.error || undefined,
    triggeredBy: r.triggered_by || undefined,
    createdAt: toIsoString(r.created_at)
  }));
}

export async function appendEmailLogEntry(entry: Omit<EmailLogRecord, 'id' | 'createdAt'>): Promise<EmailLogRecord> {
  if (!isPostgresEnabled()) return appendEmailLogJson(entry);
  const item: EmailLogRecord = {
    ...entry,
    id: `eml-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString()
  };
  await dbQuery(
    `INSERT INTO public.email_logs (id, recipient, subject, category, provider, status, message_id, error, triggered_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      item.id,
      item.recipient,
      item.subject,
      item.category,
      item.provider,
      item.status,
      item.messageId || null,
      item.error || null,
      item.triggeredBy || null,
      item.createdAt
    ]
  );
  return item;
}

export async function getSystemErrors(): Promise<SystemErrorRecord[]> {
  if (!isPostgresEnabled()) return readSystemErrorsJson();
  const res = await dbQuery('SELECT * FROM public.system_errors ORDER BY created_at DESC LIMIT 500');
  return res.rows.map(r => ({
    id: r.id,
    level: r.level,
    source: r.source,
    message: r.message,
    details: r.details || undefined,
    createdAt: toIsoString(r.created_at)
  }));
}

export async function appendSystemErrorEntry(entry: Omit<SystemErrorRecord, 'id' | 'createdAt'>): Promise<void> {
  if (!isPostgresEnabled()) {
    appendSystemErrorJson(entry);
    return;
  }
  const id = `err-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  await dbQuery(
    `INSERT INTO public.system_errors (id, level, source, message, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, entry.level, entry.source, entry.message, entry.details || null, new Date().toISOString()]
  ).catch(err => console.error('[Gulfaro Postgres] Failed to append system_error:', err));
}

export async function clearSystemErrors(): Promise<void> {
  if (!isPostgresEnabled()) {
    fs.writeFileSync(DB_FILES.systemErrors, '[]', 'utf-8');
    return;
  }
  await dbQuery('DELETE FROM public.system_errors');
}

export async function getTrash(): Promise<TrashItemRecord[]> {
  if (!isPostgresEnabled()) return readTrashJson();
  const res = await dbQuery('SELECT * FROM public.trash_items ORDER BY deleted_at DESC');
  return res.rows.map(r => ({
    trashId: r.trash_id,
    itemType: r.item_type,
    originalId: r.original_id,
    label: r.label,
    deletedBy: r.deleted_by,
    deletedAt: toIsoString(r.deleted_at),
    payload: r.payload
  }));
}

export async function saveTrash(items: TrashItemRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeTrashJson(items);
    return;
  }
  await withTransaction(async (client) => {
    await client.query('DELETE FROM public.trash_items');
    for (const item of items) {
      await client.query(
        `INSERT INTO public.trash_items (trash_id, item_type, original_id, label, deleted_by, deleted_at, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          item.trashId,
          item.itemType,
          item.originalId,
          item.label,
          item.deletedBy,
          toIsoOrNull(item.deletedAt) || new Date().toISOString(),
          JSON.stringify(item.payload)
        ]
      );
    }
  });
}

// --- Settings JSONB Store ---

async function readPlatformConfigRow<T>(key: string, fallback: T): Promise<T> {
  const res = await dbQuery('SELECT value FROM public.platform_settings WHERE key = $1 LIMIT 1', [key]);
  if (res.rows[0]?.value) {
    return res.rows[0].value as T;
  }
  await dbQuery(
    `INSERT INTO public.platform_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO NOTHING`,
    [key, JSON.stringify(fallback)]
  );
  return fallback;
}

async function writePlatformConfigRow<T>(key: string, value: T): Promise<void> {
  await dbQuery(
    `INSERT INTO public.platform_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isPostgresEnabled()) return readSiteSettingsJson();
  const saved = await readPlatformConfigRow<Partial<SiteSettings>>('site_settings', DEFAULT_SITE_SETTINGS);
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

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  if (!isPostgresEnabled()) {
    writeSiteSettingsJson(settings);
    return;
  }
  await writePlatformConfigRow('site_settings', settings);
}

export async function getMarketplaceConfig(): Promise<MarketplaceConfig> {
  if (!isPostgresEnabled()) return readMarketplaceConfigJson();
  const saved = await readPlatformConfigRow<Partial<MarketplaceConfig>>('marketplace_config', DEFAULT_MARKETPLACE_CONFIG);
  return {
    countries: Array.isArray(saved.countries) && saved.countries.length ? saved.countries : DEFAULT_MARKETPLACE_CONFIG.countries,
    categories: syncMarketplaceCategories(Array.isArray(saved.categories) ? saved.categories : undefined),
    employmentTypes: Array.isArray(saved.employmentTypes) && saved.employmentTypes.length ? saved.employmentTypes : DEFAULT_MARKETPLACE_CONFIG.employmentTypes,
    experienceLevels: Array.isArray(saved.experienceLevels) && saved.experienceLevels.length ? saved.experienceLevels : DEFAULT_MARKETPLACE_CONFIG.experienceLevels,
    salaryRules: { ...DEFAULT_MARKETPLACE_CONFIG.salaryRules, ...(saved.salaryRules || {}) }
  };
}

export async function saveMarketplaceConfig(cfg: MarketplaceConfig): Promise<void> {
  if (!isPostgresEnabled()) {
    writeMarketplaceConfigJson(cfg);
    return;
  }
  await writePlatformConfigRow('marketplace_config', cfg);
}

export async function getMonetization(): Promise<MonetizationConfig> {
  if (!isPostgresEnabled()) return readMonetizationJson();
  const saved = await readPlatformConfigRow<Partial<MonetizationConfig>>('monetization', DEFAULT_MONETIZATION_CONFIG);
  return {
    ...DEFAULT_MONETIZATION_CONFIG,
    ...saved,
    plans: Array.isArray(saved.plans) && saved.plans.length ? saved.plans : DEFAULT_MONETIZATION_CONFIG.plans,
    transactions: Array.isArray(saved.transactions) ? saved.transactions : []
  };
}

export async function saveMonetization(cfg: MonetizationConfig): Promise<void> {
  if (!isPostgresEnabled()) {
    writeMonetizationJson(cfg);
    return;
  }
  await writePlatformConfigRow('monetization', cfg);
}

export async function getApplications(): Promise<JobApplicationRecord[]> {
  if (!isPostgresEnabled()) return readApplicationsJson();
  const res = await dbQuery('SELECT * FROM public.legacy_applications ORDER BY applied_at DESC');
  return res.rows.map(r => ({
    id: r.id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    companyName: r.company_name,
    applicantUserId: r.applicant_user_id || undefined,
    applicantName: r.applicant_name,
    applicantEmail: r.applicant_email,
    applicantPhone: r.applicant_phone,
    applicantWhatsapp: r.applicant_whatsapp,
    currentCountry: r.current_country,
    currentCity: r.current_city,
    iqamaStatus: r.iqama_status,
    yearsExperience: r.years_experience,
    coverNote: r.cover_note,
    resumeFileName: r.resume_file_name || undefined,
    appliedAt: toIsoString(r.applied_at),
    status: r.status
  }));
}

export async function saveApplications(apps: JobApplicationRecord[]): Promise<void> {
  if (!isPostgresEnabled()) {
    writeApplicationsJson(apps);
    return;
  }
  await withTransaction(async (client) => {
    for (const a of apps) {
      await client.query(
        `INSERT INTO public.legacy_applications (
          id, job_id, job_title, company_name, applicant_user_id, applicant_name,
          applicant_email, applicant_phone, applicant_whatsapp, current_country,
          current_city, iqama_status, years_experience, cover_note, resume_file_name,
          applied_at, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [
          a.id,
          a.jobId,
          a.jobTitle,
          a.companyName,
          a.applicantUserId || null,
          a.applicantName,
          a.applicantEmail,
          a.applicantPhone || '',
          a.applicantWhatsapp || '',
          a.currentCountry || 'saudi-arabia',
          a.currentCity || 'Riyadh',
          a.iqamaStatus || 'any',
          a.yearsExperience || '',
          a.coverNote || '',
          a.resumeFileName || null,
          toIsoOrNull(a.appliedAt) || new Date().toISOString(),
          a.status || 'new'
        ]
      );
    }
  });
}
