import React, { useState, useEffect } from 'react';
import { GccCountry, User } from '../types/job';
import { GCC_COUNTRY_DIRECTORY } from '../data/gccDirectory';
import {
  Briefcase,
  PlusCircle,
  Globe,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Building,
  LogOut,
  Menu,
  X,
  BookOpen,
  Info,
  Mail,
  ShieldCheck,
  UserPlus,
  LayoutGrid,
  Smartphone,
  Download,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  currentCountry: GccCountry | 'all';
  onNavigatePath: (path: string) => void;
  onSelectCountry: (country: GccCountry | 'all') => void;
  currentUser: User | null;
  onOpenPostJob: () => void;
  onNavigateTab: (tab: 'jobs' | 'dashboard' | 'safety' | 'countries' | 'my-jobs') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
  activeTab: string;
  savedCount: number;
  employerJobCount?: number;
  onInstallAndroid?: () => void;
  onOpenIOSInstall?: () => void;
  isAppInstalled?: boolean;
  isIOSDevice?: boolean;
  isAndroidDevice?: boolean;
  hasNativeInstallPrompt?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  currentUser,
  onNavigatePath,
  onOpenPostJob,
  onNavigateTab,
  onOpenAuth,
  onLogout,
  activeTab,
  savedCount,
  employerJobCount,
  onInstallAndroid,
  onOpenIOSInstall,
  isAppInstalled = false,
  isIOSDevice = false,
  isAndroidDevice = false,
  hasNativeInstallPrompt = false
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const navigateClean = (path: string) => {
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
    onNavigatePath(path);
  };

  const isHomeActive = currentPath === '/' && activeTab === 'jobs';
  const isCountriesActive = currentPath.startsWith('/country') || currentPath === '/countries';
  const isCategoriesActive = currentPath.startsWith('/category') || currentPath === '/categories';
  const isCareerActive = currentPath.startsWith('/career-advice');
  const isAboutActive = currentPath === '/about';

  return (
    <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-white">
      {/* Main 3-Zone Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Clean Brand Wordmark Only */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => navigateClean('/')}
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg py-1"
            title="Gulfaro – GCC Job Portal"
            aria-label="Gulfaro Homepage"
          >
            <img
              src="/assets/aistudio/Gulfaro_logo_white_clean.png"
              alt="Gulfaro"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
            />
          </button>
        </div>

        {/* Zone 2: Single-Line Navigation Links (5 core routes) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300" aria-label="Main Navigation">
          <button
            onClick={() => navigateClean('/')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              isHomeActive ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            Jobs
          </button>

          <button
            onClick={() => navigateClean('/countries')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              isCountriesActive ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            GCC Countries
          </button>

          <button
            onClick={() => navigateClean('/categories')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              isCategoriesActive ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            Categories
          </button>

          <button
            onClick={() => navigateClean('/career-advice')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              isCareerActive ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            Career Advice
          </button>

          <button
            onClick={() => navigateClean('/about')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              isAboutActive ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            About
          </button>
        </nav>

        {/* Zone 3: Single Primary Action & Account / Menu Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">

          {currentUser?.role === 'employer' && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenPostJob();
              }}
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post a Job</span>
            </button>
          )}

          {currentUser ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs transition-colors"
                aria-expanded={showUserMenu}
                aria-label="Account menu"
              >
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="font-semibold text-slate-100 max-w-[110px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200">
                  <div className="px-4 py-2.5 border-b border-slate-800">
                    <p className="font-bold text-sm text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    <p className="text-[11px] text-teal-400 font-semibold uppercase mt-1">
                      {currentUser.role.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'employer' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigateTab('my-jobs');
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center justify-between text-teal-300"
                      >
                        <span className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          My Job Posts
                        </span>
                        {employerJobCount !== undefined && employerJobCount > 0 && (
                          <span className="text-xs font-mono text-teal-400">{employerJobCount}</span>
                        )}
                      </button>
                    )}

                    {currentUser.role === 'job_seeker' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigateTab('dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          Saved Jobs & Profile
                        </span>
                        {savedCount > 0 && (
                          <span className="text-xs font-mono text-teal-400">{savedCount}</span>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 text-rose-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

          {/* Hamburger Menu Trigger (Mobile, Tablet & Desktop) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 shrink-0 cursor-pointer transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-teal-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/80 z-50 transition-opacity duration-200 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Responsive Hamburger Navigation Drawer (Mobile, Tablet & Desktop) */}
      <div
        className={`fixed top-0 right-0 w-[86vw] max-w-sm h-full bg-slate-950 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <button onClick={() => navigateClean('/')} className="focus:outline-none">
            <img src="/assets/aistudio/Gulfaro_logo_white_clean.png" alt="Gulfaro" className="h-7 w-auto" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {currentUser ? (
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
              <p className="text-xs text-slate-300">
                Browse GCC jobs freely, or sign in as an employer or job seeker.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2 px-3 bg-teal-600 text-white rounded-lg text-xs font-bold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="py-2 px-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {currentUser?.role === 'employer' && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenPostJob();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-teal-500 text-slate-950 rounded-xl font-bold text-sm"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Post a New Job
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Explore Gulfaro
            </p>
            {[
              { label: 'Home & Latest Jobs', path: '/', icon: <Briefcase className="w-4 h-4" /> },
              { label: 'GCC Country Portals', path: '/countries', icon: <Globe className="w-4 h-4" /> },
              { label: 'All 30 Job Categories', path: '/categories', icon: <LayoutGrid className="w-4 h-4" /> },
              { label: 'Career Advice & Guides', path: '/career-advice', icon: <BookOpen className="w-4 h-4" /> },
              { label: 'About Gulfaro', path: '/about', icon: <Info className="w-4 h-4" /> },
              { label: 'Contact Us', path: '/contact', icon: <Mail className="w-4 h-4" /> }
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigateClean(item.path)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900"
              >
                <span className="flex items-center gap-3">
                  <span className="text-teal-400">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            ))}

            {currentUser && (
              <>
                {currentUser.role === 'employer' && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateTab('my-jobs');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-teal-300 hover:bg-slate-900"
                  >
                    <span className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4" />
                      My Job Posts
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}
                {currentUser.role === 'job_seeker' && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateTab('dashboard');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900"
                  >
                    <span className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-teal-400" />
                      My Dashboard
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateTab('safety');
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Safety & Hiring Rules
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Download Gulfaro App (Exclusive Location Inside Hamburger Menu) */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5" aria-label="Download Gulfaro App">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Download Gulfaro App</span>
              </p>
              {isAppInstalled ? (
                <span className="text-[10px] font-semibold text-teal-300">Installed</span>
              ) : (isAndroidDevice || isIOSDevice) ? (
                <span className="text-[10px] font-semibold text-slate-400">
                  {isAndroidDevice ? 'Android detected' : 'iPhone / iPad detected'}
                </span>
              ) : null}
            </div>

            {isAppInstalled ? (
              <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/60 flex items-center gap-2.5 text-xs text-teal-200">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Gulfaro App is installed on this device.</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-xs text-slate-300 leading-snug">
                  {isAndroidDevice
                    ? 'Install Gulfaro directly on your Android home screen for 1-tap job access.'
                    : isIOSDevice
                    ? 'Add Gulfaro to your iPhone or iPad home screen via Safari.'
                    : 'Choose your mobile platform to install the Gulfaro Web App.'}
                </p>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onInstallAndroid?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isAndroidDevice || (hasNativeInstallPrompt && !isIOSDevice)
                        ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border-slate-700 font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Download
                        className={`w-4 h-4 shrink-0 ${
                          isAndroidDevice || (hasNativeInstallPrompt && !isIOSDevice)
                            ? 'text-slate-950'
                            : 'text-teal-400'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs leading-tight">Android</span>
                        <span
                          className={`block text-[10px] leading-tight ${
                            isAndroidDevice || (hasNativeInstallPrompt && !isIOSDevice)
                              ? 'text-slate-900/80 font-medium'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          {hasNativeInstallPrompt ? 'Direct installation prompt' : 'Browser install guide'}
                        </span>
                      </span>
                    </span>
                    {isAndroidDevice && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 shrink-0">
                        Your Device
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenIOSInstall?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isIOSDevice
                        ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border-slate-700 font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Smartphone
                        className={`w-4 h-4 shrink-0 ${
                          isIOSDevice ? 'text-slate-950' : 'text-teal-400'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs leading-tight">iPhone / iPad</span>
                        <span
                          className={`block text-[10px] leading-tight ${
                            isIOSDevice
                              ? 'text-slate-900/80 font-medium'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          Safari Add to Home Screen
                        </span>
                      </span>
                    </span>
                    {isIOSDevice && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 shrink-0">
                        Your Device
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Browse by GCC Country
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {GCC_COUNTRY_DIRECTORY.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigateClean(`/country/${c.slug}`)}
                  className="px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                >
                  <span>{c.flag}</span>
                  <span className="truncate">{c.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {currentUser && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold text-rose-400 border border-rose-900/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
