import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES, User } from '../types/job';
import { storageService } from '../services/storage';
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered: (user: User) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered
}) => {
  const [role, setRole] = useState<'job_seeker' | 'employer'>('employer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [country, setCountry] = useState<GccCountry>('saudi-arabia');
  const [city, setCity] = useState(GCC_COUNTRIES['saudi-arabia'].topCities[0]);
  const [phone, setPhone] = useState('+966 ');
  const [whatsapp, setWhatsapp] = useState('+966 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [headline, setHeadline] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCountryChange = (c: GccCountry) => {
    setCountry(c);
    setCity(GCC_COUNTRIES[c].topCities[0]);
    setPhone(GCC_COUNTRIES[c].phoneCode + ' ');
    setWhatsapp(GCC_COUNTRIES[c].phoneCode + ' ');
  };

  const handleCloseModal = () => {
    setPendingEmail(null);
    setPendingMsg(null);
    setResendNotice(null);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!name.trim() || !cleanEmail) {
      setErrorMsg('Full name and email address are required.');
      return;
    }

    if (role === 'employer' && !companyName.trim()) {
      setErrorMsg('Company / Establishment Name is required.');
      return;
    }
    if (role === 'job_seeker' && !professionalTitle.trim()) {
      setErrorMsg('Professional Title / Trade is required.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMsg('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/\d/.test(password)) {
      setErrorMsg('Password must contain at least one number (0-9).');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Confirm Password does not match Password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await storageService.registerUserAsync({
        name: name.trim(),
        email: cleanEmail,
        password,
        confirmPassword,
        role,
        companyName: role === 'employer' ? companyName.trim() : undefined,
        hiringOrgName: role === 'employer' ? companyName.trim() : undefined,
        professionalTitle: role === 'job_seeker' ? professionalTitle.trim() : undefined,
        country,
        city,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        headline:
          headline.trim() ||
          (role === 'employer'
            ? `Recruiter at ${companyName.trim()}`
            : professionalTitle.trim())
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed.');
        return;
      }

      if (res.requiresVerification !== false) {
        setPendingEmail(cleanEmail);
        setPendingMsg(
          res.message ||
            'Your registration was successful. Please check your email and click the verification link to activate your Gulfaro account.'
        );
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (res.user) {
        onUserRegistered(res.user);
        handleCloseModal();
      }
    } catch {
      setErrorMsg('An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendNotice(null);
    setIsResending(true);
    const res = await storageService.resendVerificationEmailAsync(pendingEmail);
    setIsResending(false);
    setResendNotice(
      res.success
        ? res.message ||
            'If an unverified Gulfaro account exists with that email address, a new verification link has been sent.'
        : res.error || 'Unable to resend verification email right now.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create a Gulfaro Account</h2>
            <p className="text-xs text-slate-500">Join GCC employers and job seekers across the Arabian Gulf</p>
          </div>
          <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-base leading-none cursor-pointer">
            ✕
          </button>
        </div>

        {pendingEmail ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Check Your Email</p>
                <p className="leading-relaxed text-emerald-900">{pendingMsg}</p>
                <p className="text-[11px] text-emerald-800 pt-1">
                  Sent from <strong>info@gulfaro.net</strong> to <span className="font-mono font-bold">{pendingEmail}</span>.
                </p>
              </div>
            </div>

            {resendNotice && (
              <p className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {resendNotice}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isResending}
                onClick={handleResend}
                className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Resend Verification</span>
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-teal-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setRole('employer');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  role === 'employer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 I am an Employer
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('job_seeker');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  role === 'job_seeker' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👨‍💼 I am a Job Seeker
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {role === 'employer' ? 'Contact Person Name *' : 'Your Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Muhammad Haroon"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              {role === 'employer' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Establishment Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Gulf Contracting Group W.L.L."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Professional Title / Trade *</label>
                  <input
                    type="text"
                    required
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="e.g. Civil Site Engineer, Accountant"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GCC Country</label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  >
                    <option value="saudi-arabia">🇸🇦 Saudi Arabia</option>
                    <option value="uae">🇦🇪 UAE</option>
                    <option value="qatar">🇶🇦 Qatar</option>
                    <option value="kuwait">🇰🇼 Kuwait</option>
                    <option value="bahrain">🇧🇭 Bahrain</option>
                    <option value="oman">🇴🇲 Oman</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  >
                    {GCC_COUNTRIES[country].topCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Direct Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 5..."
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+966 5..."
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8, A-Z, 0-9"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Professional Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={role === 'employer' ? 'e.g. HR Manager at Al-Bawani' : 'e.g. Civil Engineer · 5 Yrs KSA'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Creating Account...' : 'Create Account & Send Verification Link'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
