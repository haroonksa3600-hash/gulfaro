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

    if (!email || !email.includes('@')) {
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

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to send password reset email. Please try again.'
        };
      }

      return {
        success: true,
        message: data.message || 'If an account with that email exists, we have sent a secure password reset link to it. Please check your inbox and spam folder.'
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
   * Validate token and email securely against the backend server
   */
  public async validateResetToken(token: string | null, rawEmail: string | null): Promise<ValidationResult> {
    if (!token || !rawEmail) {
      return {
        valid: false,
        error: 'Invalid or missing reset link. Please request a new one.'
      };
    }

    const email = rawEmail.trim().toLowerCase();

    try {
      const response = await fetch(apiUrl('/api/auth/verify-reset-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        return {
          valid: false,
          error: data.error || 'Invalid or expired password reset link. Please request a new one.'
        };
      }

      return { valid: true };
    } catch (err) {
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
    rawEmail: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const email = rawEmail.trim().toLowerCase();

    // 1. Client-side pre-validation
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.'
      };
    }

    if (!/\d/.test(newPassword)) {
      return {
        success: false,
        error: 'Password must contain at least 1 number.'
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
          token,
          email,
          password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update password. The link may have expired or already been used.'
        };
      }

      // Also update local cache so the user can immediately log in on this device
      storageService.updateUserPassword(email, newPassword);

      return { success: true };
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
