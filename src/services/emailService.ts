import { storageService } from './storage';
import { apiUrl } from './apiConfig';

export interface SendResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

class EmailService {
  /**
   * Request a real password reset email from the server.
   * - Sends request to backend /api/auth/forgot-password
   * - Server dispatches real email via production SMTP / Resend
   * - Prevents user enumeration by showing standard message
   */
  public async sendPasswordResetEmail(rawEmail: string): Promise<SendResetResult> {
    const email = rawEmail.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address.'
      };
    }

    try {
      const response = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to send password reset email. Please try again.'
        };
      }

      return {
        success: true,
        message:
          data.message ||
          'If an account exists with this email address, you will receive a password reset link shortly.'
      };
    } catch (err: any) {
      console.error('Password reset request error:', err);
      return {
        success: false,
        error: 'Unable to connect to the email server. Please check your network and try again.'
      };
    }
  }

  /**
   * Validate reset token securely against the backend server
   */
  public async validateResetToken(token: string | null, rawEmail?: string | null): Promise<ValidationResult> {
    if (!token || !token.trim()) {
      return {
        valid: false,
        error: 'Invalid or missing password reset link. Please request a new one.'
      };
    }

    const email = rawEmail ? rawEmail.trim().toLowerCase() : undefined;

    try {
      const response = await fetch(apiUrl('/api/auth/verify-reset-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email ? { token: token.trim(), email } : { token: token.trim() })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.valid) {
        return {
          valid: false,
          error: data.error || 'Invalid or expired password reset link. Please request a new one.'
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Failed to verify token with security server. Please check your connection.'
      };
    }
  }

  /**
   * Complete password reset securely on the backend server
   */
  public async resetPassword(
    token: string,
    rawEmail: string | undefined,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const email = rawEmail ? rawEmail.trim().toLowerCase() : undefined;

    // 1. Client-side pre-validation
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.'
      };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return {
        success: false,
        error: 'Password must contain at least one uppercase letter (A-Z).'
      };
    }

    if (!/\d/.test(newPassword)) {
      return {
        success: false,
        error: 'Password must contain at least one number (0-9).'
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match.'
      };
    }

    // 2. Submit to backend API
    try {
      const response = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          ...(email ? { email } : {}),
          password: newPassword,
          confirmPassword
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update password. The link may have expired or already been used.'
        };
      }

      if (email) {
        storageService.updateUserPassword(email, newPassword);
      }

      return {
        success: true,
        message:
          data.message ||
          'Your password has been successfully reset. You can now log in using your new password.'
      };
    } catch (err: any) {
      console.error('Password reset submit error:', err);
      return {
        success: false,
        error: 'Unable to communicate with the security server. Please try again.'
      };
    }
  }
}

export const emailService = new EmailService();
export default emailService;
