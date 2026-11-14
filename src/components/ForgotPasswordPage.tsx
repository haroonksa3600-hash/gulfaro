import React, { useState } from 'react';
import { 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  KeyRound, 
  AlertTriangle, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Timer
} from 'lucide-react';
import { storageService } from '../services/storage';

interface ForgotPasswordPageProps {
  onNavigateToSignIn: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateToResetPassword?: (token: string, email: string) => void;
  onNavigateHome?: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToSignIn,
  onNavigateToSignUp,
  onNavigateHome
}) => {
  // Navigation / Step state: 'verify_key' -> 'reset_password' -> 'success'
  const [step, setStep] = useState<'verify_key' | 'reset_password' | 'success'>('verify_key');

  // Step 1: Verification Form Inputs
  const [email, setEmail] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showAccessKeyTooltip, setShowAccessKeyTooltip] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);

  // Step 2: Reset Password Inputs & Session
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  // -------------------------------------------------------------------------
  // STEP 1: Verify Access Key
  // -------------------------------------------------------------------------
  const handleVerifyAccessKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = accessKey.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!cleanKey || cleanKey.length !== 5 || !/^\d{5}$/.test(cleanKey)) {
      setErrorMessage('Access Key must be exactly 5 numeric digits.');
      return;
    }

    setIsVerifyingKey(true);

    try {
      const res = await storageService.verifyAccessKeyAsync(cleanEmail, cleanKey);

      if (!res.success || !res.token) {
        // Generic error to prevent enumeration or account lockout notification
        setErrorMessage(res.error || 'Invalid Email or Access Key.');
      } else {
        // Correct Access Key verified! Smoothly open the Reset Password section
        setResetToken(res.token);
        setStep('reset_password');
        setErrorMessage(null);
        setSuccessMessage('Access Key verified successfully! Choose your new password below.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // -------------------------------------------------------------------------
  // STEP 2: Submit New Password (using verified 10-minute JWT token)
  // -------------------------------------------------------------------------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage('Your password reset session has expired. Please verify your Access Key again.');
      setStep('verify_key');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password requirements before proceeding.');
      return;
    }

    setIsResettingPassword(true);

    try {
      const res = await storageService.resetPasswordWithAccessKeyAsync(resetToken, newPassword, email);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password. Your reset session may have expired.');
      } else {
        setStep('success');
        setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while updating your password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={onNavigateHome || onNavigateToSignIn}
            className="inline-flex items-center bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-sm focus:outline-none mb-3 hover:opacity-95 transition-all cursor-pointer"
            title="Return to Gulfaro"
            aria-label="Return to Gulfaro Homepage"
          >
            <img
              src="/assets/aistudio/Gulfaro_logo_white_clean.png"
              alt="Gul Faro – Jobs · Career · Opportunity"
              className="h-8 sm:h-9 w-auto object-contain mx-auto"
            />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {step === 'verify_key' && 'Enter your registered email and 5-digit Access Key to reset your password.'}
            {step === 'reset_password' && 'Choose a new secure password for your Gulfaro account.'}
            {step === 'success' && 'Your account recovery is complete.'}
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 space-y-5">
          
          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 1: VERIFY ACCESS KEY FLOW                                */}
          {/* ================================================================= */}
          {step === 'verify_key' && (
            <form onSubmit={handleVerifyAccessKey} className="space-y-4">
              
              {/* Registered Email Address */}
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="admingulfaro@gmail.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Access Key Section (Compulsory 5-Digit PIN) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="recovery-access-key" className="font-bold text-slate-800 text-xs">
                      Access Key <span className="text-rose-500">*</span>
                    </label>

                    {/* Alert/Warning Icon with Tooltip on Click and Hover */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowAccessKeyTooltip(!showAccessKeyTooltip)}
                        onMouseEnter={() => setShowAccessKeyTooltip(true)}
                        onMouseLeave={() => setShowAccessKeyTooltip(false)}
                        className="text-amber-600 hover:text-amber-700 p-0.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer focus:outline-none"
                        title="Click or hover for Access Key recovery notice"
                        aria-label="Access Key security notice"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </button>

                      {showAccessKeyTooltip && (
                        <div
                          role="tooltip"
                          className="absolute left-0 bottom-full mb-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-30 border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95"
                        >
                          <p className="leading-snug font-medium">
                            Keep your Access Key private and safe because through the Access Key you can Recover Your Account.
                          </p>
                          <div className="absolute left-3 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                    5-Digit PIN
                  </span>
                </div>

                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="recovery-access-key"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    required
                    value={accessKey}
                    onChange={(e) => {
                      // Only allow numeric digits (no letters)
                      const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setAccessKey(numericOnly);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter 5-digit PIN (e.g. 12345)"
                    className="block w-full pl-10 pr-14 py-2.5 border border-slate-300 rounded-xl text-xs font-mono tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs bg-white"
                  />
                  <div className="absolute right-3.5 top-2.5 text-[11px] font-mono font-semibold text-slate-400">
                    {accessKey.length}/5
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  Enter the 5-digit Access Key chosen when you created your Gulfaro account.
                </p>
              </div>

              {/* Verify Access Key Button */}
              <div>
                <button
                  type="submit"
                  disabled={isVerifyingKey || accessKey.length !== 5 || !email.includes('@')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  {isVerifyingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      <span>Verifying Access Key...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Access Key</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* SECTION 2: RESET PASSWORD (Revealed smoothly on verification)     */}
          {/* ================================================================= */}
          {step === 'reset_password' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Verified Session Indicator */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-950">Access Key Verified</p>
                  <p className="text-[11px] text-emerald-800">
                    Identity verified for <span className="font-mono font-bold">{email}</span>. Reset session valid for 10 minutes.
                  </p>
                </div>
                <Timer className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="border-t border-slate-100 pt-3">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Reset Password
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Enter your new secure password below.
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="new-password" className="text-xs font-bold text-slate-700">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="confirm-new-password" className="text-xs font-bold text-slate-700">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirm-new-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Real-time Password Requirements Checklist */}
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
                      At least one uppercase letter (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span className={hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                      At least one number (0-9)
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
                        {passwordsMatch ? 'Passwords match' : 'Confirm Password must match Password'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Password Reset Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isResettingPassword || !isPasswordValid}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Updating Password...</span>
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
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 3: SUCCESS STATE                                          */}
          {/* ================================================================= */}
          {step === 'success' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold text-sm text-emerald-950">Password Successfully Reset</p>
                  <p className="leading-relaxed text-emerald-800">
                    Your password has been securely updated. You can now log into your Gulfaro account with your new password.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToSignIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <span>Sign In with New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Navigation Links */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            {onNavigateToSignUp && (
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-teal-700 hover:text-teal-800 font-semibold transition-colors text-[11px] cursor-pointer"
              >
                Create Account
              </button>
            )}
          </div>

        </div>

        {/* Security Assurance */}
        <div className="mt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Gulfaro Security Gateway · Bcrypt Hashed 5-Digit PIN Recovery</span>
        </div>

      </div>

    </div>
  );
};

export default ForgotPasswordPage;
