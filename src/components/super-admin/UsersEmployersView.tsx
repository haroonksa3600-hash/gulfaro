import React, { useEffect, useMemo, useState } from 'react';
import { GCC_COUNTRIES, GccCountry } from '../../types/job';
import { ManagedUser } from './types';
import { saFetch } from './api';
import {
  Search,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Ban,
  CheckCircle2,
  Mail,
  LogOut,
  Trash2,
  Edit3,
  Eye,
  X,
  Lock,
  Unlock,
  Star,
  AlertTriangle
} from 'lucide-react';

interface UsersEmployersViewProps {
  mode: 'users' | 'employers';
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const UsersEmployersView: React.FC<UsersEmployersViewProps> = ({ mode, onToast }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'job_seeker' | 'employer'>(
    mode === 'employers' ? 'employer' : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: mode === 'employers' ? 'employer' : 'job_seeker',
    phone: '+966 ',
    country: 'saudi-arabia',
    city: 'Riyadh',
    companyName: '',
    professionalTitle: '',
    emailVerified: true
  });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    setRoleFilter(mode === 'employers' ? 'employer' : 'all');
  }, [mode]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ users: ManagedUser[] }>('/users');
      setUsers(res.users);
      if (selectedUser) {
        const refreshed = res.users.find(u => u.id === selectedUser.id) || null;
        setSelectedUser(refreshed);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to load accounts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false;
      if (countryFilter !== 'all' && u.country !== countryFilter) return false;
      if (verifiedFilter === 'verified' && !u.emailVerified) return false;
      if (verifiedFilter === 'unverified' && u.emailVerified) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${u.name} ${u.email} ${u.companyName || ''} ${u.phone || ''} ${u.city || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, countryFilter, verifiedFilter, search]);

  const handlePatchUser = async (userId: string, payload: Record<string, any>, successMessage: string) => {
    setActionBusyId(userId);
    try {
      await saFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      onToast(successMessage, 'success');
      await loadUsers();
    } catch (err: any) {
      onToast(err.message || 'Update failed.', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSendResetLink = async (userId: string, email: string) => {
    setActionBusyId(userId);
    try {
      const res = await saFetch<{ message: string }>(`/users/${userId}/send-reset-link`, {
        method: 'POST'
      });
      onToast(res.message || `Password reset link sent to ${email}.`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Could not dispatch reset email.', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteUser = async (user: ManagedUser, permanent = false) => {
    const label = permanent ? 'PERMANENTLY DELETE' : 'move to Trash';
    if (!window.confirm(`${label} account "${user.name}" (${user.email})?`)) return;
    setActionBusyId(user.id);
    try {
      await saFetch(`/users/${user.id}${permanent ? '?permanent=true' : ''}`, {
        method: 'DELETE'
      });
      onToast(
        permanent ? `Permanently deleted ${user.email}.` : `Moved ${user.email} to Trash (recoverable).`,
        'success'
      );
      if (selectedUser?.id === user.id) setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      onToast(err.message || 'Delete failed.', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saFetch('/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      onToast(`Created ${createForm.role === 'employer' ? 'Employer' : 'Job Seeker'} account.`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: mode === 'employers' ? 'employer' : 'job_seeker',
        phone: '+966 ',
        country: 'saudi-arabia',
        city: 'Riyadh',
        companyName: '',
        professionalTitle: '',
        emailVerified: true
      });
      await loadUsers();
    } catch (err: any) {
      onToast(err.message || 'Could not create account.', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await handlePatchUser(editingUser.id, editForm, `Updated account for ${editingUser.email}.`);
    setEditingUser(null);
  };

  const statusBadge = (status: string) => {
    if (status === 'suspended') return 'bg-amber-100 text-amber-800';
    if (status === 'banned') return 'bg-rose-100 text-rose-800';
    if (status === 'deactivated') return 'bg-slate-200 text-slate-700';
    return 'bg-emerald-100 text-emerald-800';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'employers' ? 'Employer & Company Accounts' : 'Users & Accounts Directory'}
          </h2>
          <p className="text-xs text-slate-500">
            New accounts register & activate automatically. Manage verification badges, posting limits, suspensions, and password resets here.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add {mode === 'employers' ? 'Employer' : 'Account'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company, city, or phone..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
        >
          <option value="all">All Account Roles</option>
          <option value="job_seeker">Job Seekers Only</option>
          <option value="employer">Employers Only</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>

        <div className="flex gap-2">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="flex-1 px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="all">All Countries</option>
            {Object.values(GCC_COUNTRIES).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as any)}
            className="px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="all">Any Verif.</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Account / Company</th>
                <th className="py-3 px-3 font-semibold">Role</th>
                <th className="py-3 px-3 font-semibold">Location</th>
                <th className="py-3 px-3 font-semibold">Verification</th>
                <th className="py-3 px-3 font-semibold">Activity</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">Loading accounts...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">No matching accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const countryInfo = GCC_COUNTRIES[u.country as GccCountry];
                  const busy = actionBusyId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{u.role === 'employer' && u.companyName ? u.companyName : u.name}</span>
                          {u.isFeaturedEmployer && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">Featured</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                        {u.role === 'employer' && u.companyName && (
                          <div className="text-[10px] text-slate-400">Contact: {u.name}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.role === 'employer' ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role === 'employer' ? 'Employer' : 'Job Seeker'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{countryInfo ? `${countryInfo.flag} ${u.city || countryInfo.name}` : u.country}</div>
                        <div className="text-[10px] text-slate-400">{u.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          disabled={busy}
                          onClick={() =>
                            handlePatchUser(
                              u.id,
                              { emailVerified: !u.emailVerified },
                              u.emailVerified ? `Removed verified badge from ${u.email}` : `Verified ${u.email}`
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            u.emailVerified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle verification badge"
                        >
                          {u.emailVerified ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                          <span>{u.emailVerified ? 'Verified' : 'Unverified'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-600">
                        {u.role === 'employer' ? (
                          <div>
                            <span className="font-bold text-slate-900">{u.jobsPostedCount}</span> jobs
                            {u.postingRestricted && (
                              <span className="block text-[10px] text-rose-600 font-semibold">Posting Restricted</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{u.applicationsCount}</span> applications
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${statusBadge(u.status || 'active')}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                            title="Inspect Profile, Jobs & Logins"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditForm({
                                name: u.name,
                                email: u.email,
                                phone: u.phone || '',
                                country: u.country,
                                city: u.city,
                                companyName: u.companyName || '',
                                professionalTitle: u.professionalTitle || '',
                                newPassword: ''
                              });
                            }}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                            title="Edit Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {u.role === 'employer' && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  handlePatchUser(
                                    u.id,
                                    { postingRestricted: !u.postingRestricted },
                                    u.postingRestricted ? `Restored job posting for ${u.email}` : `Restricted job posting for ${u.email}`
                                  )
                                }
                                className={`p-1.5 rounded ${u.postingRestricted ? 'bg-rose-100 text-rose-700' : 'hover:bg-slate-200 text-slate-600'}`}
                                title={u.postingRestricted ? 'Allow Job Posting' : 'Restrict Job Posting'}
                              >
                                {u.postingRestricted ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  handlePatchUser(
                                    u.id,
                                    { isFeaturedEmployer: !u.isFeaturedEmployer },
                                    u.isFeaturedEmployer ? `Unfeatured ${u.companyName || u.name}` : `Marked ${u.companyName || u.name} as Featured Employer`
                                  )
                                }
                                className={`p-1.5 rounded ${u.isFeaturedEmployer ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-200 text-slate-600'}`}
                                title="Toggle Featured Employer"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            disabled={busy}
                            onClick={() =>
                              handlePatchUser(
                                u.id,
                                {
                                  status: u.status === 'active' ? 'suspended' : 'active',
                                  suspensionReason: u.status === 'active' ? 'Suspended by Super Admin' : ''
                                },
                                u.status === 'active' ? `Suspended ${u.email}` : `Reactivated ${u.email}`
                              )
                            }
                            className={`p-1.5 rounded ${u.status === 'active' ? 'hover:bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                            title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                          >
                            {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => handleSendResetLink(u.id, u.email)}
                            className="p-1.5 rounded hover:bg-sky-100 text-sky-700"
                            title="Send Password Reset Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => handleDeleteUser(u, false)}
                            className="p-1.5 rounded hover:bg-rose-100 text-rose-600"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect User Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl border-l border-slate-200 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{selectedUser.role}</span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedUser.companyName || selectedUser.name}
                </h3>
                <p className="text-xs text-slate-500">{selectedUser.email} · {selectedUser.phone}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handlePatchUser(selectedUser.id, { forceLogout: true }, `Forced logout for ${selectedUser.email}`)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Force Logout
              </button>
              <button
                onClick={() => handlePatchUser(selectedUser.id, { status: 'banned', suspensionReason: 'Banned by Super Admin' }, `Banned ${selectedUser.email}`)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Ban Account
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">User ID:</span><span className="font-mono">{selectedUser.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Created:</span><span>{new Date(selectedUser.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Last Login IP:</span><span className="font-mono">{selectedUser.lastLoginIp || 'Not recorded'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Verified:</span><span>{selectedUser.emailVerified ? 'Yes' : 'No'}</span></div>
            </div>

            {selectedUser.jobsList && selectedUser.jobsList.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Posted Jobs ({selectedUser.jobsList.length})
                </h4>
                <div className="space-y-2">
                  {selectedUser.jobsList.map((j: any) => (
                    <div key={j.id} className="p-2.5 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{j.title}</p>
                        <p className="text-[11px] text-slate-500">{j.city} · {j.viewsCount || 0} views</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 rounded">{j.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.applicationsList && selectedUser.applicationsList.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Submitted Applications ({selectedUser.applicationsList.length})
                </h4>
                <div className="space-y-2">
                  {selectedUser.applicationsList.map((a: any) => (
                    <div key={a.id} className="p-2.5 border border-slate-200 rounded-lg text-xs">
                      <p className="font-semibold text-slate-900">{a.jobTitle}</p>
                      <p className="text-[11px] text-slate-500">{a.companyName} · {new Date(a.appliedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Recent Login & Security Events
              </h4>
              {selectedUser.recentLogins.length === 0 ? (
                <p className="text-xs text-slate-400">No login events recorded since Super Admin activation.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedUser.recentLogins.map(ev => (
                    <div key={ev.id} className="p-2 border border-slate-100 bg-slate-50 rounded text-[11px] flex justify-between">
                      <span>{ev.event} {ev.reason ? `(${ev.reason})` : ''}</span>
                      <span className="font-mono text-slate-400">{ev.ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleDeleteUser(selectedUser, true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Edit Account: {editingUser.email}</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              {editingUser.role === 'employer' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editForm.companyName || ''}
                    onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Set New Password (optional)</label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Leave blank to keep unchanged"
                  value={editForm.newPassword || ''}
                  onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border border-slate-300 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Create Platform Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="job_seeker">Job Seeker</option>
                    <option value="employer">Employer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country</label>
                  <select
                    value={createForm.country}
                    onChange={e => setCreateForm({ ...createForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.values(GCC_COUNTRIES).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              {createForm.role === 'employer' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Hiring Org Name</label>
                  <input
                    type="text"
                    value={createForm.companyName}
                    onChange={e => setCreateForm({ ...createForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password (min 8) *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={e => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.emailVerified}
                  onChange={e => setCreateForm({ ...createForm, emailVerified: e.target.checked })}
                />
                <span className="font-semibold text-slate-700">Mark account email as Verified immediately</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
