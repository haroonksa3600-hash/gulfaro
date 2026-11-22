import React, { useEffect, useMemo, useState } from 'react';
import { AuthHistoryItem } from './types';
import { saFetch } from './api';
import { Save, LogOut, ShieldAlert, Search, Trash2, Plus, KeyRound } from 'lucide-react';

interface AuthRegistrationsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AuthRegistrationsView: React.FC<AuthRegistrationsViewProps> = ({ onToast }) => {
  const [registration, setRegistration] = useState<any>(null);
  const [authHistory, setAuthHistory] = useState<AuthHistoryItem[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'suspicious' | 'failed'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{
        registration: any;
        authHistory: AuthHistoryItem[];
        activeAdminSessions: any[];
      }>('/auth-settings');
      setRegistration(res.registration);
      setAuthHistory(res.authHistory);
      setSessions(res.activeAdminSessions);
    } catch (err: any) {
      onToast(err.message || 'Failed to load auth settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saFetch<{ registration: any }>('/auth-settings', {
        method: 'PUT',
        body: JSON.stringify(registration)
      });
      setRegistration(res.registration);
      onToast('Registration & authentication policy saved.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to update auth settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleForceLogoutAll = async () => {
    if (!window.confirm('Force logout ALL regular Job Seeker and Employer accounts across the platform?')) return;
    try {
      const res = await saFetch<{ count: number }>('/sessions/force-logout-all-users', { method: 'POST' });
      onToast(`Session cutoff applied across ${res.count} user accounts.`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Action failed.', 'error');
    }
  };

  const handleRevokeAdminSession = async (sessionId: string) => {
    try {
      await saFetch(`/sessions/revoke-admin/${sessionId}`, { method: 'POST' });
      onToast('Terminated administrator session.', 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Could not revoke session.', 'error');
    }
  };

  const filteredHistory = useMemo(() => {
    return authHistory.filter(h => {
      if (historyFilter === 'suspicious' && !h.suspicious) return false;
      if (historyFilter === 'failed' && h.success) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        if (!`${h.emailOrUsername} ${h.ip} ${h.event} ${h.reason || ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [authHistory, historyFilter, historySearch]);

  if (loading || !registration) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading security policy...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Registration, Auth & Session Controls</h2>
          <p className="text-xs text-slate-500">
            Configure user onboarding, email verification policy, anti-spam rules, rate limiting, and audit live login sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleForceLogoutAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" /> Force Logout All Users
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Auth Policy'}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Onboarding & Verification</h3>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Allow Job Seeker Registrations</span>
              <span className="text-[11px] text-slate-500">New Job Seeker accounts must verify their email address via info@gulfaro.net before signing in.</span>
            </div>
            <input
              type="checkbox"
              checked={registration.allowJobSeekerRegistration}
              onChange={e => setRegistration({ ...registration, allowJobSeekerRegistration: e.target.checked })}
              className="w-4 h-4 accent-teal-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Allow Employer Registrations</span>
              <span className="text-[11px] text-slate-500">New Employer accounts must verify their email address via info@gulfaro.net before signing in and posting jobs.</span>
            </div>
            <input
              type="checkbox"
              checked={registration.allowEmployerRegistration}
              onChange={e => setRegistration({ ...registration, allowEmployerRegistration: e.target.checked })}
              className="w-4 h-4 accent-teal-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-slate-800 block">Automated Spam & Scam Screening</span>
              <span className="text-[11px] text-slate-500">Screen new signups & job posts against blocked keywords and domains.</span>
            </div>
            <input
              type="checkbox"
              checked={registration.spamProtectionEnabled}
              onChange={e => setRegistration({ ...registration, spamProtectionEnabled: e.target.checked })}
              className="w-4 h-4 accent-teal-600"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verification Mode</label>
              <select
                value={registration.emailVerificationMode}
                onChange={e => setRegistration({ ...registration, emailVerificationMode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="required">Mandatory Email Verification (info@gulfaro.net)</option>
                <option value="required_for_badge">Mandatory + Verified Badge Sync</option>
                <option value="optional">Optional (Legacy Override)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">CAPTCHA Challenge</label>
              <select
                value={registration.captchaEnabled ? registration.captchaProvider : 'off'}
                onChange={e =>
                  setRegistration({
                    ...registration,
                    captchaEnabled: e.target.value !== 'off',
                    captchaProvider: e.target.value === 'off' ? registration.captchaProvider : e.target.value
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="off">Disabled</option>
                <option value="builtin_challenge">Built-in Challenge</option>
                <option value="turnstile">Cloudflare Turnstile</option>
                <option value="hcaptcha">hCaptcha</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Failed Logins</label>
              <input
                type="number"
                min={3}
                max={20}
                value={registration.maxFailedLoginAttempts}
                onChange={e => setRegistration({ ...registration, maxFailedLoginAttempts: Number(e.target.value) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lockout (Mins)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={registration.lockoutDurationMinutes}
                onChange={e => setRegistration({ ...registration, lockoutDurationMinutes: Number(e.target.value) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Idle (Mins)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={registration.adminSessionTimeoutMinutes}
                onChange={e => setRegistration({ ...registration, adminSessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Blocked Domains & Keywords */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Blocked Domains & Auto-Flag Keywords</h3>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Blocked Disposable Email Domains</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. tempmail.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  const d = newDomain.trim().toLowerCase();
                  if (!d) return;
                  if (!registration.blockedDomains.includes(d)) {
                    setRegistration({ ...registration, blockedDomains: [...registration.blockedDomains, d] });
                  }
                  setNewDomain('');
                }}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(registration.blockedDomains || []).map((dom: string) => (
                <span key={dom} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">
                  {dom}
                  <button
                    onClick={() =>
                      setRegistration({
                        ...registration,
                        blockedDomains: registration.blockedDomains.filter((x: string) => x !== dom)
                      })
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="block font-semibold text-slate-700 mb-1.5">Blocked Spam / Fee Scam Keywords (Auto-Rejects Job Ads)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. visa fee, wire money"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  const kw = newKeyword.trim().toLowerCase();
                  if (!kw) return;
                  if (!registration.blockedKeywords.includes(kw)) {
                    setRegistration({ ...registration, blockedKeywords: [...registration.blockedKeywords, kw] });
                  }
                  setNewKeyword('');
                }}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(registration.blockedKeywords || []).map((kw: string) => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded text-[11px]">
                  {kw}
                  <button
                    onClick={() =>
                      setRegistration({
                        ...registration,
                        blockedKeywords: registration.blockedKeywords.filter((x: string) => x !== kw)
                      })
                    }
                    className="text-rose-400 hover:text-rose-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Super Admin Sessions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-teal-600" />
          <span>Active Super Admin Sessions ({sessions.length})</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Session ID</th>
                <th className="py-2 px-3">IP Address</th>
                <th className="py-2 px-3">Last Activity</th>
                <th className="py-2 px-3">User Agent</th>
                <th className="py-2 px-3 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="py-2 px-3 font-mono text-slate-700">{s.id}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{s.ip}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(s.lastActivityAt).toLocaleString()}</td>
                  <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{s.userAgent}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleRevokeAdminSession(s.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auth History Log */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Registration, Login & Suspicious Attempt Logs</span>
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter email or IP..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
            <select
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All Events</option>
              <option value="suspicious">Suspicious Only</option>
              <option value="failed">Failures Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Account</th>
                <th className="py-2 px-3">Event</th>
                <th className="py-2 px-3">IP & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No authentication events match filters.</td></tr>
              ) : (
                filteredHistory.map(ev => (
                  <tr key={ev.id} className={ev.suspicious ? 'bg-amber-50/40' : ''}>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(ev.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 capitalize font-semibold text-slate-700">{ev.actorType}</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{ev.emailOrUsername}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ev.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ev.event.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      <span className="font-mono text-slate-500 mr-2">{ev.ip}</span>
                      {ev.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
