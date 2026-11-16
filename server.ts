import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { ViteDevServer } from 'vite';

dotenv.config();

import {
  hashPassword,
  verifyPassword,
  sendRealPasswordResetEmail,
  verifyResetTokenRecord,
  completePasswordReset,
  sendEmployerEmailVerification,
  verifyEmployerEmailRecord,
  phonesMatch,
  cleanPhone,
  hashAccessKey,
  verifyAccessKeyAndGenerateToken,
  resetPasswordWithJwt,
  sendPlatformEmail,
  UserRecord
} from './server/authService';
import { initializeSuperAdminStores } from './server/superAdminStore';
import {
  appendAuthHistoryEntry,
  appendSystemErrorEntry,
  createUserTransactional,
  deleteJobById,
  findUserByEmail,
  findUserById,
  getApplications,
  getJobs,
  getMarketplaceConfig,
  getMonetization,
  getReports,
  getSiteSettings,
  getUsers,
  saveApplications,
  saveReports,
  saveUser,
  upsertJob
} from './server/repository';
import { checkPostgresHealth } from './server/db';
import { createSuperAdminRouter } from './server/superAdminRoutes';
import { validateJobFieldsForExternalLinks, EXTERNAL_LINK_ERROR_MESSAGE } from './shared/externalLinkValidator';
import {
  GCC_COUNTRY_DIRECTORY,
  PUBLIC_JOB_CATEGORIES,
  findCountryMetaBySlug,
  findCategoryMetaBySlug,
  isJobActiveAndUnexpired
} from './src/data/gccDirectory';
import { isValidJobCategoryId, resolveJobCategoryId } from './shared/jobCategories';
import { CAREER_ARTICLES } from './src/data/careerArticles';
import { GCC_COUNTRIES } from './src/types/job';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');

// Ensure backup JSON data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Find job by slug, ID, or numeric digits (case-insensitive)
function findJobInList(jobs: any[], rawParam: string): any | undefined {
  if (!rawParam) return undefined;
  const clean = decodeURIComponent(rawParam)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.html$/i, '')
    .toLowerCase();
  if (!clean) return undefined;

  // 1. Exact match on slug
  const matchSlug = jobs.find(j => j.slug && j.slug.toLowerCase() === clean);
  if (matchSlug) return matchSlug;

  // 2. Exact match on ID (e.g. GF-8136 or gf-8136)
  const matchId = jobs.find(j => j.id && j.id.toLowerCase() === clean);
  if (matchId) return matchId;

  // 3. Pure numeric ID (8136) or trailing -<digits> suffix (building-surveyor-riyadh-8136 -> GF-8136)
  const pureDigitsMatch = clean.match(/^(?:gf-)?(\d+)$/);
  const trailingDigitsMatch = clean.match(/-(\d+)$/);
  const idDigits = pureDigitsMatch?.[1] || trailingDigitsMatch?.[1];
  if (idDigits) {
    const matchDigits = jobs.find(j => j.id && j.id.replace(/[^0-9]/g, '') === idDigits);
    if (matchDigits) return matchDigits;
  }

  // 4. Safe partial slug fallback (require meaningful length >= 4 and non-empty strings)
  if (clean.length >= 4) {
    const matchSub = jobs.find(j => {
      const jSlug = (j.slug || '').trim().toLowerCase();
      return jSlug.length >= 4 && (jSlug.includes(clean) || clean.includes(jSlug));
    });
    if (matchSub) return matchSub;
  }

  return undefined;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAllowedCorsOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/+$/, '');
  if (!normalized) return false;

  const configuredRaw = [
    process.env.CORS_ORIGIN,
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.APP_URL
  ]
    .filter(Boolean)
    .join(',');

  if (configuredRaw) {
    const entries = configuredRaw
      .split(',')
      .map(s => s.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    if (entries.includes('*') || entries.includes(normalized)) {
      return true;
    }
  }

  // Always allow official Gulfaro domains (.net & .com), Hostinger preview domains, AI Studio preview, and local dev origins
  if (
    /^https:\/\/([a-z0-9-]+\.)?gulfaro\.net$/i.test(normalized) ||
    /^https:\/\/([a-z0-9-]+\.)?gulfaro\.com$/i.test(normalized) ||
    /^https:\/\/[a-z0-9-]+\.hostingersite\.com$/i.test(normalized) ||
    /^https:\/\/[a-z0-9-]+\.run\.app$/i.test(normalized) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

async function startServer() {
  initializeSuperAdminStores();

  const app = express();
  const httpServer = http.createServer(app);

  // Required behind Render / Cloud Run HTTPS reverse proxies
  app.set('trust proxy', 1);

  // Express CORS middleware allowing Hostinger production domain & local preview
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && isAllowedCorsOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-gulfaro-user-id, x-gulfaro-user-email'
      );
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // =========================================================================
  // Gulfaro Super Admin Portal API (/api/super-admin/*)
  // =========================================================================
  app.use('/api/super-admin', createSuperAdminRouter());

  // =========================================================================
  // Public Platform Configuration, Applications & Reporting APIs
  // =========================================================================
  app.get('/api/public/config', async (_req: Request, res: Response) => {
    try {
      const [settings, marketplace, monetization] = await Promise.all([
        getSiteSettings(),
        getMarketplaceConfig(),
        getMonetization()
      ]);
      res.json({
        cms: settings.cms,
        adsense: settings.adsense,
        registration: {
          allowJobSeekerRegistration: settings.registration.allowJobSeekerRegistration,
          allowEmployerRegistration: settings.registration.allowEmployerRegistration,
          emailVerificationMode: settings.registration.emailVerificationMode,
          captchaEnabled: settings.registration.captchaEnabled
        },
        emergency: settings.emergency,
        countries: marketplace.countries,
        categories: marketplace.categories,
        employmentTypes: marketplace.employmentTypes,
        experienceLevels: marketplace.experienceLevels,
        salaryRules: marketplace.salaryRules,
        plans: monetization.plans.filter(p => p.active),
        paymentCollectionEnabled: monetization.paymentCollectionEnabled
      });
    } catch (err: any) {
      console.error('Error in /api/public/config:', err);
      res.status(500).json({ error: 'Failed to load platform configuration.' });
    }
  });

  app.post('/api/reports', async (req: Request, res: Response) => {
    try {
      const { targetType, targetId, targetTitle, category, reason, details, reporterName, reporterEmail } = req.body || {};
      if (!targetId || !reason) {
        return res.status(400).json({ error: 'Target ID and reason for reporting are required.' });
      }
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const reports = await getReports();
      const newReport = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        targetType: (targetType === 'employer' || targetType === 'user' ? targetType : 'job') as 'job' | 'employer' | 'user',
        targetId: String(targetId),
        targetTitle: String(targetTitle || targetId),
        category: (category || 'other') as any,
        reason: String(reason).trim(),
        details: String(details || '').trim(),
        reporterName: String(reporterName || 'Anonymous Visitor').trim(),
        reporterEmail: String(reporterEmail || '').trim().toLowerCase(),
        reporterIp: ip,
        status: 'open' as const,
        createdAt: new Date().toISOString()
      };
      reports.unshift(newReport);
      await saveReports(reports);
      res.status(201).json({ success: true, reportId: newReport.id, message: 'Report submitted to Gulfaro Trust & Safety team.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to submit report.' });
    }
  });

  app.get('/api/applications', async (req: Request, res: Response) => {
    try {
      const apps = await getApplications();
      const { userId, jobId } = req.query;
      let filtered = apps;
      if (userId) filtered = filtered.filter(a => a.applicantUserId === String(userId));
      if (jobId) filtered = filtered.filter(a => a.jobId.toLowerCase() === String(jobId).toLowerCase());
      res.json(filtered);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve applications.' });
    }
  });

  app.post('/api/applications', (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'Online application and CV submission through Gulfaro has been removed. Please contact the employer directly by email or phone.'
    });
  });

  app.patch('/api/applications/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      const apps = await getApplications();
      const idx = apps.findIndex(a => a.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Application not found.' });
      if (status) apps[idx].status = status;
      await saveApplications(apps);
      res.json({ success: true, application: apps[idx] });
    } catch {
      res.status(500).json({ error: 'Failed to update application.' });
    }
  });

  // Health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbHealth = await checkPostgresHealth();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      storageBackend: dbHealth.mode,
      databaseConnected: dbHealth.connected
    });
  });

  // Helper to determine active public frontend base URL for emailed links
  function getAppBaseUrl(req: Request): string {
    const configured = (process.env.FRONTEND_URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (configured) {
      return configured;
    }
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = forwardedProto ? (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) : (req.secure ? 'https' : 'http');
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost ? (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) : (req.headers.host || 'www.gulfaro.net');
    return `${proto}://${host}`;
  }

  // =========================================================================
  // Authentication & Password Reset API Endpoints
  // =========================================================================

  // Request password reset email (Real email delivery)
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const appUrl = getAppBaseUrl(req);

      const result = await sendRealPasswordResetEmail(email, appUrl, clientIp);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (err: any) {
      console.error('Error in /api/auth/forgot-password:', err);
      res.status(500).json({ error: 'Failed to process password reset request. Please try again later.' });
    }
  });

  // Verify reset token validity
  app.post('/api/auth/verify-reset-token', async (req: Request, res: Response) => {
    try {
      const { token, email } = req.body;
      const result = await verifyResetTokenRecord(token, email);
      if (result.valid) {
        res.json({ valid: true });
      } else {
        res.status(400).json({ valid: false, error: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ valid: false, error: 'Failed to verify reset token.' });
    }
  });

  // Complete password reset
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, email, password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
      }
      if (!/\d/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number (0-9).' });
      }

      const result = await completePasswordReset(token, email, password);
      if (result.success) {
        res.json({ success: true, message: 'Password reset successful!' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (err: any) {
      console.error('Error in /api/auth/reset-password:', err);
      res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
  });

  // Verify 5-digit Access Key (Account Recovery)
  app.post('/api/auth/verify-access-key', async (req: Request, res: Response) => {
    try {
      const { email, accessKey } = req.body || {};
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

      const result = await verifyAccessKeyAndGenerateToken(email, accessKey, clientIp);
      if (result.success) {
        res.status(200).json({ success: true, token: result.token, message: 'Access Key verified successfully.' });
      } else {
        res.status(result.status || 400).json({ success: false, error: result.error });
      }
    } catch (err: any) {
      console.error('Error in /api/auth/verify-access-key:', err);
      res.status(500).json({ success: false, error: 'Verification service error. Please try again.' });
    }
  });

  // Reset Password using verified 10-minute JWT session token
  app.post('/api/auth/reset-password-access-key', async (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body || {};
      const result = await resetPasswordWithJwt(resetToken, newPassword);
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password updated successfully! You can now sign in with your new password.'
        });
      } else {
        res.status(result.status || 400).json({ success: false, error: result.error });
      }
    } catch (err: any) {
      console.error('Error in /api/auth/reset-password-access-key:', err);
      res.status(500).json({ success: false, error: 'Password update service error. Please try again.' });
    }
  });

  // Send Employer Corporate Email Verification
  app.post('/api/auth/send-employer-verification', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid corporate email address is required.' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const appUrl = getAppBaseUrl(req);

      const result = await sendEmployerEmailVerification(email, appUrl, clientIp);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('Error in /api/auth/send-employer-verification:', err);
      res.status(500).json({ error: 'Failed to dispatch verification email. Please try again.' });
    }
  });

  // Complete Employer Corporate Email Verification
  app.post('/api/auth/verify-employer-email', async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: 'Email and 6-digit code or link are required.' });
      }

      const result = await verifyEmployerEmailRecord(email, code);
      if (result.success) {
        const safeUser = result.user ? { ...result.user } : undefined;
        if (safeUser) {
          delete safeUser.password;
          delete safeUser.passwordHash;
          delete safeUser.accessKeyHash;
        }
        res.json({
          success: true,
          message: 'Employer corporate email verified successfully! Your job postings now show the Verified Employer badge.',
          user: safeUser,
          updatedJobsCount: result.updatedJobsCount
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (err: any) {
      console.error('Error in /api/auth/verify-employer-email:', err);
      res.status(500).json({ error: 'Failed to process email verification.' });
    }
  });

  // In-process serialized queue to prevent simultaneous duplicate registrations in JSON mode
  let registrationQueue: Promise<any> = Promise.resolve();

  // Secure user login verification (Email Address & Password ONLY)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.emergencyShutdown) {
        return res.status(503).json({ error: settings.emergency.emergencyShutdownMessage || 'Platform is temporarily paused for maintenance.' });
      }

      const { email, identifier, password } = req.body;
      const rawEmail = (email || identifier || '').trim();

      if (!rawEmail || !password) {
        return res.status(400).json({ error: 'Email address and password are required.' });
      }

      if (!rawEmail.includes('@')) {
        return res.status(400).json({
          error: 'Please enter your registered email address to sign in. Phone number login is not supported.'
        });
      }

      const cleanEmail = rawEmail.toLowerCase();
      const user = await findUserByEmail(cleanEmail);

      if (!user) {
        await appendAuthHistoryEntry({
          actorType: 'user',
          emailOrUsername: cleanEmail,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: 'Account not found',
          suspicious: false
        });
        return res.status(404).json({
          error: 'No Gulfaro account found with this email address. Please check your spelling or click "Create Account".'
        });
      }

      if (user.status === 'suspended' || user.status === 'banned' || user.status === 'deactivated') {
        await appendAuthHistoryEntry({
          actorType: user.role === 'employer' ? 'employer' : 'user',
          actorId: user.id,
          emailOrUsername: user.email,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: `Account ${user.status}`,
          suspicious: true
        });
        return res.status(403).json({
          error: `Your account is currently ${user.status}.${user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ' Contact admingulfaro@gmail.com for assistance.'}`
        });
      }

      const now = Date.now();
      if (user.loginLockoutUntil && user.loginLockoutUntil > now) {
        const mins = Math.ceil((user.loginLockoutUntil - now) / 60000);
        return res.status(429).json({
          error: `Account temporarily locked due to repeated failed logins. Try again in ${mins} minute(s).`
        });
      }

      const storedPassword = user.passwordHash || user.password || '';
      const isValid = verifyPassword(password, storedPassword);

      if (!isValid) {
        const maxFail = settings.registration.maxFailedLoginAttempts || 5;
        const failCount = (user.loginFailedAttempts || 0) + 1;
        user.loginFailedAttempts = failCount;
        if (failCount >= maxFail) {
          user.loginLockoutUntil = now + (settings.registration.lockoutDurationMinutes || 15) * 60 * 1000;
        }
        await saveUser(user);
        await appendAuthHistoryEntry({
          actorType: user.role === 'employer' ? 'employer' : 'user',
          actorId: user.id,
          emailOrUsername: user.email,
          event: failCount >= maxFail ? 'lockout' : 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: `Incorrect password (attempt ${failCount}/${maxFail})`,
          suspicious: failCount >= 3
        });
        return res.status(401).json({
          error: 'Incorrect password. Please verify your password and try again, or click "Forgot password?".'
        });
      }

      // Upgrade legacy plain-text password to PBKDF2 hash on successful login
      if (!user.passwordHash && user.password) {
        user.passwordHash = hashPassword(password);
        user.password = undefined;
      }
      user.loginFailedAttempts = 0;
      user.loginLockoutUntil = null;
      user.lastLoginAt = new Date().toISOString();
      user.lastLoginIp = ip;
      await saveUser(user);

      await appendAuthHistoryEntry({
        actorType: user.role === 'employer' ? 'employer' : 'user',
        actorId: user.id,
        emailOrUsername: user.email,
        event: 'login_success',
        success: true,
        ip,
        userAgent,
        suspicious: false
      });

      const sanitized = { ...user };
      delete sanitized.password;
      delete sanitized.passwordHash;
      delete sanitized.accessKeyHash;

      res.json({ success: true, user: sanitized });
    } catch (err: any) {
      console.error('[Auth API /api/auth/login] Error:', err);
      await appendSystemErrorEntry({ level: 'error', source: '/api/auth/login', message: err?.message || 'Login error' });
      res.status(500).json({ error: 'Authentication failed due to a server error. Please try again.' });
    }
  });

  // Pre-check duplicate account (Email or Phone)
  app.post('/api/auth/check-duplicate', async (req: Request, res: Response) => {
    try {
      const { email, phone, whatsapp } = req.body;
      const users = await getUsers();

      if (email && typeof email === 'string') {
        const cleanEmail = email.trim().toLowerCase();
        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
          return res.json({
            exists: true,
            field: 'email',
            message: 'An account with this email address already exists. Please sign in instead.'
          });
        }
      }

      if (phone || whatsapp) {
        const checkPhone = phone || whatsapp;
        const existing = users.find(u =>
          phonesMatch(u.phone, checkPhone) ||
          phonesMatch(u.whatsapp, checkPhone)
        );
        if (existing) {
          return res.json({
            exists: true,
            field: 'phone',
            message: 'An account with this phone number already exists. Please sign in instead.'
          });
        }
      }

      res.json({ exists: false });
    } catch (err: any) {
      console.error('[Auth API /api/auth/check-duplicate] Error:', err);
      res.status(500).json({ error: 'Failed to check account uniqueness.' });
    }
  });

  // Register new user (Serialized queue + PostgreSQL unique constraints to prevent duplicates)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    registrationQueue = registrationQueue.then(async () => {
      try {
        const settings = await getSiteSettings();
        if (settings.emergency.maintenanceMode || settings.emergency.emergencyShutdown) {
          return res.status(503).json({
            error: 'New registrations are temporarily paused during maintenance. Please try again shortly.'
          });
        }

        const userData = req.body || {};
        console.log('[Auth API /api/auth/register] Processing registration for:', userData.email, 'Role:', userData.role);

        const role = userData.role;
        if (role !== 'job_seeker' && role !== 'employer') {
          return res.status(400).json({ error: 'Please select a valid account type: "I am a Job Seeker" or "I am an Employer".' });
        }

        if (role === 'job_seeker' && !settings.registration.allowJobSeekerRegistration) {
          return res.status(403).json({ error: 'Job Seeker registration is currently disabled by site administration.' });
        }
        if (role === 'employer' && !settings.registration.allowEmployerRegistration) {
          return res.status(403).json({ error: 'Employer registration is currently disabled by site administration.' });
        }

        // 1. Mandatory Full Name
        const name = (userData.name || '').trim();
        if (!name || name.length < 2) {
          return res.status(400).json({ error: 'Full Name is required (minimum 2 characters).' });
        }

        // 2. Mandatory Email Address
        const cleanEmail = (userData.email || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          return res.status(400).json({ error: 'A valid email address is required.' });
        }

        // 3. Mandatory GCC Country (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman)
        const rawCountry = (userData.country || '').trim().toLowerCase();
        const countryMap: Record<string, string> = {
          'saudi arabia': 'saudi-arabia',
          'saudi-arabia': 'saudi-arabia',
          'united arab emirates': 'uae',
          'united-arab-emirates': 'uae',
          'uae': 'uae',
          'qatar': 'qatar',
          'kuwait': 'kuwait',
          'bahrain': 'bahrain',
          'oman': 'oman'
        };
        const countryKey = countryMap[rawCountry] || rawCountry;
        const validCountries = ['saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman'];
        if (!countryKey || !validCountries.includes(countryKey)) {
          return res.status(400).json({
            error: 'Please select a valid GCC country: Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, or Oman.'
          });
        }

        // 4. Mandatory Phone Number
        const phone = (userData.phone || '').trim();
        const digits = phone.replace(/\D/g, '');
        if (!phone || digits.length < 7) {
          return res.status(400).json({ error: 'A valid phone number with country code is required.' });
        }

        // 5. Mandatory Role-Specific Fields
        let professionalTitle = '';
        let companyName = '';
        let hiringOrgName = '';

        if (role === 'job_seeker') {
          professionalTitle = (userData.professionalTitle || userData.headline || '').trim();
          if (!professionalTitle || professionalTitle.length < 2) {
            return res.status(400).json({ error: 'Professional Title / Trade is mandatory for Job Seekers.' });
          }
        } else if (role === 'employer') {
          companyName = (userData.companyName || '').trim();
          hiringOrgName = (userData.hiringOrgName || userData.organizationName || '').trim();

          if (!companyName || companyName.length < 2) {
            return res.status(400).json({ error: 'Company Name is mandatory for Employers.' });
          }
          if (!hiringOrgName || hiringOrgName.length < 2) {
            return res.status(400).json({ error: 'Hiring Organization Name is mandatory for Employers.' });
          }
        }

        // 6. Mandatory Password Requirements
        const password = userData.password || '';
        const confirmPassword = userData.confirmPassword;

        if (!password || password.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }
        if (!/[A-Z]/.test(password)) {
          return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
        }
        if (!/\d/.test(password)) {
          return res.status(400).json({ error: 'Password must contain at least one number (0-9).' });
        }
        if (confirmPassword !== undefined && confirmPassword !== password) {
          return res.status(400).json({ error: 'Confirm Password does not match Password.' });
        }

        // 7. Compulsory 5-digit Access Key (Account Recovery PIN)
        const rawAccessKey = (userData.accessKey || '').toString().trim();
        if (!rawAccessKey || !/^\d{5}$/.test(rawAccessKey)) {
          return res.status(400).json({
            error: 'A 5-digit numeric Access Key is compulsory (numbers only, exactly 5 digits).'
          });
        }

        // 8. Backend Duplicate Account Protection (Email & Phone uniqueness)
        const users = await getUsers();

        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
          return res.status(400).json({
            error: 'An account with this email address already exists. Please sign in instead.'
          });
        }

        const existingPhoneUser = users.find(u =>
          phonesMatch(u.phone, phone) ||
          phonesMatch(u.whatsapp, phone)
        );
        if (existingPhoneUser) {
          return res.status(400).json({
            error: 'An account with this phone number already exists. Please sign in instead.'
          });
        }

        const emailDomain = cleanEmail.split('@')[1] || '';
        if (settings.registration.blockedDomains.some(d => d.toLowerCase() === emailDomain)) {
          return res.status(400).json({ error: 'Disposable or blocked email domains cannot be used on Gulfaro.' });
        }

        // 9. Create and persist user record with PBKDF2 password hash & bcrypt Access Key hash
        const accessKeyHash = await hashAccessKey(rawAccessKey);

        const newUser: UserRecord = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          email: cleanEmail,
          role,
          phone: cleanPhone(phone),
          whatsapp: cleanPhone(userData.whatsapp || phone),
          country: countryKey,
          city: (userData.city || 'Riyadh').trim(),
          professionalTitle: role === 'job_seeker' ? professionalTitle : undefined,
          headline: role === 'job_seeker' ? professionalTitle : `Recruiter at ${companyName}`,
          companyName: role === 'employer' ? companyName : undefined,
          hiringOrgName: role === 'employer' ? hiringOrgName : undefined,
          passwordHash: hashPassword(password),
          accessKeyHash: accessKeyHash,
          failedAttempts: 0,
          lockoutUntil: null,
          status: 'active',
          createdAt: new Date().toISOString(),
          emailVerified: settings.registration.emailVerificationMode === 'optional'
        };

        try {
          await createUserTransactional(newUser);
        } catch (dbErr: any) {
          if (dbErr?.code === '23505' || dbErr?.cause?.code === '23505') {
            return res.status(400).json({
              error: 'An account with this email address or phone number already exists. Please sign in instead.'
            });
          }
          throw dbErr;
        }

        await appendAuthHistoryEntry({
          actorType: role === 'employer' ? 'employer' : 'user',
          actorId: newUser.id,
          emailOrUsername: newUser.email,
          event: 'register',
          success: true,
          ip,
          userAgent,
          suspicious: false
        });

        // Optional non-blocking welcome email
        if (settings.emailConfig.welcomeEmailEnabled && process.env.RESEND_API_KEY?.startsWith('re_')) {
          sendPlatformEmail({
            to: newUser.email,
            subject: settings.emailConfig.welcomeSubject || 'Welcome to Gulfaro',
            category: 'welcome',
            html: `<p>Hello ${escapeHtml(newUser.name)},</p><p>${escapeHtml(settings.emailConfig.welcomeBody)}</p>`,
            triggeredBy: 'auto-registration'
          }).catch(() => {});
        }

        console.log('[Auth API /api/auth/register] User registered successfully (automatic activation):', newUser.id, newUser.email, newUser.role);

        const sanitized = { ...newUser };
        delete sanitized.password;
        delete sanitized.passwordHash;
        delete sanitized.accessKeyHash;

        res.status(201).json({ success: true, user: sanitized });
      } catch (err: any) {
        console.error('[Auth API /api/auth/register] Error:', err);
        await appendSystemErrorEntry({ level: 'error', source: '/api/auth/register', message: err?.message || 'Register error' });
        res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
      }
    }).catch(err => {
      console.error('[Auth API Queue] Unexpected error:', err);
      res.status(500).json({ error: 'Registration processing failed.' });
    });
  });

  // Sync users list (sanitized)
  app.get('/api/auth/users', async (_req: Request, res: Response) => {
    try {
      const users = await getUsers();
      const sanitized = users.map(u => {
        const copy = { ...u };
        delete copy.password;
        delete copy.passwordHash;
        delete copy.accessKeyHash;
        return copy;
      });
      res.json(sanitized);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve users.' });
    }
  });

  // Get all published jobs (respects hideAllPublicJobs & filters out hidden/rejected jobs publicly)
  app.get('/api/jobs', async (_req: Request, res: Response) => {
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown) {
        return res.json([]);
      }
      const allJobs = await getJobs();
      const jobs = allJobs.filter(j => j.status !== 'hidden' && j.status !== 'rejected');
      res.json(jobs);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve jobs.' });
    }
  });

  // Get a single job by slug or ID
  app.get('/api/jobs/:idOrSlug', async (req: Request, res: Response) => {
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown) {
        return res.status(404).json({ error: 'Job listing temporarily unavailable' });
      }
      const { idOrSlug } = req.params;
      const jobs = await getJobs();
      const job = findJobInList(jobs, idOrSlug);

      if (job && job.status !== 'hidden' && job.status !== 'rejected') {
        res.json(job);
      } else {
        res.status(404).json({ error: 'Job not found', requested: idOrSlug });
      }
    } catch {
      res.status(500).json({ error: 'Failed to retrieve job.' });
    }
  });

  // Helper to resolve requester & job ownership cleanly
  async function resolveJobRequester(req: Request, bodyUserId?: string, bodyEmail?: string): Promise<any | null> {
    const headerId = req.headers['x-gulfaro-user-id'];
    const headerEmail = req.headers['x-gulfaro-user-email'];
    const targetId = typeof headerId === 'string' && headerId.trim() ? headerId.trim() : bodyUserId;
    if (targetId) {
      const byId = await findUserById(targetId);
      if (byId) return byId;
    }
    const fallbackEmail =
      (typeof bodyEmail === 'string' && bodyEmail.trim() ? bodyEmail : undefined) ||
      (typeof headerEmail === 'string' && headerEmail.trim() ? headerEmail : undefined);
    if (fallbackEmail) {
      const byEmail = await findUserByEmail(String(fallbackEmail).trim().toLowerCase());
      if (byEmail) return byEmail;
    }
    return null;
  }

  function isJobOwnerOrAdmin(user: any, job: any): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'employer') return false;
    if (job.userId && job.userId === user.id) return true;
    if (job.contactEmail && user.email && job.contactEmail.toLowerCase() === user.email.toLowerCase()) return true;
    if (user.id === 'user-emp-1' && String(job.company || '').includes('Al-Bawani')) return true;
    if (user.id === 'user-emp-2' && String(job.company || '').includes('FinGulf')) return true;
    return false;
  }

  function collectJobLinkValidationFields(data: any): Record<string, any> {
    return {
      title: data.title,
      category: data.category,
      subcategory: data.subcategory,
      company: data.company,
      contactPerson: data.contactPerson,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      contactWhatsapp: data.contactWhatsapp,
      city: data.city,
      district: data.district,
      salaryDisplay: data.salaryDisplay,
      experienceLevel: data.experienceLevel,
      educationLevel: data.educationLevel,
      skills: data.skills,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      benefits: data.benefits
    };
  }

  // Create a new job advertisement (Employer-Only, Automatic Publishing with Strict No-External-Links Validation)
  app.post('/api/jobs', async (req: Request, res: Response) => {
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.maintenanceMode || settings.emergency.emergencyShutdown) {
        return res.status(503).json({ error: 'Job posting is paused during platform maintenance.' });
      }
      if (settings.emergency.disableNewJobPublishing) {
        return res.status(403).json({ error: 'New job publishing is temporarily disabled by site administration.' });
      }

      const adData = req.body || {};
      const postingUser = await resolveJobRequester(req, adData.userId, adData.requesterEmail);

      // Strict Registered Employer Permission Enforcement
      if (!postingUser) {
        return res.status(403).json({
          error: 'Only registered Gulfaro employer accounts can publish job postings. Please sign in as an employer.'
        });
      }
      if (postingUser.role !== 'employer' && postingUser.role !== 'admin') {
        return res.status(403).json({
          error: 'Job seeker accounts cannot publish job vacancies. Please sign in with a registered employer account.'
        });
      }
      if (postingUser.status === 'suspended' || postingUser.status === 'banned' || postingUser.status === 'deactivated') {
        return res.status(403).json({ error: `Your account is ${postingUser.status} and cannot publish jobs.` });
      }
      if (postingUser.postingRestricted) {
        return res.status(403).json({ error: 'Your employer account is currently restricted from posting new vacancies.' });
      }

      // Strict No-External-Links Policy across EVERY field (checked before format rules)
      const linkCheck = validateJobFieldsForExternalLinks(collectJobLinkValidationFields(adData));
      if (!linkCheck.valid) {
        return res.status(400).json({
          error: EXTERNAL_LINK_ERROR_MESSAGE,
          invalidFields: linkCheck.invalidFields
        });
      }

      // Required field checks (Company Name, Contact Person, Required Experience, and Education are optional)
      if (!adData.title || String(adData.title).trim().length < 2) {
        return res.status(400).json({ error: 'Job Title is required.', invalidFields: ['title'] });
      }
      const rawCategory = String(adData.category || '').trim().toLowerCase();
      if (!rawCategory || !isValidJobCategoryId(rawCategory)) {
        return res.status(400).json({
          error: 'Please select a valid Job Category from the Gulfaro category list.',
          invalidFields: ['category']
        });
      }
      if (!adData.description || String(adData.description).trim().length < 10) {
        return res.status(400).json({ error: 'Position Details must be at least 10 characters.', invalidFields: ['description'] });
      }

      const rawEmail = String(adData.contactEmail || '').trim();
      const rawPhone = String(adData.contactPhone || '').trim();
      const explicitContactMethod =
        adData.contactMethod === 'phone' || adData.contactMethod === 'email'
          ? adData.contactMethod
          : undefined;
      const resolvedContactMethod: 'email' | 'phone' =
        explicitContactMethod || (rawPhone && !rawEmail ? 'phone' : 'email');

      if (resolvedContactMethod === 'phone') {
        if (!rawPhone || rawPhone.replace(/\D/g, '').length < 6) {
          return res.status(400).json({ error: 'A valid Contact Phone Number is required.', invalidFields: ['contactPhone'] });
        }
      } else {
        if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
          return res.status(400).json({ error: 'A valid Contact Email address is required.', invalidFields: ['contactEmail'] });
        }
      }

      if (settings.registration.spamProtectionEnabled) {
        const combinedText = `${adData.title} ${adData.description} ${adData.company || ''}`.toLowerCase();
        const blockedHit = (settings.registration.blockedKeywords || []).find(kw => kw && combinedText.includes(kw.toLowerCase()));
        if (blockedHit) {
          return res.status(400).json({
            error: `Job rejected by automated anti-scam safety rules (prohibited phrase detected: "${blockedHit}").`
          });
        }
      }

      const existingJobs = await getJobs();
      const existingIds = new Set(existingJobs.map(j => String(j.id || '').toUpperCase()));
      let randomIdNumber = Math.floor(1000 + Math.random() * 9000);
      let generatedId = `GF-${randomIdNumber}`;
      let attempts = 0;
      while (!adData.id && existingIds.has(generatedId.toUpperCase()) && attempts < 20) {
        randomIdNumber = Math.floor(10000 + Math.random() * 90000);
        generatedId = `GF-${randomIdNumber}`;
        attempts++;
      }
      const id = adData.id || generatedId;

      const cleanTitle =
        (adData.title || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
          .slice(0, 45) || 'job';
      const cleanCity =
        (adData.city || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || 'gcc';
      const slug = (adData.slug || `${cleanTitle}-${cleanCity}-${randomIdNumber}`).replace(/-+/g, '-');

      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (adData.howToApply && adData.howToApply !== 'email') {
        return res.status(400).json({
          error: 'Gulfaro online applications are disabled. Candidates must apply directly via contact email or phone number.'
        });
      }

      const normalizedSubcategory =
        adData.subcategory && String(adData.subcategory).trim()
          ? String(adData.subcategory).trim()
          : undefined;

      const finalContactEmail =
        explicitContactMethod === 'phone' ? '' : rawEmail;
      const finalContactPhone =
        explicitContactMethod === 'email' ? '' : rawPhone;
      const cleanPhoneDigits = finalContactPhone.replace(/[^0-9+]/g, '');

      const newJob = {
        ...adData,
        id,
        slug,
        userId: postingUser.id,
        company: String(adData.company || '').trim(),
        contactPerson: String(adData.contactPerson || '').trim(),
        experienceLevel: String(adData.experienceLevel || '').trim(),
        educationLevel: String(adData.educationLevel || '').trim(),
        category: resolveJobCategoryId(rawCategory),
        subcategory: normalizedSubcategory,
        vacanciesCount: Math.max(1, Number(adData.vacanciesCount) || 1),
        contactMethod: resolvedContactMethod,
        contactEmail: finalContactEmail,
        contactPhone: finalContactPhone,
        contactWhatsapp: finalContactPhone
          ? (adData.contactWhatsapp ? String(adData.contactWhatsapp).trim() : cleanPhoneDigits)
          : '',
        howToApply: 'email',
        postedAt: adData.postedAt || now.toISOString(),
        expiresAt: adData.expiresAt || expiry.toISOString(),
        viewsCount: adData.viewsCount || 1,
        inquiriesCount: adData.inquiriesCount || 0,
        status: 'active', // Always publish valid jobs automatically & immediately
        isEmployerVerified: Boolean(postingUser.emailVerified)
      };

      await upsertJob(newJob);

      res.status(201).json(newJob);
    } catch (err: any) {
      console.error('Error creating job:', err);
      await appendSystemErrorEntry({ level: 'error', source: '/api/jobs', message: err?.message || 'Job publish error' }).catch(() => {});
      res.status(500).json({ error: 'Failed to create job', details: err?.message });
    }
  });

  // Update a job (Owner Employer or Admin only + Strict No-External-Links Validation)
  app.put('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { requesterUserId, ...updates } = req.body || {};
      const jobs = await getJobs();
      const existing = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

      if (!existing) {
        return res.status(404).json({ error: 'Job not found to update' });
      }

      const requester = await resolveJobRequester(req, requesterUserId || updates.userId, undefined);
      if (!isJobOwnerOrAdmin(requester, existing)) {
        return res.status(403).json({ error: 'You do not have permission to edit this job advertisement.' });
      }

      if (updates.howToApply && updates.howToApply !== 'email') {
        return res.status(400).json({
          error: 'Gulfaro online applications are disabled. Candidates must apply directly via contact email or phone number.'
        });
      }

      if (updates.title !== undefined && String(updates.title).trim().length < 2) {
        return res.status(400).json({ error: 'Job Title is required.', invalidFields: ['title'] });
      }
      if (updates.description !== undefined && String(updates.description).trim().length < 10) {
        return res.status(400).json({ error: 'Position Details must be at least 10 characters.', invalidFields: ['description'] });
      }

      if (updates.category !== undefined) {
        const rawUpdCat = String(updates.category || '').trim().toLowerCase();
        if (!rawUpdCat || !isValidJobCategoryId(rawUpdCat)) {
          return res.status(400).json({
            error: 'Please select a valid Job Category from the Gulfaro category list.',
            invalidFields: ['category']
          });
        }
        updates.category = resolveJobCategoryId(rawUpdCat);
      }

      if (updates.subcategory !== undefined) {
        updates.subcategory = updates.subcategory && String(updates.subcategory).trim()
          ? String(updates.subcategory).trim()
          : undefined;
      }

      // Strict No-External-Links Validation on edited fields
      const linkCheck = validateJobFieldsForExternalLinks(collectJobLinkValidationFields(updates));
      if (!linkCheck.valid) {
        return res.status(400).json({
          error: EXTERNAL_LINK_ERROR_MESSAGE,
          invalidFields: linkCheck.invalidFields
        });
      }

      // Validate and apply contact method changes cleanly while maintaining backward compatibility
      const updMethod =
        updates.contactMethod === 'phone' || updates.contactMethod === 'email'
          ? updates.contactMethod
          : undefined;

      if (updMethod === 'email') {
        const nextEmail = String(updates.contactEmail !== undefined ? updates.contactEmail : existing.contactEmail || '').trim();
        if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
          return res.status(400).json({ error: 'A valid Contact Email address is required.', invalidFields: ['contactEmail'] });
        }
        updates.contactMethod = 'email';
        updates.contactEmail = nextEmail;
        updates.contactPhone = '';
        updates.contactWhatsapp = '';
      } else if (updMethod === 'phone') {
        const nextPhone = String(updates.contactPhone !== undefined ? updates.contactPhone : existing.contactPhone || '').trim();
        if (!nextPhone || nextPhone.replace(/\D/g, '').length < 6) {
          return res.status(400).json({ error: 'A valid Contact Phone Number is required.', invalidFields: ['contactPhone'] });
        }
        updates.contactMethod = 'phone';
        updates.contactPhone = nextPhone;
        updates.contactWhatsapp = nextPhone.replace(/[^0-9+]/g, '');
        updates.contactEmail = '';
      }

      if (updates.company !== undefined) updates.company = String(updates.company || '').trim();
      if (updates.contactPerson !== undefined) updates.contactPerson = String(updates.contactPerson || '').trim();
      if (updates.experienceLevel !== undefined) updates.experienceLevel = String(updates.experienceLevel || '').trim();
      if (updates.educationLevel !== undefined) updates.educationLevel = String(updates.educationLevel || '').trim();

      const updatedJob = {
        ...existing,
        ...updates,
        howToApply: 'email',
        id: existing.id,
        userId: existing.userId
      };
      await upsertJob(updatedJob);
      res.json(updatedJob);
    } catch (err: any) {
      console.error('Error updating job:', err);
      res.status(500).json({ error: 'Failed to update job.' });
    }
  });

  // Delete a job (Owner Employer or Admin only)
  app.delete('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const jobs = await getJobs();
      const target = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

      if (!target) {
        return res.status(404).json({ error: 'Job not found to delete' });
      }

      const bodyUserId = req.body?.requesterUserId || req.body?.userId || (typeof req.query.userId === 'string' ? req.query.userId : undefined);
      const requester = await resolveJobRequester(req, bodyUserId, undefined);
      if (!isJobOwnerOrAdmin(requester, target)) {
        return res.status(403).json({ error: 'You do not have permission to delete this job advertisement.' });
      }

      await deleteJobById(target.id);
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('Error deleting job:', err);
      res.status(500).json({ error: 'Failed to delete job.' });
    }
  });

  // Redirect legacy /admin paths cleanly to official /super-admin login portal
  app.get(['/admin', '/admin/*'], (_req: Request, res: Response) => {
    res.redirect(302, '/super-admin');
  });

  function getCanonicalBaseOrigin(req: Request): string {
    const raw = getAppBaseUrl(req).replace(/\/+$/, '');
    if (/localhost|127\.0\.0\.1|ais-dev-|webcontainer|onrender\.com/i.test(raw)) {
      return 'https://www.gulfaro.net';
    }
    if (/^https?:\/\/gulfaro\.net$/i.test(raw)) {
      return 'https://www.gulfaro.net';
    }
    return raw;
  }

  function escapeXml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function applyServerSeoTags(
    html: string,
    meta: {
      title: string;
      description: string;
      canonicalPath: string;
      robots?: string;
      ogType?: 'website' | 'article';
      jsonLd?: Record<string, any> | null;
      origin: string;
    }
  ): string {
    const canonicalUrl = `${meta.origin}${meta.canonicalPath.startsWith('/') ? meta.canonicalPath : `/${meta.canonicalPath}`}`;
    const ogImage = `${meta.origin}/pwa-512x512.png`;
    const safeTitle = escapeHtml(meta.title);
    const safeDesc = escapeHtml(meta.description);
    const safeRobots = escapeHtml(meta.robots || 'index, follow');
    const safeUrl = escapeHtml(canonicalUrl);
    const safeImage = escapeHtml(ogImage);
    const safeOgType = escapeHtml(meta.ogType || 'website');

    let out = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
      .replace(/<meta\s+name="description"[^>]*>/gi, '')
      .replace(/<meta\s+name="robots"[^>]*>/gi, '')
      .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
      .replace(/<meta\s+property="og:(type|site_name|title|description|url|image)"[^>]*>/gi, '')
      .replace(/<meta\s+name="twitter:(card|title|description|image)"[^>]*>/gi, '');

    const jsonLdTag = meta.jsonLd
      ? `\n    <script id="gulfaro-route-jsonld" type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/<\/script>/gi, '<\\/script>')}</script>`
      : '';

    const seoBlock = `
    <meta name="description" content="${safeDesc}" />
    <meta name="robots" content="${safeRobots}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="${safeOgType}" />
    <meta property="og:site_name" content="Gulfaro" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:image" content="${safeImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />${jsonLdTag}`;

    return out.replace('</head>', `${seoBlock}\n  </head>`);
  }

  // Server-side OpenGraph / WhatsApp / Facebook Share Preview HTML (works even on API-only Render deploy)
  app.get(['/share/job/:idOrSlug', '/api/share/job/:idOrSlug'], async (req: Request, res: Response) => {
    try {
      const { idOrSlug } = req.params;
      const [jobs, settings] = await Promise.all([getJobs(), getSiteSettings()]);
      const matchedJob =
        settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown
          ? undefined
          : findJobInList(jobs, idOrSlug);

      const frontendOrigin = getCanonicalBaseOrigin(req);

      if (!matchedJob || matchedJob.status === 'hidden' || matchedJob.status === 'rejected') {
        const notFoundUrl = `${frontendOrigin}/job/${encodeURIComponent(idOrSlug)}`;
        return res
          .status(404)
          .set({ 'Content-Type': 'text/html; charset=utf-8' })
          .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Job Advertisement Not Found | Gulfaro</title>
    <meta name="description" content="The requested job vacancy on Gulfaro is no longer available or has been removed. Browse active GCC job vacancies." />
    <meta name="robots" content="noindex, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gulfaro" />
    <meta property="og:title" content="Job Advertisement Not Found | Gulfaro" />
    <meta property="og:description" content="The requested job vacancy is no longer available. Browse active opportunities across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman." />
    <meta property="og:url" content="${escapeHtml(notFoundUrl)}" />
    <meta property="og:image" content="${escapeHtml(frontendOrigin)}/pwa-512x512.png" />
    <script>window.location.replace(${JSON.stringify(notFoundUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(notFoundUrl)}">Gulfaro</a>...</p>
  </body>
</html>`);
      }

      const active = isJobActiveAndUnexpired(matchedJob as any);
      const countryInfo = GCC_COUNTRIES[matchedJob.country as keyof typeof GCC_COUNTRIES];
      const countryName = countryInfo?.name || matchedJob.country;
      const slugOrId = matchedJob.slug || matchedJob.id;
      const jobCanonicalUrl = `${frontendOrigin}/job/${encodeURIComponent(slugOrId)}`;
      const ogImage = `${frontendOrigin}/pwa-512x512.png`;
      const cleanDesc = (matchedJob.description || '').replace(/\s+/g, ' ').trim();
      const summaryDesc =
        cleanDesc.length > 160
          ? `${cleanDesc.slice(0, 157)}...`
          : cleanDesc || `${matchedJob.title} at ${matchedJob.company} in ${matchedJob.city}, ${countryName}.`;
      const pageTitle = active
        ? `${matchedJob.title} – ${matchedJob.company} (${matchedJob.city}, ${countryName}) | Gulfaro`
        : `${matchedJob.title} (Expired) – ${matchedJob.company} | Gulfaro`;

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(summaryDesc)}" />
    <meta name="robots" content="${active ? 'index, follow' : 'noindex, follow'}" />
    <link rel="canonical" href="${escapeHtml(jobCanonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Gulfaro" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(summaryDesc)}" />
    <meta property="og:url" content="${escapeHtml(jobCanonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(summaryDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <script>window.location.replace(${JSON.stringify(jobCanonicalUrl)});</script>
  </head>
  <body>
    <main style="font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 16px;">
      <h1>${escapeHtml(matchedJob.title)}</h1>
      <p><strong>${escapeHtml(matchedJob.company)}</strong> · ${escapeHtml(matchedJob.city)}, ${escapeHtml(countryName)}</p>
      <p>${escapeHtml(summaryDesc)}</p>
      <p><a href="${escapeHtml(jobCanonicalUrl)}">View Full Vacancy on Gulfaro</a></p>
    </main>
  </body>
</html>`;

      return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (err) {
      console.error('Error rendering share preview:', err);
      return res.redirect(302, 'https://www.gulfaro.net/');
    }
  });

  // Dynamic robots.txt for search crawlers
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = getCanonicalBaseOrigin(req);
    const robotsTxt = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /super-admin',
      'Disallow: /admin',
      'Disallow: /post-job',
      'Disallow: /post',
      'Disallow: /my-job-posts',
      'Disallow: /manage-jobs',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /unauthorized',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      ''
    ].join('\n');
    res.status(200).type('text/plain').send(robotsTxt);
  });

  // Dynamic XML Sitemap excluding expired/hidden jobs & private pages
  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      const baseUrl = getCanonicalBaseOrigin(req);
      const nowMs = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const [allJobs, settings] = await Promise.all([getJobs(), getSiteSettings()]);

      const staticEntries: Array<{ path: string; priority: string; changefreq: string; lastmod?: string }> = [
        { path: '/', priority: '1.0', changefreq: 'daily', lastmod: today },
        { path: '/countries', priority: '0.9', changefreq: 'daily', lastmod: today },
        ...GCC_COUNTRY_DIRECTORY.map(c => ({
          path: `/country/${c.slug}`,
          priority: '0.9',
          changefreq: 'daily',
          lastmod: today
        })),
        { path: '/categories', priority: '0.8', changefreq: 'weekly', lastmod: today },
        ...PUBLIC_JOB_CATEGORIES.map(cat => ({
          path: `/category/${cat.slug}`,
          priority: '0.8',
          changefreq: 'daily',
          lastmod: today
        })),
        { path: '/career-advice', priority: '0.8', changefreq: 'weekly', lastmod: today },
        ...CAREER_ARTICLES.map(art => ({
          path: `/career-advice/${art.slug}`,
          priority: '0.7',
          changefreq: 'monthly',
          lastmod: today
        })),
        { path: '/about', priority: '0.5', changefreq: 'monthly', lastmod: today },
        { path: '/contact', priority: '0.5', changefreq: 'monthly', lastmod: today },
        { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly', lastmod: today },
        { path: '/terms', priority: '0.4', changefreq: 'yearly', lastmod: today },
        { path: '/disclaimer', priority: '0.4', changefreq: 'yearly', lastmod: today },
        { path: '/cookie-policy', priority: '0.4', changefreq: 'yearly', lastmod: today }
      ];

      const publicJobs =
        settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown
          ? []
          : allJobs.filter(job => isJobActiveAndUnexpired(job as any, nowMs));

      const jobEntries = publicJobs.map(job => ({
        path: `/job/${encodeURIComponent(job.slug || job.id)}`,
        priority: '0.8',
        changefreq: 'daily',
        lastmod: (job.postedAt || today).split('T')[0]
      }));

      const xmlItems = [...staticEntries, ...jobEntries]
        .map(
          entry => `  <url>
    <loc>${escapeXml(`${baseUrl}${entry.path}`)}</loc>
    <lastmod>${escapeXml(entry.lastmod || today)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
        )
        .join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;

      res.status(200).set({ 'Content-Type': 'application/xml; charset=utf-8' }).send(xml);
    } catch (err) {
      console.error('Error generating /sitemap.xml:', err);
      res.status(500).type('text/plain').send('Failed to generate sitemap');
    }
  });

  // Ensure unmatched /api/* routes and middleware/body-parser errors always return JSON (never HTML)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (req.originalUrl.startsWith('/api')) {
      const status = Number(err?.status || err?.statusCode || 500);
      const message =
        err?.type === 'entity.too.large'
          ? 'Submitted payload is too large. Please shorten the text and try again.'
          : err?.type === 'entity.parse.failed'
            ? 'Invalid JSON request payload.'
            : err?.message || 'Internal server error.';
      return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
    return next(err);
  });

  // =========================================================================
  // Vite Integration (Dev) vs Static Files (Prod) with Dynamic SSR OpenGraph
  // =========================================================================

  let vite: ViteDevServer | null = null;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer }
      },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist when bundled together (optional on API-only Render)
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { index: false }));
    }
  }

  // Universal HTML Handler with Route-Aware SEO, OpenGraph Card & SSR Initial Job Data Injection
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    const pathname = req.path.replace(/\/+$/, '') || '/';

    // Skip API and assets with file extensions
    if (url.startsWith('/api') || path.extname(pathname)) {
      return next();
    }

    try {
      let template: string;
      if (!isProduction && vite) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        const indexPath = path.resolve(__dirname, 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          template = fs.readFileSync(indexPath, 'utf-8');
        } else {
          // API-only deployment (e.g. Render backend while frontend runs on Hostinger)
          return res.status(200).json({
            service: 'Gulfaro Backend API',
            status: 'ok',
            health: '/api/health'
          });
        }
      }

      const origin = getCanonicalBaseOrigin(req);

      // Check if this request is for an individual job URL: /job/:idOrSlug or /jobs/:idOrSlug
      const jobUrlMatch = pathname.match(/^\/jobs?\/([^/?#]+)/i);
      const queryJobParam = req.query.job as string | undefined;
      const targetSlugOrId = jobUrlMatch ? jobUrlMatch[1] : queryJobParam;

      if (targetSlugOrId) {
        const [jobs, settings] = await Promise.all([getJobs(), getSiteSettings()]);
        const matchedJob =
          settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown
            ? undefined
            : findJobInList(jobs, targetSlugOrId);

        if (matchedJob && matchedJob.status !== 'hidden' && matchedJob.status !== 'rejected') {
          const active = isJobActiveAndUnexpired(matchedJob as any);
          const countryName = GCC_COUNTRIES[matchedJob.country as keyof typeof GCC_COUNTRIES]?.name || matchedJob.country;
          const cleanDesc = (matchedJob.description || '').replace(/\s+/g, ' ').trim();
          const summaryDesc = cleanDesc.length > 155 ? `${cleanDesc.slice(0, 152)}...` : cleanDesc;
          const employmentMap: Record<string, string> = {
            'full-time': 'FULL_TIME',
            'part-time': 'PART_TIME',
            contract: 'CONTRACTOR',
            temporary: 'TEMPORARY',
            remote: 'FULL_TIME',
            'walk-in': 'FULL_TIME'
          };

          const jobPostingJsonLd =
            active && matchedJob.title && matchedJob.city && matchedJob.description
              ? {
                  '@context': 'https://schema.org/',
                  '@type': 'JobPosting',
                  title: matchedJob.title,
                  description: matchedJob.description,
                  identifier: {
                    '@type': 'PropertyValue',
                    name: 'Gulfaro',
                    value: matchedJob.id
                  },
                  datePosted: matchedJob.postedAt,
                  validThrough: matchedJob.expiresAt,
                  employmentType: employmentMap[matchedJob.employmentType] || 'FULL_TIME',
                  hiringOrganization: {
                    '@type': 'Organization',
                    name: matchedJob.company || 'Direct GCC Employer'
                  },
                  jobLocation: {
                    '@type': 'Place',
                    address: {
                      '@type': 'PostalAddress',
                      streetAddress: matchedJob.district || matchedJob.city,
                      addressLocality: matchedJob.city,
                      addressCountry: GCC_COUNTRIES[matchedJob.country as keyof typeof GCC_COUNTRIES]?.code || 'SA'
                    }
                  },
                  ...(matchedJob.workMode === 'remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
                  ...(matchedJob.salaryMin && matchedJob.salaryMin > 0
                    ? {
                        baseSalary: {
                          '@type': 'MonetaryAmount',
                          currency: matchedJob.currency || 'SAR',
                          value: {
                            '@type': 'QuantitativeValue',
                            minValue: matchedJob.salaryMin,
                            maxValue: matchedJob.salaryMax || matchedJob.salaryMin,
                            unitText:
                              matchedJob.salaryPeriod === 'yearly'
                                ? 'YEAR'
                                : matchedJob.salaryPeriod === 'daily'
                                  ? 'DAY'
                                  : 'MONTH'
                          }
                        }
                      }
                    : {})
                }
              : null;

          const companyTitleSuffix = matchedJob.company ? ` – ${matchedJob.company}` : '';
          const companyAtClause = matchedJob.company ? ` at ${matchedJob.company}` : '';
          template = applyServerSeoTags(template, {
            title: active
              ? `${matchedJob.title}${companyTitleSuffix} (${matchedJob.city}, ${countryName}) | Gulfaro`
              : `${matchedJob.title} (Expired)${companyTitleSuffix} | Gulfaro`,
            description:
              summaryDesc || `${matchedJob.title} opportunity${companyAtClause} in ${matchedJob.city}, ${countryName}.`,
            canonicalPath: `/job/${matchedJob.slug || matchedJob.id}`,
            robots: active ? 'index, follow' : 'noindex, follow',
            ogType: 'article',
            jsonLd: jobPostingJsonLd,
            origin
          });

          const ssrScript = `
    <script id="gulfaro-ssr-data">
      window.__INITIAL_JOB__ = ${JSON.stringify(matchedJob).replace(/<\/script>/gi, '<\\/script>')};
      window.__REQUESTED_JOB_SLUG__ = ${JSON.stringify(targetSlugOrId)};
    </script>`;
          template = template.replace('</head>', `${ssrScript}\n  </head>`);
        } else {
          template = applyServerSeoTags(template, {
            title: 'Job Advertisement Not Found | Gulfaro',
            description: 'The requested job listing is no longer available or has expired. Browse active GCC opportunities on Gulfaro.',
            canonicalPath: pathname,
            robots: 'noindex, follow',
            origin
          });

          const notFoundScript = `
    <script id="gulfaro-ssr-data">
      window.__JOB_NOT_FOUND__ = true;
      window.__REQUESTED_JOB_SLUG__ = ${JSON.stringify(targetSlugOrId)};
    </script>`;
          template = template.replace('</head>', `${notFoundScript}\n  </head>`);
        }
      } else if (pathname === '/countries') {
        template = applyServerSeoTags(template, {
          title: 'Browse Jobs by GCC Country | Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman | Gulfaro',
          description: 'Explore regional job hubs, major hiring cities, labor portals, and active vacancies across all six GCC countries.',
          canonicalPath: '/countries',
          origin
        });
      } else if (pathname.startsWith('/country/')) {
        const slug = pathname.replace(/^\/country\//i, '').split('/')[0];
        const countryMeta = findCountryMetaBySlug(slug);
        if (countryMeta) {
          template = applyServerSeoTags(template, {
            title: `Jobs in ${countryMeta.name} (${countryMeta.shortName}) – Direct Employer Vacancies | Gulfaro`,
            description: countryMeta.overview,
            canonicalPath: `/country/${countryMeta.slug}`,
            origin
          });
        } else {
          template = applyServerSeoTags(template, {
            title: 'GCC Countries Directory | Gulfaro',
            description: 'Browse active jobs across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.',
            canonicalPath: '/countries',
            robots: 'noindex, follow',
            origin
          });
        }
      } else if (pathname === '/categories') {
        template = applyServerSeoTags(template, {
          title: 'All 30 GCC Job Categories | Engineering, Healthcare, IT, Finance & More | Gulfaro',
          description: 'Browse open employment vacancies across 30 GCC industries including Engineering, Healthcare, IT, Accounting, Construction, Logistics, Hospitality, and more.',
          canonicalPath: '/categories',
          origin
        });
      } else if (pathname.startsWith('/category/')) {
        const slug = pathname.replace(/^\/category\//i, '').split('/')[0];
        const catMeta = findCategoryMetaBySlug(slug);
        if (catMeta) {
          template = applyServerSeoTags(template, {
            title: `${catMeta.name} Jobs in GCC – Saudi Arabia, UAE, Qatar & Gulf | Gulfaro`,
            description: `${catMeta.summary} ${catMeta.overview}`,
            canonicalPath: `/category/${catMeta.slug}`,
            origin
          });
        } else {
          template = applyServerSeoTags(template, {
            title: 'GCC Job Categories | Gulfaro',
            description: 'Explore GCC employment opportunities organized by industry category.',
            canonicalPath: '/categories',
            robots: 'noindex, follow',
            origin
          });
        }
      } else if (pathname === '/career-advice') {
        template = applyServerSeoTags(template, {
          title: 'GCC Career Advice, CV Writing & Interview Preparation Guides | Gulfaro',
          description: 'Original articles covering Gulf job search strategy, professional CV preparation, common interview questions, and GCC labor contract essentials.',
          canonicalPath: '/career-advice',
          origin
        });
      } else if (pathname.startsWith('/career-advice/')) {
        const slug = pathname.replace(/^\/career-advice\//i, '').split('/')[0];
        const article = CAREER_ARTICLES.find(a => a.slug === slug);
        if (article) {
          template = applyServerSeoTags(template, {
            title: `${article.title} | Gulfaro Career Advice`,
            description: article.summary,
            canonicalPath: `/career-advice/${article.slug}`,
            ogType: 'article',
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article.title,
              description: article.summary,
              author: { '@type': 'Organization', name: 'Gulfaro Career Editorial Guide' },
              publisher: {
                '@type': 'Organization',
                name: 'Gulfaro',
                logo: { '@type': 'ImageObject', url: `${origin}/pwa-512x512.png` }
              },
              mainEntityOfPage: `${origin}/career-advice/${article.slug}`
            },
            origin
          });
        }
      } else if (pathname === '/about') {
        template = applyServerSeoTags(template, {
          title: 'About Gulfaro | Direct GCC Job Portal & Recruitment Standards',
          description: 'Learn how Gulfaro connects professionals with direct employers across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.',
          canonicalPath: '/about',
          origin
        });
      } else if (pathname === '/contact') {
        template = applyServerSeoTags(template, {
          title: 'Contact Gulfaro | Official Support & Trust Desk',
          description: 'Contact the Gulfaro administration team by email or online inquiry form for listing assistance, account help, or safety reports.',
          canonicalPath: '/contact',
          origin
        });
      } else if (pathname === '/privacy-policy') {
        template = applyServerSeoTags(template, {
          title: 'Privacy Policy | Data Protection, Cookies & Advertising Disclosure | Gulfaro',
          description: 'Read the Gulfaro Privacy Policy detailing data collection, GCC compliance, cookies, and Google AdSense advertising disclosures.',
          canonicalPath: '/privacy-policy',
          origin
        });
      } else if (pathname === '/terms') {
        template = applyServerSeoTags(template, {
          title: 'Terms and Conditions | Gulfaro Platform Rules',
          description: 'Review Gulfaro Terms and Conditions governing job listings, prohibited candidate fees, and platform usage across the GCC.',
          canonicalPath: '/terms',
          origin
        });
      } else if (pathname === '/disclaimer') {
        template = applyServerSeoTags(template, {
          title: 'Disclaimer | Gulfaro Legal & Content Notice',
          description: 'Read Gulfaro legal disclaimers regarding employer-published job advertisements, career guidance articles, and direct candidate communication.',
          canonicalPath: '/disclaimer',
          origin
        });
      } else if (pathname === '/cookie-policy') {
        template = applyServerSeoTags(template, {
          title: 'Cookie Policy | Essential & Third-Party Advertising Cookies | Gulfaro',
          description: 'Learn how Gulfaro uses essential storage, preferences, and Google AdSense advertising cookies, plus how to manage your browser settings.',
          canonicalPath: '/cookie-policy',
          origin
        });
      } else if (/^\/(super-admin|post-job|post|my-job-posts|manage-jobs|forgot-password|reset-password|unauthorized)/i.test(pathname)) {
        template = applyServerSeoTags(template, {
          title: 'Gulfaro Account & Administration',
          description: 'Gulfaro employer and administration portal.',
          canonicalPath: pathname,
          robots: 'noindex, nofollow',
          origin
        });
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      console.error('Error handling route:', e);
      res.status(500).end(e.stack);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Gulfaro server listening on http://0.0.0.0:${PORT} (env: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Gulfaro server:', err);
  process.exit(1);
});
