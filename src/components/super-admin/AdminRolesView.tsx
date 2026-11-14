import React, { useEffect, useState } from 'react';
import { AdminProfile, AdminRole } from './types';
import { saFetch } from './api';
import { Shield, UserPlus, Trash2, Ban, CheckCircle2, Lock, X } from 'lucide-react';

interface AdminRolesViewProps {
  currentAdmin: AdminProfile;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminRolesView: React.FC<AdminRolesViewProps> = ({ currentAdmin, onToast }) => {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'moderator' as AdminRole,
    permissions: ['overview', 'jobs', 'reports'] as string[]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ admins: AdminProfile[]; availablePermissions: string[] }>('/admins');
      setAdmins(res.admins);
      setAvailablePermissions(res.availablePermissions);
    } catch (err: any) {
      onToast(err.message || 'Failed to load administrators.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saFetch('/admins', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onToast(`Created sub-admin account "${form.username}".`, 'success');
      setShowCreate(false);
      setForm({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'moderator',
        permissions: ['overview', 'jobs', 'reports']
      });
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Could not create admin.', 'error');
    }
  };

  const handleToggleStatus = async (adm: AdminProfile) => {
    try {
      await saFetch(`/admins/${adm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: adm.status === 'active' ? 'suspended' : 'active' })
      });
      onToast(`${adm.username} status updated.`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Update failed.', 'error');
    }
  };

  const handleTogglePermission = async (adm: AdminProfile, perm: string) => {
    if (adm.isOwner || adm.role === 'super_admin') return;
    const exists = adm.permissions.includes(perm);
    const next = exists ? adm.permissions.filter(p => p !== perm) : [...adm.permissions, perm];
    try {
      await saFetch(`/admins/${adm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: next })
      });
      onToast(`Updated permissions for ${adm.username}.`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Permission update failed.', 'error');
    }
  };

  const handleDelete = async (adm: AdminProfile) => {
    if (!window.confirm(`Permanently delete sub-admin "${adm.username}"?`)) return;
    try {
      await saFetch(`/admins/${adm.id}`, { method: 'DELETE' });
      onToast(`Deleted sub-admin "${adm.username}".`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Delete failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Admin Management & Granular RBAC</h2>
          <p className="text-xs text-slate-500">
            Assign Moderator, Support, or Content Manager accounts with section-level permission scopes. The Owner account is strictly protected.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Create Sub-Admin
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">Loading admin team...</div>
      ) : (
        <div className="space-y-4">
          {admins.map(adm => (
            <div key={adm.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                    adm.isOwner ? 'bg-slate-900 text-teal-400' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {adm.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{adm.fullName}</span>
                      <span className="font-mono text-slate-500">@{adm.username}</span>
                      {adm.isOwner ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-teal-300 font-bold text-[10px] uppercase">
                          <Lock className="w-3 h-3" /> Protected Owner
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold uppercase text-[10px]">
                          {adm.role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {adm.email} · 2FA: {adm.twoFactorEnabled ? `Enabled (${adm.twoFactorMethod})` : 'Off'} · Last Login:{' '}
                      {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                {!adm.isOwner && adm.id !== currentAdmin.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(adm)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold ${
                        adm.status === 'active'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {adm.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{adm.status === 'active' ? 'Suspend' : 'Activate'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(adm)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions Matrix */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Granted Section Permissions
                </p>
                {adm.isOwner || adm.permissions.includes('*') ? (
                  <p className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Full unrestricted system access across all 14 Super Admin modules.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availablePermissions.map(perm => {
                      const granted = adm.permissions.includes(perm);
                      return (
                        <button
                          key={perm}
                          onClick={() => handleTogglePermission(adm, perm)}
                          className={`px-2.5 py-1 rounded-lg border font-semibold capitalize transition-colors ${
                            granted
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {perm.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sub-Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Create Sub-Administrator</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value as AdminRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="moderator">Moderator</option>
                    <option value="support">Support</option>
                    <option value="content_manager">Content Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password (min 10 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold">
                  Create Sub-Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
