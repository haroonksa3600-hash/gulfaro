import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  ALL_PERMISSIONS,
  AdminAccount,
  AdminPermission,
  AdminRole,
  generateBase32Secret,
  verifyTotpCode
} from './superAdminStore';
import { resolveJobCategoryId } from '../shared/jobCategories';
import {
  appendAuditLogEntry,
  appendAuthHistoryEntry,
  appendSystemErrorEntry,
  clearSystemErrors,
  deleteAdminById,
  deleteJobById,
  deleteUserById,
  forceLogoutAllUsersInStore,
  getAdminResetTokens,
  getAdminSessions,
  getAdmins,
  getApplications,
  getAuditLogs,
  getAuthHistory,
  getEmailLogs,
  getJobs,
  getMarketplaceConfig,
  getMonetization,
  getReports,
  getSiteSettings,
  getSystemErrors,
  getTrash,
  getUsers,
  saveAdmin,
  saveAdminResetTokens,
  saveAdminSessions,
  saveAllJobs,
  saveAllUsers,
  saveApplications,
  saveMarketplaceConfig,
  saveMonetization,
  saveReports,
  saveSiteSettings,
  saveTrash,
  saveUser,
  syncEmployerVerifiedOnJobs,
  upsertJob
} from './repository';
import {
  hashPassword,
  sendPlatformEmail,
  hashToken
} from './authService';

const SESSION_COOKIE_NAME = 'gulfaro_sa_session';
const SA_JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'gulfaro-super-admin-secret-key-2026';

// Pending 2FA Email OTP map: challengeId -> { codeHash, adminId, expiresAt }
const email2faOtpMap = new Map<string, { code: string; adminId: string; expiresAt: number }>();

interface AuthenticatedAdminRequest extends Request {
  admin?: AdminAccount;
  adminSessionId?: string;
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function getAppBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const fwdProto = req.headers['x-forwarded-proto'];
  const proto = fwdProto ? (Array.isArray(fwdProto) ? fwdProto[0] : fwdProto) : (req.secure ? 'https' : 'http');
  const fwdHost = req.headers['x-forwarded-host'];
  const host = fwdHost ? (Array.isArray(fwdHost) ? fwdHost[0] : fwdHost) : (req.headers.host || 'gulfaro.com');
  return `${proto}://${host}`;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

function setSessionCookie(res: Response, req: Request, token: string, rememberMe: boolean) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const maxAgeMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: maxAgeMs
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

function sanitizeAdmin(a: AdminAccount) {
  const { passwordHash: _ph, twoFactorSecret: _tfs, ...rest } = a;
  return rest;
}

function extractSessionToken(req: Request): string | null {
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE_NAME]) return cookies[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function createAdminSession(admin: AdminAccount, rememberMe: boolean, req: Request): Promise<{ rawToken: string; sessionId: string }> {
  const rawToken = crypto.randomBytes(36).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const maxAgeMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const sessionId = `sas-${now}-${crypto.randomBytes(4).toString('hex')}`;

  const existing = await getAdminSessions();
  const sessions = existing.filter(s => !s.revoked && s.expiresAt > now);
  sessions.unshift({
    id: sessionId,
    tokenHash,
    adminId: admin.id,
    rememberMe,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + maxAgeMs,
    ip: getClientIp(req),
    userAgent: (req.headers['user-agent'] || '').slice(0, 200),
    revoked: false
  });
  if (sessions.length > 200) sessions.length = 200;
  await saveAdminSessions(sessions);

  return { rawToken, sessionId };
}

export async function requireSuperAdmin(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
  try {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to the Super Admin portal.', code: 'UNAUTHENTICATED' });
    }

    const tokenHash = hashToken(rawToken);
    const sessions = await getAdminSessions();
    const sessionIdx = sessions.findIndex(s => s.tokenHash === tokenHash && !s.revoked);

    if (sessionIdx === -1) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session invalid or signed out. Please sign in again.', code: 'INVALID_SESSION' });
    }

    const session = sessions[sessionIdx];
    const now = Date.now();
    const settings = await getSiteSettings();
    const inactivityTimeoutMs = Math.max(5, settings.registration.adminSessionTimeoutMinutes || 15) * 60 * 1000;

    if (now > session.expiresAt) {
      sessions[sessionIdx].revoked = true;
      await saveAdminSessions([sessions[sessionIdx]]);
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session expired. Please sign in again.', code: 'SESSION_EXPIRED' });
    }

    if (now - session.lastActivityAt > inactivityTimeoutMs) {
      sessions[sessionIdx].revoked = true;
      await saveAdminSessions([sessions[sessionIdx]]);
      clearSessionCookie(res);
      return res.status(401).json({
        error: `Session locked after ${settings.registration.adminSessionTimeoutMinutes || 15} minutes of inactivity. Please sign in again.`,
        code: 'INACTIVITY_TIMEOUT'
      });
    }

    const admins = await getAdmins();
    const admin = admins.find(a => a.id === session.adminId);
    if (!admin || admin.status !== 'active') {
      sessions[sessionIdx].revoked = true;
      await saveAdminSessions([sessions[sessionIdx]]);
      clearSessionCookie(res);
      return res.status(403).json({ error: 'Administrator account is suspended or unavailable.', code: 'ADMIN_SUSPENDED' });
    }

    // Slide inactivity window
    sessions[sessionIdx].lastActivityAt = now;
    await saveAdminSessions([sessions[sessionIdx]]);

    req.admin = admin;
    req.adminSessionId = session.id;
    next();
  } catch (err: any) {
    console.error('[SuperAdmin Session Error]:', err);
    res.status(500).json({ error: 'Failed to verify administrator session.' });
  }
}

function hasPermission(admin: AdminAccount, permission: AdminPermission): boolean {
  if (admin.isOwner || admin.role === 'owner') return true;
  if (admin.permissions.includes('*')) return true;
  return admin.permissions.includes(permission);
}

export function requirePermission(permission: AdminPermission) {
  return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!hasPermission(req.admin, permission)) {
      return res.status(403).json({
        error: `Access denied. Required permission: ${permission}`
      });
    }
    next();
  };
}

function escapeCsvCell(val: any): string {
  const s = val === null || val === undefined ? '' : String(val);
  const safe = s.replace(/"/g, '""');
  return `"${safe}"`;
}

export function createSuperAdminRouter(): express.Router {
  const router = express.Router();

  // =========================================================================
  // 1. SUPER ADMIN AUTHENTICATION (Login, 2FA, Session, Logout, Password Reset)
  // =========================================================================

  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password, rememberMe } = req.body || {};
      const cleanUser = (username || '').toString().trim();
      const rawPassword = (password || '').toString();
      const ip = getClientIp(req);
      const userAgent = (req.headers['user-agent'] || '').slice(0, 200);

      if (!cleanUser || !rawPassword) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const admins = await getAdmins();
      const adminIdx = admins.findIndex(
        a => a.username.toLowerCase() === cleanUser.toLowerCase() || a.email.toLowerCase() === cleanUser.toLowerCase()
      );

      if (adminIdx === -1) {
        await bcrypt.compare(rawPassword, '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
        await appendAuthHistoryEntry({
          actorType: 'admin',
          emailOrUsername: cleanUser,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: 'Unknown admin username',
          suspicious: true
        });
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const admin = admins[adminIdx];
      const now = Date.now();

      if (admin.status !== 'active') {
        await appendAuthHistoryEntry({
          actorType: 'admin',
          actorId: admin.id,
          emailOrUsername: admin.username,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: 'Admin account suspended',
          suspicious: true
        });
        return res.status(403).json({ error: 'This administrator account has been suspended.' });
      }

      if (admin.lockoutUntil && admin.lockoutUntil > now) {
        const mins = Math.ceil((admin.lockoutUntil - now) / 60000);
        return res.status(429).json({
          error: `Too many failed login attempts. Account locked for ${mins} minute${mins === 1 ? '' : 's'}.`
        });
      }

      if (admin.lockoutUntil && admin.lockoutUntil <= now) {
        admin.failedAttempts = 0;
        admin.lockoutUntil = null;
      }

      const isValid = await bcrypt.compare(rawPassword, admin.passwordHash);
      if (!isValid) {
        const attempts = (admin.failedAttempts || 0) + 1;
        admin.failedAttempts = attempts;
        const maxAttempts = 5;
        const isSuspicious = attempts >= 3;

        if (attempts >= maxAttempts) {
          admin.lockoutUntil = now + 15 * 60 * 1000;
          await saveAdmin(admin);
          await appendAuthHistoryEntry({
            actorType: 'admin',
            actorId: admin.id,
            emailOrUsername: admin.username,
            event: 'lockout',
            success: false,
            ip,
            userAgent,
            reason: `Locked for 15 minutes after ${attempts} failed login attempts`,
            suspicious: true
          });
          await appendSystemErrorEntry({
            level: 'security',
            source: 'SuperAdminAuth',
            message: `Super Admin login lockout triggered for "${admin.username}" from IP ${ip}`
          });
          return res.status(429).json({
            error: 'Account locked for 15 minutes due to 5 failed login attempts.'
          });
        }

        await saveAdmin(admin);
        await appendAuthHistoryEntry({
          actorType: 'admin',
          actorId: admin.id,
          emailOrUsername: admin.username,
          event: 'login_failed',
          success: false,
          ip,
          userAgent,
          reason: `Wrong password (attempt ${attempts}/${maxAttempts})`,
          suspicious: isSuspicious
        });
        return res.status(401).json({
          error: `Invalid username or password. (${maxAttempts - attempts} attempts remaining before temporary lockout.)`
        });
      }

      // Reset failed attempt counters
      const previousIp = admin.lastLoginIp;
      admin.failedAttempts = 0;
      admin.lockoutUntil = null;
      await saveAdmin(admin);

      // Check 2FA requirement
      if (admin.twoFactorEnabled) {
        const challengeToken = jwt.sign(
          { sub: admin.id, purpose: 'sa-2fa', rememberMe: Boolean(rememberMe), ip },
          SA_JWT_SECRET,
          { expiresIn: '5m' }
        );

        if (admin.twoFactorMethod === 'email') {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          email2faOtpMap.set(admin.id, { code, adminId: admin.id, expiresAt: now + 5 * 60 * 1000 });
          await sendPlatformEmail({
            to: admin.email,
            subject: 'Gulfaro Super Admin 2FA Verification Code',
            category: 'security_alert',
            triggeredBy: admin.username,
            html: `<p>Your Super Admin 2-Factor verification code is: <strong style="font-size:20px;letter-spacing:4px;">${code}</strong></p><p>Valid for 5 minutes. Login IP: ${ip}</p>`
          });
        }

        return res.json({
          requiresTwoFactor: true,
          method: admin.twoFactorMethod,
          challengeToken,
          message:
            admin.twoFactorMethod === 'email'
              ? 'A 6-digit verification code has been sent to your registered admin email.'
              : 'Enter the 6-digit code from your Authenticator app.'
        });
      }

      // Finalize session
      admin.lastLoginAt = new Date().toISOString();
      admin.lastLoginIp = ip;
      await saveAdmin(admin);

      const { rawToken } = await createAdminSession(admin, Boolean(rememberMe), req);
      setSessionCookie(res, req, rawToken, Boolean(rememberMe));

      const suspiciousNewIp = Boolean(previousIp && previousIp !== ip);
      await appendAuthHistoryEntry({
        actorType: 'admin',
        actorId: admin.id,
        emailOrUsername: admin.username,
        event: 'login_success',
        success: true,
        ip,
        userAgent,
        reason: suspiciousNewIp ? `New login IP detected (prev: ${previousIp})` : undefined,
        suspicious: suspiciousNewIp
      });
      await appendAuditLogEntry({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'SUPER_ADMIN_LOGIN',
        targetType: 'session',
        details: `Authenticated into Super Admin Portal${rememberMe ? ' (Remember Me enabled)' : ''}`,
        ip
      });

      const settings = await getSiteSettings();
      res.json({
        success: true,
        token: rawToken,
        admin: sanitizeAdmin(admin),
        inactivityTimeoutMinutes: settings.registration.adminSessionTimeoutMinutes || 15
      });
    } catch (err: any) {
      console.error('[SuperAdmin Login Error]:', err);
      res.status(500).json({ error: 'Authentication service failed. Please try again.' });
    }
  });

  router.post('/auth/verify-2fa', async (req: Request, res: Response) => {
    try {
      const { challengeToken, code } = req.body || {};
      const ip = getClientIp(req);
      const userAgent = (req.headers['user-agent'] || '').slice(0, 200);

      if (!challengeToken || !code) {
        return res.status(400).json({ error: 'Verification challenge token and 6-digit code are required.' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(challengeToken, SA_JWT_SECRET);
      } catch {
        return res.status(401).json({ error: '2FA challenge expired. Please sign in again.' });
      }

      if (!decoded || decoded.purpose !== 'sa-2fa') {
        return res.status(401).json({ error: 'Invalid 2FA challenge token.' });
      }

      const admins = await getAdmins();
      const admin = admins.find(a => a.id === decoded.sub);
      if (!admin) {
        return res.status(401).json({ error: 'Administrator account not found.' });
      }

      let validCode = false;

      if (admin.twoFactorMethod === 'email') {
        const otpRecord = email2faOtpMap.get(admin.id);
        if (otpRecord && Date.now() <= otpRecord.expiresAt && otpRecord.code === String(code).trim()) {
          validCode = true;
          email2faOtpMap.delete(admin.id);
        }
      } else if (admin.twoFactorSecret) {
        validCode = verifyTotpCode(admin.twoFactorSecret, String(code));
      }

      if (!validCode) {
        await appendAuthHistoryEntry({
          actorType: 'admin',
          actorId: admin.id,
          emailOrUsername: admin.username,
          event: '2fa_failed',
          success: false,
          ip,
          userAgent,
          reason: 'Invalid 2FA verification code',
          suspicious: true
        });
        return res.status(401).json({ error: 'Invalid or expired 6-digit verification code.' });
      }

      admin.lastLoginAt = new Date().toISOString();
      admin.lastLoginIp = ip;
      await saveAdmin(admin);

      const { rawToken } = await createAdminSession(admin, Boolean(decoded.rememberMe), req);
      setSessionCookie(res, req, rawToken, Boolean(decoded.rememberMe));

      await appendAuthHistoryEntry({
        actorType: 'admin',
        actorId: admin.id,
        emailOrUsername: admin.username,
        event: 'login_success',
        success: true,
        ip,
        userAgent,
        reason: '2FA verified',
        suspicious: false
      });

      const settings = await getSiteSettings();
      res.json({
        success: true,
        token: rawToken,
        admin: sanitizeAdmin(admin),
        inactivityTimeoutMinutes: settings.registration.adminSessionTimeoutMinutes || 15
      });
    } catch {
      res.status(500).json({ error: '2FA verification failed.' });
    }
  });

  router.get('/auth/session', requireSuperAdmin, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const settings = await getSiteSettings();
      res.json({
        authenticated: true,
        admin: sanitizeAdmin(req.admin!),
        inactivityTimeoutMinutes: settings.registration.adminSessionTimeoutMinutes || 15
      });
    } catch {
      res.status(500).json({ error: 'Failed to load session metadata.' });
    }
  });

  router.post('/auth/logout', async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const rawToken = extractSessionToken(req);
      if (rawToken) {
        const tokenHash = hashToken(rawToken);
        const sessions = await getAdminSessions();
        const idx = sessions.findIndex(s => s.tokenHash === tokenHash);
        if (idx > -1) {
          sessions[idx].revoked = true;
          await saveAdminSessions([sessions[idx]]);
        }
      }
      clearSessionCookie(res);
      res.json({ success: true });
    } catch {
      clearSessionCookie(res);
      res.json({ success: true });
    }
  });

  // =========================================================================
  // Protect ALL routes below this point
  // =========================================================================
  router.use(requireSuperAdmin);

  // =========================================================================
  // 2. SECTION 1 & 9: OVERVIEW + ANALYTICS + CSV EXPORTS
  // =========================================================================

  router.get('/overview', requirePermission('overview'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [users, jobs, applications, reports, auditLogs, authHistory, settings, monetization] = await Promise.all([
        getUsers(),
        getJobs(),
        getApplications(),
        getReports(),
        getAuditLogs(),
        getAuthHistory(),
        getSiteSettings(),
        getMonetization()
      ]);

      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      const jobSeekers = users.filter(u => u.role === 'job_seeker');
      const employers = users.filter(u => u.role === 'employer');
      const verifiedEmployers = employers.filter(u => u.emailVerified);
      const suspendedUsers = users.filter(u => u.status === 'suspended' || u.status === 'banned');

      const activeJobs = jobs.filter(j => j.status === 'active');
      const featuredJobs = jobs.filter(j => j.isFeatured);
      const urgentJobs = jobs.filter(j => j.isUrgent);
      const hiddenJobs = jobs.filter(j => j.status === 'hidden' || j.status === 'rejected');
      const closedJobs = jobs.filter(j => j.status === 'closed');
      const expiredJobs = jobs.filter(j => j.status === 'expired' || (j.expiresAt && new Date(j.expiresAt).getTime() < now));

      const newRegsToday = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= todayMs).length;
      const jobsToday = jobs.filter(j => j.postedAt && new Date(j.postedAt).getTime() >= todayMs).length;
      const appsToday = applications.filter(a => a.appliedAt && new Date(a.appliedAt).getTime() >= todayMs).length;
      const openReports = reports.filter(r => r.status === 'open' || r.status === 'investigating');
      const suspiciousAlerts = authHistory.filter(h => h.suspicious).slice(0, 20);
      const totalJobViews = jobs.reduce((sum, j) => sum + (Number(j.viewsCount) || 0), 0);
      const totalInquiries = jobs.reduce((sum, j) => sum + (Number(j.inquiriesCount) || 0), 0);

      const days: Array<{ date: string; label: string; registrations: number; jobs: number; applications: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(todayMs - i * 86400000);
        const isoPrefix = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        days.push({
          date: isoPrefix,
          label,
          registrations: users.filter(u => (u.createdAt || '').startsWith(isoPrefix)).length,
          jobs: jobs.filter(j => (j.postedAt || '').startsWith(isoPrefix)).length,
          applications: applications.filter(a => (a.appliedAt || '').startsWith(isoPrefix)).length
        });
      }

      const jobsByCountry: Record<string, number> = {};
      const jobsByCategory: Record<string, number> = {};
      const usersByCountry: Record<string, number> = {};

      for (const j of jobs) {
        const c = j.country || 'unknown';
        jobsByCountry[c] = (jobsByCountry[c] || 0) + 1;
        const cat = resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory });
        jobsByCategory[cat] = (jobsByCategory[cat] || 0) + 1;
      }
      for (const u of users) {
        const c = u.country || 'unknown';
        usersByCountry[c] = (usersByCountry[c] || 0) + 1;
      }

      const totalRevenue = monetization.transactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      res.json({
        kpis: {
          totalUsers: users.length,
          totalJobSeekers: jobSeekers.length,
          totalEmployers: employers.length,
          verifiedEmployers: verifiedEmployers.length,
          suspendedUsers: suspendedUsers.length,
          totalJobs: jobs.length,
          activeJobs: activeJobs.length,
          featuredJobs: featuredJobs.length,
          urgentJobs: urgentJobs.length,
          hiddenJobs: hiddenJobs.length,
          closedJobs: closedJobs.length,
          expiredJobs: expiredJobs.length,
          totalApplications: applications.length,
          totalJobViews,
          totalInquiries,
          newRegistrationsToday: newRegsToday,
          jobsPostedToday: jobsToday,
          applicationsToday: appsToday,
          openReportsCount: openReports.length,
          totalReportsCount: reports.length,
          suspiciousAlertsCount: suspiciousAlerts.length,
          totalRevenue
        },
        timeline14Days: days,
        jobsByCountry,
        jobsByCategory,
        usersByCountry,
        recentAuditLogs: auditLogs.slice(0, 15),
        recentReports: reports.slice(0, 8),
        suspiciousLogins: suspiciousAlerts.slice(0, 8),
        emergencyStatus: settings.emergency
      });
    } catch (err: any) {
      console.error('[SuperAdmin Overview Error]:', err);
      res.status(500).json({ error: 'Failed to load overview metrics.' });
    }
  });

  router.get('/export/:dataset', requirePermission('analytics'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { dataset } = req.params;
      let csv = '';
      const filename = `gulfaro-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;

      if (dataset === 'users' || dataset === 'employers') {
        const users = (await getUsers()).filter(u => (dataset === 'employers' ? u.role === 'employer' : true));
        const headers = ['ID', 'Name', 'Email', 'Role', 'Company', 'Country', 'City', 'Phone', 'EmailVerified', 'Status', 'CreatedAt'];
        const rows = users.map(u =>
          [u.id, u.name, u.email, u.role, u.companyName || '', u.country || '', u.city || '', u.phone || '', Boolean(u.emailVerified), u.status || 'active', u.createdAt]
            .map(escapeCsvCell)
            .join(',')
        );
        csv = [headers.join(','), ...rows].join('\n');
      } else if (dataset === 'jobs') {
        const jobs = await getJobs();
        const headers = ['ID', 'Title', 'Company', 'Country', 'City', 'Category', 'Status', 'Package', 'Featured', 'Urgent', 'Views', 'Inquiries', 'PostedAt', 'ExpiresAt'];
        const rows = jobs.map(j =>
          [j.id, j.title, j.company, j.country, j.city, j.category, j.status, j.packageType, Boolean(j.isFeatured), Boolean(j.isUrgent), j.viewsCount || 0, j.inquiriesCount || 0, j.postedAt, j.expiresAt]
            .map(escapeCsvCell)
            .join(',')
        );
        csv = [headers.join(','), ...rows].join('\n');
      } else if (dataset === 'applications') {
        const apps = await getApplications();
        const headers = ['ID', 'JobID', 'JobTitle', 'Company', 'ApplicantName', 'ApplicantEmail', 'Phone', 'Country', 'City', 'Iqama', 'Experience', 'Status', 'AppliedAt'];
        const rows = apps.map(a =>
          [a.id, a.jobId, a.jobTitle, a.companyName, a.applicantName, a.applicantEmail, a.applicantPhone, a.currentCountry, a.currentCity, a.iqamaStatus, a.yearsExperience, a.status, a.appliedAt]
            .map(escapeCsvCell)
            .join(',')
        );
        csv = [headers.join(','), ...rows].join('\n');
      } else if (dataset === 'reports') {
        const reports = await getReports();
        const headers = ['ID', 'TargetType', 'TargetID', 'TargetTitle', 'Category', 'Reason', 'ReporterEmail', 'Status', 'ActionTaken', 'CreatedAt'];
        const rows = reports.map(r =>
          [r.id, r.targetType, r.targetId, r.targetTitle, r.category, r.reason, r.reporterEmail, r.status, r.actionTaken || '', r.createdAt]
            .map(escapeCsvCell)
            .join(',')
        );
        csv = [headers.join(','), ...rows].join('\n');
      } else if (dataset === 'audit_logs') {
        const logs = await getAuditLogs();
        const headers = ['ID', 'AdminUsername', 'Action', 'TargetType', 'TargetID', 'Details', 'IP', 'CreatedAt'];
        const rows = logs.map(l =>
          [l.id, l.adminUsername, l.action, l.targetType, l.targetId || '', l.details, l.ip, l.createdAt].map(escapeCsvCell).join(',')
        );
        csv = [headers.join(','), ...rows].join('\n');
      } else {
        return res.status(400).json({ error: 'Unknown export dataset.' });
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'EXPORT_CSV',
        targetType: dataset,
        details: `Exported ${dataset} dataset to CSV`,
        ip: getClientIp(req)
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch {
      res.status(500).json({ error: 'Failed to export dataset.' });
    }
  });

  // =========================================================================
  // 3. SECTION 2 & 3: USERS & EMPLOYERS MANAGEMENT
  // =========================================================================

  router.get('/users', requirePermission('users'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [users, applications, jobs, authHistory] = await Promise.all([
        getUsers(),
        getApplications(),
        getJobs(),
        getAuthHistory()
      ]);

      const enriched = users.map(u => {
        const { password: _p, passwordHash: _ph, accessKeyHash: _ak, ...safe } = u;
        const userJobs = jobs.filter(
          j => j.userId === u.id || (j.contactEmail && j.contactEmail.toLowerCase() === u.email.toLowerCase())
        );
        const userApps = applications.filter(
          a => a.applicantUserId === u.id || (a.applicantEmail && a.applicantEmail.toLowerCase() === u.email.toLowerCase())
        );
        const userLogins = authHistory.filter(h => h.emailOrUsername.toLowerCase() === u.email.toLowerCase()).slice(0, 15);
        return {
          ...safe,
          status: u.status || 'active',
          jobsPostedCount: userJobs.length,
          applicationsCount: userApps.length,
          recentLogins: userLogins,
          applicationsList: userApps.slice(0, 20),
          jobsList: userJobs.slice(0, 20)
        };
      });

      res.json({ users: enriched });
    } catch {
      res.status(500).json({ error: 'Failed to load users list.' });
    }
  });

  router.post('/users', requirePermission('users'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { name, email, password, role, phone, country, city, companyName, hiringOrgName, professionalTitle, emailVerified } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!name || !cleanEmail || !password || password.length < 8) {
        return res.status(400).json({ error: 'Name, valid email, and password (min 8 chars) are required.' });
      }
      const users = await getUsers();
      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }

      const validRole = role === 'employer' ? 'employer' : 'job_seeker';
      const newUser: any = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        email: cleanEmail,
        role: validRole,
        phone: (phone || '+966 50 000 0000').trim(),
        whatsapp: (phone || '+966 50 000 0000').trim(),
        country: country || 'saudi-arabia',
        city: city || 'Riyadh',
        professionalTitle: validRole === 'job_seeker' ? (professionalTitle || 'Professional').trim() : undefined,
        companyName: validRole === 'employer' ? (companyName || name).trim() : undefined,
        hiringOrgName: validRole === 'employer' ? (hiringOrgName || companyName || name).trim() : undefined,
        headline: validRole === 'job_seeker' ? (professionalTitle || 'GCC Candidate') : `Recruiter at ${companyName || name}`,
        passwordHash: hashPassword(password),
        status: 'active',
        emailVerified: Boolean(emailVerified),
        emailVerifiedAt: emailVerified ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString()
      };

      await saveUser(newUser);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'CREATE_USER',
        targetType: validRole,
        targetId: newUser.id,
        details: `Created ${validRole} account for ${cleanEmail}`,
        ip: getClientIp(req)
      });

      const { passwordHash: _ph, ...safe } = newUser;
      res.status(201).json({ success: true, user: safe });
    } catch {
      res.status(500).json({ error: 'Failed to create user.' });
    }
  });

  router.patch('/users/:id', requirePermission('users'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const users = await getUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return res.status(404).json({ error: 'User account not found.' });

      const target = users[idx];
      const allowedFields = [
        'name',
        'email',
        'phone',
        'whatsapp',
        'country',
        'city',
        'role',
        'companyName',
        'hiringOrgName',
        'companyType',
        'professionalTitle',
        'headline',
        'bio',
        'status',
        'suspensionReason',
        'emailVerified',
        'postingRestricted',
        'isFeaturedEmployer'
      ];

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          (users[idx] as any)[key] = updates[key];
        }
      }

      if (updates.emailVerified === true && !users[idx].emailVerifiedAt) {
        users[idx].emailVerifiedAt = new Date().toISOString();
      }
      if (updates.emailVerified === false) {
        users[idx].emailVerifiedAt = undefined;
      }

      if (updates.newPassword && String(updates.newPassword).length >= 8) {
        users[idx].password = undefined;
        users[idx].passwordHash = hashPassword(String(updates.newPassword));
        users[idx].failedAttempts = 0;
        users[idx].lockoutUntil = null;
      }

      if (updates.forceLogout) {
        users[idx].forceLogoutBefore = Date.now();
      }

      await saveUser(users[idx]);

      if (updates.emailVerified !== undefined) {
        await syncEmployerVerifiedOnJobs(target.id, target.email, Boolean(updates.emailVerified));
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: updates.status ? `USER_STATUS_${String(updates.status).toUpperCase()}` : 'UPDATE_USER',
        targetType: target.role,
        targetId: target.id,
        details: `Updated ${target.email} (${Object.keys(updates).join(', ')})`,
        ip: getClientIp(req)
      });

      const { password: _p, passwordHash: _ph, accessKeyHash: _ak, ...safe } = users[idx];
      res.json({ success: true, user: safe });
    } catch {
      res.status(500).json({ error: 'Failed to update user.' });
    }
  });

  router.post('/users/:id/send-reset-link', requirePermission('users'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const users = await getUsers();
      const user = users.find(u => u.id === id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { sendRealPasswordResetEmail } = await import('./authService');
      const result = await sendRealPasswordResetEmail(user.email, getAppBaseUrl(req), getClientIp(req));
      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'TRIGGER_USER_RESET_EMAIL',
        targetType: 'user',
        targetId: user.id,
        details: `Dispatched password reset link to ${user.email}: ${result.success ? 'accepted' : result.message}`,
        ip: getClientIp(req)
      });

      if (!result.success) return res.status(400).json({ error: result.message });
      res.json({ success: true, message: result.message });
    } catch {
      res.status(500).json({ error: 'Failed to send password reset email.' });
    }
  });

  router.delete('/users/:id', requirePermission('users'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const permanent = req.query.permanent === 'true';
      const users = await getUsers();
      const target = users.find(u => u.id === id);
      if (!target) return res.status(404).json({ error: 'User not found.' });

      if (target.email.toLowerCase() === req.admin!.email.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot delete the active Super Admin email record.' });
      }

      await deleteUserById(target.id);

      if (!permanent) {
        const trash = await getTrash();
        trash.unshift({
          trashId: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          itemType: 'user',
          originalId: target.id,
          label: `${target.name} (${target.email})`,
          deletedBy: req.admin!.username,
          deletedAt: new Date().toISOString(),
          payload: target
        });
        await saveTrash(trash);
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: permanent ? 'PERMANENT_DELETE_USER' : 'SOFT_DELETE_USER',
        targetType: target.role,
        targetId: target.id,
        details: `${permanent ? 'Permanently deleted' : 'Moved to Trash'} user ${target.email}`,
        ip: getClientIp(req)
      });

      res.json({ success: true, movedToTrash: !permanent });
    } catch {
      res.status(500).json({ error: 'Failed to delete user.' });
    }
  });

  // =========================================================================
  // 4. SECTION 4: JOBS MANAGEMENT (Post-Publish Control & Automatic Publishing)
  // =========================================================================

  router.get('/jobs', requirePermission('jobs'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [jobs, reports] = await Promise.all([getJobs(), getReports()]);
      const enriched = jobs.map(j => {
        const jobReports = reports.filter(r => r.targetType === 'job' && r.targetId === j.id);
        return {
          ...j,
          reportsCount: jobReports.length,
          openReportsCount: jobReports.filter(r => r.status === 'open' || r.status === 'investigating').length
        };
      });
      res.json({ jobs: enriched });
    } catch {
      res.status(500).json({ error: 'Failed to load jobs.' });
    }
  });

  router.post('/jobs', requirePermission('jobs'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const adData = req.body || {};
      if (!adData.title || !adData.company || !adData.description) {
        return res.status(400).json({ error: 'Job title, company name, and description are required.' });
      }
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const id = adData.id || `GF-${randNum}`;
      const cleanTitle = adData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 45);
      const cleanCity = (adData.city || 'gcc').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const newJob = {
        ...adData,
        id,
        slug: `${cleanTitle}-${cleanCity}-${randNum}`,
        postedAt: now.toISOString(),
        expiresAt: adData.expiresAt || expiry.toISOString(),
        viewsCount: 0,
        inquiriesCount: 0,
        status: adData.status || 'active',
        packageType: adData.packageType || (adData.isFeatured ? 'featured' : 'standard'),
        isFeatured: Boolean(adData.isFeatured),
        isUrgent: Boolean(adData.isUrgent),
        userId: adData.userId || req.admin!.id,
        isEmployerVerified: adData.isEmployerVerified ?? true
      };

      await upsertJob(newJob);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'ADMIN_CREATE_JOB',
        targetType: 'job',
        targetId: newJob.id,
        details: `Created job "${newJob.title}" at ${newJob.company}`,
        ip: getClientIp(req)
      });

      res.status(201).json({ success: true, job: newJob });
    } catch {
      res.status(500).json({ error: 'Failed to create job.' });
    }
  });

  router.patch('/jobs/:id', requirePermission('jobs'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const jobs = await getJobs();
      const existing = jobs.find(j => j.id && j.id.toLowerCase() === id.toLowerCase());
      if (!existing) return res.status(404).json({ error: 'Job not found.' });

      const nextJob = { ...existing };
      if (updates.extendDays) {
        const days = Number(updates.extendDays) || 30;
        const base = Math.max(Date.now(), new Date(nextJob.expiresAt || Date.now()).getTime());
        nextJob.expiresAt = new Date(base + days * 86400000).toISOString();
        if (nextJob.status === 'expired') nextJob.status = 'active';
        delete updates.extendDays;
      }

      const finalJob = { ...nextJob, ...updates };
      await upsertJob(finalJob);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'ADMIN_UPDATE_JOB',
        targetType: 'job',
        targetId: finalJob.id,
        details: `Updated job "${finalJob.title}" (${Object.keys(updates).join(', ') || 'extended expiry'})`,
        ip: getClientIp(req)
      });

      res.json({ success: true, job: finalJob });
    } catch {
      res.status(500).json({ error: 'Failed to update job.' });
    }
  });

  router.post('/jobs/bulk', requirePermission('jobs'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { ids, action } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0 || !action) {
        return res.status(400).json({ error: 'Job IDs array and bulk action are required.' });
      }
      const idSet = new Set(ids.map((x: string) => String(x).toLowerCase()));
      let jobs = await getJobs();
      const trash = await getTrash();
      let affected = 0;

      if (action === 'delete') {
        const kept: any[] = [];
        for (const j of jobs) {
          if (idSet.has(String(j.id).toLowerCase())) {
            affected++;
            trash.unshift({
              trashId: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              itemType: 'job',
              originalId: j.id,
              label: `${j.title} — ${j.company}`,
              deletedBy: req.admin!.username,
              deletedAt: new Date().toISOString(),
              payload: j
            });
            await deleteJobById(j.id);
          } else {
            kept.push(j);
          }
        }
        await saveTrash(trash);
      } else {
        const modified: any[] = [];
        jobs = jobs.map(j => {
          if (!idSet.has(String(j.id).toLowerCase())) return j;
          affected++;
          let next = j;
          if (action === 'hide') next = { ...j, status: 'hidden' };
          else if (action === 'activate') next = { ...j, status: 'active' };
          else if (action === 'close') next = { ...j, status: 'closed' };
          else if (action === 'feature') next = { ...j, isFeatured: true, packageType: 'featured' };
          else if (action === 'unfeature') next = { ...j, isFeatured: false, packageType: 'standard' };
          modified.push(next);
          return next;
        });
        await saveAllJobs(modified.length > 0 ? modified : jobs);
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: `BULK_JOBS_${String(action).toUpperCase()}`,
        targetType: 'job',
        details: `Applied "${action}" to ${affected} jobs`,
        ip: getClientIp(req)
      });

      res.json({ success: true, affected });
    } catch {
      res.status(500).json({ error: 'Bulk job operation failed.' });
    }
  });

  router.delete('/jobs/:id', requirePermission('jobs'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const permanent = req.query.permanent === 'true';
      const jobs = await getJobs();
      const target = jobs.find(j => j.id && j.id.toLowerCase() === id.toLowerCase());
      if (!target) return res.status(404).json({ error: 'Job not found.' });

      await deleteJobById(target.id);

      if (!permanent) {
        const trash = await getTrash();
        trash.unshift({
          trashId: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          itemType: 'job',
          originalId: target.id,
          label: `${target.title} — ${target.company}`,
          deletedBy: req.admin!.username,
          deletedAt: new Date().toISOString(),
          payload: target
        });
        await saveTrash(trash);
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: permanent ? 'PERMANENT_DELETE_JOB' : 'SOFT_DELETE_JOB',
        targetType: 'job',
        targetId: target.id,
        details: `${permanent ? 'Permanently deleted' : 'Moved to Trash'} job "${target.title}"`,
        ip: getClientIp(req)
      });

      res.json({ success: true, movedToTrash: !permanent });
    } catch {
      res.status(500).json({ error: 'Failed to delete job.' });
    }
  });

  // =========================================================================
  // 5. SECTION 5: REGISTRATION & AUTH SETTINGS + LOGIN HISTORY + SESSIONS
  // =========================================================================

  router.get('/auth-settings', requirePermission('auth_settings'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [settings, history, sessions] = await Promise.all([
        getSiteSettings(),
        getAuthHistory(),
        getAdminSessions()
      ]);
      const adminSessions = sessions
        .filter(s => !s.revoked && s.expiresAt > Date.now())
        .map(({ tokenHash: _th, ...rest }) => rest);

      res.json({
        registration: settings.registration,
        authHistory: history.slice(0, 250),
        activeAdminSessions: adminSessions
      });
    } catch {
      res.status(500).json({ error: 'Failed to load authentication settings.' });
    }
  });

  router.put('/auth-settings', requirePermission('auth_settings'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const settings = await getSiteSettings();
      settings.registration = {
        ...settings.registration,
        ...(req.body || {})
      };
      await saveSiteSettings(settings);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_AUTH_SETTINGS',
        targetType: 'settings',
        details: 'Updated registration, CAPTCHA, spam protection, or rate-limit settings',
        ip: getClientIp(req)
      });

      res.json({ success: true, registration: settings.registration });
    } catch {
      res.status(500).json({ error: 'Failed to update auth settings.' });
    }
  });

  router.post('/sessions/force-logout-all-users', requirePermission('auth_settings'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const cutoff = Date.now();
      const count = await forceLogoutAllUsersInStore(cutoff);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'FORCE_LOGOUT_ALL_USERS',
        targetType: 'session',
        details: `Forced session invalidation for ${count} user accounts`,
        ip: getClientIp(req)
      });

      res.json({ success: true, count });
    } catch {
      res.status(500).json({ error: 'Failed to force logout user sessions.' });
    }
  });

  router.post('/sessions/revoke-admin/:sessionId', requirePermission('auth_settings'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      if (sessionId === req.adminSessionId) {
        return res.status(400).json({ error: 'Cannot revoke your current active session. Use Logout instead.' });
      }
      const sessions = await getAdminSessions();
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx === -1) return res.status(404).json({ error: 'Session not found.' });

      sessions[idx].revoked = true;
      await saveAdminSessions([sessions[idx]]);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'REVOKE_ADMIN_SESSION',
        targetType: 'session',
        targetId: sessionId,
        details: `Terminated admin session ${sessionId}`,
        ip: getClientIp(req)
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to revoke admin session.' });
    }
  });

  // =========================================================================
  // 6. SECTION 6: EMAIL & NOTIFICATION SYSTEM
  // =========================================================================

  router.get('/emails', requirePermission('emails'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [settings, logs] = await Promise.all([getSiteSettings(), getEmailLogs()]);
      const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
      const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

      res.json({
        emailConfig: settings.emailConfig,
        providerStatus: {
          activeProvider: hasResend ? 'Resend API (Configured)' : hasSmtp ? `SMTP (${process.env.SMTP_HOST})` : 'Not Configured',
          resendConfigured: hasResend,
          smtpConfigured: hasSmtp,
          fromEnv: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'security@gulfaro.com'
        },
        logs: logs.slice(0, 250)
      });
    } catch {
      res.status(500).json({ error: 'Failed to load email logs and configuration.' });
    }
  });

  router.put('/emails/settings', requirePermission('emails'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const settings = await getSiteSettings();
      settings.emailConfig = {
        ...settings.emailConfig,
        ...(req.body || {})
      };
      await saveSiteSettings(settings);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_EMAIL_SETTINGS',
        targetType: 'email',
        details: 'Updated sender configuration and email templates',
        ip: getClientIp(req)
      });

      res.json({ success: true, emailConfig: settings.emailConfig });
    } catch {
      res.status(500).json({ error: 'Failed to update email settings.' });
    }
  });

  router.post('/emails/send-announcement', requirePermission('emails'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { audience, specificEmail, subject, message } = req.body || {};
      if (!subject || !message) {
        return res.status(400).json({ error: 'Email subject and message body are required.' });
      }

      const users = await getUsers();
      let recipients: string[] = [];

      if (audience === 'specific') {
        const clean = (specificEmail || '').trim().toLowerCase();
        if (!clean || !clean.includes('@')) {
          return res.status(400).json({ error: 'Please enter a valid recipient email address.' });
        }
        recipients = [clean];
      } else if (audience === 'job_seekers') {
        recipients = users.filter(u => u.role === 'job_seeker' && u.status !== 'banned').map(u => u.email.toLowerCase());
      } else if (audience === 'employers') {
        recipients = users.filter(u => u.role === 'employer' && u.status !== 'banned').map(u => u.email.toLowerCase());
      } else {
        recipients = users.filter(u => u.status !== 'banned' && u.role !== 'admin').map(u => u.email.toLowerCase());
      }

      recipients = Array.from(new Set(recipients)).slice(0, 100);
      if (recipients.length === 0) {
        return res.status(400).json({ error: 'No matching recipients found for selected audience.' });
      }

      const safeMessageHtml = String(message).replace(/\n/g, '<br/>');
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;color:#ffffff;padding:20px 24px;border-bottom:3px solid #0d9488;">
            <strong style="font-size:18px;letter-spacing:1px;">GULFARO</strong>
            <span style="color:#5eead4;font-size:11px;margin-left:8px;">OFFICIAL ANNOUNCEMENT</span>
          </div>
          <div style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6;">
            ${safeMessageHtml}
          </div>
          <div style="background:#f8fafc;padding:16px 24px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
            Gulfaro GCC Job Classifieds · Official Platform Communication
          </div>
        </div>
      `;

      let sent = 0;
      let failed = 0;
      let lastError = '';

      for (const to of recipients) {
        const result = await sendPlatformEmail({
          to,
          subject: subject.trim(),
          html,
          category: 'announcement',
          triggeredBy: req.admin!.username
        });
        if (result.success) sent++;
        else {
          failed++;
          lastError = result.error || lastError;
        }
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'SEND_ANNOUNCEMENT_EMAIL',
        targetType: 'email',
        details: `Audience: ${audience}. Sent: ${sent}, Failed: ${failed}`,
        ip: getClientIp(req)
      });

      res.json({
        success: sent > 0,
        sent,
        failed,
        total: recipients.length,
        error: sent === 0 ? lastError || 'All deliveries failed.' : undefined
      });
    } catch {
      res.status(500).json({ error: 'Failed to dispatch announcement emails.' });
    }
  });

  // =========================================================================
  // 7. SECTION 7: REPORTS & COMPLAINTS
  // =========================================================================

  router.get('/reports', requirePermission('reports'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      res.json({ reports: await getReports() });
    } catch {
      res.status(500).json({ error: 'Failed to load reports.' });
    }
  });

  router.patch('/reports/:id', requirePermission('reports'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, actionTaken, quickAction } = req.body || {};
      const reports = await getReports();
      const idx = reports.findIndex(r => r.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Report not found.' });

      const report = reports[idx];

      if (quickAction === 'hide_job' && report.targetType === 'job') {
        const jobs = await getJobs();
        const targetJob = jobs.find(j => j.id.toLowerCase() === report.targetId.toLowerCase());
        if (targetJob) {
          await upsertJob({ ...targetJob, status: 'hidden', rejectionReason: actionTaken || 'Hidden via report moderation' });
        }
      } else if (quickAction === 'delete_job' && report.targetType === 'job') {
        const jobs = await getJobs();
        const jobToDelete = jobs.find(j => j.id.toLowerCase() === report.targetId.toLowerCase());
        if (jobToDelete) {
          await deleteJobById(jobToDelete.id);
          const trash = await getTrash();
          trash.unshift({
            trashId: `tr-${Date.now()}`,
            itemType: 'job',
            originalId: jobToDelete.id,
            label: `${jobToDelete.title} — ${jobToDelete.company}`,
            deletedBy: req.admin!.username,
            deletedAt: new Date().toISOString(),
            payload: jobToDelete
          });
          await saveTrash(trash);
        }
      } else if (quickAction === 'suspend_target') {
        const users = await getUsers();
        for (const u of users) {
          if (
            u.id === report.targetId ||
            u.id === report.targetOwnerId ||
            u.email.toLowerCase() === report.targetId.toLowerCase()
          ) {
            await saveUser({ ...u, status: 'suspended' as const, suspensionReason: actionTaken || report.reason });
          }
        }
      }

      reports[idx] = {
        ...report,
        status: status || 'resolved',
        actionTaken: actionTaken || report.actionTaken,
        resolvedBy: req.admin!.username,
        resolvedAt: new Date().toISOString()
      };
      await saveReports(reports);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'MODERATE_REPORT',
        targetType: 'report',
        targetId: report.id,
        details: `Report ${report.id} set to ${reports[idx].status}${quickAction ? ` (${quickAction})` : ''}`,
        ip: getClientIp(req)
      });

      res.json({ success: true, report: reports[idx] });
    } catch {
      res.status(500).json({ error: 'Failed to moderate report.' });
    }
  });

  // =========================================================================
  // 8. SECTION 8: WEBSITE CONTENT & SETTINGS (CMS + AdSense)
  // =========================================================================

  router.get('/cms', requirePermission('cms'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const settings = await getSiteSettings();
      res.json({ cms: settings.cms, adsense: settings.adsense });
    } catch {
      res.status(500).json({ error: 'Failed to load CMS configuration.' });
    }
  });

  router.put('/cms', requirePermission('cms'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { cms, adsense } = req.body || {};
      const settings = await getSiteSettings();
      if (cms) {
        settings.cms = {
          ...settings.cms,
          ...cms,
          announcementBanner: {
            ...settings.cms.announcementBanner,
            ...(cms.announcementBanner || {})
          }
        };
      }
      if (adsense) {
        settings.adsense = {
          ...settings.adsense,
          ...adsense,
          slots: {
            ...settings.adsense.slots,
            ...(adsense.slots || {})
          }
        };
      }
      await saveSiteSettings(settings);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_WEBSITE_CMS',
        targetType: 'cms',
        details: 'Updated website content, banners, pages, or AdSense configuration',
        ip: getClientIp(req)
      });

      res.json({ success: true, cms: settings.cms, adsense: settings.adsense });
    } catch {
      res.status(500).json({ error: 'Failed to save CMS settings.' });
    }
  });

  // =========================================================================
  // 9. SECTION 10: REVENUE, SUBSCRIPTIONS & PAYMENTS
  // =========================================================================

  router.get('/monetization', requirePermission('monetization'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      res.json(await getMonetization());
    } catch {
      res.status(500).json({ error: 'Failed to load monetization configuration.' });
    }
  });

  router.put('/monetization', requirePermission('monetization'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const current = await getMonetization();
      const updated = {
        ...current,
        ...(req.body || {}),
        plans: Array.isArray(req.body?.plans) ? req.body.plans : current.plans,
        transactions: Array.isArray(req.body?.transactions) ? req.body.transactions : current.transactions
      };
      await saveMonetization(updated);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_MONETIZATION',
        targetType: 'monetization',
        details: `Updated pricing plans / payment collection (${updated.paymentCollectionEnabled ? 'ON' : 'OFF'})`,
        ip: getClientIp(req)
      });

      res.json({ success: true, monetization: updated });
    } catch {
      res.status(500).json({ error: 'Failed to update monetization settings.' });
    }
  });

  router.post('/monetization/refund/:txId', requirePermission('monetization'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { txId } = req.params;
      const monetization = await getMonetization();
      const idx = monetization.transactions.findIndex(t => t.id === txId);
      if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });

      monetization.transactions[idx].status = 'refunded';
      monetization.transactions[idx].refundedAt = new Date().toISOString();
      await saveMonetization(monetization);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'REFUND_TRANSACTION',
        targetType: 'transaction',
        targetId: txId,
        details: `Marked transaction ${txId} as refunded`,
        ip: getClientIp(req)
      });

      res.json({ success: true, transaction: monetization.transactions[idx] });
    } catch {
      res.status(500).json({ error: 'Failed to refund transaction.' });
    }
  });

  // =========================================================================
  // 10. SECTION 11: COUNTRY, CITY, CATEGORY & JOB SETTINGS
  // =========================================================================

  router.get('/marketplace', requirePermission('marketplace'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      res.json(await getMarketplaceConfig());
    } catch {
      res.status(500).json({ error: 'Failed to load marketplace configuration.' });
    }
  });

  router.put('/marketplace', requirePermission('marketplace'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const current = await getMarketplaceConfig();
      const updated = {
        ...current,
        ...(req.body || {})
      };
      await saveMarketplaceConfig(updated);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_MARKETPLACE_CONFIG',
        targetType: 'marketplace',
        details: 'Updated GCC countries, cities, job categories, or salary display rules',
        ip: getClientIp(req)
      });

      res.json({ success: true, marketplace: updated });
    } catch {
      res.status(500).json({ error: 'Failed to update marketplace configuration.' });
    }
  });

  // =========================================================================
  // 11. SECTION 12: ADMIN MANAGEMENT & ROLES (RBAC)
  // =========================================================================

  router.get('/admins', requirePermission('admin_roles'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const admins = (await getAdmins()).map(sanitizeAdmin);
      res.json({ admins, availablePermissions: ALL_PERMISSIONS });
    } catch {
      res.status(500).json({ error: 'Failed to load administrators.' });
    }
  });

  router.post('/admins', requirePermission('admin_roles'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { username, email, fullName, password, role, permissions } = req.body || {};
      const cleanUser = (username || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanUser || !cleanEmail || !password || password.length < 10) {
        return res.status(400).json({ error: 'Username, valid email, and password (min 10 chars) are required.' });
      }

      const admins = await getAdmins();
      if (admins.some(a => a.username.toLowerCase() === cleanUser.toLowerCase() || a.email.toLowerCase() === cleanEmail)) {
        return res.status(400).json({ error: 'An administrator with that username or email already exists.' });
      }

      const safeRole: AdminRole = ['super_admin', 'moderator', 'support', 'content_manager'].includes(role)
        ? role
        : 'moderator';

      const newAdmin: AdminAccount = {
        id: `sa-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        username: cleanUser,
        email: cleanEmail,
        fullName: (fullName || cleanUser).trim(),
        passwordHash: await bcrypt.hash(password, 12),
        role: safeRole,
        permissions: safeRole === 'super_admin' ? ['*'] : Array.isArray(permissions) ? permissions : ['overview', 'jobs', 'reports'],
        isOwner: false,
        status: 'active',
        twoFactorEnabled: false,
        twoFactorMethod: 'totp',
        failedAttempts: 0,
        lockoutUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveAdmin(newAdmin);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'CREATE_SUB_ADMIN',
        targetType: 'admin',
        targetId: newAdmin.id,
        details: `Created ${safeRole} admin "${newAdmin.username}" (${newAdmin.email})`,
        ip: getClientIp(req)
      });

      res.status(201).json({ success: true, admin: sanitizeAdmin(newAdmin) });
    } catch {
      res.status(500).json({ error: 'Failed to create administrator account.' });
    }
  });

  router.patch('/admins/:id', requirePermission('admin_roles'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const admins = await getAdmins();
      const target = admins.find(a => a.id === id);
      if (!target) return res.status(404).json({ error: 'Administrator not found.' });

      if (target.isOwner) {
        if (updates.status && updates.status !== 'active') {
          return res.status(403).json({ error: 'The protected Owner account cannot be suspended or disabled.' });
        }
        if (updates.role && updates.role !== 'owner') {
          return res.status(403).json({ error: 'The protected Owner role cannot be downgraded.' });
        }
        if (!req.admin!.isOwner) {
          return res.status(403).json({ error: 'Only the Owner can modify the Owner profile.' });
        }
      }

      if (updates.fullName) target.fullName = String(updates.fullName).trim();
      if (updates.email) target.email = String(updates.email).trim().toLowerCase();
      if (!target.isOwner) {
        if (updates.role && ['super_admin', 'moderator', 'support', 'content_manager'].includes(updates.role)) {
          target.role = updates.role;
        }
        if (Array.isArray(updates.permissions)) {
          target.permissions = updates.permissions;
        }
        if (updates.status === 'active' || updates.status === 'suspended') {
          target.status = updates.status;
        }
      }
      if (updates.newPassword && String(updates.newPassword).length >= 10) {
        target.passwordHash = await bcrypt.hash(String(updates.newPassword), 12);
      }
      target.updatedAt = new Date().toISOString();
      await saveAdmin(target);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_ADMIN',
        targetType: 'admin',
        targetId: target.id,
        details: `Updated admin "${target.username}"`,
        ip: getClientIp(req)
      });

      res.json({ success: true, admin: sanitizeAdmin(target) });
    } catch {
      res.status(500).json({ error: 'Failed to update administrator.' });
    }
  });

  router.delete('/admins/:id', requirePermission('admin_roles'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const admins = await getAdmins();
      const target = admins.find(a => a.id === id);
      if (!target) return res.status(404).json({ error: 'Administrator not found.' });

      if (target.isOwner) {
        return res.status(403).json({ error: 'Protected Owner account cannot be deleted.' });
      }
      if (target.id === req.admin!.id) {
        return res.status(400).json({ error: 'You cannot delete your own active session account.' });
      }

      await deleteAdminById(target.id);

      const sessions = (await getAdminSessions())
        .filter(s => s.adminId === target.id)
        .map(s => ({ ...s, revoked: true }));
      if (sessions.length > 0) {
        await saveAdminSessions(sessions);
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'DELETE_SUB_ADMIN',
        targetType: 'admin',
        targetId: target.id,
        details: `Deleted sub-admin "${target.username}"`,
        ip: getClientIp(req)
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete administrator.' });
    }
  });

  // =========================================================================
  // 12. SECTION 13: SECURITY SETTINGS, 2FA, BACKUP & RESTORE, LOGS
  // =========================================================================

  router.get('/security', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [auditLogs, errorLogs, authHistory] = await Promise.all([
        getAuditLogs(),
        getSystemErrors(),
        getAuthHistory()
      ]);

      res.json({
        currentAdmin: sanitizeAdmin(req.admin!),
        auditLogs: auditLogs.slice(0, 300),
        errorLogs: errorLogs.slice(0, 200),
        suspiciousEvents: authHistory.filter(h => h.suspicious).slice(0, 100)
      });
    } catch {
      res.status(500).json({ error: 'Failed to load security logs.' });
    }
  });

  router.post('/security/change-password', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
      }
      if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({
          error: 'New password must be at least 10 characters with at least one uppercase letter and one number.'
        });
      }

      const admins = await getAdmins();
      const target = admins.find(a => a.id === req.admin!.id);
      if (!target) return res.status(404).json({ error: 'Admin not found.' });

      const match = await bcrypt.compare(String(currentPassword), target.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      target.passwordHash = await bcrypt.hash(String(newPassword), 12);
      target.updatedAt = new Date().toISOString();
      await saveAdmin(target);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'CHANGE_OWN_PASSWORD',
        targetType: 'admin',
        targetId: req.admin!.id,
        details: 'Changed Super Admin account password',
        ip: getClientIp(req)
      });

      res.json({ success: true, message: 'Password updated successfully.' });
    } catch {
      res.status(500).json({ error: 'Failed to change password.' });
    }
  });

  router.post('/security/2fa/setup', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { method } = req.body || {};
      const admins = await getAdmins();
      const target = admins.find(a => a.id === req.admin!.id);
      if (!target) return res.status(404).json({ error: 'Admin not found.' });

      const secret = generateBase32Secret(20);
      target.twoFactorSecret = secret;
      target.twoFactorMethod = method === 'email' ? 'email' : 'totp';
      await saveAdmin(target);

      const issuer = 'Gulfaro Super Admin';
      const otpAuthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(target.username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

      res.json({
        success: true,
        method: target.twoFactorMethod,
        secret,
        otpAuthUri
      });
    } catch {
      res.status(500).json({ error: 'Failed to initialize 2FA setup.' });
    }
  });

  router.post('/security/2fa/enable', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { method, verificationCode } = req.body || {};
      const admins = await getAdmins();
      const target = admins.find(a => a.id === req.admin!.id);
      if (!target) return res.status(404).json({ error: 'Admin not found.' });

      const chosenMethod = method === 'email' ? 'email' : 'totp';
      if (chosenMethod === 'totp') {
        if (!target.twoFactorSecret) {
          return res.status(400).json({ error: 'Generate a 2FA secret first.' });
        }
        if (!verifyTotpCode(target.twoFactorSecret, String(verificationCode || ''))) {
          return res.status(400).json({ error: 'Invalid 6-digit authenticator code. Please try again.' });
        }
      }

      target.twoFactorMethod = chosenMethod;
      target.twoFactorEnabled = true;
      target.updatedAt = new Date().toISOString();
      await saveAdmin(target);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'ENABLE_2FA',
        targetType: 'security',
        targetId: req.admin!.id,
        details: `Enabled 2-Factor Authentication (${chosenMethod})`,
        ip: getClientIp(req)
      });

      res.json({ success: true, admin: sanitizeAdmin(target) });
    } catch {
      res.status(500).json({ error: 'Failed to enable 2FA.' });
    }
  });

  router.post('/security/2fa/disable', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const admins = await getAdmins();
      const target = admins.find(a => a.id === req.admin!.id);
      if (!target) return res.status(404).json({ error: 'Admin not found.' });

      target.twoFactorEnabled = false;
      target.updatedAt = new Date().toISOString();
      await saveAdmin(target);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'DISABLE_2FA',
        targetType: 'security',
        targetId: req.admin!.id,
        details: 'Disabled 2-Factor Authentication',
        ip: getClientIp(req)
      });

      res.json({ success: true, admin: sanitizeAdmin(target) });
    } catch {
      res.status(500).json({ error: 'Failed to disable 2FA.' });
    }
  });

  router.get('/backup/download', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [users, jobs, applications, reports, siteSettings, marketplaceConfig, monetization, trash] = await Promise.all([
        getUsers(),
        getJobs(),
        getApplications(),
        getReports(),
        getSiteSettings(),
        getMarketplaceConfig(),
        getMonetization(),
        getTrash()
      ]);

      const snapshot = {
        exportedAt: new Date().toISOString(),
        exportedBy: req.admin!.username,
        version: '1.0',
        data: {
          users,
          jobs,
          applications,
          reports,
          siteSettings,
          marketplaceConfig,
          monetization,
          trash
        }
      };

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'DOWNLOAD_DATABASE_BACKUP',
        targetType: 'backup',
        details: `Exported JSON backup (${snapshot.data.users.length} users, ${snapshot.data.jobs.length} jobs)`,
        ip: getClientIp(req)
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="gulfaro-backup-${new Date().toISOString().slice(0, 10)}.json"`);
      res.send(JSON.stringify(snapshot, null, 2));
    } catch {
      res.status(500).json({ error: 'Failed to export database backup.' });
    }
  });

  router.post('/backup/restore', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const payload = req.body?.data || req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid backup payload.' });
      }

      const restoredParts: string[] = [];
      if (Array.isArray(payload.users)) {
        await saveAllUsers(payload.users);
        restoredParts.push(`users (${payload.users.length})`);
      }
      if (Array.isArray(payload.jobs)) {
        await saveAllJobs(payload.jobs);
        restoredParts.push(`jobs (${payload.jobs.length})`);
      }
      if (Array.isArray(payload.applications)) {
        await saveApplications(payload.applications);
        restoredParts.push(`applications (${payload.applications.length})`);
      }
      if (Array.isArray(payload.reports)) {
        await saveReports(payload.reports);
        restoredParts.push(`reports (${payload.reports.length})`);
      }
      if (payload.siteSettings && typeof payload.siteSettings === 'object') {
        await saveSiteSettings(payload.siteSettings);
        restoredParts.push('siteSettings');
      }
      if (payload.marketplaceConfig && typeof payload.marketplaceConfig === 'object') {
        await saveMarketplaceConfig(payload.marketplaceConfig);
        restoredParts.push('marketplaceConfig');
      }

      if (restoredParts.length === 0) {
        return res.status(400).json({ error: 'Backup JSON did not contain recognized datasets.' });
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'RESTORE_DATABASE_BACKUP',
        targetType: 'backup',
        details: `Restored backup: ${restoredParts.join(', ')}`,
        ip: getClientIp(req)
      });

      res.json({ success: true, restored: restoredParts });
    } catch {
      res.status(500).json({ error: 'Failed to restore backup.' });
    }
  });

  router.post('/security/clear-logs', requirePermission('security'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { logType } = req.body || {};
      if (logType === 'errors') {
        await clearSystemErrors();
      } else if (logType === 'expired_tokens') {
        const resetTokens = (await getAdminResetTokens()).filter(t => !t.used && t.expiresAt > Date.now());
        await saveAdminResetTokens(resetTokens);
      }

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'MAINTENANCE_CLEAR_LOGS',
        targetType: 'security',
        details: `Cleared ${logType || 'maintenance cache'}`,
        ip: getClientIp(req)
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to clear logs.' });
    }
  });

  // =========================================================================
  // 13. SECTION 14: EMERGENCY CONTROLS & TRASH RECOVERY
  // =========================================================================

  router.get('/emergency', requirePermission('emergency'), async (_req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const [settings, trash] = await Promise.all([getSiteSettings(), getTrash()]);
      res.json({
        emergency: settings.emergency,
        registration: settings.registration,
        trash
      });
    } catch {
      res.status(500).json({ error: 'Failed to load emergency controls.' });
    }
  });

  router.put('/emergency', requirePermission('emergency'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const settings = await getSiteSettings();
      const updates = req.body || {};

      settings.emergency = {
        ...settings.emergency,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: req.admin!.username
      };

      if (typeof updates.allowJobSeekerRegistration === 'boolean') {
        settings.registration.allowJobSeekerRegistration = updates.allowJobSeekerRegistration;
      }
      if (typeof updates.allowEmployerRegistration === 'boolean') {
        settings.registration.allowEmployerRegistration = updates.allowEmployerRegistration;
      }

      await saveSiteSettings(settings);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'UPDATE_EMERGENCY_CONTROLS',
        targetType: 'emergency',
        details: `Maintenance=${settings.emergency.maintenanceMode}, Shutdown=${settings.emergency.emergencyShutdown}, HideJobs=${settings.emergency.hideAllPublicJobs}, DisablePost=${settings.emergency.disableNewJobPublishing}`,
        ip: getClientIp(req)
      });

      res.json({ success: true, emergency: settings.emergency, registration: settings.registration });
    } catch {
      res.status(500).json({ error: 'Failed to update emergency controls.' });
    }
  });

  router.post('/trash/:trashId/restore', requirePermission('emergency'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { trashId } = req.params;
      const trash = await getTrash();
      const idx = trash.findIndex(t => t.trashId === trashId);
      if (idx === -1) return res.status(404).json({ error: 'Deleted item not found in trash.' });

      const item = trash[idx];
      if (item.itemType === 'user') {
        const users = await getUsers();
        if (!users.some(u => u.id === item.payload.id)) {
          await saveUser({ ...item.payload, status: 'active' });
        }
      } else if (item.itemType === 'job') {
        const jobs = await getJobs();
        if (!jobs.some(j => j.id === item.payload.id)) {
          await upsertJob({ ...item.payload, status: 'active' });
        }
      } else if (item.itemType === 'report') {
        const reports = await getReports();
        if (!reports.some(r => r.id === item.payload.id)) {
          reports.unshift(item.payload);
          await saveReports(reports);
        }
      }

      trash.splice(idx, 1);
      await saveTrash(trash);

      await appendAuditLogEntry({
        adminId: req.admin!.id,
        adminUsername: req.admin!.username,
        action: 'RESTORE_FROM_TRASH',
        targetType: item.itemType,
        targetId: item.originalId,
        details: `Restored ${item.itemType}: ${item.label}`,
        ip: getClientIp(req)
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to restore item from trash.' });
    }
  });

  router.delete('/trash/:trashId', requirePermission('emergency'), async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const { trashId } = req.params;
      const trash = await getTrash();
      const filtered = trash.filter(t => t.trashId !== trashId);
      if (filtered.length === trash.length) return res.status(404).json({ error: 'Item not found.' });
      await saveTrash(filtered);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to permanently delete trash item.' });
    }
  });

  return router;
}
