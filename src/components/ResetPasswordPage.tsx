import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Check, X, Loader2, ArrowLeft } from 'lucide-react';
import { emailService } from '../services/emailService';

interface ResetPasswordPageProps {
  tokenProp?: string | null;
  emailProp?: string | null;
  onNavigateToSignIn: () => void;
  onNavigateToForgotPassword: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  tokenProp,
  emailProp,
  onNavigateToSignIn,
  onNavigateToForgotPassword
}) => {
  // Read params from props or directly from URL query string
  const [token, setToken] = useState<string | null>(tokenProp || null);
  const [email, setEmail] = useState<string | null>(emailProp || null);

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Parse query parameters from window.location on mount if not provided as props
  useEffect(() => {
    let isMounted = true;
    let activeToken = tokenProp;
    let activeEmail = emailProp;

    if (!activeToken || !activeEmail) {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        activeToken = searchParams.get('token') || activeToken;
        activeEmail = searchParams.get('email') || activeEmail;
      }
    }

    setToken(activeToken || null);
    setEmail(activeEmail || null);

    const validate = async () => {
      setIsValidating(true);
      const validation = await emailService.validateResetToken(activeToken || null, activeEmail || null);
      if (!isMounted) return;
      setIsValidating(false);

      if (validation.valid) {
        setIsTokenValid(true);
        setValidationError(null);
      } else {
        setIsTokenValid(false);
        setValidationError(validation.error || 'Invalid or expired reset link. Please request a new one.');
      }
    };

    validate();

    return () => {
      isMounted = false;
    };
  }, [tokenProp, emailProp]);

  // Real-time password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormSubmittable = hasMinLength && hasUppercase && hasNumber && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!token || !email) {
      setSubmitError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    if (!hasMinLength) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasUppercase) {
      setSubmitError('Password must contain at least 1 uppercase letter (A-Z).');
      return;
    }

    if (!hasNumber) {
      setSubmitError('Password must contain at least 1 number (0-9).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await emailService.resetPassword(token, email, newPassword, confirmPassword);

      if (!res.success) {
        setSubmitError(res.error || 'Failed to reset password. Please request a new link.');
      } else {
        // REQUIREMENT 4: Show exact message and redirect after 2 seconds
        setSubmitSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          onNavigateToSignIn();
        }, 2000);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={onNavigateToSignIn}
            className="inline-flex items-center bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-sm focus:outline-none mb-3 hover:opacity-95 transition-all"
            title="Return to Gulfaro"
            aria-label="Return to Gulfaro Homepage"
          >
            <img
              src="/assets/aistudio/Gulfaro_logo_white_clean.png"
              alt="Gulfaro – Jobs · Career · Opportunity"
              className="h-8 sm:h-9 w-auto object-contain mx-auto"
            />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            Choose a strong, secure password for your Gulfaro account.
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 space-y-5">
          
          {/* Validation Loading Spinner */}
          {isValidating && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">Validating secure reset token...</p>
            </div>
          )}

          {/* Invalid or Expired Token Alert */}
          {!isValidating && !isTokenValid && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-bold text-sm text-rose-800">Reset Link Expired or Invalid</h3>
                  <p className="font-medium text-rose-700 leading-relaxed">
                    {validationError || 'Invalid or expired reset link. Please request a new one.'}
                  </p>
                  <p className="text-[11px] text-rose-600">
                    For your security, Gulfaro password reset links expire after 1 hour or after being used.
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request a New Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onNavigateToSignIn}
                  className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* Valid Token -> Show Reset Password Form */}
          {!isValidating && isTokenValid && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Account Identity Badge */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Account:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {email}
                </span>
              </div>

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              {/* Submission Success Banner */}
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">{submitSuccess}</p>
                  <p className="text-[11px] text-emerald-700">Please wait while we take you to the Sign In page...</p>
                </div>
              )}

              {!submitSuccess && (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  
                  {/* New Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        New Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 8 characters)"
                        className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Confirm New Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Explicit Requirement 4 Rules Indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                    <p className="font-bold text-slate-700">Password Requirements:</p>
                    <div className="flex items-center gap-2">
                      {hasMinLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                      <span className={hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                        Minimum 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasUppercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                      <span className={hasUppercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                        At least 1 uppercase letter (A-Z)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                      <span className={hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                        At least 1 number (0-9)
                      </span>
                    </div>

                    {confirmPassword.length > 0 && (
                      <div className="flex items-center gap-2">
                        {passwordsMatch ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-500 font-bold" />
                        )}
                        <span className={passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                          {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={!isFormSubmittable}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Updating password in gulfaro_users...</span>
                        </>
                      ) : (
                        <>
                          <span>Reset Password</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </div>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>

        </div>

        {/* Security badge */}
        <div className="mt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Gulfaro Security Gateway · Session Encrypted</span>
        </div>

      </div>

    </div>
  );
};

export default ResetPasswordPage;
