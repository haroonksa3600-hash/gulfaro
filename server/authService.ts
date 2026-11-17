import crypto from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  appendEmailLogEntry,
  findUserByEmail,
  getResetTokens,
  getSiteSettings,
  getVerificationCodes,
  readJobsJson,
  readUsersJson,
  saveResetTokens,
  saveUser,
  saveVerificationCodes,
  syncEmployerVerifiedOnJobs,
  writeJobsJson,
  writeUsersJson
} from './repository';

// Resend Client Factory
let resendInstance: Resend | null = null;
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  if (!resendInstance) {
    resendInstance = new Resend(apiKey.trim());
  }
  return resendInstance;
}

export function getSenderEmail(defaultCategory: 'security' | 'verify' = 'security'): string {
  const fromEnv = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || '').trim();
  if (fromEnv) {
    // Resend strictly forbids sending from public webmail domains (like @gmail.com, @yahoo.com)
    // because DMARC/SPF cannot authenticate third-party sending without owning the domain.
    if (/@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i.test(fromEnv.replace(/>/g, ''))) {
      console.warn(`[Gulfaro Resend] Warning: Senders cannot use public webmail address "${fromEnv}". Using Resend onboarding address for delivery.`);
      return `Gulfaro ${defaultCategory === 'security' ? 'Security' : 'Verification'} <onboarding@resend.dev>`;
    }
    return fromEnv;
  }
  // Default Gulfaro domain sender
  return `Gulfaro ${defaultCategory === 'security' ? 'Security' : 'Verification'} <${defaultCategory}@gulfaro.com>`;
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
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  accessKeyHash?: string; // Bcrypt hash of 5-digit numeric PIN
  failedAttempts?: number; // Failed PIN recovery attempts
  lockoutUntil?: number | null; // 15-minute lockout timestamp
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
  token?: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip?: string;
}

export interface VerificationCodeRecord {
  code: string;
  token?: string;
  email: string;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  ip?: string;
}

// In-memory rate limiting map: key -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    rateLimitMap.set(key, validTimestamps);
    return false; // Rate limited
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

/**
 * Normalizes phone numbers for matching, indexing, and comparison across GCC formats.
 * Strips formatting, handles GCC country codes (+966, +971, +974, +965, +973, +968),
 * and isolates the national significant number.
 */
export function normalizePhone(rawPhone?: string | null): { digits: string; nationalDigits: string; e164: string } | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 7) return null;

  // Check GCC country codes: 966 (KSA), 971 (UAE), 974 (Qatar), 965 (Kuwait), 973 (Bahrain), 968 (Oman)
  let national = digits;
  const gccCodes = ['966', '971', '974', '965', '973', '968'];
  for (const code of gccCodes) {
    if (digits.startsWith(code) && digits.length >= code.length + 7) {
      national = digits.slice(code.length);
      break;
    }
  }

  // Strip leading zero for local trunk formats (e.g. 0541234567 -> 541234567)
  if (national.startsWith('0') && national.length > 7) {
    national = national.slice(1);
  }

  return {
    digits,
    nationalDigits: national,
    e164: `+${digits}`
  };
}

/**
 * Checks whether two phone numbers match, accounting for country codes, spaces,
 * leading zeros, and formatting differences.
 */
export function phonesMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const cleanA = phoneA.trim();
  const cleanB = phoneB.trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  const normA = normalizePhone(cleanA);
  const normB = normalizePhone(cleanB);
  if (!normA || !normB) return false;

  // Direct digits match (e.g. "966501234567" === "966501234567")
  if (normA.digits === normB.digits) return true;

  // National significant number match (e.g. "0501234567" matches "501234567" or "+966501234567")
  if (normA.nationalDigits.length >= 7 && normA.nationalDigits === normB.nationalDigits) {
    return true;
  }

  // Suffix match (e.g. one has country code prefix and other does not)
  if (
    (normA.digits.length > normB.nationalDigits.length && normA.digits.endsWith(normB.nationalDigits)) ||
    (normB.digits.length > normA.nationalDigits.length && normB.digits.endsWith(normA.nationalDigits))
  ) {
    return true;
  }

  return false;
}

/**
 * Clean phone string for consistent storage while preserving readability.
 */
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

// Password hashing helper using PBKDF2 with 100,000 iterations and salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  // Handle PBKDF2 hashed password
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const originalHash = parts[2];
      const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(testHash, 'hex'));
    }
  }

  // Handle legacy plain text passwords gracefully while upgrading
  const plainMatch = password === stored || (stored === 'password123' && password === 'password123');
  return plainMatch;
}

// Hash token for safe storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

// Email Transporter Factory
let cachedTransporter: Transporter | null = null;
let cachedTransporterType = '';

export async function getEmailTransporter(): Promise<{ transporter: Transporter; providerName: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  // 1. Custom SMTP Server configured via environment variables
  if (smtpHost && smtpUser && smtpPass) {
    if (cachedTransporter && cachedTransporterType === 'smtp') {
      return { transporter: cachedTransporter, providerName: `SMTP (${smtpHost})` };
    }
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    cachedTransporter = transporter;
    cachedTransporterType = 'smtp';
    return { transporter, providerName: `SMTP (${smtpHost})` };
  }

  // 2. Direct Ethereal SMTP Live Test Transport (standard RFC 5322 real SMTP delivery)
  if (cachedTransporter && cachedTransporterType === 'ethereal') {
    return { transporter: cachedTransporter, providerName: 'Ethereal SMTP Engine' };
  }

  const testAccount = await nodemailer.createTestAccount();
  const etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  cachedTransporter = etherealTransporter;
  cachedTransporterType = 'ethereal';
  return { transporter: etherealTransporter, providerName: `Ethereal Live SMTP (${testAccount.user})` };
}

// Generate the responsive, branded HTML email template for Gul Faro
export function generatePasswordResetEmailHtml(name: string, resetLink: string, expirationText = '1 hour'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Gul Faro Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #090d16;
      padding: 28px 32px;
      text-align: center;
      border-bottom: 2px solid #0d9488;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-tagline {
      color: #94a3b8;
      font-size: 11px;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 20px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0d9488;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
    }
    .link-fallback {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 14px;
      font-size: 12px;
      color: #475569;
      word-break: break-all;
      margin-top: 24px;
      border: 1px solid #e2e8f0;
    }
    .link-fallback a {
      color: #0d9488;
      text-decoration: none;
    }
    .notice {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 24px 0;
      border-radius: 4px;
      font-size: 12px;
      color: #92400e;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer a {
      color: #0d9488;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">GUL FARO</h1>
        <div class="brand-tagline">GCC Job Classifieds Marketplace</div>
      </div>
      <div class="content">
        <h2 class="greeting">Hello ${name ? name.split(' ')[0] : 'there'},</h2>
        <p class="text">
          We received a request to reset the password associated with your Gul Faro account.
        </p>
        <p class="text">
          To choose a new secure password, click the button below:
        </p>
        
        <div class="btn-container">
          <a href="${resetLink}" class="btn" target="_blank" rel="noopener noreferrer">
            Reset Your Password
          </a>
        </div>

        <div class="notice">
          <strong>Security Notice:</strong> This password reset link is strictly valid for <strong>${expirationText}</strong> and can only be used once.
        </div>

        <p class="text" style="font-size: 12px; color: #64748b;">
          If the button above does not work, copy and paste this secure link directly into your browser:
        </p>
        <div class="link-fallback">
          <a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a>
        </div>

        <p class="text" style="font-size: 12px; color: #64748b; margin-top: 24px;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px 0;">
          Gul Faro Official Security Gateway · Connecting Talent Across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman
        </p>
        <p style="margin: 0;">
          Need help? Contact <a href="mailto:admingulfaro@gmail.com">admingulfaro@gmail.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Main function to send real password reset email
export async function sendRealPasswordResetEmail(
  email: string,
  appUrl: string,
  clientIp = 'unknown'
): Promise<{ success: boolean; message: string; previewUrl?: string; resetUrl?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Rate limit: max 5 requests per 15 mins per IP or email
  const rateLimitKey = `pw_reset:${clientIp}:${cleanEmail}`;
  if (!checkRateLimit(rateLimitKey)) {
    return {
      success: false,
      message: 'Too many password reset requests. Please wait 15 minutes before trying again.'
    };
  }

  // Find user in server database
  const user = await findUserByEmail(cleanEmail);

  // If user is not found, clearly inform the user so they can correct typos or create an account
  if (!user) {
    return {
      success: false,
      message: `No Gulfaro account found with email "${cleanEmail}". Please check your email address or create an account.`
    };
  }

  // Generate cryptographically secure 64-char hex token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  // Store token in server database
  const tokens = await getResetTokens();
  // Invalidate any existing unused tokens for this email
  const updatedTokens = tokens.map(t => {
    if (t.email.toLowerCase() === cleanEmail && !t.used) {
      return { ...t, used: true, usedAt: Date.now() };
    }
    return t;
  });

  updatedTokens.push({
    tokenHash,
    token: rawToken,
    email: cleanEmail,
    expiresAt,
    used: false,
    createdAt: Date.now(),
    ip: clientIp
  });
  await saveResetTokens(updatedTokens);

  // Construct absolute reset URL
  const resetLink = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

  // Send real email
  const emailHtml = generatePasswordResetEmailHtml(user.name, resetLink, '1 hour');
  const fromAddress = getSenderEmail('security');

  // 1. Resend API Delivery (Primary Production Delivery Engine)
  const resend = getResendClient();
  if (resend) {
    try {
      console.log(`[Gulfaro Resend] Dispatching password reset email to: ${cleanEmail} from: ${fromAddress}`);
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: cleanEmail,
        subject: 'Reset Your Gulfaro Password',
        html: emailHtml,
        replyTo: process.env.RESEND_FROM_EMAIL || 'admingulfaro@gmail.com'
      });

      if (error) {
        console.error('[Gulfaro Resend] Resend API provider error:', error);
        const configuredKey = process.env.RESEND_API_KEY || '';
        const isNotResendKey = !configuredKey.startsWith('re_');
        const hint = isNotResendKey
          ? ` (Notice: Resend API keys must start with "re_" from resend.com/api-keys. Your current key starts with "${configuredKey.slice(0, 3)}...", which is not a Resend key).`
          : '';
        await appendEmailLogEntry({
          recipient: cleanEmail,
          subject: 'Reset Your Gulfaro Password',
          category: 'password_reset',
          provider: 'Resend',
          status: 'failed',
          error: error.message
        });
        return {
          success: false,
          message: `Email provider rejected request: ${error.message}${hint}`,
          resetUrl: resetLink
        };
      }

      console.log(`[Gulfaro Resend] Password reset email accepted by Resend! Message ID: ${data?.id}`);
      await appendEmailLogEntry({
        recipient: cleanEmail,
        subject: 'Reset Your Gulfaro Password',
        category: 'password_reset',
        provider: 'Resend',
        status: 'sent',
        messageId: data?.id
      });
      return {
        success: true,
        message: 'A secure password reset link has been dispatched to your email address. Please check your inbox and spam folder.',
        resetUrl: resetLink
      };
    } catch (err: any) {
      console.error('[Gulfaro Resend] Connection error sending reset email:', err);
      await appendEmailLogEntry({
        recipient: cleanEmail,
        subject: 'Reset Your Gulfaro Password',
        category: 'password_reset',
        provider: 'Resend',
        status: 'failed',
        error: err.message
      });
      return {
        success: false,
        message: err.message || 'Failed to communicate with Resend email delivery service.',
        resetUrl: resetLink
      };
    }
  }

  // 2. Custom SMTP fallback if SMTP_HOST and SMTP_USER are defined
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const { transporter } = await getEmailTransporter();
      await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: 'Reset Your Gulfaro Password',
        html: emailHtml
      });
      return {
        success: true,
        message: 'A secure password reset link has been dispatched to your email address. Please check your inbox and spam folder.',
        resetUrl: resetLink
      };
    } catch (smtpErr: any) {
      console.error('[Gulfaro SMTP] SMTP delivery error:', smtpErr);
      return {
        success: false,
        message: smtpErr.message || 'Failed to send password reset email via SMTP server.',
        resetUrl: resetLink
      };
    }
  }

  // 3. No production provider configured
  console.warn('[Gulfaro Email] Resend API key (RESEND_API_KEY) is pending configuration.');
  return {
    success: false,
    message: 'Email delivery provider is pending configuration. Please set RESEND_API_KEY (starts with "re_") in your environment variables.',
    resetUrl: resetLink
  };
}

// Verify a reset token
export async function verifyResetTokenRecord(
  token: string,
  rawEmail?: string
): Promise<{ valid: boolean; email?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: 'Invalid or missing password reset link. Please request a new one.' };
  }

  const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase() : undefined;
  const tokenHash = hashToken(token);
  const tokens = await getResetTokens();

  const record = tokens.find(t => t.tokenHash === tokenHash || (t.token && t.token === token));

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
    return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
  }

  return { valid: true, email: record.email };
}

// Complete the password reset
export async function completePasswordReset(
  token: string,
  rawEmail: string | undefined,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyResetTokenRecord(token, rawEmail);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Validate password rules
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  if (!/\d/.test(newPassword)) {
    return { success: false, error: 'Password must contain at least 1 number.' };
  }

  const cleanEmail = (rawEmail || verification.email)!.trim().toLowerCase();
  const tokenHash = hashToken(token);

  // 1. Mark token as used immediately
  const tokens = await getResetTokens();
  const updatedTokens = tokens.map(t => {
    if (t.tokenHash === tokenHash || (t.token && t.token === token)) {
      return { ...t, used: true, usedAt: Date.now() };
    }
    return t;
  });
  await saveResetTokens(updatedTokens);

  // 2. Hash new password and update user record
  const user = await findUserByEmail(cleanEmail);

  if (!user) {
    return { success: false, error: 'Account not found. Please contact support.' };
  }

  const newHash = hashPassword(newPassword);
  user.password = undefined; // Remove plain text
  user.passwordHash = newHash;
  await saveUser(user);

  return { success: true };
}

// Generate HTML email for Employer Verification
export function generateEmployerVerificationEmailHtml(
  name: string,
  companyName: string,
  code: string,
  verifyLink: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Employer Corporate Email - Gul Faro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #091e3a 0%, #061528 100%);
      padding: 32px 32px 28px;
      text-align: center;
      border-bottom: 3px solid #0d9488;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0 0 4px 0;
    }
    .brand-tagline {
      color: #5eead4;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
    .badge-bar {
      display: inline-block;
      margin-top: 14px;
      background: rgba(13, 148, 136, 0.2);
      border: 1px solid #0d9488;
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 11px;
      color: #2dd4bf;
      font-weight: 700;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 14px;
    }
    .text {
      font-size: 14px;
      color: #334155;
      margin-bottom: 18px;
      line-height: 1.6;
    }
    .code-box {
      background-color: #f0fdf4;
      border: 2px dashed #0d9488;
      border-radius: 10px;
      padding: 22px 16px;
      text-align: center;
      margin: 26px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 1.2px;
      margin-bottom: 8px;
    }
    .code-digits {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 8px;
    }
    .code-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 8px;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0d9488;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 32px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3);
    }
    .benefits-box {
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 18px;
      margin: 24px 0;
      font-size: 12px;
      color: #334155;
    }
    .benefits-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      display: block;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">GUL FARO</h1>
        <div class="brand-tagline">GCC Job Classifieds Marketplace</div>
        <div class="badge-bar">✓ Official Employer Verification Gateway</div>
      </div>
      <div class="content">
        <h2 class="greeting">Hello ${name || 'Hiring Manager'},</h2>
        <p class="text">
          Thank you for managing recruitment on Gulfaro for <strong>${companyName || 'your company'}</strong>.
        </p>
        <p class="text">
          To ensure employer legitimacy, protect expatriate candidates, and award your company the official <strong>Verified Employer</strong> trust badge, please confirm ownership of this corporate email address.
        </p>
        
        <div class="code-box">
          <div class="code-label">Your 6-Digit Employer Verification Code</div>
          <div class="code-digits">${code}</div>
          <div class="code-meta">Valid for 15 minutes · Enter this code in your Gulfaro Dashboard</div>
        </div>

        <div class="btn-container">
          <a href="${verifyLink}" class="btn" target="_blank" rel="noopener noreferrer">
            Instant 1-Click Verification
          </a>
        </div>

        <div class="benefits-box">
          <span class="benefits-title">Why Verify Your Corporate Email?</span>
          <div>• Displays the distinctive <strong>Verified Employer</strong> badge on all your job vacancies.</div>
          <div>• Ranks your classifieds higher in GCC search results across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman.</div>
          <div>• Attracts up to 3x more qualified candidate CVs and direct WhatsApp inquiries.</div>
        </div>

        <p class="text" style="font-size: 12px; color: #64748b;">
          If you did not request this verification, please contact our security team at <a href="mailto:admingulfaro@gmail.com" style="color: #0d9488;">admingulfaro@gmail.com</a>.
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px 0;">
          Gul Faro Official Security Gateway · Riyadh · Dubai · Doha · Kuwait City · Manama · Muscat
        </p>
        <p style="margin: 0;">
          Connecting verified employers with genuine talent across the Arabian Gulf.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Send Employer Email Verification (Disabled: registered employers receive automatic Verified Employer status)
export async function sendEmployerEmailVerification(
  _email: string,
  _appUrl: string,
  _clientIp = 'unknown'
): Promise<{ success: boolean; message: string; previewUrl?: string; code?: string }> {
  return {
    success: false,
    message: 'Employer email verification is no longer required. Registered employer accounts automatically receive the Verified Employer badge.'
  };
}

// Complete Employer Email Verification
export async function verifyEmployerEmailRecord(
  email: string,
  codeOrToken: string
): Promise<{ success: boolean; error?: string; user?: UserRecord; updatedJobsCount?: number }> {
  if (!email || !codeOrToken) {
    return { success: false, error: 'Email and verification code/link are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = codeOrToken.trim();

  const codes = await getVerificationCodes();
  const matchIndex = codes.findIndex(c => 
    c.email.toLowerCase() === cleanEmail && 
    (c.code === cleanCode || c.token === cleanCode)
  );

  if (matchIndex === -1) {
    return { success: false, error: 'Invalid verification code or link. Please check the code or request a new one.' };
  }

  const record = codes[matchIndex];
  if (record.used) {
    return { success: false, error: 'This verification code has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    return { success: false, error: 'This verification code has expired (15 minute validity). Please request a new code.' };
  }

  // Mark code as used
  codes[matchIndex].used = true;
  codes[matchIndex].usedAt = Date.now();
  await saveVerificationCodes(codes);

  // Update user in database
  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    return { success: false, error: 'Account associated with this email could not be found.' };
  }

  const nowIso = new Date().toISOString();
  user.emailVerified = true;
  user.emailVerifiedAt = nowIso;
  await saveUser(user);

  // Update all jobs belonging to this employer
  const updatedCount = await syncEmployerVerifiedOnJobs(user.id, cleanEmail, true);

  return {
    success: true,
    user,
    updatedJobsCount: updatedCount
  };
}

// =========================================================================
// 5-Digit Access Key Recovery System (Bcrypt + Rate Limiting + 10-Min JWT)
// =========================================================================

const JWT_RESET_SECRET = process.env.JWT_SECRET || 'gulfaro-access-key-jwt-secret-secure-2026';

export function issueUserSessionToken(user: Pick<UserRecord, 'id' | 'email' | 'role'>, rememberMe = false): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email.toLowerCase(),
      role: user.role,
      purpose: 'gulfaro-user-session'
    },
    JWT_RESET_SECRET,
    { expiresIn: rememberMe ? '30d' : '24h' }
  );
}

export function verifyUserSessionToken(
  token: string
): { valid: boolean; userId?: string; email?: string; role?: string; iatMs?: number } {
  try {
    const decoded = jwt.verify(token, JWT_RESET_SECRET) as any;
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

/**
 * Hash a 5-digit Access Key using bcrypt with salt rounds of 10.
 * Never stores plain-text access keys in the database.
 */
export async function hashAccessKey(accessKey: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(accessKey, salt);
}

/**
 * Compare a candidate 5-digit Access Key against a bcrypt hash.
 */
export async function compareAccessKey(accessKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(accessKey, hash);
}

/**
 * Generate a short-lived 10-minute JWT specifically for password reset.
 */
export function generateResetJwt(user: UserRecord): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email.toLowerCase(),
      purpose: 'access-key-password-reset'
    },
    JWT_RESET_SECRET,
    { expiresIn: '10m' }
  );
}

/**
 * Verify a password reset JWT session token.
 */
export function verifyResetJwt(token: string): { valid: boolean; email?: string; userId?: string; error?: string } {
  try {
    const decoded = jwt.verify(token, JWT_RESET_SECRET) as any;
    if (!decoded || decoded.purpose !== 'access-key-password-reset' || !decoded.email) {
      return { valid: false, error: 'Invalid password reset session token.' };
    }
    return { valid: true, email: decoded.email, userId: decoded.sub };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'Password reset session has expired (10-minute limit). Please verify your Access Key again.' };
    }
    return { valid: false, error: 'Invalid or expired password reset session token.' };
  }
}

/**
 * Verify an Access Key against the database:
 * - Checks account lockout (3 failed attempts = 15 minutes lock)
 * - Hashes/compares key with bcrypt
 * - Generic error "Invalid Email or Access Key." on any mismatch to prevent enumeration
 * - Generates 10-minute JWT upon success
 */
export async function verifyAccessKeyAndGenerateToken(
  rawEmail: string,
  rawAccessKey: string,
  clientIp = 'unknown'
): Promise<{ success: boolean; token?: string; error?: string; status: number }> {
  const cleanEmail = (rawEmail || '').trim().toLowerCase();
  const cleanKey = (rawAccessKey || '').toString().trim();

  // Validate basic format (must be 5 digits and valid email)
  if (!cleanEmail || !cleanKey || !/^\d{5}$/.test(cleanKey)) {
    return {
      success: false,
      error: 'Invalid Email or Access Key.',
      status: 400
    };
  }

  const user = await findUserByEmail(cleanEmail);

  // If user does not exist, perform dummy comparison to prevent timing enumeration
  if (!user) {
    await bcrypt.compare('00000', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
    return {
      success: false,
      error: 'Invalid Email or Access Key.',
      status: 400
    };
  }

  const now = Date.now();

  // Check if account is currently locked out
  if (user.lockoutUntil && user.lockoutUntil > now) {
    const remainingMinutes = Math.ceil((user.lockoutUntil - now) / (60 * 1000));
    return {
      success: false,
      error: `Account is temporarily locked due to 3 failed attempts. Please try again after ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
      status: 429
    };
  }

  // If previous lockout period has passed, reset counter
  if (user.lockoutUntil && user.lockoutUntil <= now) {
    user.failedAttempts = 0;
    user.lockoutUntil = null;
  }

  // Compare key against bcrypt hash (fallback to default 12345 for legacy accounts)
  let isMatch = false;
  if (user.accessKeyHash) {
    isMatch = await compareAccessKey(cleanKey, user.accessKeyHash);
  } else {
    isMatch = (cleanKey === '12345');
    if (isMatch) {
      user.accessKeyHash = await hashAccessKey('12345');
    }
  }

  if (!isMatch) {
    const failedCount = (user.failedAttempts || 0) + 1;
    user.failedAttempts = failedCount;

    if (failedCount >= 3) {
      user.lockoutUntil = now + 15 * 60 * 1000; // 15-minute security lockout
      await saveUser(user);
      return {
        success: false,
        error: 'Too many failed attempts. Account has been locked for 15 minutes for your security.',
        status: 429
      };
    }

    await saveUser(user);
    // Generic error to prevent enumeration
    return {
      success: false,
      error: 'Invalid Email or Access Key.',
      status: 400
    };
  }

  // Success! Clear failed attempts and lockouts
  user.failedAttempts = 0;
  user.lockoutUntil = null;
  await saveUser(user);

  // Generate 10-minute JWT session token
  const token = generateResetJwt(user);

  return {
    success: true,
    token,
    status: 200
  };
}

/**
 * Reset password using the verified 10-minute JWT token.
 */
export async function resetPasswordWithJwt(
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; status: number }> {
  // Verify JWT
  const decoded = verifyResetJwt(resetToken);
  if (!decoded.valid || !decoded.email) {
    return {
      success: false,
      error: decoded.error || 'Invalid or expired password reset session. Please verify your Access Key again.',
      status: 401
    };
  }

  // Validate password rules (min 8 chars, 1 uppercase, 1 number)
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.', status: 400 };
  }
  if (!/[A-Z]/.test(newPassword)) {
    return { success: false, error: 'Password must contain at least one uppercase letter (A-Z).', status: 400 };
  }
  if (!/\d/.test(newPassword)) {
    return { success: false, error: 'Password must contain at least one number (0-9).', status: 400 };
  }

  const user = await findUserByEmail(decoded.email);

  if (!user) {
    return { success: false, error: 'Account could not be found.', status: 404 };
  }

  // Hash new password using PBKDF2 salt+hash (never store plaintext)
  const newHash = hashPassword(newPassword);
  user.password = undefined;
  user.passwordHash = newHash;
  user.failedAttempts = 0;
  user.lockoutUntil = null;
  await saveUser(user);

  return {
    success: true,
    status: 200
  };
}

/**
 * Send a transactional or announcement email via configured Resend/SMTP provider
 * and persist the delivery outcome to email_logs.
 */
export async function sendPlatformEmail(opts: {
  to: string;
  subject: string;
  html: string;
  category: 'verification' | 'password_reset' | 'welcome' | 'announcement' | 'security_alert' | 'admin_reset' | 'system';
  triggeredBy?: string;
}): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
  const cleanTo = opts.to.trim().toLowerCase();
  const settings = await getSiteSettings();
  const replyTo = settings.emailConfig.replyToEmail || 'admingulfaro@gmail.com';
  let fromAddress = getSenderEmail('security');

  if (settings.emailConfig.senderEmail && !/@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i.test(settings.emailConfig.senderEmail)) {
    const senderName = settings.emailConfig.senderName || 'Gulfaro Official';
    fromAddress = `${senderName} <${settings.emailConfig.senderEmail}>`;
  }

  const resend = getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: cleanTo,
        subject: opts.subject,
        html: opts.html,
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

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const { transporter, providerName } = await getEmailTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanTo,
        subject: opts.subject,
        html: opts.html,
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
      await appendEmailLogEntry({
        recipient: cleanTo,
        subject: opts.subject,
        category: opts.category,
        provider: 'SMTP',
        status: 'failed',
        error: smtpErr.message,
        triggeredBy: opts.triggeredBy
      });
      return { success: false, provider: 'SMTP', error: smtpErr.message };
    }
  }

  const msg = 'Email delivery provider is pending configuration (RESEND_API_KEY / SMTP not configured).';
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


