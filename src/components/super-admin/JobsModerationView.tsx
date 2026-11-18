import React, { useEffect, useMemo, useState } from 'react';
import { GCC_COUNTRIES, GccCountry, JobAd } from '../../types/job';
import {
  JOB_CATEGORIES,
  jobMatchesCategoryFilter,
  resolveJobCategoryId
} from '../../data/categories';
import { saFetch } from './api';
import {
  Search,
  Plus,
  Sparkles,
  Zap,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  Flag
} from 'lucide-react';

interface ManagedJob extends JobAd {
  reportsCount?: number;
  openReportsCount?: number;
}

interface JobsModerationViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const JobsModerationView: React.FC<JobsModerationViewProps> = ({ onToast }) => {
  const [jobs, setJobs] = useState<ManagedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingJob, setEditingJob] = useState<ManagedJob | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobForm, setJobForm] = useState<any>({
    title: '',
    company: '',
    country: 'saudi-arabia',
    city: '',
    category: 'engineering',
    salaryMin: 5000,
    salaryMax: 9000,
    currency: 'SAR',
    employmentType: 'full-time',
    experienceLevel: '3-5-years',
    iqamaRequirement: 'transferable',
    contactEmail: 'admingulfaro@gmail.com',
    contactPhone: '+966 50 000 0000',
    contactWhatsapp: '+966 50 000 0000',
    companyType: 'direct-company',
    description: '',
    isFeatured: false,
    isUrgent: false,
    status: 'active'
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ jobs: ManagedJob[] }>('/jobs');
      setJobs(res.jobs);
    } catch (err: any) {
      onToast(err.message || 'Failed to load jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (statusTab === 'featured' && !j.isFeatured) return false;
      else if (statusTab === 'urgent' && !j.isUrgent) return false;
      else if (statusTab === 'reported' && !(j.openReportsCount && j.openReportsCount > 0)) return false;
      else if (!['all', 'featured', 'urgent', 'reported'].includes(statusTab) && j.status !== statusTab) return false;

      if (countryFilter !== 'all' && j.country !== countryFilter) return false;
      if (categoryFilter !== 'all' && !jobMatchesCategoryFilter(j, categoryFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${j.id} ${j.title} ${j.company} ${j.city} ${j.contactEmail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, statusTab, countryFilter, categoryFilter, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredJobs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJobs.map(j => j.id));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'hide' | 'close' | 'feature' | 'unfeature' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Move ${selectedIds.length} selected jobs to Trash?`)) return;
    try {
      const res = await saFetch<{ affected: number }>('/jobs/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, action })
      });
      onToast(`Applied "${action}" to ${res.affected} job(s).`, 'success');
      setSelectedIds([]);
      await loadJobs();
    } catch (err: any) {
      onToast(err.message || 'Bulk action failed.', 'error');
    }
  };

  const handleQuickPatch = async (jobId: string, updates: Record<string, any>, msg: string) => {
    try {
      await saFetch(`/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      onToast(msg, 'success');
      await loadJobs();
    } catch (err: any) {
      onToast(err.message || 'Update failed.', 'error');
    }
  };

  const handleDeleteJob = async (job: ManagedJob) => {
    if (!window.confirm(`Move "${job.title}" (${job.id}) to Trash?`)) return;
    try {
      await saFetch(`/jobs/${job.id}`, { method: 'DELETE' });
      onToast(`Moved "${job.title}" to Trash.`, 'success');
      await loadJobs();
    } catch (err: any) {
      onToast(err.message || 'Delete failed.', 'error');
    }
  };

  const handleSaveJobForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingJob) {
        await saFetch(`/jobs/${editingJob.id}`, {
          method: 'PATCH',
          body: JSON.stringify(jobForm)
        });
        onToast(`Updated job ${editingJob.id}.`, 'success');
        setEditingJob(null);
      } else {
        await saFetch('/jobs', {
          method: 'POST',
          body: JSON.stringify(jobForm)
        });
        onToast('Published new job listing.', 'success');
        setShowCreateModal(false);
      }
      await loadJobs();
    } catch (err: any) {
      onToast(err.message || 'Could not save job.', 'error');
    }
  };

  const openEdit = (j: ManagedJob) => {
    setEditingJob(j);
    setJobForm({
      title: j.title,
      company: j.company,
      country: j.country,
      city: j.city,
      category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory }),
      salaryMin: j.salaryMin || 0,
      salaryMax: j.salaryMax || 0,
      currency: j.currency,
      employmentType: j.employmentType,
      experienceLevel: j.experienceLevel,
      iqamaRequirement: j.iqamaRequirement,
      contactEmail: j.contactEmail,
      contactPhone: j.contactPhone,
      contactWhatsapp: j.contactWhatsapp,
      companyType: j.companyType,
      description: j.description,
      isFeatured: j.isFeatured,
      isUrgent: j.isUrgent,
      status: j.status
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Jobs Control & Post-Publish Moderation</h2>
          <p className="text-xs text-slate-500">
            Valid employer jobs publish automatically with spam & restriction screening. Override visibility, featured status, expiry, or edit any ad here.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingJob(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Job Directly</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-2 text-xs">
        {[
          { id: 'all', label: `All (${jobs.length})` },
          { id: 'active', label: `Active (${jobs.filter(j => j.status === 'active').length})` },
          { id: 'featured', label: `Featured (${jobs.filter(j => j.isFeatured).length})` },
          { id: 'urgent', label: `Urgent (${jobs.filter(j => j.isUrgent).length})` },
          { id: 'hidden', label: `Hidden (${jobs.filter(j => j.status === 'hidden' || j.status === 'rejected').length})` },
          { id: 'closed', label: `Closed (${jobs.filter(j => j.status === 'closed').length})` },
          { id: 'expired', label: `Expired (${jobs.filter(j => j.status === 'expired').length})` },
          { id: 'reported', label: `Reported (${jobs.filter(j => j.openReportsCount && j.openReportsCount > 0).length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusTab(tab.id);
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors tabular-nums ${
              statusTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Bulk Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID (#GF-), job title, company, city, or contact email..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>
          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50"
          >
            <option value="all">All GCC Countries</option>
            {Object.values(GCC_COUNTRIES).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50"
          >
            <option value="all">All Categories</option>
            {JOB_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-800 tabular-nums">{selectedIds.length} job(s) selected</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => handleBulkAction('activate')} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">Activate</button>
              <button onClick={() => handleBulkAction('feature')} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">Feature</button>
              <button onClick={() => handleBulkAction('hide')} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold">Hide</button>
              <button onClick={() => handleBulkAction('close')} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold">Close</button>
              <button onClick={() => handleBulkAction('delete')} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold">Move to Trash</button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedIds.length === filteredJobs.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3 px-3 font-semibold">Job Advertisement</th>
                <th className="py-3 px-3 font-semibold">Country & City</th>
                <th className="py-3 px-3 font-semibold">Visibility / Flags</th>
                <th className="py-3 px-3 font-semibold">Metrics & Expiry</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading listings...</td></tr>
              ) : filteredJobs.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">No job advertisements match filters.</td></tr>
              ) : (
                filteredJobs.map(j => {
                  const countryInfo = GCC_COUNTRIES[j.country as GccCountry];
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(j.id)}
                          onChange={() => toggleSelect(j.id)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{j.title}</span>
                          {j.openReportsCount && j.openReportsCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                              <Flag className="w-2.5 h-2.5" /> {j.openReportsCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {j.company} · <span className="font-mono text-slate-400">{j.id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {countryInfo ? `${countryInfo.flag} ${j.city || countryInfo.name}` : (j.city || j.country)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              handleQuickPatch(
                                j.id,
                                { isFeatured: !j.isFeatured, packageType: !j.isFeatured ? 'featured' : 'standard' },
                                j.isFeatured ? `Removed featured highlight from ${j.id}` : `Featured ${j.id}`
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              j.isFeatured ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" /> Featured
                          </button>
                          <button
                            onClick={() =>
                              handleQuickPatch(j.id, { isUrgent: !j.isUrgent }, `Updated urgent flag on ${j.id}`)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              j.isUrgent ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Zap className="w-3 h-3" /> Urgent
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 tabular-nums text-[11px] text-slate-600">
                        <div>{j.viewsCount || 0} views · {j.inquiriesCount || 0} inquiries</div>
                        <div className="text-slate-400">Exp: {j.expiresAt ? new Date(j.expiresAt).toLocaleDateString() : '—'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          j.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'hidden' || j.status === 'rejected'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/job/${j.slug || j.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                            title="View Live Ad"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => openEdit(j)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                            title="Edit Job Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickPatch(j.id, { extendDays: 30 }, `Extended ${j.id} expiry by 30 days.`)}
                            className="p-1.5 rounded hover:bg-teal-100 text-teal-700"
                            title="Extend Expiry +30 Days"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          {j.status === 'active' ? (
                            <button
                              onClick={() => handleQuickPatch(j.id, { status: 'hidden' }, `Hidden job ${j.id} from public site.`)}
                              className="p-1.5 rounded hover:bg-amber-100 text-amber-700"
                              title="Hide Job from Public Feed"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickPatch(j.id, { status: 'active' }, `Activated job ${j.id}.`)}
                              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
                              title="Activate / Restore Job"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {j.status !== 'closed' && (
                            <button
                              onClick={() => handleQuickPatch(j.id, { status: 'closed' }, `Marked ${j.id} as closed.`)}
                              className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                              title="Close Position"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteJob(j)}
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

      {/* Create / Edit Job Modal */}
      {(showCreateModal || editingJob) && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingJob ? `Edit Job (${editingJob.id})` : 'Publish Job Directly'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingJob(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveJobForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.company}
                    onChange={e => setJobForm({ ...jobForm, company: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country</label>
                  <select
                    value={jobForm.country}
                    onChange={e => {
                      const c = e.target.value as GccCountry;
                      setJobForm({
                        ...jobForm,
                        country: c,
                        currency: GCC_COUNTRIES[c]?.currencyCode || 'SAR'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.values(GCC_COUNTRIES).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CITY / REGION</label>
                  <input
                    type="text"
                    value={jobForm.city}
                    onChange={e => setJobForm({ ...jobForm, city: e.target.value })}
                    placeholder="Enter city or region"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={jobForm.category}
                    onChange={e => setJobForm({ ...jobForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {JOB_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salary Min</label>
                  <input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={e => setJobForm({ ...jobForm, salaryMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salary Max</label>
                  <input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={e => setJobForm({ ...jobForm, salaryMax: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={jobForm.status}
                    onChange={e => setJobForm({ ...jobForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="active">Active (Live)</option>
                    <option value="hidden">Hidden</option>
                    <option value="closed">Closed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={jobForm.contactEmail}
                    onChange={e => setJobForm({ ...jobForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={jobForm.contactWhatsapp}
                    onChange={e => setJobForm({ ...jobForm, contactWhatsapp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={jobForm.contactPhone}
                    onChange={e => setJobForm({ ...jobForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  value={jobForm.description}
                  onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.isFeatured}
                    onChange={e => setJobForm({ ...jobForm, isFeatured: e.target.checked })}
                  />
                  Featured Listing
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.isUrgent}
                    onChange={e => setJobForm({ ...jobForm, isUrgent: e.target.checked })}
                  />
                  Urgent Hiring
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingJob(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold">
                  {editingJob ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
