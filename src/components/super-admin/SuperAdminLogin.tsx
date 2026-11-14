import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2
} from 'lucide-react';
import { AdminProfile } from './types';
import { saFetch, storeSuperAdminToken } from './api';

interface SuperAdminLoginProps {
  onLoginSuccess: (admin: AdminProfile, inactivityTimeoutMinutes: number) => void;
  onNavigateHome: () => void;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [view, setView] = useState<'login' | 'two_factor'>('login');

  // Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA Step
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email'>('totp');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('Username and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await saFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          rememberMe
        })
      });

      if (res.requiresTwoFactor) {
        setChallengeToken(res.challengeToken);
        setTwoFactorMethod(res.method || 'totp');
        setInfoMsg(res.message || 'Please enter your 6-digit verification code.');
        setView('two_factor');
        return;
      }

      if (res.success && res.admin && res.token) {
        storeSuperAdminToken(res.token, rememberMe);
        onLoginSuccess(res.admin, res.inactivityTimeoutMinutes || 15);
      } else {
        setErrorMsg(res.error || 'Authentication failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials or access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!/^\d{6}$/.test(twoFactorCode.trim())) {
      setErrorMsg('Please enter the 6-digit numeric verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await saFetch('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          challengeToken,
          code: twoFactorCode.trim()
        })
      });

      if (res.success && res.admin && res.token) {
        storeSuperAdminToken(res.token, rememberMe);
        onLoginSuccess(res.admin, res.inactivityTimeoutMinutes || 15);
      } else {
        setErrorMsg(res.error || 'Invalid 2FA code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Marketplace</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Gulfaro Control Gateway
        </span>
      </div>

      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Top Brand Strip */}
          <div className="bg-slate-900 px-7 py-6 border-b border-slate-800 text-center">
            <img
              src="/assets/aistudio/Gulfaro_logo_white_clean.png"
              alt="Gulfaro"
              className="h-9 w-auto mx-auto mb-3 object-contain"
            />
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authorized Administration Only</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1.5 tracking-tight">
              {view === 'login' && 'Super Admin Login'}
              {view === 'two_factor' && 'Two-Factor Verification'}
            </h1>
          </div>

          <div className="p-7">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter admin username"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-600 rounded-lg text-sm text-slate-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-600 rounded-lg text-sm text-slate-900 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Secure Login</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'two_factor' && (
              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {twoFactorMethod === 'email'
                    ? 'Enter the 6-digit security code dispatched to your verified administrator email.'
                    : 'Open Google Authenticator or Authy and enter the current 6-digit verification code.'}
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit Security Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-teal-600 rounded-lg text-center font-mono text-lg tracking-[0.4em] text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setErrorMsg(null);
                      setTwoFactorCode('');
                    }}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Verify & Continue</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Protected by HttpOnly session cookies, rate limiting & brute-force lockout · Gulfaro Administration
      </div>
    </div>
  );
};
