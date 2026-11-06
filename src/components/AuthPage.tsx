import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES, User, IqamaStatus, CompanyType } from '../types/job';
import { storageService, DEMO_USERS } from '../services/storage';
import { 
  Building, 
  UserCheck, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  MessageCircle, 
  AlertCircle,
  Briefcase,
  Sparkles,
  KeyRound,
  FileCheck
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  initialRole?: 'job_seeker' | 'employer';
  onAuthSuccess: (user: User) => void;
  onCancel: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  initialRole = 'job_seeker',
  onAuthSuccess,
  onCancel
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<'job_seeker' | 'employer'>(initialRole);

  // Common Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Specific Fields
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<GccCountry>('saudi-arabia');
  const [city, setCity] = useState(GCC_COUNTRIES['saudi-arabia'].topCities[0]);
  const [whatsapp, setWhatsapp] = useState('+966 5');
  const [phone, setPhone] = useState('+966 ');

  // Employer Specific Fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('direct-employer');

  // Job Seeker Specific Fields
  const [headline, setHeadline] = useState('');
  const [iqamaStatus, setIqamaStatus] = useState<IqamaStatus>('transferable');
  const [experienceYears, setExperienceYears] = useState('3-5 years');

  // State & Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Update country phone code on country change
  const handleCountryChange = (c: GccCountry) => {
    setCountry(c);
    setCity(GCC_COUNTRIES[c].topCities[0]);
    setWhatsapp(`${GCC_COUNTRIES[c].phoneCode} 5`);
    setPhone(`${GCC_COUNTRIES[c].phoneCode} `);
  };

  // Sign In Handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email or phone number.');
      return;
    }

    const res = storageService.loginUser(email, password);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to authenticate.');
      return;
    }

    setSuccessMsg(`Welcome back, ${res.user.name}!`);
    setTimeout(() => {
      onAuthSuccess(res.user!);
    }, 400);
  };

  // Sign Up Handler
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please provide your full name or contact name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (role === 'employer' && !companyName.trim()) {
      setErrorMsg('Please specify your company or organization name.');
      return;
    }

    const res = storageService.registerUser({
      name: fullName.trim(),
      email: email.trim(),
      password,
      role,
      companyName: role === 'employer' ? companyName.trim() : undefined,
      companyType: role === 'employer' ? companyType : undefined,
      country,
      city,
      whatsapp: whatsapp.trim(),
      phone: phone.trim(),
      iqamaStatus: role === 'job_seeker' ? iqamaStatus : undefined,
      experienceYears: role === 'job_seeker' ? experienceYears : undefined,
      headline: headline.trim() || (role === 'employer' ? `Recruitment Lead at ${companyName}` : `GCC Professional (${city})`)
    });

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Registration failed.');
      return;
    }

    setSuccessMsg('Account created successfully! Redirecting...');
    setTimeout(() => {
      onAuthSuccess(res.user!);
    }, 400);
  };

  // Instant 1-Click Demo Login
  const handleFastDemoLogin = (demoRole: 'job_seeker' | 'employer' | 'admin') => {
    const user = storageService.switchDemoUser(demoRole);
    setSuccessMsg(`Logged in as ${user.name} (${user.role.replace('_', ' ')})`);
    setTimeout(() => {
      onAuthSuccess(user);
    }, 300);
  };

  // Forgot password submit
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    const res = storageService.requestPasswordReset(resetEmail);
    setResetFeedback(res.message);
  };

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-80px)] py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Visual Brand & Value Proposition (Desktop) */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-8 sm:p-10 relative flex flex-col justify-between overflow-hidden">
          {/* Background image with navy tint scrim */}
          <div className="absolute inset-0 z-0">
            <img
              src="/src/assets/images/gcc_recruitment_meeting_1793920057434.jpg"
              alt="GCC Corporate Recruitment Meeting in Riyadh & Dubai"
              className="w-full h-full object-cover opacity-25"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950/95" />
          </div>

          {/* Brand & Content Header */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
                G
              </div>
              <span className="text-2xl font-black tracking-tight text-white">GULFARO</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
              The Verified Job Classifieds Marketplace for the Arabian Gulf
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Connect directly with employers and expatriate talent across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
            </p>

            {/* Value checklist */}
            <div className="space-y-3 pt-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Direct WhatsApp Communication:</strong> Reach advertisers instantly with no agency paywalls.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Iqama & Labor Law Compliant:</strong> Transferable Iqama filtering and official portal verification.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Auto-Expiring Verified Ads:</strong> Clean, fresh listings refreshed every 30 days.</span>
              </div>
            </div>
          </div>

          {/* GCC 6 Country Badges */}
          <div className="relative z-10 pt-8 border-t border-slate-800/80 mt-8">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Serving All 6 GCC Nations:
            </p>
            <div className="flex items-center gap-2 text-xl">
              <span title="Saudi Arabia">🇸🇦</span>
              <span title="United Arab Emirates">🇦🇪</span>
              <span title="Qatar">🇶🇦</span>
              <span title="Kuwait">🇰🇼</span>
              <span title="Bahrain">🇧🇭</span>
              <span title="Oman">🇴🇲</span>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form & Fast Demo Switcher */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          
          <div>
            {/* Top Switcher Tabs: Sign In vs Sign Up */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <button
                onClick={onCancel}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel
              </button>
            </div>

            {/* Error or Success Alert */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 mb-4 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 mb-4 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM A: SIGN IN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Welcome Back to Gulfaro</h3>
                  <p className="text-slate-500 text-xs">Access your posted advertisements, saved vacancies, and direct leads</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address or Registered Phone
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. zaid.almansoor@example.com or +966..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-[11px] text-teal-600 hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Remember me on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  Sign In to Gulfaro
                </button>
              </form>
            )}

            {/* FORM B: SIGN UP */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create Your Free Gulfaro Account</h3>
                  <p className="text-slate-500 text-xs">Choose whether you are hiring or seeking jobs in the Gulf</p>
                </div>

                {/* Role Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRole('job_seeker')}
                    className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                      role === 'job_seeker'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>I am a Job Seeker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('employer')}
                    className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                      role === 'employer'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 text-teal-600" />
                    <span>I am an Employer</span>
                  </button>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {role === 'employer' ? 'Contact Person Name *' : 'Full Legal Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Tariq Al-Otaibi"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>
                </div>

                {/* Employer Specific Company Details */}
                {role === 'employer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Company / Group Name *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Al-Bawani Contracting Co."
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hiring Organization Type</label>
                      <select
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none text-xs capitalize"
                      >
                        <option value="direct-employer">Direct Corporate Employer</option>
                        <option value="recruitment-agency">Licensed Recruitment Agency</option>
                        <option value="confidential">Confidential / Executive Search</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Job Seeker Specific Details */}
                {role === 'job_seeker' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Professional Title / Trade</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Civil Site Engineer (B.Sc Civil)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Iqama Status</label>
                      <select
                        value={iqamaStatus}
                        onChange={(e) => setIqamaStatus(e.target.value as IqamaStatus)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none text-xs capitalize"
                      >
                        <option value="transferable">Transferable Iqama</option>
                        <option value="non-transferable">Non-Transferable</option>
                        <option value="visit-visa">Visit Visa</option>
                        <option value="citizen-only">GCC Citizen</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Country & City Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GCC Country</label>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs font-semibold"
                    >
                      <option value="saudi-arabia">🇸🇦 Saudi Arabia (KSA)</option>
                      <option value="uae">🇦🇪 United Arab Emirates</option>
                      <option value="qatar">🇶🇦 Qatar</option>
                      <option value="kuwait">🇰🇼 Kuwait</option>
                      <option value="bahrain">🇧🇭 Bahrain</option>
                      <option value="oman">🇴🇲 Oman</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    >
                      {GCC_COUNTRIES[country].topCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* WhatsApp & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Direct WhatsApp Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+966 5..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 5..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password (6+ chars) *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      required
                      defaultChecked
                      className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                    />
                    <span>
                      I agree to the Gulfaro terms of service and verify compliance with GCC labor regulations (no charging fees to job seekers).
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  Create {role === 'employer' ? 'Employer' : 'Job Seeker'} Account
                </button>
              </form>
            )}

            {/* Fast 1-Click Demo Accounts (Extremely handy for testing!) */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ⚡ 1-Click Fast Demo Login (Instant Test):
                </span>
                <span className="text-[10px] text-teal-600 font-semibold">No password needed</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('job_seeker')}
                  className="p-2 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-lg text-left transition-colors text-xs group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-teal-700 flex items-center justify-between">
                    <span>👨‍💼 Job Seeker</span>
                    <span className="text-[10px] text-slate-400">Riyadh</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Zaid Al-Mansoor</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('employer')}
                  className="p-2 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-lg text-left transition-colors text-xs group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-teal-700 flex items-center justify-between">
                    <span>🏢 Employer</span>
                    <span className="text-[10px] text-slate-400">KSA/UAE</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Al-Bawani Group</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('admin')}
                  className="p-2 border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-lg text-left transition-colors text-xs group"
                >
                  <div className="font-bold text-amber-900 group-hover:text-amber-800 flex items-center justify-between">
                    <span>🛡️ Super Admin</span>
                    <span className="text-[10px] text-amber-600">Console</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Moderator Admin</p>
                </button>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">
            Protected by GCC verified employer standards · End-to-end encrypted direct contacts
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Reset Your Gulfaro Password</h3>
              </div>
              <button
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setResetFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {resetFeedback ? (
              <div className="space-y-3 py-2">
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs">
                  {resetFeedback}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordOpen(false);
                    setResetFeedback(null);
                  }}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Enter your registered email address or phone number. We will send a secure 6-digit verification code to your WhatsApp and email.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email or WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com or +966..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                  >
                    Send Recovery Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
