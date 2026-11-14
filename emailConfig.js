/**
 * Gulfaro Email Service Configuration (Resend API Production)
 * 
 * Configures transactional email delivery for:
 * - Password reset verification links (single-use, 1-hour expiration)
 * - Employer corporate domain email verification (6-digit OTP code)
 * 
 * ACTIVE PROVIDER: Resend API (https://resend.com)
 * 
 * PRODUCTION DOMAIN SETUP:
 * 1. Add your domain in the Resend dashboard: https://resend.com/domains (e.g. gulfaro.com)
 * 2. Add the 3 DNS records provided by Resend to your domain registrar (DKIM, SPF, MX).
 * 3. Once status is "Verified", set:
 *      RESEND_API_KEY="re_..."
 *      RESEND_FROM_EMAIL="Gulfaro Security <security@gulfaro.com>"
 * 4. All registered users across Gmail, Outlook, Yahoo, and corporate domains
 *    will receive emails directly to their personal and work inboxes.
 */

export const emailConfig = {
  // Official support email
  officialEmail: 'admingulfaro@gmail.com',

  // Active production provider
  provider: 'resend',

  // Resend API Configuration
  resend: {
    apiKey: process.env?.RESEND_API_KEY || '',
    fromEmail: process.env?.RESEND_FROM_EMAIL || process.env?.EMAIL_FROM || 'Gulfaro <security@gulfaro.com>',
    replyTo: 'admingulfaro@gmail.com'
  },

  // Token & OTP expirations
  tokenExpiryMs: 3600000, // 1 hour (secure single-use)
  verificationCodeExpiryMs: 900000, // 15 minutes (6-digit OTP)

  // Branding
  senderName: 'Gulfaro Security',
  resetSubject: 'Reset Your Gulfaro Password',
  verificationSubject: 'Verify Your Employer Corporate Email - Gul Faro'
};

export default emailConfig;
