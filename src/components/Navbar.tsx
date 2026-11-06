import React, { useState, useEffect } from 'react';
import { GccCountry, GCC_COUNTRIES, User } from '../types/job';
import { 
  Briefcase, 
  PlusCircle, 
  Globe, 
  ShieldCheck, 
  UserCheck, 
  Sliders, 
  ChevronDown,
  ChevronRight,
  Building,
  Bookmark,
  CheckCircle2,
  LogIn,
  UserPlus,
  LogOut,
  Menu,
  X,
  Sparkles,
  FileText
} from 'lucide-react';

interface NavbarProps {
  currentCountry: GccCountry | 'all';
  onSelectCountry: (country: GccCountry | 'all') => void;
  currentUser: User | null;
  onSwitchUserRole: (role: 'job_seeker' | 'employer' | 'admin') => void;
  onOpenPostJob: () => void;
  onNavigateTab: (tab: 'jobs' | 'dashboard' | 'admin' | 'safety' | 'countries') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
  activeTab: string;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCountry,
  onSelectCountry,
  currentUser,
  onSwitchUserRole,
  onOpenPostJob,
  onNavigateTab,
  onOpenAuth,
  onLogout,
  activeTab,
  savedCount
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prevent background scroll when mobile navigation drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close mobile navigation drawer with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Handlers that perform action and dismiss mobile menu in 1 tap
  const handleNavClick = (tab: 'jobs' | 'dashboard' | 'admin' | 'safety' | 'countries') => {
    onNavigateTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleCountryClick = (country: GccCountry | 'all') => {
    onSelectCountry(country);
    setIsMobileMenuOpen(false);
  };

  const handlePostJobClick = () => {
    setIsMobileMenuOpen(false);
    onOpenPostJob();
  };

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setIsMobileMenuOpen(false);
    onOpenAuth(mode);
  };

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    onLogout();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      {/* Top Utility Bar: GCC Country Selector & Quick Persona Switcher (Desktop & Tablet) */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-6 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* GCC Country Quick Ticker */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none text-slate-300">
            <span className="text-slate-400 font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              GCC Portals:
            </span>
            <button
              onClick={() => onSelectCountry('all')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap shrink-0 text-xs ${
                currentCountry === 'all' 
                  ? 'bg-teal-600 text-white font-semibold' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌐 All GCC
            </button>
            {Object.values(GCC_COUNTRIES).map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCountry(c.id)}
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 text-xs ${
                  currentCountry === c.id 
                    ? 'bg-teal-600 text-white font-semibold' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Quick Demo Role Switcher or Sign In Prompt (Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Persona:</span>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-[11px]">
                  <button
                    onClick={() => onSwitchUserRole('job_seeker')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentUser.role === 'job_seeker' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Job Seeker
                  </button>
                  <button
                    onClick={() => onSwitchUserRole('employer')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentUser.role === 'employer' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Employer
                  </button>
                  <button
                    onClick={() => onSwitchUserRole('admin')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentUser.role === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Super Admin
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <span>Direct WhatsApp & Applications:</span>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="text-teal-400 hover:text-teal-300 font-bold hover:underline flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-8">
        
        {/* Zone 1: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => handleNavClick('jobs')}
            className="flex items-center gap-2 sm:gap-2.5 text-left group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-black text-slate-950 shadow-md">
              <span className="text-base sm:text-lg tracking-tighter">G</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white group-hover:text-teal-300 transition-colors">
                GULFARO
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] tracking-wider uppercase font-semibold text-teal-400">
                GCC Job Classifieds
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links (Desktop layout unchanged) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigateTab('jobs')}
            className={`whitespace-nowrap transition-colors hover:text-teal-300 ${
              activeTab === 'jobs' ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            Browse Vacancies
          </button>

          <button
            onClick={() => onNavigateTab('countries')}
            className={`whitespace-nowrap transition-colors hover:text-teal-300 ${
              activeTab === 'countries' ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            GCC Countries
          </button>

          {currentUser ? (
            <button
              onClick={() => onNavigateTab('dashboard')}
              className={`whitespace-nowrap flex items-center gap-1.5 transition-colors hover:text-teal-300 ${
                activeTab === 'dashboard' ? 'text-teal-400 font-semibold' : ''
              }`}
            >
              <span>{currentUser.role === 'employer' ? 'Employer Portal' : 'My Dashboard'}</span>
              {currentUser.role === 'job_seeker' && savedCount > 0 && (
                <span className="bg-slate-800 text-teal-400 text-xs px-1.5 py-0.2 rounded-full border border-teal-500/40">
                  {savedCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth('signup')}
              className="whitespace-nowrap transition-colors hover:text-teal-300"
            >
              Employer Hub
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onNavigateTab('admin')}
              className={`whitespace-nowrap flex items-center gap-1 transition-colors hover:text-amber-300 ${
                activeTab === 'admin' ? 'text-amber-400 font-bold' : 'text-amber-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Admin Moderation
            </button>
          )}

          <button
            onClick={() => onNavigateTab('safety')}
            className={`whitespace-nowrap transition-colors hover:text-teal-300 ${
              activeTab === 'safety' ? 'text-teal-400 font-semibold' : ''
            }`}
          >
            Safety & Iqama Rules
          </button>
        </nav>

        {/* Zone 3: Primary Action + Desktop Profile / Auth + Mobile Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Post Job CTA Button */}
          <button
            onClick={onOpenPostJob}
            className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-sm transition-all whitespace-nowrap active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Post</span>
          </button>

          {/* Desktop/Tablet: Signed In User Menu (unchanged on desktop & tablet) */}
          {currentUser ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                aria-expanded={showUserMenu}
                aria-label="User profile options"
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 font-semibold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-slate-100 max-w-[100px] truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-teal-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50 text-slate-200">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="font-bold text-sm text-white">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 inline-block text-[11px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60 uppercase font-semibold">
                      Role: {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigateTab('dashboard');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>{currentUser.role === 'employer' ? 'Manage My Postings' : 'Saved Jobs & Applications'}</span>
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          onNavigateTab('admin');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 text-amber-300 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Admin Control Panel</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 text-rose-400 hover:text-rose-300"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-2 px-3">
                    <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Switch Persona:</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          onSwitchUserRole('job_seeker');
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                          currentUser.role === 'job_seeker' ? 'bg-teal-600/20 text-teal-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>👨‍💼 Job Seeker</span>
                        {currentUser.role === 'job_seeker' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                      </button>
                      <button
                        onClick={() => {
                          onSwitchUserRole('employer');
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                          currentUser.role === 'employer' ? 'bg-teal-600/20 text-teal-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>🏢 Employer / Recruiter</span>
                        {currentUser.role === 'employer' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                      </button>
                      <button
                        onClick={() => {
                          onSwitchUserRole('admin');
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                          currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>🛡️ Super Admin</span>
                        {currentUser.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: Single "Join" Button (Desktop, Tablet & Mobile) */
            <div className="flex items-center">
              <button
                onClick={() => onOpenAuth('signup')}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-700/80 border border-slate-700 hover:border-teal-500/50 rounded-lg transition-all shadow-2xs whitespace-nowrap active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
                <span>Join</span>
              </button>
            </div>
          )}

          {/* Clean Mobile Hamburger Menu Toggle Button (☰ / ✕) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white border border-slate-700/90 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 shrink-0"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-teal-400 transition-transform duration-200" />
            ) : (
              <Menu className="w-5 h-5 transition-transform duration-200" />
            )}
          </button>

        </div>

      </div>

      {/* Smooth Mobile Navigation Slide-out Drawer */}
      {/* 1. Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Slide-out Navigation Drawer */}
      <div
        className={`fixed top-0 right-0 w-[88vw] max-w-sm h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-black text-slate-950 shadow-md">
              <span className="text-base tracking-tighter">G</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">GULFARO</span>
              <span className="block text-[9px] font-semibold text-teal-400 tracking-wider uppercase">GCC Job Classifieds</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Drawer Scrollable Body with all navigation options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
          
          {/* User Account / Status Card */}
          {currentUser ? (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-base flex items-center justify-center shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate text-sm">{currentUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60 font-semibold uppercase tracking-wider">
                    <UserCheck className="w-3 h-3 text-teal-400" />
                    <span>{currentUser.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* 1-Tap Persona Switcher */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                  <span>Switch Role:</span>
                  <span className="text-[10px] text-teal-400">1-tap demo switch</span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => onSwitchUserRole('job_seeker')}
                    className={`py-1.5 px-1 text-center rounded font-semibold transition-colors ${
                      currentUser.role === 'job_seeker'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Candidate
                  </button>
                  <button
                    onClick={() => onSwitchUserRole('employer')}
                    className={`py-1.5 px-1 text-center rounded font-semibold transition-colors ${
                      currentUser.role === 'employer'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Employer
                  </button>
                  <button
                    onClick={() => onSwitchUserRole('admin')}
                    className={`py-1.5 px-1 text-center rounded font-semibold transition-colors ${
                      currentUser.role === 'admin'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-slate-800 space-y-3">
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">Welcome to Gulfaro</p>
                <p className="text-xs text-slate-400">
                  Connect directly with employers in KSA, UAE, Qatar, Kuwait, Bahrain & Oman.
                </p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Join</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Quick Action: Post a Job Free */}
          <button
            onClick={handlePostJobClick}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:from-teal-600 active:to-teal-700 text-slate-950 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-5 h-5 text-slate-950 shrink-0" />
              <div className="text-left">
                <p className="font-extrabold leading-tight">Post a Job Ad Free</p>
                <p className="text-[11px] font-medium text-teal-950">Direct WhatsApp applications</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>

          {/* Main Navigation Links (All 1-Tap Accessible) */}
          <div className="space-y-1 pt-1">
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              All Navigation Options
            </p>

            {/* 1. Browse All Vacancies */}
            <button
              onClick={() => handleNavClick('jobs')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                activeTab === 'jobs'
                  ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className={`w-4 h-4 ${activeTab === 'jobs' ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>Browse Vacancies</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 2. GCC Countries */}
            <button
              onClick={() => handleNavClick('countries')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                activeTab === 'countries'
                  ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe className={`w-4 h-4 ${activeTab === 'countries' ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>GCC Country Hubs</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 3. Dashboard / Employer Portal */}
            {currentUser ? (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{currentUser.role === 'employer' ? 'Employer Portal' : 'My Dashboard'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {currentUser.role === 'job_seeker' && savedCount > 0 && (
                    <span className="bg-teal-500/20 text-teal-300 text-xs px-2 py-0.5 rounded-full border border-teal-500/40 font-bold">
                      {savedCount} saved
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            ) : (
              <button
                onClick={() => handleAuthClick('signup')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>Employer Hub & Postings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            )}

            {/* 4. Admin Panel (if admin role) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin Moderation Panel</span>
                </div>
                <span className="text-[10px] uppercase font-bold bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </button>
            )}

            {/* 5. Safety & Iqama Rules */}
            <button
              onClick={() => handleNavClick('safety')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                activeTab === 'safety'
                  ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${activeTab === 'safety' ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>Safety & Iqama Rules</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Quick GCC Country Switcher in Drawer (1-Tap Switching) */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Country Portal
              </p>
              <span className="text-[10px] text-teal-400 font-medium">1-tap filter</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleCountryClick('all')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  currentCountry === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>🌐</span>
                <span className="truncate">All GCC</span>
              </button>
              {Object.values(GCC_COUNTRIES).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCountryClick(c.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentCountry === c.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out Action (if logged in) */}
          {currentUser && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-[11px] text-slate-500 shrink-0">
          <p>© Gulfaro · GCC Job Classifieds Marketplace</p>
        </div>
      </div>
    </header>
  );
};
