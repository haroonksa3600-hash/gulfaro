import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'crypto';
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
  phonesMatch,
  issueUserSessionToken,
  verifyUserSessionToken,
  issueEmailVerificationToken,
  verifyEmailByToken,
  resendVerificationEmail,
  verifySmtpConnection,
  isSmtpConfigured,
  validatePasswordStrength,
  cleanPhone,
  REGISTRATION_SUCCESS_MESSAGE,
  UserRecord
} from './server/authService';
import { initializeSuperAdminStores } from './server/superAdminStore';
import {
  appendAuthHistoryEntry,
  appendSystemErrorEntry,
  checkDbRateLimit,
  createUserTransactional,
  deleteJobById,
  findUserByEmail,
  findUserById,
  getAdmins,
  getAdminSessions,
  getJobs,
  getMarketplaceConfig,
  getMonetization,
  getReports,
  getSiteSettings,
  getUsers,
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
import {
  isValidJobCategoryId,
  jobMatchesCategoryFilter,
  resolveJobCategoryId
} from './shared/jobCategories';
import { CAREER_ARTICLES } from './src/data/careerArticles';
import { GCC_COUNTRIES } from './src/types/job';
import {
  DISCOVERY_LINK_HEADER,
  prefersMarkdown,
  buildLlmsTxt,
  buildHomepageMarkdown
} from './server/llmsMarkdown';
import { createGulfaroMcpHandlers } from './server/mcpServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.GULFARO_DATA_DIR
  ? path.resolve(process.env.GULFARO_DATA_DIR)
  : path.resolve(__dirname, 'data');

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

  // Express CORS middleware allowing Hostinger production domain & local preview, plus read-only MCP CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cleanReqPath = req.path.replace(/\/+$/, '') || '/';
    if (cleanReqPath === '/mcp' || cleanReqPath === '/.well-known/mcp/server-card.json') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id'
      );
      res.setHeader('Access-Control-Expose-Headers', 'MCP-Protocol-Version');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      return next();
    }

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

  app.get('/api/applications', (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'This legacy applications endpoint is no longer available. Online application and CV submission through Gulfaro has been removed.'
    });
  });

  app.post('/api/applications', (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'Online application and CV submission through Gulfaro has been removed. Please contact the employer directly by email or phone.'
    });
  });

  app.patch('/api/applications/:id', (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'This legacy applications endpoint is no longer available. Online application and CV submission through Gulfaro has been removed.'
    });
  });

  // Health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbHealth = await checkPostgresHealth();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      storageBackend: dbHealth.mode,
      databaseConnected: dbHealth.connected,
      smtpConfigured: isSmtpConfigured()
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
  // Authentication, Email Verification & Password Reset API Endpoints
  // =========================================================================

  // Verify newly registered user email using single-use 24h SHA-256 verification token
  app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const rawToken =
        (req.body && typeof req.body.token === 'string' ? req.body.token : '') ||
        (typeof req.query.token === 'string' ? req.query.token : '');

      const result = await verifyEmailByToken(rawToken, getAppBaseUrl(req));
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message
        });
      }
      return res.status(400).json({
        success: false,
        code: result.code,
        error: result.error
      });
    } catch (err: any) {
      console.error('Error in /api/auth/verify-email:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify email address. Please try again later.'
      });
    }
  });

  // Resend account verification email (DB rate-limited, non-enumerating)
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    try {
      const email = req.body?.email;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const result = await resendVerificationEmail(
        typeof email === 'string' ? email : '',
        getAppBaseUrl(req),
        clientIp
      );

      if (result.status >= 400) {
        return res.status(result.status).json({
          success: false,
          error: result.error || 'Unable to resend verification email.'
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err: any) {
      console.error('Error in /api/auth/resend-verification:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to process verification email request. Please try again later.'
      });
    }
  });

  // Request password reset email (Hostinger SMTP, 30-min single-use token, anti-enumeration)
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const appUrl = getAppBaseUrl(req);

      const result = await sendRealPasswordResetEmail(email, appUrl, clientIp);
      if (result.status && result.status >= 400) {
        return res.status(result.status).json({ success: false, error: result.message });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (err: any) {
      console.error('Error in /api/auth/forgot-password:', err);
      return res.status(500).json({ error: 'Failed to process password reset request. Please try again later.' });
    }
  });

  // Verify password reset token validity (?token=... with optional email check)
  app.post('/api/auth/verify-reset-token', async (req: Request, res: Response) => {
    try {
      const token =
        (req.body && typeof req.body.token === 'string' ? req.body.token : '') ||
        (typeof req.query.token === 'string' ? req.query.token : '');
      const email = req.body && typeof req.body.email === 'string' ? req.body.email : undefined;

      const result = await verifyResetTokenRecord(token, email);
      if (result.valid) {
        return res.json({ valid: true });
      }
      return res.status(400).json({ valid: false, error: result.error });
    } catch {
      return res.status(500).json({ valid: false, error: 'Failed to verify reset token.' });
    }
  });

  // Complete password reset and invalidate all sessions & sibling unused reset tokens
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, email, password, newPassword, confirmPassword } = req.body || {};
      const nextPassword = typeof password === 'string' && password ? password : (typeof newPassword === 'string' ? newPassword : '');
      const strength = validatePasswordStrength(nextPassword);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.error });
      }

      const result = await completePasswordReset(token, email, nextPassword, confirmPassword);
      if (result.success) {
        return res.json({ success: true, message: result.message });
      }
      return res.status(400).json({ error: result.error });
    } catch (err: any) {
      console.error('Error in /api/auth/reset-password:', err);
      return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
  });

  // Legacy employer verification endpoint retired in favor of /api/auth/verify-email
  app.post('/api/auth/send-employer-verification', (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      error: 'Legacy endpoint retired. Use POST /api/auth/resend-verification for account email verification.'
    });
  });

  app.post('/api/auth/verify-employer-email', (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      error: 'Legacy endpoint retired. Use POST /api/auth/verify-email to verify your Gulfaro account.'
    });
  });

  const USER_SESSION_COOKIE = 'gulfaro_user_token';

  function parseCookies(req: Request): Record<string, string> {
    const raw = req.headers.cookie;
    if (!raw || typeof raw !== 'string') return {};
    const out: Record<string, string> = {};
    for (const part of raw.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key) {
        try {
          out[key] = decodeURIComponent(val);
        } catch {
          out[key] = val;
        }
      }
    }
    return out;
  }

  function sanitizeUser(u: UserRecord) {
    const copy: any = { ...u };
    delete copy.password;
    delete copy.passwordHash;
    copy.emailVerified = Boolean(u.emailVerified);
    copy.emailVerifiedAt = u.emailVerifiedAt;
    return copy;
  }

  function setUserSessionCookie(req: Request, res: Response, token: string, rememberMe = false) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie(USER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: Boolean(isHttps),
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
      path: '/'
    });
  }

  function clearUserSessionCookie(req: Request, res: Response) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.clearCookie(USER_SESSION_COOKIE, {
      httpOnly: true,
      secure: Boolean(isHttps),
      sameSite: isHttps ? 'none' : 'lax',
      path: '/'
    });
  }

  interface AuthenticatedActor {
    isAdmin: boolean;
    id: string;
    email: string;
    user?: UserRecord;
  }

  async function resolveAuthenticatedActor(req: Request): Promise<AuthenticatedActor | null> {
    const cookies = parseCookies(req);
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    // 1. Check signed marketplace user JWT (Bearer or HttpOnly cookie)
    const userToken = bearerToken || cookies[USER_SESSION_COOKIE] || '';
    if (userToken) {
      const verified = verifyUserSessionToken(userToken);
      if (verified.valid && verified.userId) {
        const user = await findUserById(verified.userId);
        if (user && (user.status || 'active') === 'active' && user.emailVerified === true) {
          if (!user.forceLogoutBefore || (verified.iatMs ?? 0) >= user.forceLogoutBefore) {
            return {
              isAdmin: user.role === 'admin',
              id: user.id,
              email: user.email,
              user
            };
          }
        }
      }
    }

    // 2. Check active Super Admin session (Bearer or HttpOnly cookie gulfaro_sa_session)
    const saToken = bearerToken || cookies['gulfaro_sa_session'] || '';
    if (saToken) {
      const tokenHash = crypto.createHash('sha256').update(saToken).digest('hex');
      const [sessions, admins, settings] = await Promise.all([
        getAdminSessions(),
        getAdmins(),
        getSiteSettings()
      ]);
      const now = Date.now();
      const inactivityTimeoutMs = Math.max(5, settings.registration.adminSessionTimeoutMinutes || 15) * 60 * 1000;
      const session = sessions.find(
        s =>
          s.tokenHash === tokenHash &&
          !s.revoked &&
          now <= s.expiresAt &&
          now - s.lastActivityAt <= inactivityTimeoutMs
      );
      if (session) {
        const admin = admins.find(a => a.id === session.adminId && a.status === 'active');
        if (admin) {
          return {
            isAdmin: true,
            id: admin.id,
            email: admin.email
          };
        }
      }
    }

    return null;
  }

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
          error: `Your account is currently ${user.status}.${user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ' Please submit an inquiry via the Gulfaro Contact Us page for assistance.'}`
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

      if (user.emailVerified !== true) {
        await appendAuthHistoryEntry({
          actorType: user.role === 'employer' ? 'employer' : 'user',
          actorId: user.id,
          emailOrUsername: user.email,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: 'Email not verified',
          suspicious: false
        });
        return res.status(403).json({
          error: 'Please verify your email address before signing in.',
          code: 'EMAIL_NOT_VERIFIED'
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

      const rememberMe = Boolean(req.body?.rememberMe);
      const token = issueUserSessionToken(user, rememberMe);
      setUserSessionCookie(req, res, token, rememberMe);

      res.json({ success: true, user: sanitizeUser(user), token });
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

  // Public user registration (Job Seeker & Employer) — starts unverified and dispatches verification email
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.emergencyShutdown || settings.emergency.maintenanceMode) {
        return res.status(503).json({
          error: settings.emergency.emergencyShutdownMessage || 'Registrations are temporarily paused during scheduled maintenance.'
        });
      }

      const body = req.body || {};
      const requestedRole = body.role === 'employer' ? 'employer' : 'job_seeker';

      if (requestedRole === 'job_seeker' && settings.registration.allowJobSeekerRegistration === false) {
        return res.status(403).json({ error: 'Job seeker registrations are currently disabled by administration.' });
      }
      if (requestedRole === 'employer' && settings.registration.allowEmployerRegistration === false) {
        return res.status(403).json({ error: 'Employer registrations are currently disabled by administration.' });
      }

      const ipAllowed = await checkDbRateLimit(`register:ip:${clientIp}`, 10, 15 * 60 * 1000);
      if (!ipAllowed) {
        return res.status(429).json({
          error: 'Too many registration attempts from this network. Please wait 15 minutes and try again.'
        });
      }

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : undefined;
      const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const rawWhatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
      const country = typeof body.country === 'string' ? body.country.trim() : '';
      const city = typeof body.city === 'string' ? body.city.trim() : '';

      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Please enter your full name.' });
      }
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      const cleanedPhone = cleanPhone(rawPhone);
      if (!cleanedPhone || cleanedPhone.replace(/\D/g, '').length < 7) {
        return res.status(400).json({ error: 'Please enter a valid phone number.' });
      }
      if (!country) {
        return res.status(400).json({ error: 'Please select your GCC country or location.' });
      }

      const strength = validatePasswordStrength(password);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.error });
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      const professionalTitle = typeof body.professionalTitle === 'string' ? body.professionalTitle.trim() : '';
      const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
      const hiringOrgName = typeof body.hiringOrgName === 'string' ? body.hiringOrgName.trim() : '';
      const companyType = typeof body.companyType === 'string' ? body.companyType.trim() : '';

      if (requestedRole === 'job_seeker' && !professionalTitle) {
        return res.status(400).json({ error: 'Please enter your professional job title or role.' });
      }
      if (requestedRole === 'employer' && !companyName) {
        return res.status(400).json({ error: 'Please enter your company or organization name.' });
      }

      if (settings.registration.spamProtectionEnabled) {
        const emailDomain = rawEmail.split('@')[1] || '';
        const blockedDomains = (settings.registration.blockedDomains || []).map(d => d.toLowerCase().trim()).filter(Boolean);
        if (blockedDomains.some(d => emailDomain === d || emailDomain.endsWith(`.${d}`))) {
          return res.status(400).json({ error: 'Disposable or blocked email domains are not permitted on Gulfaro.' });
        }
        const combinedText = `${name} ${rawEmail} ${companyName} ${professionalTitle}`.toLowerCase();
        const blockedKw = (settings.registration.blockedKeywords || []).find(kw => kw && combinedText.includes(kw.toLowerCase()));
        if (blockedKw) {
          return res.status(400).json({ error: 'Registration blocked by platform safety rules.' });
        }
      }

      const users = await getUsers();
      if (users.some(u => u.email.toLowerCase() === rawEmail)) {
        return res.status(409).json({
          error: 'An account with this email address already exists. Please sign in instead.'
        });
      }

      const phoneConflict = users.find(
        u =>
          phonesMatch(u.phone, cleanedPhone) ||
          phonesMatch(u.whatsapp, cleanedPhone) ||
          (rawWhatsapp && (phonesMatch(u.phone, rawWhatsapp) || phonesMatch(u.whatsapp, rawWhatsapp)))
      );
      if (phoneConflict) {
        return res.status(409).json({
          error: 'An account with this phone number already exists. Please sign in instead.'
        });
      }

      const nowIso = new Date().toISOString();
      const newUser: UserRecord = {
        id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name,
        email: rawEmail,
        passwordHash: hashPassword(password),
        role: requestedRole,
        phone: cleanedPhone,
        whatsapp: cleanPhone(rawWhatsapp) || cleanedPhone,
        country,
        city: city || undefined,
        professionalTitle: requestedRole === 'job_seeker' ? professionalTitle : undefined,
        companyName: requestedRole === 'employer' ? companyName : undefined,
        hiringOrgName: requestedRole === 'employer' ? (hiringOrgName || companyName) : undefined,
        companyType: requestedRole === 'employer' ? (companyType || undefined) : undefined,
        headline:
          typeof body.headline === 'string' && body.headline.trim()
            ? body.headline.trim()
            : requestedRole === 'job_seeker'
              ? professionalTitle
              : `Recruiter at ${companyName}`,
        bio: typeof body.bio === 'string' && body.bio.trim() ? body.bio.trim() : undefined,
        iqamaStatus: typeof body.iqamaStatus === 'string' && body.iqamaStatus.trim() ? body.iqamaStatus.trim() : undefined,
        experienceYears:
          typeof body.experienceYears === 'string' && body.experienceYears.trim()
            ? body.experienceYears.trim()
            : undefined,
        emailVerified: false,
        emailVerifiedAt: undefined,
        loginFailedAttempts: 0,
        loginLockoutUntil: null,
        status: 'active',
        createdAt: nowIso
      };

      await createUserTransactional(newUser);

      const appUrl = getAppBaseUrl(req);
      const verificationDispatch = await issueEmailVerificationToken(newUser, appUrl, clientIp);
      if (!verificationDispatch.sent) {
        console.log('[Gulfaro Registration] Account created unverified; verification email not dispatched:', verificationDispatch.error);
      }

      await appendAuthHistoryEntry({
        actorType: requestedRole === 'employer' ? 'employer' : 'user',
        actorId: newUser.id,
        emailOrUsername: newUser.email,
        event: 'register',
        success: true,
        ip: clientIp,
        userAgent,
        reason: verificationDispatch.sent ? 'Account registered; verification email sent' : 'Account registered; pending verification email',
        suspicious: false
      });

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        emailSent: verificationDispatch.sent,
        message: REGISTRATION_SUCCESS_MESSAGE,
        user: sanitizeUser(newUser)
      });
    } catch (err: any) {
      console.error('[Auth API /api/auth/register] Error:', err);
      await appendSystemErrorEntry({ level: 'error', source: '/api/auth/register', message: err?.message || 'Registration error' }).catch(() => {});
      return res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
    }
  });

  // Get currently authenticated marketplace user profile
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const actor = await resolveAuthenticatedActor(req);
      if (!actor || !actor.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
      }
      res.json({ success: true, user: sanitizeUser(actor.user) });
    } catch {
      res.status(500).json({ error: 'Failed to load current user session.' });
    }
  });

  // Sign out marketplace user session
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearUserSessionCookie(req, res);
    res.json({ success: true });
  });

  // Sync users list (Admin-only; never exposed publicly)
  app.get('/api/auth/users', async (req: Request, res: Response) => {
    try {
      const actor = await resolveAuthenticatedActor(req);
      if (!actor) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      if (!actor.isAdmin) {
        return res.status(403).json({ error: 'Administrator permission required to view user directory.' });
      }
      const users = await getUsers();
      res.json(users.map(sanitizeUser));
    } catch {
      res.status(500).json({ error: 'Failed to retrieve users.' });
    }
  });

  async function enrichJobsVerifiedStatus(jobs: any[]): Promise<any[]> {
    const users = await getUsers();
    const userById = new Map(users.map(u => [u.id, u]));
    return jobs.map(j => {
      const owner = j.userId ? userById.get(j.userId) : undefined;
      const isVerified = owner
        ? (owner.role === 'employer' || owner.role === 'admin') && owner.emailVerified === true
        : Boolean(j.isEmployerVerified);
      return {
        ...j,
        isEmployerVerified: isVerified
      };
    });
  }

  const CITY_SEARCH_ALIASES: Record<string, string[]> = {
    makkah: ['makkah', 'mecca'],
    mecca: ['makkah', 'mecca'],
    madinah: ['madinah', 'medina'],
    medina: ['madinah', 'medina'],
    ahmadi: ['ahmadi', 'al ahmadi']
  };

  function jobMatchesCitySearchQuery(job: any, rawCityQuery: string): boolean {
    const cleanSelected = rawCityQuery.trim().replace(/\s+/g, ' ');
    if (!cleanSelected || cleanSelected.toLowerCase() === 'all cities') return true;
    const target = cleanSelected.toLowerCase();
    const jobCity = String(job?.city || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const jobLocation = String(job?.location || job?.district || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const aliases = CITY_SEARCH_ALIASES[target] || [target];
    return aliases.some(term => jobCity === term || jobCity.includes(term) || jobLocation.includes(term));
  }

  function formatJobLocationLabel(city?: string | null, countryName?: string | null): string {
    const cleanCity = String(city || '').trim();
    const cleanCountry = String(countryName || '').trim() || 'GCC';
    return cleanCity ? `${cleanCity}, ${cleanCountry}` : cleanCountry;
  }

  // Get all published jobs (supports optional city/country/category/q search params; respects hideAllPublicJobs & filters out hidden/rejected jobs publicly)
  app.get('/api/jobs', async (req: Request, res: Response) => {
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown) {
        return res.json([]);
      }
      const allJobs = await getJobs();
      let visibleJobs = allJobs.filter(j => j.status !== 'hidden' && j.status !== 'rejected');

      const cityParam = String(req.query.city || req.query.location || '').trim();
      const countryParam = String(req.query.country || '').trim().toLowerCase();
      const categoryParam = String(req.query.category || '').trim();
      const qParam = String(req.query.q || req.query.query || '').trim().toLowerCase();

      if (countryParam && countryParam !== 'all') {
        visibleJobs = visibleJobs.filter(j => String(j.country || '').toLowerCase() === countryParam);
      }
      if (cityParam) {
        visibleJobs = visibleJobs.filter(j => jobMatchesCitySearchQuery(j, cityParam));
      }
      if (categoryParam && categoryParam.toLowerCase() !== 'all') {
        visibleJobs = visibleJobs.filter(j => jobMatchesCategoryFilter(j, categoryParam));
      }
      if (qParam) {
        visibleJobs = visibleJobs.filter(j => {
          const hay = [
            j.title,
            j.description,
            j.company,
            j.city,
            j.district,
            j.subcategory,
            ...(Array.isArray(j.requirements) ? j.requirements : [])
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(qParam);
        });
      }

      const enriched = await enrichJobsVerifiedStatus(visibleJobs);
      res.json(enriched);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve jobs.' });
    }
  });

  // Get ONLY the authenticated employer's own job posts (or all jobs for Admin)
  app.get('/api/employer/jobs', async (req: Request, res: Response) => {
    try {
      const actor = await resolveAuthenticatedActor(req);
      if (!actor) {
        return res.status(401).json({ error: 'Please sign in to access your job posts.' });
      }
      if (!actor.isAdmin && actor.user?.role !== 'employer') {
        return res.status(403).json({ error: 'Only registered employer accounts can access employer job management.' });
      }
      const allJobs = await getJobs();
      const scopedJobs = actor.isAdmin
        ? allJobs
        : allJobs.filter(j => Boolean(j.userId) && j.userId === actor.id);
      const enriched = await enrichJobsVerifiedStatus(scopedJobs);
      res.json(enriched);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve employer job posts.' });
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
        const [enriched] = await enrichJobsVerifiedStatus([job]);
        res.json(enriched);
      } else {
        res.status(404).json({ error: 'Job not found', requested: idOrSlug });
      }
    } catch {
      res.status(500).json({ error: 'Failed to retrieve job.' });
    }
  });

  function isJobOwnerOrAdmin(actor: AuthenticatedActor | null, job: any): boolean {
    if (!actor || !job) return false;
    if (actor.isAdmin) return true;
    if (actor.user?.role !== 'employer') return false;
    return Boolean(job.userId) && job.userId === actor.id;
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

  // Create a new job advertisement (Authenticated Employer or Admin only)
  app.post('/api/jobs', async (req: Request, res: Response) => {
    try {
      const settings = await getSiteSettings();
      if (settings.emergency.maintenanceMode || settings.emergency.emergencyShutdown) {
        return res.status(503).json({ error: 'Job posting is paused during platform maintenance.' });
      }
      if (settings.emergency.disableNewJobPublishing) {
        return res.status(403).json({ error: 'New job publishing is temporarily disabled by site administration.' });
      }

      const actor = await resolveAuthenticatedActor(req);
      if (!actor) {
        return res.status(401).json({
          error: 'Authentication required. Please sign in with a registered Gulfaro employer account to publish jobs.'
        });
      }
      if (!actor.isAdmin && actor.user?.role !== 'employer') {
        return res.status(403).json({
          error: 'Job seeker accounts cannot publish job vacancies. Please sign in with a registered employer account.'
        });
      }
      if (actor.user) {
        if (actor.user.status === 'suspended' || actor.user.status === 'banned' || actor.user.status === 'deactivated') {
          return res.status(403).json({ error: `Your account is ${actor.user.status} and cannot publish jobs.` });
        }
        if (actor.user.postingRestricted) {
          return res.status(403).json({ error: 'Your employer account is currently restricted from posting new vacancies.' });
        }
      }

      const adData = req.body || {};

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
      const normalizedCity = String(adData.city || '').trim();
      const cleanCity =
        normalizedCity
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

      const {
        requesterUserId: _rUid,
        requesterEmail: _rEmail,
        userId: _ignoredUserId,
        ...cleanAdData
      } = adData;

      const newJob = {
        ...cleanAdData,
        id,
        slug,
        userId: actor.id,
        city: normalizedCity,
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
        postedAt: now.toISOString(),
        expiresAt: adData.expiresAt || expiry.toISOString(),
        viewsCount: 1,
        inquiriesCount: 0,
        status: 'active',
        isEmployerVerified: actor.user ? actor.user.emailVerified === true : true
      };

      await upsertJob(newJob);

      res.status(201).json(newJob);
    } catch (err: any) {
      console.error('Error creating job:', err);
      await appendSystemErrorEntry({ level: 'error', source: '/api/jobs', message: err?.message || 'Job publish error' }).catch(() => {});
      res.status(500).json({ error: 'Failed to create job', details: err?.message });
    }
  });

  // Update a job (Strict Authenticated Owner Employer or Admin only + Strict No-External-Links Validation)
  app.put('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
      const actor = await resolveAuthenticatedActor(req);
      if (!actor) {
        return res.status(401).json({ error: 'Authentication required. Please sign in to edit a job post.' });
      }

      const { id } = req.params;
      const {
        requesterUserId: _rUid,
        requesterEmail: _rEmail,
        userId: _ignoredUserId,
        id: _ignoredId,
        isEmployerVerified: _ignoredVerified,
        viewsCount: _ignoredViews,
        inquiriesCount: _ignoredInq,
        postedAt: _ignoredPostedAt,
        ...updates
      } = req.body || {};

      const jobs = await getJobs();
      const existing = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

      if (!existing) {
        return res.status(404).json({ error: 'Job not found to update' });
      }

      if (!isJobOwnerOrAdmin(actor, existing)) {
        return res.status(403).json({ error: 'Forbidden: You can only edit job posts owned by your employer account.' });
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

      if (updates.city !== undefined) updates.city = String(updates.city || '').trim();
      if (updates.company !== undefined) updates.company = String(updates.company || '').trim();
      if (updates.contactPerson !== undefined) updates.contactPerson = String(updates.contactPerson || '').trim();
      if (updates.experienceLevel !== undefined) updates.experienceLevel = String(updates.experienceLevel || '').trim();
      if (updates.educationLevel !== undefined) updates.educationLevel = String(updates.educationLevel || '').trim();

      const updatedJob = {
        ...existing,
        ...updates,
        howToApply: 'email',
        id: existing.id,
        userId: existing.userId,
        isEmployerVerified: actor.user ? actor.user.emailVerified === true : Boolean(existing.isEmployerVerified)
      };
      await upsertJob(updatedJob);
      res.json(updatedJob);
    } catch (err: any) {
      console.error('Error updating job:', err);
      res.status(500).json({ error: 'Failed to update job.' });
    }
  });

  // Delete a job (Strict Authenticated Owner Employer or Admin only)
  app.delete('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
      const actor = await resolveAuthenticatedActor(req);
      if (!actor) {
        return res.status(401).json({ error: 'Authentication required. Please sign in to delete a job post.' });
      }

      const { id } = req.params;
      const jobs = await getJobs();
      const target = jobs.find(j => j.id.toLowerCase() === id.toLowerCase());

      if (!target) {
        return res.status(404).json({ error: 'Job not found to delete' });
      }

      if (!isJobOwnerOrAdmin(actor, target)) {
        return res.status(403).json({ error: 'Forbidden: You can only delete job posts owned by your employer account.' });
      }

      await deleteJobById(target.id);
      res.json({ success: true, deletedId: target.id });
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
    if (/^https?:\/\/(www\.)?gulfaro\.net$/i.test(raw)) {
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

  function buildServerOrganizationNode(
    origin: string,
    settings?: { cms?: { footerContactEmail?: string; contactUsEmail?: string; footerDescription?: string } }
  ) {
    const orgDescription =
      String(settings?.cms?.footerDescription || '').trim() ||
      'Gulfaro is a modern GCC job marketplace connecting skilled expatriate and national talent with verified employers across the Arabian Gulf, making recruitment simpler, faster, and more reliable.';

    return {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: 'Gulfaro',
      alternateName: 'Gulfaro GCC Jobs',
      url: origin,
      description: orgDescription,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/pwa-512x512.png`,
        width: 512,
        height: 512
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: `${origin}/contact`,
        areaServed: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
        availableLanguage: ['English']
      },
      areaServed: [
        { '@type': 'Country', name: 'Saudi Arabia' },
        { '@type': 'Country', name: 'United Arab Emirates' },
        { '@type': 'Country', name: 'Qatar' },
        { '@type': 'Country', name: 'Kuwait' },
        { '@type': 'Country', name: 'Bahrain' },
        { '@type': 'Country', name: 'Oman' }
      ]
    };
  }

  function buildServerWebSiteNode(origin: string) {
    return {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: origin,
      name: 'Gulfaro',
      alternateName: 'Gulfaro GCC Jobs',
      publisher: {
        '@id': `${origin}/#organization`
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
  }

  function buildServerBreadcrumbListNode(
    origin: string,
    items: Array<{ name: string; path: string }>
  ) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: item.name,
        item: `${origin}${item.path.startsWith('/') ? item.path : `/${item.path}`}`
      }))
    };
  }

  function buildServerSeoGraph(
    origin: string,
    extraNodes: Array<Record<string, any> | null | undefined> = [],
    settings?: any
  ) {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        buildServerOrganizationNode(origin, settings),
        buildServerWebSiteNode(origin),
        ...extraNodes.filter((n): n is Record<string, any> => Boolean(n))
      ]
    };
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
    const normalizedPath = meta.canonicalPath.startsWith('/') ? meta.canonicalPath : `/${meta.canonicalPath}`;
    const canonicalUrl = `${meta.origin}${normalizedPath}`;
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
      .replace(/<meta\s+name="twitter:(card|title|description|image)"[^>]*>/gi, '')
      .replace(/<script\s+id="gulfaro-route-jsonld"[^>]*>[\s\S]*?<\/script>/gi, '');

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
      const locationLabel = formatJobLocationLabel(matchedJob.city, countryName);
      const slugOrId = matchedJob.slug || matchedJob.id;
      const jobCanonicalUrl = `${frontendOrigin}/job/${encodeURIComponent(slugOrId)}`;
      const ogImage = `${frontendOrigin}/pwa-512x512.png`;
      const cleanDesc = (matchedJob.description || '').replace(/\s+/g, ' ').trim();
      const summaryDesc =
        cleanDesc.length > 160
          ? `${cleanDesc.slice(0, 157)}...`
          : cleanDesc || `${matchedJob.title}${matchedJob.company ? ` at ${matchedJob.company}` : ''} in ${locationLabel}.`;
      const pageTitle = active
        ? `${matchedJob.title}${matchedJob.company ? ` – ${matchedJob.company}` : ''} (${locationLabel}) | Gulfaro`
        : `${matchedJob.title} (Expired)${matchedJob.company ? ` – ${matchedJob.company}` : ''} | Gulfaro`;

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
      <p>${matchedJob.company ? `<strong>${escapeHtml(matchedJob.company)}</strong> · ` : ''}${escapeHtml(locationLabel)}</p>
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
      'User-agent: Googlebot',
      'Allow: /',
      'Allow: /favicon.ico',
      'Allow: /favicon.png',
      'Allow: /apple-touch-icon.png',
      '',
      'User-agent: Googlebot-Image',
      'Allow: /',
      'Allow: /favicon.ico',
      'Allow: /favicon.png',
      'Allow: /apple-touch-icon.png',
      '',
      'User-agent: *',
      'Content-Signal: search=yes, ai-train=no',
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
      'Disallow: /verify-email',
      'Disallow: /unauthorized',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      ''
    ].join('\n');
    res.status(200).type('text/plain').send(robotsTxt);
  });

  function formatSitemapLastmod(primary?: string, secondary?: string, fallback?: string): string {
    const candidates = [primary, secondary];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const ms = Date.parse(candidate);
      if (!Number.isNaN(ms)) {
        return new Date(ms).toISOString().split('T')[0];
      }
    }
    return fallback || new Date().toISOString().split('T')[0];
  }

  // Dynamic XML Sitemap excluding expired/hidden/deleted jobs & private/admin pages
  app.get(['/sitemap.xml', '/api/sitemap.xml'], async (req: Request, res: Response) => {
    try {
      const resolvedOrigin = getCanonicalBaseOrigin(req);
      const baseUrl =
        /^https?:\/\/(www\.)?gulfaro\.net$/i.test(resolvedOrigin) || /run\.app/i.test(resolvedOrigin)
          ? 'https://www.gulfaro.net'
          : resolvedOrigin;
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
          : allJobs
              .filter(job => isJobActiveAndUnexpired(job as any, nowMs))
              .sort((a, b) => {
                const aMs = Date.parse(a.updatedAt || a.postedAt || '') || 0;
                const bMs = Date.parse(b.updatedAt || b.postedAt || '') || 0;
                return bMs - aMs;
              });

      const jobEntries = publicJobs.map(job => ({
        path: `/job/${encodeURIComponent(job.slug || job.id)}`,
        priority: '0.8',
        changefreq: 'daily',
        lastmod: formatSitemapLastmod(job.updatedAt, job.postedAt, today)
      }));

      const seenLocs = new Set<string>();
      const uniqueEntries = [...staticEntries, ...jobEntries].filter(entry => {
        const loc = `${baseUrl}${entry.path}`;
        if (seenLocs.has(loc)) return false;
        seenLocs.add(loc);
        return true;
      });

      const xmlItems = uniqueEntries
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

      res
        .status(200)
        .set({
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-cache, must-revalidate'
        })
        .send(xml);
    } catch (err) {
      console.error('Error generating /sitemap.xml:', err);
      res.status(500).type('text/plain').send('Failed to generate sitemap');
    }
  });

  // Dynamic /llms.txt for AI discoverability (HTTP 200, Content-Type: text/plain)
  app.get('/llms.txt', async (req: Request, res: Response) => {
    try {
      const origin = getCanonicalBaseOrigin(req);
      const [jobs, settings] = await Promise.all([getJobs(), getSiteSettings().catch(() => null)]);
      const body = buildLlmsTxt({ origin, jobs, settings });
      res
        .status(200)
        .set({
          'Content-Type': 'text/plain; charset=utf-8',
          Link: DISCOVERY_LINK_HEADER,
          'Cache-Control': 'public, max-age=120, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        })
        .vary('Accept')
        .send(body);
    } catch (err) {
      console.error('Error generating /llms.txt:', err);
      const fallbackPath = path.resolve(__dirname, 'public', 'llms.txt');
      if (fs.existsSync(fallbackPath)) {
        res
          .status(200)
          .set({
            'Content-Type': 'text/plain; charset=utf-8',
            Link: DISCOVERY_LINK_HEADER
          })
          .vary('Accept')
          .sendFile(fallbackPath);
        return;
      }
      res.status(500).type('text/plain').send('Failed to generate llms.txt');
    }
  });

  // Explicit Markdown alternate for Gulfaro homepage (/index.md)
  app.get('/index.md', async (req: Request, res: Response) => {
    try {
      const origin = getCanonicalBaseOrigin(req);
      const [jobs, settings] = await Promise.all([getJobs(), getSiteSettings().catch(() => null)]);
      const markdown = buildHomepageMarkdown({ origin, jobs, settings });
      res
        .status(200)
        .set({
          'Content-Type': 'text/markdown; charset=utf-8',
          Link: DISCOVERY_LINK_HEADER,
          'Cache-Control': 'public, max-age=120, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        })
        .vary('Accept')
        .send(markdown);
    } catch (err) {
      console.error('Error generating /index.md:', err);
      const fallbackPath = path.resolve(__dirname, 'public', 'index.md');
      if (fs.existsSync(fallbackPath)) {
        res
          .status(200)
          .set({
            'Content-Type': 'text/markdown; charset=utf-8',
            Link: DISCOVERY_LINK_HEADER
          })
          .vary('Accept')
          .sendFile(fallbackPath);
        return;
      }
      res.status(500).type('text/plain').send('Failed to generate Markdown homepage');
    }
  });

  // =========================================================================
  // Read-Only MCP Server (/mcp) & MCP Server Card (/.well-known/mcp/server-card.json)
  // Mounted BEFORE Vite/static & the generic .well-known 404 fallback.
  // =========================================================================
  const mcpHandlers = createGulfaroMcpHandlers({
    getJobs,
    getSiteSettings,
    enrichJobsVerifiedStatus,
    getCanonicalBaseOrigin
  });

  app.get('/.well-known/mcp/server-card.json', mcpHandlers.handleServerCard);
  app.all('/mcp', mcpHandlers.handleMcpRequest);

  // Ensure unmatched /api/* routes and middleware/body-parser errors always return JSON (never HTML)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (req.originalUrl.startsWith('/api') || req.path === '/mcp') {
      const status = Number(err?.status || err?.statusCode || 500);
      const message =
        err?.type === 'entity.too.large'
          ? 'Submitted payload is too large. Please shorten the text and try again.'
          : err?.type === 'entity.parse.failed'
            ? 'Invalid JSON request payload.'
            : err?.message || 'Internal server error.';
      if (req.path === '/mcp') {
        return res.status(status >= 400 && status < 600 ? status : 400).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: err?.type === 'entity.parse.failed' ? -32700 : -32600,
            message
          }
        });
      }
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

  // Explicitly return HTTP 404 for missing /.well-known/* endpoints
  // and missing static file extensions so they never fall through to the homepage HTML.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const pathname = req.path.replace(/\/+$/, '') || '/';
    if (pathname.startsWith('/api') || pathname === '/mcp' || pathname === '/.well-known/mcp/server-card.json') {
      return next();
    }
    if (pathname === '/.well-known' || pathname.startsWith('/.well-known/')) {
      if (pathname.toLowerCase().endsWith('.json') || (req.headers.accept || '').includes('application/json')) {
        return res
          .status(404)
          .set({ 'Cache-Control': 'no-cache, no-store, must-revalidate' })
          .json({ error: 'Not Found', path: pathname });
      }
      return res
        .status(404)
        .set({ 'Cache-Control': 'no-cache, no-store, must-revalidate' })
        .type('text/plain')
        .send('404 Not Found');
    }
    const ext = path.extname(pathname);
    if (ext && !/^\/jobs?\/[^/]+\.html$/i.test(pathname)) {
      if (ext.toLowerCase() === '.json') {
        return res
          .status(404)
          .set({ 'Cache-Control': 'no-cache, no-store, must-revalidate' })
          .json({ error: 'Not Found', path: pathname });
      }
      return res
        .status(404)
        .set({ 'Cache-Control': 'no-cache, no-store, must-revalidate' })
        .type('text/plain')
        .send('404 Not Found');
    }
    return next();
  });

  // Universal HTML Handler with Route-Aware SEO, OpenGraph Card & SSR Initial Job Data Injection
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    const pathname = req.path.replace(/\/+$/, '') || '/';

    // Skip API
    if (url.startsWith('/api')) {
      return next();
    }

    try {
      const origin = getCanonicalBaseOrigin(req);

      // Server-side content negotiation for Accept: text/markdown (or ?format=markdown) on homepage (/)
      if (pathname === '/' && (req.query.format === 'markdown' || prefersMarkdown(req.headers.accept))) {
        const [jobs, settings] = await Promise.all([
          getJobs().catch(() => []),
          getSiteSettings().catch(() => null)
        ]);
        const markdown = buildHomepageMarkdown({ origin, jobs, settings });
        return res
          .status(200)
          .set({
            'Content-Type': 'text/markdown; charset=utf-8',
            Link: DISCOVERY_LINK_HEADER,
            'Cache-Control': 'public, max-age=120, must-revalidate',
            'X-Content-Type-Options': 'nosniff'
          })
          .vary('Accept')
          .send(markdown);
      }

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
          if (pathname === '/') {
            return res.status(200).json({
              service: 'Gulfaro Backend API',
              status: 'ok',
              health: '/api/health'
            });
          }
          return res.status(404).json({
            error: 'Not Found',
            path: pathname
          });
        }
      }

      const siteSettings = await getSiteSettings().catch(() => null);
      let responseStatus = 200;

      // Check if this request is for an individual job URL: /job/:idOrSlug or /jobs/:idOrSlug (single segment)
      const jobUrlMatch = pathname.match(/^\/jobs?\/([^/]+)$/i);
      const queryJobParam =
        pathname === '/'
          ? ((req.query.job || req.query.id || req.query.ref) as string | undefined)
          : undefined;
      const targetSlugOrId = jobUrlMatch ? jobUrlMatch[1] : queryJobParam;

      const lowerPath = pathname.toLowerCase();
      const privateSeoMap: Record<string, { title: string; description: string; canonicalPath: string }> = {
        '/super-admin': {
          title: 'Super Admin Portal | Gulfaro',
          description: 'Restricted Gulfaro platform administration portal.',
          canonicalPath: '/super-admin'
        },
        '/post-job': {
          title: 'Post a Job Vacancy | Gulfaro',
          description: 'Publish a direct GCC job vacancy on Gulfaro for Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.',
          canonicalPath: '/post-job'
        },
        '/post': {
          title: 'Post a Job Vacancy | Gulfaro',
          description: 'Publish a direct GCC job vacancy on Gulfaro for Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.',
          canonicalPath: '/post-job'
        },
        '/my-job-posts': {
          title: 'Manage Job Advertisements | Gulfaro',
          description: 'Review, edit, renew, or manage your published GCC job advertisements on Gulfaro.',
          canonicalPath: '/my-job-posts'
        },
        '/manage-jobs': {
          title: 'Manage Job Advertisements | Gulfaro',
          description: 'Review, edit, renew, or manage your published GCC job advertisements on Gulfaro.',
          canonicalPath: '/my-job-posts'
        },
        '/forgot-password': {
          title: 'Account & Password Recovery | Gulfaro',
          description: 'Recover access to your Gulfaro employer or job seeker account using your registered email address.',
          canonicalPath: '/forgot-password'
        },
        '/verify-email': {
          title: 'Verify Email Address | Gulfaro',
          description: 'Verify your Gulfaro account email address to activate your job seeker or employer account.',
          canonicalPath: '/verify-email'
        },
        '/reset-password': {
          title: 'Reset Password | Gulfaro',
          description: 'Set a new password for your Gulfaro account.',
          canonicalPath: '/reset-password'
        },
        '/unauthorized': {
          title: 'Employer Access Required | Gulfaro',
          description: 'Employer account authorization is required to publish and manage job vacancies on Gulfaro.',
          canonicalPath: '/unauthorized'
        }
      };

      const countryRouteMatch = pathname.match(/^\/country\/([^/]+)$/i);
      const categoryRouteMatch = pathname.match(/^\/category\/([^/]+)$/i);
      const articleRouteMatch = pathname.match(/^\/career-advice\/([^/]+)$/i);

      if (targetSlugOrId) {
        const [jobs, settings] = await Promise.all([getJobs(), siteSettings ? Promise.resolve(siteSettings) : getSiteSettings()]);
        const rawMatchedJob =
          settings.emergency.hideAllPublicJobs || settings.emergency.emergencyShutdown
            ? undefined
            : findJobInList(jobs, targetSlugOrId);
        const matchedJob = rawMatchedJob
          ? (await enrichJobsVerifiedStatus([rawMatchedJob]))[0]
          : undefined;

        if (matchedJob && matchedJob.status !== 'hidden' && matchedJob.status !== 'rejected') {
          const active = isJobActiveAndUnexpired(matchedJob as any);
          const countryInfo = GCC_COUNTRIES[matchedJob.country as keyof typeof GCC_COUNTRIES];
          const countryName = countryInfo?.name || matchedJob.country;
          const categoryMeta = PUBLIC_JOB_CATEGORIES.find(
            c => c.slug === matchedJob.category || c.id === matchedJob.category
          );
          const locationLabel = formatJobLocationLabel(matchedJob.city, countryName);
          const cleanDesc = (matchedJob.description || '').replace(/\s+/g, ' ').trim();
          const summaryDesc = cleanDesc.length > 155 ? `${cleanDesc.slice(0, 152)}...` : cleanDesc;
          const jobCanonicalPath = `/job/${matchedJob.slug || matchedJob.id}`;
          const jobCanonicalUrl = `${origin}${jobCanonicalPath}`;
          const employmentMap: Record<string, string> = {
            'full-time': 'FULL_TIME',
            'part-time': 'PART_TIME',
            contract: 'CONTRACTOR',
            temporary: 'TEMPORARY',
            remote: 'FULL_TIME',
            'walk-in': 'FULL_TIME'
          };

          const fullDescriptionParts = [String(matchedJob.description || '').trim()];
          if (Array.isArray(matchedJob.responsibilities) && matchedJob.responsibilities.length > 0) {
            fullDescriptionParts.push(`Responsibilities: ${matchedJob.responsibilities.join('; ')}`);
          }
          if (Array.isArray(matchedJob.requirements) && matchedJob.requirements.length > 0) {
            fullDescriptionParts.push(`Requirements: ${matchedJob.requirements.join('; ')}`);
          }
          if (Array.isArray(matchedJob.benefits) && matchedJob.benefits.length > 0) {
            fullDescriptionParts.push(`Benefits: ${matchedJob.benefits.join('; ')}`);
          }

          const jobBreadcrumbNode = buildServerBreadcrumbListNode(origin, [
            { name: 'Home', path: '/' },
            { name: `${countryName} Jobs`, path: `/country/${matchedJob.country}` },
            { name: matchedJob.title, path: jobCanonicalPath }
          ]);

          const jobPostingNode =
            active && matchedJob.title && matchedJob.description
              ? {
                  '@type': 'JobPosting',
                  '@id': `${jobCanonicalUrl}#jobposting`,
                  title: matchedJob.title,
                  description: fullDescriptionParts.join('\n\n'),
                  url: jobCanonicalUrl,
                  directApply: true,
                  identifier: {
                    '@type': 'PropertyValue',
                    name: 'Gulfaro',
                    value: matchedJob.id
                  },
                  datePosted: matchedJob.postedAt,
                  validThrough: matchedJob.expiresAt,
                  employmentType: employmentMap[matchedJob.employmentType] || 'FULL_TIME',
                  ...(categoryMeta?.name || matchedJob.category
                    ? { occupationalCategory: categoryMeta?.name || matchedJob.category }
                    : {}),
                  ...(matchedJob.experienceLevel
                    ? { experienceRequirements: String(matchedJob.experienceLevel).replace(/-/g, ' ') }
                    : {}),
                  ...(matchedJob.educationLevel
                    ? { educationRequirements: String(matchedJob.educationLevel) }
                    : {}),
                  hiringOrganization: {
                    '@type': 'Organization',
                    name: matchedJob.company || 'Direct GCC Employer'
                  },
                  jobLocation: {
                    '@type': 'Place',
                    address: {
                      '@type': 'PostalAddress',
                      ...(matchedJob.district || matchedJob.city
                        ? { streetAddress: matchedJob.district || matchedJob.city }
                        : {}),
                      ...(matchedJob.city ? { addressLocality: matchedJob.city } : {}),
                      addressCountry: countryInfo?.code || 'SA'
                    }
                  },
                  ...(matchedJob.workMode === 'remote'
                    ? {
                        jobLocationType: 'TELECOMMUTE',
                        ...(countryName
                          ? { applicantLocationRequirements: { '@type': 'Country', name: countryName } }
                          : {})
                      }
                    : {}),
                  ...(matchedJob.salaryMin && matchedJob.salaryMin > 0
                    ? {
                        baseSalary: {
                          '@type': 'MonetaryAmount',
                          currency: matchedJob.currency || countryInfo?.currencyCode || 'SAR',
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
              ? `${matchedJob.title}${companyTitleSuffix} (${locationLabel}) | Gulfaro`
              : `${matchedJob.title} (Expired)${companyTitleSuffix} (${locationLabel}) | Gulfaro`,
            description:
              summaryDesc || `${matchedJob.title} opportunity${companyAtClause} in ${locationLabel}.`,
            canonicalPath: jobCanonicalPath,
            robots: active ? 'index, follow' : 'noindex, follow',
            ogType: 'article',
            jsonLd: buildServerSeoGraph(
              origin,
              active ? [jobBreadcrumbNode, jobPostingNode] : [jobBreadcrumbNode],
              settings
            ),
            origin
          });

          const ssrScript = `
    <script id="gulfaro-ssr-data">
      window.__INITIAL_JOB__ = ${JSON.stringify(matchedJob).replace(/<\/script>/gi, '<\\/script>')};
      window.__REQUESTED_JOB_SLUG__ = ${JSON.stringify(targetSlugOrId)};
    </script>`;
          template = template.replace('</head>', `${ssrScript}\n  </head>`);
        } else {
          responseStatus = 404;
          template = applyServerSeoTags(template, {
            title: '404 – Job Advertisement Not Found | Gulfaro',
            description: 'The requested job listing is no longer available or has expired. Browse active GCC opportunities on Gulfaro.',
            canonicalPath: pathname,
            robots: 'noindex, follow',
            jsonLd: null,
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
          title: 'GCC Country Job Portals — Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman | Gulfaro',
          description: 'Browse verified direct-employer job openings and labor guides across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.',
          canonicalPath: '/countries',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'GCC Countries', path: '/countries' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (countryRouteMatch) {
        const slug = decodeURIComponent(countryRouteMatch[1]);
        const countryMeta = findCountryMetaBySlug(slug);
        if (countryMeta) {
          template = applyServerSeoTags(template, {
            title: `Jobs in ${countryMeta.name} (${countryMeta.shortName}) – Direct Employer Vacancies | Gulfaro`,
            description: countryMeta.overview.slice(0, 158),
            canonicalPath: `/country/${countryMeta.slug}`,
            jsonLd: buildServerSeoGraph(
              origin,
              [
                buildServerBreadcrumbListNode(origin, [
                  { name: 'Home', path: '/' },
                  { name: 'GCC Countries', path: '/countries' },
                  { name: countryMeta.name, path: `/country/${countryMeta.slug}` }
                ])
              ],
              siteSettings
            ),
            origin
          });
        } else {
          responseStatus = 404;
          template = applyServerSeoTags(template, {
            title: '404 – GCC Country Not Found | Gulfaro',
            description: 'Explore active job portals across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman on Gulfaro.',
            canonicalPath: pathname,
            robots: 'noindex, nofollow',
            jsonLd: null,
            origin
          });
          const notFoundScript = `
    <script id="gulfaro-ssr-data">
      window.__ROUTE_NOT_FOUND__ = true;
      window.__REQUESTED_PATH__ = ${JSON.stringify(pathname)};
    </script>`;
          template = template.replace('</head>', `${notFoundScript}\n  </head>`);
        }
      } else if (pathname === '/categories') {
        template = applyServerSeoTags(template, {
          title: 'All 30 GCC Job Categories | Accounting, Engineering, IT, Healthcare & More | Gulfaro',
          description: 'Browse open employment vacancies across 30 GCC industries including Engineering, Healthcare, IT, Accounting, Construction, Logistics, Hospitality, and more.',
          canonicalPath: '/categories',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Job Categories', path: '/categories' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (categoryRouteMatch) {
        const slug = decodeURIComponent(categoryRouteMatch[1]);
        const catMeta = findCategoryMetaBySlug(slug);
        if (catMeta) {
          template = applyServerSeoTags(template, {
            title: `${catMeta.name} Jobs in Saudi Arabia, UAE & GCC | Gulfaro`,
            description: `${catMeta.summary} ${catMeta.overview}`.slice(0, 158),
            canonicalPath: `/category/${catMeta.slug}`,
            jsonLd: buildServerSeoGraph(
              origin,
              [
                buildServerBreadcrumbListNode(origin, [
                  { name: 'Home', path: '/' },
                  { name: 'Job Categories', path: '/categories' },
                  { name: catMeta.name, path: `/category/${catMeta.slug}` }
                ])
              ],
              siteSettings
            ),
            origin
          });
        } else {
          responseStatus = 404;
          template = applyServerSeoTags(template, {
            title: '404 – Job Category Not Found | Gulfaro',
            description: 'Explore GCC employment opportunities organized by industry category.',
            canonicalPath: pathname,
            robots: 'noindex, nofollow',
            jsonLd: null,
            origin
          });
          const notFoundScript = `
    <script id="gulfaro-ssr-data">
      window.__ROUTE_NOT_FOUND__ = true;
      window.__REQUESTED_PATH__ = ${JSON.stringify(pathname)};
    </script>`;
          template = template.replace('</head>', `${notFoundScript}\n  </head>`);
        }
      } else if (pathname === '/career-advice') {
        template = applyServerSeoTags(template, {
          title: 'GCC Career Advice, CV Writing & Interview Preparation Guides | Gulfaro',
          description: 'Original articles covering Gulf job search strategy, professional CV preparation, common interview questions, and GCC labor contract essentials.',
          canonicalPath: '/career-advice',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Career Advice', path: '/career-advice' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (articleRouteMatch) {
        const slug = decodeURIComponent(articleRouteMatch[1]);
        const article = CAREER_ARTICLES.find(a => a.slug === slug);
        if (article) {
          const articleUrl = `${origin}/career-advice/${article.slug}`;
          template = applyServerSeoTags(template, {
            title: `${article.title} | Gulfaro Career Advice`,
            description: article.summary.slice(0, 158),
            canonicalPath: `/career-advice/${article.slug}`,
            ogType: 'article',
            jsonLd: buildServerSeoGraph(
              origin,
              [
                buildServerBreadcrumbListNode(origin, [
                  { name: 'Home', path: '/' },
                  { name: 'Career Advice', path: '/career-advice' },
                  { name: article.title, path: `/career-advice/${article.slug}` }
                ]),
                {
                  '@type': 'Article',
                  '@id': `${articleUrl}#article`,
                  headline: article.title,
                  description: article.summary,
                  author: { '@type': 'Organization', name: 'Gulfaro Career Editorial Guide' },
                  publisher: { '@id': `${origin}/#organization` },
                  mainEntityOfPage: articleUrl
                }
              ],
              siteSettings
            ),
            origin
          });
        } else {
          responseStatus = 404;
          template = applyServerSeoTags(template, {
            title: '404 – Career Article Not Found | Gulfaro',
            description: 'Explore original GCC career advice, CV blueprints, and interview guides on Gulfaro.',
            canonicalPath: pathname,
            robots: 'noindex, nofollow',
            jsonLd: null,
            origin
          });
          const notFoundScript = `
    <script id="gulfaro-ssr-data">
      window.__ROUTE_NOT_FOUND__ = true;
      window.__REQUESTED_PATH__ = ${JSON.stringify(pathname)};
    </script>`;
          template = template.replace('</head>', `${notFoundScript}\n  </head>`);
        }
      } else if (pathname === '/about') {
        const aboutTitle = 'About Us — Gulfaro Direct GCC Job Portal & Hiring Standards';
        const aboutDescription =
          'Learn how Gulfaro connects employers and job seekers across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman with transparent hiring rules.';
        const visibleFaqs = (siteSettings?.cms?.faqs || [])
          .map((f: any) => ({
            question: String(f?.question || '').trim(),
            answer: String(f?.answer || '').trim()
          }))
          .filter((f: { question: string; answer: string }) => f.question && f.answer);

        const faqNode =
          visibleFaqs.length > 0
            ? {
                '@type': 'FAQPage',
                mainEntity: visibleFaqs.map((faq: { question: string; answer: string }) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: faq.answer
                  }
                }))
              }
            : null;

        template = applyServerSeoTags(template, {
          title: aboutTitle,
          description: aboutDescription,
          canonicalPath: '/about',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'About Us', path: '/about' }
              ]),
              {
                '@type': 'AboutPage',
                name: aboutTitle,
                description: aboutDescription
              },
              faqNode
            ],
            siteSettings
          ),
          origin
        });
      } else if (pathname === '/contact') {
        const contactTitle = 'Contact Us — Gulfaro Support & Trust Desk';
        const contactDescription =
          'Reach Gulfaro administration through our Contact Us page or submit an inquiry regarding job listings, employer verification, or privacy requests.';
        template = applyServerSeoTags(template, {
          title: contactTitle,
          description: contactDescription,
          canonicalPath: '/contact',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Contact Us', path: '/contact' }
              ]),
              {
                '@type': 'ContactPage',
                name: contactTitle,
                description: contactDescription
              }
            ],
            siteSettings
          ),
          origin
        });
      } else if (pathname === '/privacy-policy') {
        template = applyServerSeoTags(template, {
          title: 'Privacy Policy & Data Protection | Gulfaro',
          description: 'Read the Gulfaro Privacy Policy detailing data collection, GCC compliance, cookies, and Google AdSense advertising disclosures.',
          canonicalPath: '/privacy-policy',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Privacy Policy', path: '/privacy-policy' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (pathname === '/terms') {
        template = applyServerSeoTags(template, {
          title: 'Terms & Conditions | Gulfaro GCC Job Portal',
          description: 'Review Gulfaro Terms & Conditions governing job listings, prohibited candidate fees, and platform usage across the GCC.',
          canonicalPath: '/terms',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Terms & Conditions', path: '/terms' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (pathname === '/disclaimer') {
        template = applyServerSeoTags(template, {
          title: 'Legal & Editorial Disclaimer | Gulfaro',
          description: 'Read Gulfaro legal disclaimers regarding employer-published job advertisements, career guidance articles, and direct candidate communication.',
          canonicalPath: '/disclaimer',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Disclaimer', path: '/disclaimer' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (pathname === '/cookie-policy') {
        template = applyServerSeoTags(template, {
          title: 'Cookie Policy | Essential & Advertising Cookies | Gulfaro',
          description: 'Learn how Gulfaro uses essential storage, preferences, and Google AdSense advertising cookies, plus how to manage your browser settings.',
          canonicalPath: '/cookie-policy',
          jsonLd: buildServerSeoGraph(
            origin,
            [
              buildServerBreadcrumbListNode(origin, [
                { name: 'Home', path: '/' },
                { name: 'Cookie Policy', path: '/cookie-policy' }
              ])
            ],
            siteSettings
          ),
          origin
        });
      } else if (lowerPath === '/super-admin' || lowerPath.startsWith('/super-admin/') || privateSeoMap[lowerPath]) {
        const privateMeta =
          privateSeoMap[lowerPath] || privateSeoMap['/super-admin'];

        template = applyServerSeoTags(template, {
          title: privateMeta.title,
          description: privateMeta.description,
          canonicalPath: privateMeta.canonicalPath,
          robots: 'noindex, nofollow',
          jsonLd: null,
          origin
        });
      } else if (pathname === '/') {
        template = applyServerSeoTags(template, {
          title: 'Gulfaro – GCC Job Portal | Jobs in Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman',
          description: 'Find direct employer jobs across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman alongside original GCC CV writing, contract, and interview career guides.',
          canonicalPath: '/',
          jsonLd: buildServerSeoGraph(origin, [], siteSettings),
          origin
        });
      } else {
        responseStatus = 404;
        template = applyServerSeoTags(template, {
          title: '404 – Page Not Found | Gulfaro',
          description: 'The requested page could not be found on Gulfaro. Return to the homepage to browse active GCC job vacancies.',
          canonicalPath: pathname,
          robots: 'noindex, nofollow',
          jsonLd: null,
          origin
        });
        const notFoundScript = `
    <script id="gulfaro-ssr-data">
      window.__ROUTE_NOT_FOUND__ = true;
      window.__REQUESTED_PATH__ = ${JSON.stringify(pathname)};
    </script>`;
        template = template.replace('</head>', `${notFoundScript}\n  </head>`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
        Link: DISCOVERY_LINK_HEADER
      };
      if (responseStatus === 404) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }

      res
        .status(responseStatus)
        .set(headers)
        .vary('Accept')
        .end(template);
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
    if (isSmtpConfigured()) {
      verifySmtpConnection()
        .then(status => {
          if (status.ok) {
            console.log(`[Gulfaro SMTP] Verified connection via ${status.provider}`);
          } else {
            console.warn(`[Gulfaro SMTP] Startup verification failed: ${status.error}`);
          }
        })
        .catch(() => {});
    } else {
      console.log('[Gulfaro SMTP] Skipping startup check (SMTP environment variables not configured).');
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start Gulfaro server:', err);
  process.exit(1);
});
