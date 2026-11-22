import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { emailService } from '../services/emailService';

interface ForgotPasswordPageProps {
  onNavigateToSignIn: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateHome?: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToSignIn,
  onNavigateToSignUp,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await emailService.sendPasswordResetEmail(cleanEmail);
      if (!res.success) {
        setErrorMessage(res.error || 'Unable to process password reset request. Please try again.');
      } else {
        setSentMessage(
          res.message ||
            'If an account exists with this email address, you will receive a password reset link shortly.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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
              alt="Gulfaro – Jobs · Career · Opportunity"
              className="h-8 sm:h-9 w-auto object-contain mx-auto"
            />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Forgot Password
          </h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {sentMessage
              ? 'Check your email inbox for your secure password reset link.'
              : 'Enter your registered email address and we will send you a secure link to reset your password.'}
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {sentMessage ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold text-sm text-emerald-950">Reset Request Received</p>
                  <p className="leading-relaxed text-emerald-800">{sentMessage}</p>
                  <p className="text-[11px] text-emerald-700 pt-1">
                    Reset links are sent from <strong>info@gulfaro.net</strong> and expire in <strong>30 minutes</strong>. Check your Spam/Junk folder if needed.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToSignIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSentMessage(null);
                  setErrorMessage(null);
                }}
                className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Try a different email address
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="name@example.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.includes('@')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

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

        <div className="mt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Gulfaro Security Gateway · Encrypted Password Recovery</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
