import React, { useEffect, useState } from 'react';
import { EmailLogItem } from './types';
import { saFetch } from './api';
import { Mail, Send, Save, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface EmailSystemViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const EmailSystemView: React.FC<EmailSystemViewProps> = ({ onToast }) => {
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [audience, setAudience] = useState<'all' | 'job_seekers' | 'employers' | 'specific'>('specific');
  const [specificEmail, setSpecificEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ emailConfig: any; providerStatus: any; logs: EmailLogItem[] }>('/emails');
      setEmailConfig(res.emailConfig);
      setProviderStatus(res.providerStatus);
      setLogs(res.logs);
    } catch (err: any) {
      onToast(err.message || 'Failed to load email settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saFetch<{ emailConfig: any }>('/emails/settings', {
        method: 'PUT',
        body: JSON.stringify(emailConfig)
      });
      setEmailConfig(res.emailConfig);
      onToast('Email templates & sender settings saved.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await saFetch<{ success: boolean; sent: number; failed: number; total: number; error?: string }>(
        '/emails/send-announcement',
        {
          method: 'POST',
          body: JSON.stringify({ audience, specificEmail, subject, message })
        }
      );
      if (res.sent > 0) {
        onToast(`Dispatched ${res.sent}/${res.total} email(s).${res.failed > 0 ? ` (${res.failed} failed)` : ''}`, 'success');
        setSubject('');
        setMessage('');
      } else {
        onToast(res.error || 'Email delivery failed.', 'error');
      }
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to dispatch emails.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading || !emailConfig) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading email configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email & Notification System</h2>
          <p className="text-xs text-slate-500">
            Inspect active mail provider health, edit transactional templates, broadcast announcements, and review delivery logs.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </button>
      </div>

      {/* Read-only Provider Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {providerStatus?.resendConfigured || providerStatus?.smtpConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="font-bold text-slate-900">
              Active Mail Transport: {providerStatus?.activeProvider || 'Unknown'}
            </p>
            <p className="text-[11px] text-slate-500">
              Verified Sender Identity: <span className="font-mono text-slate-700">{providerStatus?.fromEnv}</span> · API secrets are stored exclusively on the backend server.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Announcement Broadcaster */}
        <form onSubmit={handleSendAnnouncement} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Send className="w-4 h-4 text-teal-600" />
            <span>Send Platform Email / Announcement</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="specific">Specific Email Address</option>
                <option value="employers">All Employers</option>
                <option value="job_seekers">All Job Seekers</option>
                <option value="all">All Registered Users</option>
              </select>
            </div>
            {audience === 'specific' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={specificEmail}
                  onChange={e => setSpecificEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject Line *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Important update from Gulfaro..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Message Body *</label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement or notice..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-2.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold transition-colors disabled:opacity-60"
          >
            {sending ? 'Dispatching...' : 'Dispatch Email Now'}
          </button>
        </form>

        {/* Sender & Templates Editor */}
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-teal-600" />
              <span>Sender Identity & Templates</span>
            </h3>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[11px]"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Templates'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sender Name</label>
              <input
                type="text"
                value={emailConfig.senderName}
                onChange={e => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sender Email</label>
              <input
                type="email"
                value={emailConfig.senderEmail}
                onChange={e => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reply-To</label>
              <input
                type="email"
                value={emailConfig.replyToEmail}
                onChange={e => setEmailConfig({ ...emailConfig, replyToEmail: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Verification Email Subject</label>
            <input
              type="text"
              value={emailConfig.verificationSubject}
              onChange={e => setEmailConfig({ ...emailConfig, verificationSubject: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password Reset Email Subject</label>
            <input
              type="text"
              value={emailConfig.resetSubject}
              onChange={e => setEmailConfig({ ...emailConfig, resetSubject: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={emailConfig.welcomeEmailEnabled}
              onChange={e => setEmailConfig({ ...emailConfig, welcomeEmailEnabled: e.target.checked })}
            />
            <span className="font-semibold text-slate-700">Enable Automated Welcome Email on Registration</span>
          </label>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Welcome Email Body</label>
            <textarea
              rows={2}
              value={emailConfig.welcomeBody}
              onChange={e => setEmailConfig({ ...emailConfig, welcomeBody: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
        </form>
      </div>

      {/* Email Delivery Logs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Email Delivery Logs ({logs.length})</h3>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Recipient</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Subject</th>
                <th className="py-2 px-3">Provider</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No outgoing email logs recorded yet.</td></tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id}>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{l.recipient}</td>
                    <td className="py-2 px-3 capitalize text-slate-600">{l.category.replace('_', ' ')}</td>
                    <td className="py-2 px-3 text-slate-800 truncate max-w-xs">{l.subject}</td>
                    <td className="py-2 px-3 uppercase text-[10px] font-semibold text-slate-500">{l.provider}</td>
                    <td className="py-2 px-3">
                      <span
                        title={l.error || l.messageId}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status}
                      </span>
                      {l.error && <span className="block text-[10px] text-rose-600 truncate max-w-[180px]">{l.error}</span>}
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
