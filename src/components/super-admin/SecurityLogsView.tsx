import React, { useEffect, useState } from 'react';
import { AdminProfile, AuditLogItem, AuthHistoryItem } from './types';
import { saFetch, saDownloadFile } from './api';
import { KeyRound, ShieldCheck, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';

interface SecurityLogsViewProps {
  onAdminUpdated: (admin: AdminProfile) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SecurityLogsView: React.FC<SecurityLogsViewProps> = ({ onAdminUpdated, onToast }) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [suspiciousEvents, setSuspiciousEvents] = useState<AuthHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const [setupMethod, setSetupMethod] = useState<'totp' | 'email'>('totp');
  const [totpSecret, setTotpSecret] = useState('');
  const [otpAuthUri, setOtpAuthUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{
        currentAdmin: AdminProfile;
        auditLogs: AuditLogItem[];
        errorLogs: any[];
        suspiciousEvents: AuthHistoryItem[];
      }>('/security');
      setAdmin(res.currentAdmin);
      setAuditLogs(res.auditLogs);
      setErrorLogs(res.errorLogs);
      setSuspiciousEvents(res.suspiciousEvents);
    } catch (err: any) {
      onToast(err.message || 'Failed to load security data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onToast('New passwords do not match.', 'error');
      return;
    }
    setPwBusy(true);
    try {
      await saFetch('/security/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      onToast('Super Admin password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Password change failed.', 'error');
    } finally {
      setPwBusy(false);
    }
  };

  const handleInit2fa = async () => {
    try {
      const res = await saFetch<{ secret: string; otpAuthUri: string; method: 'totp' | 'email' }>('/security/2fa/setup', {
        method: 'POST',
        body: JSON.stringify({ method: setupMethod })
      });
      setTotpSecret(res.secret);
      setOtpAuthUri(res.otpAuthUri);
      if (setupMethod === 'email') {
        await saFetch('/security/2fa/enable', {
          method: 'POST',
          body: JSON.stringify({ method: 'email' })
        });
        onToast('Email 2-Factor Authentication enabled.', 'success');
        await loadData();
      }
    } catch (err: any) {
      onToast(err.message || '2FA setup failed.', 'error');
    }
  };

  const handleVerifyAndEnableTotp = async () => {
    try {
      const res = await saFetch<{ admin: AdminProfile }>('/security/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ method: 'totp', verificationCode: verifyCode })
      });
      setAdmin(res.admin);
      onAdminUpdated(res.admin);
      setTotpSecret('');
      setVerifyCode('');
      onToast('Authenticator TOTP 2-Factor Authentication enabled.', 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Verification failed.', 'error');
    }
  };

  const handleDisable2fa = async () => {
    if (!window.confirm('Disable Two-Factor Authentication for your Super Admin account?')) return;
    try {
      const res = await saFetch<{ admin: AdminProfile }>('/security/2fa/disable', { method: 'POST' });
      setAdmin(res.admin);
      onAdminUpdated(res.admin);
      onToast('Two-Factor Authentication disabled.', 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to disable 2FA.', 'error');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      await saDownloadFile('/backup/download', `gulfaro-backup-${new Date().toISOString().slice(0, 10)}.json`);
      onToast('Full database JSON backup downloaded.', 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Backup export failed.', 'error');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm(`Restore database records from "${file.name}"? This will overwrite matching collections.`)) {
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await saFetch<{ restored: string[] }>('/backup/restore', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      onToast(`Restored datasets: ${res.restored.join(', ')}`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Invalid backup JSON file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleClearLogs = async (logType: 'errors' | 'expired_tokens') => {
    try {
      await saFetch('/security/clear-logs', {
        method: 'POST',
        body: JSON.stringify({ logType })
      });
      onToast(logType === 'errors' ? 'Cleared system error logs.' : 'Purged expired reset tokens.', 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to clear logs.', 'error');
    }
  };

  if (loading || !admin) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading security center...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Security, 2FA, Backups & Audit Logs</h2>
        <p className="text-xs text-slate-500">
          Rotate credentials, enforce Two-Factor Authentication, export/restore JSON backups, and audit every administrative action.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Password Change */}
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-teal-600" />
            <span>Change Admin Password</span>
          </h3>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password (min 10 chars, A-Z & 0-9)</label>
            <input
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={pwBusy}
            className="w-full py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold"
          >
            {pwBusy ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {/* Two-Factor Authentication */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Two-Factor Authentication (2FA)</span>
          </h3>

          {admin.twoFactorEnabled ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                <p className="font-bold">2FA is Active ({admin.twoFactorMethod.toUpperCase()})</p>
                <p className="text-[11px] mt-0.5">Every Super Admin sign-in requires secondary code verification.</p>
              </div>
              <button
                onClick={handleDisable2fa}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold"
              >
                Disable 2FA
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={setupMethod}
                onChange={e => setSetupMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="totp">Authenticator App (TOTP)</option>
                <option value="email">Email One-Time Passcode</option>
              </select>
              {!totpSecret ? (
                <button
                  onClick={handleInit2fa}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  {setupMethod === 'email' ? 'Enable Email 2FA' : 'Generate Authenticator Secret'}
                </button>
              ) : (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="font-semibold text-slate-800">Enter this secret in Google Authenticator / Authy:</p>
                  <p className="font-mono font-bold text-slate-900 bg-white p-2 rounded border border-slate-200 select-all break-all">
                    {totpSecret}
                  </p>
                  {otpAuthUri && (
                    <a href={otpAuthUri} className="text-[11px] text-teal-700 underline block">
                      Open in Authenticator App
                    </a>
                  )}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded font-mono text-center tracking-widest"
                    />
                    <button
                      onClick={handleVerifyAndEnableTotp}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded font-bold"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Database Backups & Cleanup */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Database Backup & Maintenance</h3>
          <button
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold"
          >
            <Download className="w-4 h-4" /> Download Full JSON Backup
          </button>

          <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restore From JSON Backup</span>
            <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
          </label>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => handleClearLogs('expired_tokens')}
              className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              Purge Expired Tokens
            </button>
            <button
              onClick={() => handleClearLogs('errors')}
              className="py-2 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold text-rose-700 flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear Error Logs
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Administrative Audit Trail ({auditLogs.length})</h3>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Admin</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Target</th>
                <th className="py-2 px-3">Details</th>
                <th className="py-2 px-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(l => (
                <tr key={l.id}>
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="py-2 px-3 font-bold text-slate-800">{l.adminUsername}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-teal-800">{l.action}</td>
                  <td className="py-2 px-3 text-slate-500">{l.targetType} {l.targetId ? `#${l.targetId}` : ''}</td>
                  <td className="py-2 px-3 text-slate-700">{l.details}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Errors & Suspicious Alerts */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>System Security & Error Logs ({errorLogs.length})</span>
        </h3>
        {errorLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No system errors or security lockout warnings logged.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {errorLogs.map(err => (
              <div key={err.id} className="p-2.5 border border-rose-200 bg-rose-50/50 rounded-lg flex justify-between gap-4">
                <div>
                  <span className="font-bold text-rose-900">[{err.source}]</span>{' '}
                  <span className="text-rose-800">{err.message}</span>
                </div>
                <span className="text-[11px] text-rose-600 whitespace-nowrap">{new Date(err.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
