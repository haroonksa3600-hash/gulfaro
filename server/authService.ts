import crypto from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import {
  appendEmailLogEntry,
  checkDbRateLimit,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  findResetTokenByHash,
  findUserByEmail,
  findUserById,
  getSiteSettings,
  readJobsJson,
  readUsersJson,
  saveUser,
  syncEmployerVerifiedOnJobs,
  writeJobsJson,
  writeUsersJson
} from './repository';

export const OFFICIAL_SENDER_EMAIL = 'info@gulfaro.net';
export const OFFICIAL_SENDER_NAME = 'Gulfaro';
export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'If an account exists with this email address, you will receive a password reset link shortly.';
export const GENERIC_RESEND_VERIFICATION_MESSAGE =
  'If an unverified Gulfaro account exists with that email address, a new verification link has been sent.';
export const REGISTRATION_SUCCESS_MESSAGE =
  'Your registration was successful. Please check your email and click the verification link to activate your Gulfaro account.';
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Your password has been successfully reset. You can now log in using your new password.';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

const JWT_SESSION_SECRET = process.env.JWT_SECRET || 'gulfaro-user-session-jwt-secret-2026';

let resendInstance: Resend | null = null;
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  if (!resendInstance) {
    resendInstance = new Resend(apiKey.trim());
  }
  return resendInstance;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function getSenderEmail(): string {
  const rawEmail = (process.env.EMAIL_FROM || process.env.SMTP_USER || OFFICIAL_SENDER_EMAIL).trim();
  const rawName = (process.env.EMAIL_FROM_NAME || OFFICIAL_SENDER_NAME).trim();
  if (rawEmail.includes('<') && rawEmail.includes('>')) {
    return rawEmail;
  }
  return `${rawName} <${rawEmail}>`;
}

export function getReplyToEmail(configuredReplyTo?: string): string {
  const candidate = (configuredReplyTo || process.env.EMAIL_FROM || OFFICIAL_SENDER_EMAIL).trim();
  return candidate || OFFICIAL_SENDER_EMAIL;
}

export interface UserRecord {
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

export interface ResetTokenRecord {
  tokenHash: string;
  userId?: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip?: string;
}

function escapeEmailHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalizes phone numbers for matching, indexing, and comparison across GCC formats.
 */
export function normalizePhone(rawPhone?: string | null): { digits: string; nationalDigits: string; e164: string } | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 7) return null;

  let national = digits;
  const gccCodes = ['966', '971', '974', '965', '973', '968'];
  for (const code of gccCodes) {
    if (digits.startsWith(code) && digits.length >= code.length + 7) {
      national = digits.slice(code.length);
      break;
    }
  }

  if (national.startsWith('0') && national.length > 7) {
    national = national.slice(1);
  }

  return {
    digits,
    nationalDigits: national,
    e164: `+${digits}`
  };
}

export function phonesMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const cleanA = phoneA.trim();
  const cleanB = phoneB.trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  const normA = normalizePhone(cleanA);
  const normB = normalizePhone(cleanB);
  if (!normA || !normB) return false;

  if (normA.digits === normB.digits) return true;

  if (normA.nationalDigits.length >= 7 && normA.nationalDigits === normB.nationalDigits) {
    return true;
  }

  if (
    (normA.digits.length > normB.nationalDigits.length && normA.digits.endsWith(normB.nationalDigits)) ||
    (normB.digits.length > normA.nationalDigits.length && normB.digits.endsWith(normA.nationalDigits))
  ) {
    return true;
  }

  return false;
}

export function cleanPhone(phone?: string | null): string | undefined {
  if (!phone || typeof phone !== 'string') return undefined;
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\s+/g, ' ');
}

export function readUsers(): UserRecord[] {
  return readUsersJson() as UserRecord[];
}

export function writeUsers(users: UserRecord[]): void {
  writeUsersJson(users);
}

export function readJobsFile(): any[] {
  return readJobsJson();
}

export function writeJobsFile(jobs: any[]): void {
  writeJobsJson(jobs);
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  return { valid: true };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !password) return false;

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const originalHash = parts[2];
      const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      const origBuf = Buffer.from(originalHash, 'hex');
      const testBuf = Buffer.from(testHash, 'hex');
      if (origBuf.length !== testBuf.length) return false;
      return crypto.timingSafeEqual(origBuf, testBuf);
    }
  }

  // Graceful legacy support for un-migrated plain-text seed accounts (upgraded on login)
  return password === stored;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function issueUserSessionToken(user: Pick<UserRecord, 'id' | 'email' | 'role'>, rememberMe = false): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email.toLowerCase(),
      role: user.role,
      purpose: 'gulfaro-user-session'
    },
    JWT_SESSION_SECRET,
    { expiresIn: rememberMe ? '30d' : '24h' }
  );
}

export function verifyUserSessionToken(
  token: string
): { valid: boolean; userId?: string; email?: string; role?: string; iatMs?: number } {
  try {
    const decoded = jwt.verify(token, JWT_SESSION_SECRET) as any;
    if (!decoded || decoded.purpose !== 'gulfaro-user-session' || !decoded.sub) {
      return { valid: false };
    }
    return {
      valid: true,
      userId: String(decoded.sub),
      email: typeof decoded.email === 'string' ? decoded.email.toLowerCase() : undefined,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
      iatMs: typeof decoded.iat === 'number' ? decoded.iat * 1000 : undefined
    };
  } catch {
    return { valid: false };
  }
}

// =========================================================================
// Hostinger SMTP Transporter & Unified Mail Delivery
// =========================================================================

let cachedTransporter: Transporter | null = null;
let cachedTransporterSignature = '';

export async function getEmailTransporter(): Promise<{ transporter: Transporter; providerName: string }> {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecureEnv = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    smtpSecureEnv === 'true' ? true : smtpSecureEnv === 'false' ? false : smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('Hostinger SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS).');
  }

  const signature = `${smtpHost}:${smtpPort}:${secure}:${smtpUser}`;
  if (cachedTransporter && cachedTransporterSignature === signature) {
    return { transporter: cachedTransporter, providerName: `SMTP (${smtpHost})` };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });

  cachedTransporter = transporter;
  cachedTransporterSignature = signature;
  return { transporter, providerName: `SMTP (${smtpHost})` };
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; provider?: string; error?: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP environment variables are not configured.' };
  }
  try {
    const { transporter, providerName } = await getEmailTransporter();
    await transporter.verify();
    return { ok: true, provider: providerName };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'SMTP verification failed' };
  }
}

export async function deliverMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: 'verification' | 'password_reset' | 'welcome' | 'announcement' | 'security_alert' | 'admin_reset' | 'system';
  triggeredBy?: string;
}): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
  const cleanTo = opts.to.trim().toLowerCase();
  const settings = await getSiteSettings().catch(() => null);

  let fromAddress = getSenderEmail();
  const configuredSenderEmail = settings?.emailConfig?.senderEmail?.trim();
  const configuredSenderName = settings?.emailConfig?.senderName?.trim();
  if (
    configuredSenderEmail &&
    !/@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|gulfaro\.com)$/i.test(configuredSenderEmail)
  ) {
    fromAddress = `${configuredSenderName || OFFICIAL_SENDER_NAME} <${configuredSenderEmail}>`;
  }

  const replyTo = getReplyToEmail(settings?.emailConfig?.replyToEmail);

  // 1. Primary Production Transport: Hostinger SMTP (info@gulfaro.net)
  if (isSmtpConfigured()) {
    try {
      const { transporter, providerName } = await getEmailTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo
      });
      await appendEmailLogEntry({
        recipient: cleanTo,
        subject: opts.subject,
        category: opts.category,
        provider: providerName,
        status: 'sent',
        messageId: info.messageId,
        triggeredBy: opts.triggeredBy
      });
      return { success: true, provider: providerName, messageId: info.messageId };
    } catch (smtpErr: any) {
      const errMsg = smtpErr?.message || 'Hostinger SMTP delivery failed';
      console.error(`[Gulfaro SMTP] Delivery error for ${opts.category} to ${cleanTo}:`, errMsg);
      await appendEmailLogEntry({
        recipient: cleanTo,
        subject: opts.subject,
        category: opts.category,
        provider: `SMTP (${process.env.SMTP_HOST})`,
        status: 'failed',
        error: errMsg,
        triggeredBy: opts.triggeredBy
      });
      return { success: false, provider: `SMTP (${process.env.SMTP_HOST})`, error: errMsg };
    }
  }

  // 2. Legacy Fallback: Resend API if explicitly configured without SMTP
  const resend = getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: cleanTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo
      });
      if (error) {
        await appendEmailLogEntry({
          recipient: cleanTo,
          subject: opts.subject,
          category: opts.category,
          provider: 'Resend',
          status: 'failed',
          error: error.message,
          triggeredBy: opts.triggeredBy
        });
        return { success: false, provider: 'Resend', error: error.message };
      }
      await appendEmailLogEntry({
        recipient: cleanTo,
        subject: opts.subject,
        category: opts.category,
        provider: 'Resend',
        status: 'sent',
        messageId: data?.id,
        triggeredBy: opts.triggeredBy
      });
      return { success: true, provider: 'Resend', messageId: data?.id };
    } catch (err: any) {
      await appendEmailLogEntry({
        recipient: cleanTo,
        subject: opts.subject,
        category: opts.category,
        provider: 'Resend',
        status: 'failed',
        error: err.message,
        triggeredBy: opts.triggeredBy
      });
      return { success: false, provider: 'Resend', error: err.message || 'Resend delivery failed' };
    }
  }

  // 3. No Email Provider Configured (Fail explicitly, never spoof success)
  const msg = 'Email delivery provider is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS for info@gulfaro.net).';
  console.log('[Gulfaro Email]', msg);
  await appendEmailLogEntry({
    recipient: cleanTo,
    subject: opts.subject,
    category: opts.category,
    provider: 'None',
    status: 'failed',
    error: msg,
    triggeredBy: opts.triggeredBy
  });
  return { success: false, provider: 'None', error: msg };
}

// =========================================================================
// Responsive Branded Email Templates (HTML + Plain Text)
// =========================================================================

function buildBrandedEmailShell(params: {
  title: string;
  preheader: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeEmailHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(params.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,0.06);">
          <tr>
            <td style="background-color:#090d16;padding:28px 32px;text-align:center;border-bottom:3px solid #0d9488;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1.5px;">GULFARO</h1>
              <p style="margin:6px 0 0 0;color:#5eead4;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;">GCC Job Classifieds Marketplace</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:22px 32px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.6;">
              <p style="margin:0 0 4px 0;font-weight:600;color:#475569;">Gulfaro · Official GCC Job Marketplace</p>
              <p style="margin:0 0 6px 0;">Saudi Arabia · UAE · Qatar · Kuwait · Bahrain · Oman</p>
              <p style="margin:0;">Need assistance? Contact <a href="mailto:info@gulfaro.net" style="color:#0d9488;text-decoration:none;font-weight:600;">info@gulfaro.net</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateAccountVerificationEmailHtml(
  name: string,
  verifyLink: string,
  expirationText = '24 hours'
): string {
  const safeFirst = escapeEmailHtml((name || '').trim().split(/\s+/)[0] || 'there');
  const safeLink = escapeEmailHtml(verifyLink);
  return buildBrandedEmailShell({
    title: 'Verify Your Gulfaro Account',
    preheader: 'Click Verify My Account to activate your Gulfaro account.',
    bodyHtml: `
      <h2 style="margin:0 0 16px 0;font-size:19px;font-weight:700;color:#0f172a;">Hello ${safeFirst},</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#334155;">
        Thank you for registering with <strong>Gulfaro</strong>. Before you can sign in and access your account, please confirm that this email address belongs to you.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#334155;">
        Click the button below to verify your email address and activate your Gulfaro account:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0d9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 34px;border-radius:10px;">
          Verify My Account
        </a>
      </div>
      <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:22px 0;border-radius:4px;font-size:12px;line-height:1.5;color:#92400e;">
        <strong>Expiration Notice:</strong> This verification link will expire in <strong>${escapeEmailHtml(expirationText)}</strong> and can only be used once.
      </div>
      <p style="margin:20px 0 8px 0;font-size:12px;color:#64748b;">
        If the button above does not work, copy and paste this link directly into your browser:
      </p>
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;">
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:#0d9488;text-decoration:none;">${safeLink}</a>
      </div>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;">
        If you did not create a Gulfaro account, you can safely ignore this email.
      </p>
    `
  });
}

export function generateAccountVerificationEmailText(
  name: string,
  verifyLink: string,
  expirationText = '24 hours'
): string {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return [
    `Hello ${first},`,
    '',
    'Thank you for registering with Gulfaro.',
    'Please verify your email address by visiting the link below:',
    '',
    verifyLink,
    '',
    `This verification link expires in ${expirationText} and can only be used once.`,
    'If you did not create a Gulfaro account, you can safely ignore this message.',
    '',
    'Best regards,',
    'Gulfaro Team',
    'info@gulfaro.net'
  ].join('\n');
}

export function generatePasswordResetEmailHtml(
  name: string,
  resetLink: string,
  expirationText = '30 minutes'
): string {
  const safeFirst = escapeEmailHtml((name || '').trim().split(/\s+/)[0] || 'there');
  const safeLink = escapeEmailHtml(resetLink);
  return buildBrandedEmailShell({
    title: 'Reset Your Gulfaro Password',
    preheader: 'Use this link within 30 minutes to reset your Gulfaro password.',
    bodyHtml: `
      <h2 style="margin:0 0 16px 0;font-size:19px;font-weight:700;color:#0f172a;">Hello ${safeFirst},</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#334155;">
        We received a request to reset the password for your <strong>Gulfaro</strong> account.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#334155;">
        Click the button below to choose a new password:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0d9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 34px;border-radius:10px;">
          Reset My Password
        </a>
      </div>
      <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:22px 0;border-radius:4px;font-size:12px;line-height:1.5;color:#92400e;">
        <strong>Security Notice:</strong> This password reset link expires in <strong>${escapeEmailHtml(expirationText)}</strong> and can only be used once.
      </div>
      <p style="margin:20px 0 8px 0;font-size:12px;color:#64748b;">
        If the button above does not work, copy and paste this secure URL into your browser:
      </p>
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;">
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:#0d9488;text-decoration:none;">${safeLink}</a>
      </div>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account stays secure.
      </p>
    `
  });
}

export function generatePasswordResetEmailText(
  name: string,
  resetLink: string,
  expirationText = '30 minutes'
): string {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return [
    `Hello ${first},`,
    '',
    'We received a request to reset the password for your Gulfaro account.',
    'Open the link below to set a new password:',
    '',
    resetLink,
    '',
    `This link expires in ${expirationText} and can only be used once.`,
    'If you did not request a password reset, please ignore this email.',
    '',
    'Best regards,',
    'Gulfaro Team',
    'info@gulfaro.net'
  ].join('\n');
}

export function generateWelcomeEmailHtml(name: string, appUrl?: string): string {
  const safeName = escapeEmailHtml((name || '').trim() || 'Member');
  const signInUrl = appUrl ? `${appUrl.replace(/\/+$/, '')}/` : 'https://www.gulfaro.net/';
  return buildBrandedEmailShell({
    title: 'Welcome to Gulfaro!',
    preheader: 'Your Gulfaro account has been verified and activated.',
    bodyHtml: `
      <h2 style="margin:0 0 16px 0;font-size:19px;font-weight:700;color:#0f172a;">Welcome to Gulfaro, ${safeName}!</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#334155;">
        Your email address has been verified and your <strong>Gulfaro</strong> account is now active.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#334155;">
        You can now sign in to explore direct job vacancies across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman, manage your profile, or post verified job listings.
      </p>
      <div style="text-align:center;margin:26px 0;">
        <a href="${escapeEmailHtml(signInUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;">
          Go to Gulfaro
        </a>
      </div>
      <p style="margin:24px 0 0 0;font-size:13px;line-height:1.7;color:#334155;">
        Best regards,<br />
        <strong>Gulfaro Team</strong><br />
        <a href="mailto:info@gulfaro.net" style="color:#0d9488;text-decoration:none;">info@gulfaro.net</a>
      </p>
    `
  });
}

export function generateWelcomeEmailText(name: string): string {
  const safeName = (name || '').trim() || 'Member';
  return [
    `Welcome to Gulfaro, ${safeName}!`,
    '',
    'Your email address has been verified and your Gulfaro account is now active.',
    'You can now sign in and use all features of the Gulfaro GCC Job Marketplace.',
    '',
    'Best regards,',
    'Gulfaro Team',
    'info@gulfaro.net'
  ].join('\n');
}

// =========================================================================
// Email Verification Workflow (24h SHA-256 Token Hash, Single-Use)
// =========================================================================

export async function issueEmailVerificationToken(
  user: UserRecord,
  appUrl: string,
  clientIp = 'unknown'
): Promise<{ sent: boolean; error?: string }> {
  const cleanEmail = user.email.trim().toLowerCase();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + EMAIL_VERIFICATION_TTL_MS;

  await createEmailVerificationToken({
    tokenHash,
    userId: user.id,
    email: cleanEmail,
    expiresAt,
    used: false,
    createdAt: Date.now(),
    ip: clientIp
  });

  const verifyLink = `${appUrl.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const settings = await getSiteSettings().catch(() => null);
  const subject = settings?.emailConfig?.verificationSubject?.trim() || 'Verify Your Gulfaro Account';

  const result = await deliverMail({
    to: cleanEmail,
    subject,
    html: generateAccountVerificationEmailHtml(user.name, verifyLink, '24 hours'),
    text: generateAccountVerificationEmailText(user.name, verifyLink, '24 hours'),
    category: 'verification'
  });

  return { sent: result.success, error: result.error };
}

export async function verifyEmailByToken(
  rawToken: string,
  appUrl?: string
): Promise<{
  success: boolean;
  code?: 'INVALID_TOKEN' | 'TOKEN_ALREADY_USED' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND';
  message?: string;
  error?: string;
}> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 16) {
    return {
      success: false,
      code: 'INVALID_TOKEN',
      error: 'Invalid or missing verification token. Please check the link or request a new verification email.'
    };
  }

  const tokenHash = hashToken(rawToken);
  const outcome = await consumeEmailVerificationToken(tokenHash);

  if (outcome.status === 'not_found' || !outcome.record) {
    return {
      success: false,
      code: 'INVALID_TOKEN',
      error: 'This verification link is invalid. Please request a new verification email.'
    };
  }

  if (outcome.status === 'already_used') {
    return {
      success: false,
      code: 'TOKEN_ALREADY_USED',
      error: 'This verification link has already been used. If your account is already verified, please sign in.'
    };
  }

  if (outcome.status === 'expired') {
    return {
      success: false,
      code: 'TOKEN_EXPIRED',
      error: 'This verification link has expired (24-hour validity). Please request a new verification email.'
    };
  }

  const user =
    (await findUserById(outcome.record.userId)) ||
    (await findUserByEmail(outcome.record.email));

  if (!user) {
    return {
      success: false,
      code: 'USER_NOT_FOUND',
      error: 'Account associated with this verification link could not be found.'
    };
  }

  const nowIso = new Date().toISOString();
  if (user.emailVerified !== true) {
    user.emailVerified = true;
    user.emailVerifiedAt = nowIso;
    await saveUser(user);
    if (user.role === 'employer') {
      await syncEmployerVerifiedOnJobs(user.id, user.email, true);
    }

    const settings = await getSiteSettings().catch(() => null);
    if (settings?.emailConfig?.welcomeEmailEnabled !== false) {
      await deliverMail({
        to: user.email,
        subject: 'Welcome to Gulfaro!',
        html: generateWelcomeEmailHtml(user.name, appUrl),
        text: generateWelcomeEmailText(user.name),
        category: 'welcome'
      }).catch(err => {
        console.warn('[Gulfaro Welcome Email] Non-fatal dispatch error:', err?.message || err);
      });
    }
  }

  return {
    success: true,
    message: 'Your email address has been verified! Your Gulfaro account is now active and ready to sign in.'
  };
}

export async function resendVerificationEmail(
  rawEmail: string,
  appUrl: string,
  clientIp = 'unknown'
): Promise<{ success: boolean; status: number; message?: string; error?: string }> {
  const cleanEmail = (rawEmail || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      status: 400,
      error: 'Please enter a valid email address.'
    };
  }

  const emailAllowed = await checkDbRateLimit(`resend_verify:email:${cleanEmail}`, 3, 15 * 60 * 1000);
  const ipAllowed = await checkDbRateLimit(`resend_verify:ip:${clientIp}`, 10, 15 * 60 * 1000);
  if (!emailAllowed || !ipAllowed) {
    return {
      success: false,
      status: 429,
      error: 'Too many verification email requests. Please wait 15 minutes before trying again.'
    };
  }

  const user = await findUserByEmail(cleanEmail);
  if (user && (user.status || 'active') === 'active' && user.emailVerified !== true) {
    await issueEmailVerificationToken(user, appUrl, clientIp);
  }

  return {
    success: true,
    status: 200,
    message: GENERIC_RESEND_VERIFICATION_MESSAGE
  };
}

// =========================================================================
// Forgot Password & Email Reset Workflow (30m SHA-256 Token Hash, Anti-Enumeration)
// =========================================================================

export async function sendRealPasswordResetEmail(
  email: string,
  appUrl: string,
  clientIp = 'unknown',
  opts?: { byAdmin?: boolean; triggeredBy?: string }
): Promise<{ success: boolean; status?: number; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      status: 400,
      message: 'Please enter a valid email address.'
    };
  }

  if (!opts?.byAdmin) {
    const emailAllowed = await checkDbRateLimit(`pw_reset:email:${cleanEmail}`, 3, 15 * 60 * 1000);
    const ipAllowed = await checkDbRateLimit(`pw_reset:ip:${clientIp}`, 10, 15 * 60 * 1000);
    if (!emailAllowed || !ipAllowed) {
      return {
        success: false,
        status: 429,
        message: 'Too many password reset requests. Please wait 15 minutes before trying again.'
      };
    }
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user || (user.status || 'active') !== 'active' || (!opts?.byAdmin && user.emailVerified !== true)) {
    if (opts?.byAdmin) {
      return {
        success: false,
        status: 404,
        message: 'Active user account not found for password reset.'
      };
    }
    // Non-enumerating response: identical regardless of account existence or verification state
    return {
      success: true,
      status: 200,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + PASSWORD_RESET_TTL_MS;

  await createPasswordResetToken({
    tokenHash,
    userId: user.id,
    email: cleanEmail,
    expiresAt,
    used: false,
    createdAt: Date.now(),
    ip: clientIp
  });

  const resetLink = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const settings = await getSiteSettings().catch(() => null);
  const subject = settings?.emailConfig?.resetSubject?.trim() || 'Reset Your Gulfaro Password';

  const delivery = await deliverMail({
    to: cleanEmail,
    subject,
    html: generatePasswordResetEmailHtml(user.name, resetLink, '30 minutes'),
    text: generatePasswordResetEmailText(user.name, resetLink, '30 minutes'),
    category: opts?.byAdmin ? 'admin_reset' : 'password_reset',
    triggeredBy: opts?.triggeredBy
  });

  if (opts?.byAdmin) {
    if (!delivery.success) {
      return {
        success: false,
        status: 500,
        message: delivery.error || 'Failed to send password reset email.'
      };
    }
    return {
      success: true,
      status: 200,
      message: `Password reset link sent to ${cleanEmail}.`
    };
  }

  return {
    success: true,
    status: 200,
    message: GENERIC_FORGOT_PASSWORD_MESSAGE
  };
}

export async function verifyResetTokenRecord(
  token: string,
  rawEmail?: string
): Promise<{ valid: boolean; email?: string; error?: string }> {
  if (!token || typeof token !== 'string' || token.trim().length < 16) {
    return { valid: false, error: 'Invalid or missing password reset link. Please request a new one.' };
  }

  const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase() : undefined;
  const tokenHash = hashToken(token);
  const record = await findResetTokenByHash(tokenHash);

  if (!record) {
    return { valid: false, error: 'Invalid or expired password reset link. Please request a new one.' };
  }

  if (cleanEmail && record.email.toLowerCase() !== cleanEmail) {
    return { valid: false, error: 'Reset link does not match the requested email address.' };
  }

  if (record.used) {
    return { valid: false, error: 'This password reset link has already been used. Please request a new one.' };
  }

  if (Date.now() > record.expiresAt) {
    return { valid: false, error: 'This password reset link has expired (30-minute validity). Please request a new one.' };
  }

  return { valid: true, email: record.email };
}

export async function completePasswordReset(
  token: string,
  rawEmail: string | undefined,
  newPassword: string,
  confirmPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const verification = await verifyResetTokenRecord(token, rawEmail);
  if (!verification.valid || !verification.email) {
    return { success: false, error: verification.error };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { success: false, error: strength.error };
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  const tokenHash = hashToken(token);
  const cleanEmail = verification.email.trim().toLowerCase();

  const consumed = await consumePasswordResetToken(tokenHash, cleanEmail);
  if (!consumed) {
    return {
      success: false,
      error: 'This password reset link has expired or has already been used. Please request a new one.'
    };
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    return { success: false, error: 'Account not found. Please contact info@gulfaro.net.' };
  }

  user.password = undefined;
  user.passwordHash = hashPassword(newPassword);
  user.loginFailedAttempts = 0;
  user.loginLockoutUntil = null;
  user.forceLogoutBefore = Date.now();
  await saveUser(user);

  return {
    success: true,
    message: PASSWORD_RESET_SUCCESS_MESSAGE
  };
}

export async function sendPlatformEmail(opts: {
  to: string;
  subject: string;
  html: string;
  category: 'verification' | 'password_reset' | 'welcome' | 'announcement' | 'security_alert' | 'admin_reset' | 'system';
  triggeredBy?: string;
}): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
  return deliverMail(opts);
}
