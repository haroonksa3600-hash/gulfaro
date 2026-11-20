import React, { useState, useEffect } from 'react';
import { GccCountry, GCC_COUNTRIES, User } from '../types/job';
import { storageService, DEMO_USERS } from '../services/storage';
import gccMeetingImg from '../assets/images/gcc_recruitment_meeting_1793920057434.jpg';
import { 
  Building, 
  UserCheck, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Check,
  X,
  Loader2,
  AlertTriangle,
  KeyRound
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  initialRole?: 'job_seeker' | 'employer';
  onAuthSuccess: (user: User) => void;
  onCancel: () => void;
  onNavigateToForgotPassword?: () => void;
}

// Exactly the 6 GCC Countries
const GCC_COUNTRY_CHOICES: { value: GccCountry; label: string; flag: string; phoneCode: string }[] = [
  { value: 'saudi-arabia', label: 'Saudi Arabia', flag: '🇸🇦', phoneCode: '+966' },
  { value: 'uae', label: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971' },
  { value: 'qatar', label: 'Qatar', flag: '🇶🇦', phoneCode: '+974' },
  { value: 'kuwait', label: 'Kuwait', flag: '🇰🇼', phoneCode: '+965' },
  { value: 'bahrain', label: 'Bahrain', flag: '🇧🇭', phoneCode: '+973' },
  { value: 'oman', label: 'Oman', flag: '🇴🇲', phoneCode: '+968' }
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  initialRole = 'job_seeker',
  onAuthSuccess,
  onCancel,
  onNavigateToForgotPassword
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<'job_seeker' | 'employer'>(initialRole);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  // Sign In State (ONLY 2 fields: Email Address, Password)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Common Registration Fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [gccCountry, setGccCountry] = useState<GccCountry>('saudi-arabia');
  const [phone, setPhone] = useState('+966 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Compulsory 5-Digit Access Key (Account Recovery PIN)
  const [accessKey, setAccessKey] = useState('');
  const [showAccessKeyTooltip, setShowAccessKeyTooltip] = useState(false);

  // Job Seeker Specific Mandatory Field
  const [professionalTitle, setProfessionalTitle] = useState('');

  // Employer Specific Mandatory Fields
  const [companyName, setCompanyName] = useState('');
  const [hiringOrgName, setHiringOrgName] = useState('');

  // UI & Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation rules for registration
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  // Handle country selection
  const handleCountryChange = (c: GccCountry) => {
    setGccCountry(c);
    const chosen = GCC_COUNTRY_CHOICES.find(item => item.value === c);
    if (chosen) {
      setPhone(`${chosen.phoneCode} `);
    }
  };

  // ----------------------------------------------------
  // Sign In Handler (Email Address & Password ONLY)
  // ----------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = loginEmail.toLowerCase().trim();
    if (!emailTrimmed) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    // Explicitly reject phone login attempts with clear user guidance
    if (!emailTrimmed.includes('@') && /^[+0-9\s\-()]+$/.test(emailTrimmed)) {
      setErrorMsg('Users must log in using their registered email address. Phone number login is not supported.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await storageService.loginUserAsync(emailTrimmed, loginPassword, rememberMe);

      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Failed to authenticate. Please check your credentials.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Welcome back, ${res.user.name}!`);
      setTimeout(() => {
        onAuthSuccess(res.user!);
      }, 350);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Sign Up Handler (Job Seeker or Employer)
  // ----------------------------------------------------
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    // 1. Mandatory Common Fields Validation
    if (!trimmedName) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMsg('A valid Email Address is required.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 8) {
      setErrorMsg('A valid Phone Number with country code is required.');
      return;
    }

    // 2. Role-specific Mandatory Fields
    if (role === 'job_seeker') {
      if (!professionalTitle.trim()) {
        setErrorMsg('Professional Title / Trade is required for Job Seekers.');
        return;
      }
    } else {
      if (!companyName.trim()) {
        setErrorMsg('Company Name is required for Employers.');
        return;
      }
      if (!hiringOrgName.trim()) {
        setErrorMsg('Hiring Organization Name is required for Employers.');
        return;
      }
    }

    // 3. Password Rules Validation
    if (!hasMinLength) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!hasUppercase) {
      setErrorMsg('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!hasNumber) {
      setErrorMsg('Password must contain at least one number (0-9).');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Confirm Password does not match Password.');
      return;
    }

    // 3b. Compulsory 5-Digit Numeric Access Key Validation
    if (!accessKey || !/^\d{5}$/.test(accessKey)) {
      setErrorMsg('A 5-digit numeric Access Key is compulsory (numbers only, exactly 5 digits).');
      return;
    }

    setIsSubmitting(true);

    // 4. Duplicate Account Protection Pre-check
    try {
      const dup = await storageService.checkDuplicateAccountAsync(trimmedEmail, trimmedPhone);
      if (dup.exists) {
        setErrorMsg(dup.message || 'An account with this email address or phone number already exists.');
        setIsSubmitting(false);
        return;
      }
    } catch (dupErr) {
      console.warn('[AuthPage] Pre-check error (will be checked by server queue):', dupErr);
    }

    // 5. Submit Registration to Backend
    try {
      const countryConfig = GCC_COUNTRIES[gccCountry];
      const city = countryConfig?.topCities[0] || 'Riyadh';

      const res = await storageService.registerUserAsync({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
        country: gccCountry,
        city,
        phone: trimmedPhone,
        whatsapp: trimmedPhone,
        accessKey,
        // Job Seeker mandatory field:
        professionalTitle: role === 'job_seeker' ? professionalTitle.trim() : undefined,
        headline: role === 'job_seeker' ? professionalTitle.trim() : `Recruitment Lead at ${companyName.trim()}`,
        // Employer mandatory fields:
        companyName: role === 'employer' ? companyName.trim() : undefined,
        hiringOrgName: role === 'employer' ? hiringOrgName.trim() : undefined,
        companyType: 'direct-employer'
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Registration failed. Please check your information.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Account created and verified automatically! Logging you in...');
      setTimeout(() => {
        onAuthSuccess(res.user!);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo Login (authenticates with server via /api/auth/login for valid JWT)
  const handleFastDemoLogin = async (demoRole: 'job_seeker' | 'employer') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    const demoEmail =
      demoRole === 'employer'
        ? 'talent@fingulf-tech.example.com'
        : 'zaid.almansoor@example.com';
    const res = await storageService.loginUserAsync(demoEmail, 'password123', true);
    setIsSubmitting(false);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Demo sign in failed.');
      return;
    }
    setSuccessMsg(`Logged in as ${res.user.name} (${res.user.role === 'employer' ? 'Employer' : 'Job Seeker'})`);
    setTimeout(() => {
      onAuthSuccess(res.user!);
    }, 300);
  };

  const handleForgotPasswordClick = () => {
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword();
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/forgot-password');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-80px)] py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Visual Brand & Value Proposition (Desktop) */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-8 sm:p-10 relative flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={gccMeetingImg}
              alt="GCC Corporate Recruitment Meeting in Riyadh & Dubai"
              className="w-full h-full object-cover opacity-25"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950/95" />
          </div>

          <div className="relative z-10 space-y-4">
            <button
              onClick={onCancel}
              className="inline-flex text-left hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg cursor-pointer"
              title="Gulfaro – Home"
              aria-label="Gulfaro Homepage"
            >
              <img
                src="/assets/aistudio/Gulfaro_logo_white_clean.png"
                alt="Gulfaro – Jobs · Career · Opportunity"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </button>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
              The Verified Job Classifieds Marketplace for the Arabian Gulf
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Connect directly with employers and expatriate talent across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
            </p>

            <div className="space-y-3 pt-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Direct WhatsApp Communication:</strong> Reach advertisers instantly with no agency paywalls.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Role-Based Access:</strong> Dedicated tools for Employers and Job Seekers.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Verified Account Security:</strong> Encrypted password hashing and duplicate prevention.</span>
              </div>
            </div>
          </div>

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

        {/* Right Column: Authentication Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          
          <div>
            {/* Top Switcher Tabs: Sign In vs Create Account */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
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
                    setSuccessMsg(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
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
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 mb-4 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 mb-4 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* 1. SIGN IN FORM (ONLY Email Address & Password)           */}
            {/* ========================================================= */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Welcome Back to Gulfaro</h3>
                  <p className="text-slate-500 text-xs">Access your posted advertisements, saved vacancies, and direct leads</p>
                </div>

                {/* Field 1: Email Address */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admingulfaro@gmail.com"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPasswordClick}
                      className="text-[11px] text-teal-600 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-teal-600 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In to Gulfaro</span>
                  )}
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* 2. CREATE ACCOUNT FORM (Job Seeker OR Employer)           */}
            {/* ========================================================= */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create an Account</h3>
                  <p className="text-slate-500 text-xs">Select your account type — accounts are verified automatically upon signup</p>
                </div>

                {/* Account Type Selector: "I am a Job Seeker" vs "I am an Employer" */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('job_seeker');
                      setErrorMsg(null);
                    }}
                    className={`py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      role === 'job_seeker'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold text-teal-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span>I am a Job Seeker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('employer');
                      setErrorMsg(null);
                    }}
                    className={`py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      role === 'employer'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold text-teal-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building className="w-4 h-4 text-teal-600" />
                    <span>I am an Employer</span>
                  </button>
                </div>

                {/* -------------------------------------------------- */}
                {/* A. JOB SEEKER FORM: All 7 Fields Compulsory        */}
                {/* -------------------------------------------------- */}
                {role === 'job_seeker' && (
                  <div className="space-y-3">
                    {/* 1. Full Name */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Muhammad Haroon"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                      />
                    </div>

                    {/* 2. Email Address */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">(Can be registered only once)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="admingulfaro@gmail.com"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* 3. Professional Title / Trade */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Professional Title / Trade <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={professionalTitle}
                          onChange={(e) => setProfessionalTitle(e.target.value)}
                          placeholder="e.g. Civil Site Engineer, Heavy Equipment Operator, Accountant"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* 4. GCC Country Dropdown & 5. Phone Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          GCC Country <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={gccCountry}
                          onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs font-semibold bg-white cursor-pointer"
                        >
                          {GCC_COUNTRY_CHOICES.map(c => (
                            <option key={c.value} value={c.value}>
                              {c.flag} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Phone Number <span className="text-rose-500">*</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">(Unique)</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+966 5..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------- */}
                {/* B. EMPLOYER FORM: All 8 Fields Compulsory          */}
                {/* -------------------------------------------------- */}
                {role === 'employer' && (
                  <div className="space-y-3">
                    {/* 1. Full Name */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Muhammad Haroon"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                      />
                    </div>

                    {/* 2. Email Address */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">(Can be registered only once)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="admingulfaro@gmail.com"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* 3. Company Name & 4. Hiring Organization Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Company Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Al-Bawani Group"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Hiring Organization Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={hiringOrgName}
                          onChange={(e) => setHiringOrgName(e.target.value)}
                          placeholder="e.g. Al-Bawani Contracting Co. Ltd."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* 5. GCC Country Dropdown & 6. Phone Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          GCC Country <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={gccCountry}
                          onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs font-semibold bg-white cursor-pointer"
                        >
                          {GCC_COUNTRY_CHOICES.map(c => (
                            <option key={c.value} value={c.value}>
                              {c.flag} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Phone Number <span className="text-rose-500">*</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">(Unique)</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+966 5..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------- */}
                {/* Password & Confirm Password (For Both Roles)       */}
                {/* -------------------------------------------------- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">
                        Confirm Password <span className="text-rose-500">*</span>
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
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Password Requirements Checklist Indicator */}
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

                {/* -------------------------------------------------- */}
                {/* Access Key Section (COMPULSORY 5-Digit PIN)        */}
                {/* -------------------------------------------------- */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="reg-access-key" className="font-bold text-slate-800 text-xs">
                        Access Key <span className="text-rose-500">*</span>
                      </label>

                      {/* Tooltip Alert/Warning Icon with Hover & Click Behavior */}
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
                      5-DIGIT PIN
                    </span>
                  </div>

                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      id="reg-access-key"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      required
                      value={accessKey}
                      onChange={(e) => {
                        // Strict validation: Only numeric digits (no letters), maximum 5 digits
                        const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 5);
                        setAccessKey(numericOnly);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="e.g. 58291"
                      className="w-full pl-9 pr-14 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-mono tracking-widest bg-white"
                    />
                    <div className="absolute right-3 top-2 text-[10px] font-mono font-semibold text-slate-400">
                      {accessKey.length}/5
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    Must be exactly 5 numeric digits (0-9). Keep this PIN safe — it is required to verify your identity and recover your account if you forget your password.
                  </p>
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
                      I agree to the Gulfaro terms of service and verify compliance with GCC labor regulations.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isPasswordValid || accessKey.length !== 5}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Creating Account & Saving...</span>
                    </>
                  ) : (
                    <span>
                      Create {role === 'employer' ? 'Employer' : 'Job Seeker'} Account
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Fast 1-Click Demo Accounts (For testing convenience) */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ⚡ 1-Click Fast Demo Login (Instant Test):
                </span>
                <span className="text-[10px] text-teal-600 font-semibold">No password needed</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('job_seeker')}
                  className="p-2 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-lg text-left transition-colors text-xs group cursor-pointer"
                >
                  <div className="font-bold text-slate-800 group-hover:text-teal-700 flex items-center justify-between">
                    <span>👨‍💼 Job Seeker Demo</span>
                    <span className="text-[10px] text-slate-400">Riyadh</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Zaid Al-Mansoor</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('employer')}
                  className="p-2 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-lg text-left transition-colors text-xs group cursor-pointer"
                >
                  <div className="font-bold text-slate-800 group-hover:text-teal-700 flex items-center justify-between">
                    <span>🏢 Employer Demo</span>
                    <span className="text-[10px] text-slate-400">Dubai / Riyadh</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">FinGulf Technologies</p>
                </button>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">
            Protected by GCC verified employer standards · End-to-end encrypted direct contacts
          </div>

        </div>

      </div>

    </div>
  );
};
