import React, { useEffect, useRef, useState } from 'react';
import { AdminProfile, SuperAdminSection } from './types';
import { saFetch, clearStoredSuperAdminToken } from './api';
import { OverviewAnalyticsView } from './OverviewAnalyticsView';
import { UsersEmployersView } from './UsersEmployersView';
import { JobsModerationView } from './JobsModerationView';
import { AuthRegistrationsView } from './AuthRegistrationsView';
import { EmailSystemView } from './EmailSystemView';
import { ReportsView } from './ReportsView';
import { WebsiteCmsView } from './WebsiteCmsView';
import { RevenueSubscriptionsView } from './RevenueSubscriptionsView';
import { MarketplaceSettingsView } from './MarketplaceSettingsView';
import { AdminRolesView } from './AdminRolesView';
import { SecurityLogsView } from './SecurityLogsView';
import { EmergencyControlsView } from './EmergencyControlsView';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  UserCheck,
  Mail,
  Flag,
  Globe,
  BarChart3,
  CreditCard,
  MapPin,
  ShieldCheck,
  Lock,
  AlertOctagon,
  LogOut,
  ExternalLink,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface SuperAdminDashboardProps {
  admin: AdminProfile;
  inactivityTimeoutMinutes: number;
  onAdminUpdated: (admin: AdminProfile) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

const NAV_ITEMS: Array<{
  id: SuperAdminSection;
  label: string;
  permission: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Dashboard Overview', permission: 'overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users Management', permission: 'users', icon: Users },
  { id: 'employers', label: 'Employer Accounts', permission: 'employers', icon: Building2 },
  { id: 'jobs', label: 'Jobs Control & Ads', permission: 'jobs', icon: Briefcase },
  { id: 'auth_settings', label: 'Registration & Auth', permission: 'auth_settings', icon: UserCheck },
  { id: 'emails', label: 'Email & Notifications', permission: 'emails', icon: Mail },
  { id: 'reports', label: 'Reports & Safety', permission: 'reports', icon: Flag },
  { id: 'cms', label: 'Website Content & CMS', permission: 'cms', icon: Globe },
  { id: 'analytics', label: 'Analytics & Exports', permission: 'analytics', icon: BarChart3 },
  { id: 'monetization', label: 'Revenue & Plans', permission: 'monetization', icon: CreditCard },
  { id: 'marketplace', label: 'Countries & Categories', permission: 'marketplace', icon: MapPin },
  { id: 'admin_roles', label: 'Admin Roles (RBAC)', permission: 'admin_roles', icon: ShieldCheck },
  { id: 'security', label: 'Security, 2FA & Logs', permission: 'security', icon: Lock },
  { id: 'emergency', label: 'Emergency & Trash', permission: 'emergency', icon: AlertOctagon }
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  admin,
  inactivityTimeoutMinutes,
  onAdminUpdated,
  onLogout,
  onNavigateHome
}) => {
  const [activeSection, setActiveSection] = useState<SuperAdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: 'success' | 'error' }>>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.max(5, inactivityTimeoutMinutes) * 60);
  const [isLocked, setIsLocked] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Track user interaction for inactivity timeout auto-lock
  useEffect(() => {
    const timeoutSec = Math.max(5, inactivityTimeoutMinutes) * 60;
    const resetActivity = () => {
      if (!isLocked) {
        lastActivityRef.current = Date.now();
        setRemainingSeconds(timeoutSec);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const rem = Math.max(0, timeoutSec - elapsed);
      setRemainingSeconds(rem);
      if (rem === 0) {
        setIsLocked(true);
      }
    }, 1000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetActivity));
      window.clearInterval(timer);
    };
  }, [inactivityTimeoutMinutes, isLocked]);

  const hasPermission = (perm: string) => {
    if (admin.isOwner || admin.role === 'owner' || admin.permissions.includes('*')) return true;
    return admin.permissions.includes(perm);
  };

  const visibleNav = NAV_ITEMS.filter(item => hasPermission(item.permission));

  const handleSignOut = async () => {
    try {
      await saFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network error during logout
    }
    clearStoredSuperAdminToken();
    onLogout();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const activeNavMeta = NAV_ITEMS.find(n => n.id === activeSection);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Gulfaro_logo_white_clean.png"
              alt="Gulfaro"
              className="h-6 w-auto object-contain"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Super Admin
            </span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2 text-xs">
          <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
            <p className="font-bold text-white truncate">{admin.fullName}</p>
            <p className="text-[10px] text-teal-400 font-mono truncate">@{admin.username} · {admin.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-semibold text-slate-300"
            >
              <ExternalLink className="w-3 h-3" /> Public Site
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-900/60 rounded-lg text-[11px] font-semibold text-rose-200"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                {activeNavMeta?.label || 'Super Admin'}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                Gulfaro Command Center · Verified Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px] tabular-nums"
              title="Inactivity auto-lock countdown"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              Auto-lock {formatTimer(remainingSeconds)}
            </span>
            <button
              onClick={() => setIsLocked(true)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-semibold text-slate-700"
            >
              Lock Screen
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Active Module Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewAnalyticsView mode="overview" onNavigateSection={setActiveSection} onToast={addToast} />
          )}
          {activeSection === 'analytics' && (
            <OverviewAnalyticsView mode="analytics" onNavigateSection={setActiveSection} onToast={addToast} />
          )}
          {activeSection === 'users' && <UsersEmployersView mode="users" onToast={addToast} />}
          {activeSection === 'employers' && <UsersEmployersView mode="employers" onToast={addToast} />}
          {activeSection === 'jobs' && <JobsModerationView onToast={addToast} />}
          {activeSection === 'auth_settings' && <AuthRegistrationsView onToast={addToast} />}
          {activeSection === 'emails' && <EmailSystemView onToast={addToast} />}
          {activeSection === 'reports' && <ReportsView onToast={addToast} />}
          {activeSection === 'cms' && <WebsiteCmsView onToast={addToast} />}
          {activeSection === 'monetization' && <RevenueSubscriptionsView onToast={addToast} />}
          {activeSection === 'marketplace' && <MarketplaceSettingsView onToast={addToast} />}
          {activeSection === 'admin_roles' && <AdminRolesView currentAdmin={admin} onToast={addToast} />}
          {activeSection === 'security' && (
            <SecurityLogsView onAdminUpdated={onAdminUpdated} onToast={addToast} />
          )}
          {activeSection === 'emergency' && <EmergencyControlsView onToast={addToast} />}
        </main>
      </div>

      {/* Toast Stack */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl shadow-lg border text-xs font-semibold ${
              t.type === 'error'
                ? 'bg-rose-950 text-rose-50 border-rose-800'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {t.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Inactivity / Manual Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Super Admin Session Locked</h3>
              <p className="text-xs text-slate-500 mt-1">
                Signed in as <strong>@{admin.username}</strong>. Re-enter the portal or sign out cleanly.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  try {
                    await saFetch('/auth/session');
                    lastActivityRef.current = Date.now();
                    setRemainingSeconds(Math.max(5, inactivityTimeoutMinutes) * 60);
                    setIsLocked(false);
                  } catch {
                    handleSignOut();
                  }
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
              >
                Resume Verified Session
              </button>
              <button
                onClick={handleSignOut}
                className="w-full py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Sign Out & Lock Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
