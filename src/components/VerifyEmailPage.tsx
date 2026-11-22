import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { storageService } from '../services/storage';

interface VerifyEmailPageProps {
  tokenProp?: string | null;
  onNavigateToSignIn: (notice?: string) => void;
  onNavigateHome?: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  tokenProp,
  onNavigateToSignIn,
  onNavigateHome
}) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let token = tokenProp || '';
    if (!token && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token') || '';
    }

    const verify = async () => {
      setStatus('verifying');
      const result = await storageService.verifyEmailTokenAsync(token);
      if (!active) return;
      if (result.success) {
        setStatus('success');
        setMessage(
          result.message ||
            'Your email address has been verified! Your Gulfaro account is now active and ready to sign in.'
        );
      } else {
        setStatus('error');
        setMessage(
          result.error ||
            'This verification link is invalid or has expired. Please request a new verification email.'
        );
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [tokenProp]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    setResendSuccess(null);

    const clean = resendEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setResendError('Please enter a valid email address.');
      return;
    }

    setIsResending(true);
    const res = await storageService.resendVerificationEmailAsync(clean);
    setIsResending(false);

    if (res.success) {
      setResendSuccess(
        res.message ||
          'If an unverified Gulfaro account exists with that email address, a new verification link has been sent.'
      );
    } else {
      setResendError(res.error || 'Unable to resend verification email. Please try again later.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <button
          type="button"
          onClick={onNavigateHome || (() => onNavigateToSignIn())}
          className="inline-flex items-center bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-sm focus:outline-none mb-3 transition-all cursor-pointer"
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
          Email Verification
        </h1>
        <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
          Activating your Gulfaro Job Seeker or Employer account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 space-y-5">
          {status === 'verifying' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-9 h-9 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-800">Verifying your email address...</p>
              <p className="text-[11px] text-slate-500">Please wait while we activate your Gulfaro account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-emerald-950">Account Activated</p>
                  <p className="leading-relaxed text-emerald-800">{message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigateToSignIn(
                    'Your email address has been verified! You can now sign in to your Gulfaro account.'
                  )
                }
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onNavigateHome && (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Browse GCC Job Vacancies
                </button>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-rose-900">Verification Link Invalid or Expired</p>
                  <p className="leading-relaxed text-rose-800">{message}</p>
                </div>
              </div>

              <form onSubmit={handleResendSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-800">Need a fresh verification link?</p>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email address"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {resendError && (
                  <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {resendError}
                  </p>
                )}

                {resendSuccess && (
                  <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    {resendSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Email...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onNavigateToSignIn()}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Gulfaro Account Security · Official verification via info@gulfaro.net</span>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
