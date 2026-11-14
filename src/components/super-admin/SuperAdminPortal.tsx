import React, { useEffect, useState } from 'react';
import { AdminProfile } from './types';
import { saFetch, setSuperAdminUnauthorizedHandler, clearStoredSuperAdminToken } from './api';
import { SuperAdminLogin } from './SuperAdminLogin';
import { SuperAdminDashboard } from './SuperAdminDashboard';

interface SuperAdminPortalProps {
  onNavigateHome: () => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ onNavigateHome }) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(15);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    setSuperAdminUnauthorizedHandler(() => {
      setAdmin(null);
    });
    return () => setSuperAdminUnauthorizedHandler(null);
  }, []);

  useEffect(() => {

    let cancelled = false;
    saFetch<{ authenticated: boolean; admin: AdminProfile; inactivityTimeoutMinutes: number }>('/auth/session')
      .then(res => {
        if (!cancelled && res.authenticated && res.admin) {
          setAdmin(res.admin);
          setTimeoutMinutes(res.inactivityTimeoutMinutes || 15);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredSuperAdminToken();
          setAdmin(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-400">Verifying Gulfaro Super Admin session...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <SuperAdminLogin
        onLoginSuccess={(loggedAdmin, mins) => {
          setAdmin(loggedAdmin);
          setTimeoutMinutes(mins || 15);
        }}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  return (
    <SuperAdminDashboard
      admin={admin}
      inactivityTimeoutMinutes={timeoutMinutes}
      onAdminUpdated={updated => setAdmin(updated)}
      onLogout={() => {
        setAdmin(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/super-admin') {
          window.history.replaceState(null, '', '/super-admin');
        }
      }}
      onNavigateHome={onNavigateHome}
    />
  );
};
