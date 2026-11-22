/**
 * Gulfaro Email Service Configuration (Hostinger SMTP Production)
 *
 * Configures transactional email delivery for:
 * - Account email verification links (single-use, 24-hour expiration)
 * - Password reset verification links (single-use, 30-minute expiration)
 * - Welcome emails upon account verification
 *
 * OFFICIAL MAILBOX: info@gulfaro.net via Hostinger SMTP (smtp.hostinger.com:465)
 */

export const emailConfig = {
  officialEmail: process.env?.EMAIL_FROM || 'info@gulfaro.net',
  provider: 'smtp',

  smtp: {
    host: process.env?.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env?.SMTP_PORT) || 465,
    secure: process.env?.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    user: process.env?.SMTP_USER || 'info@gulfaro.net',
    fromEmail: process.env?.EMAIL_FROM || 'info@gulfaro.net',
    fromName: process.env?.EMAIL_FROM_NAME || 'Gulfaro',
    replyTo: process.env?.EMAIL_FROM || 'info@gulfaro.net'
  },

  // Token expirations
  verificationTokenExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
  resetTokenExpiryMs: 30 * 60 * 1000, // 30 minutes

  // Branding & subjects
  senderName: process.env?.EMAIL_FROM_NAME || 'Gulfaro',
  verificationSubject: 'Verify Your Gulfaro Account',
  resetSubject: 'Reset Your Gulfaro Password',
  welcomeSubject: 'Welcome to Gulfaro!'
};

export default emailConfig;
