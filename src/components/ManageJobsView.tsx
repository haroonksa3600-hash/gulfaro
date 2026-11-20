import React, { useState, useMemo } from 'react';
import { 
  JobAd, 
  User, 
  GCC_COUNTRIES, 
  GccCountry 
} from '../types/job';
import { storageService } from '../services/storage';
import { 
  Briefcase, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Eye, 
  ExternalLink, 
  Search, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Filter, 
  Building, 
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

interface ManageJobsViewProps {
  currentUser: User | null;
  jobs: JobAd[];
  onEditJob: (job: JobAd) => void;
  onDeleteJob: (jobId: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onOpenPostJob: () => void;
  onSelectJob: (job: JobAd) => void;
  onNavigateHome: () => void;
}

export const ManageJobsView: React.FC<ManageJobsViewProps> = ({
  currentUser,
  jobs,
  onEditJob,
  onDeleteJob,
  onOpenPostJob,
  onSelectJob,
  onNavigateHome
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [jobToDelete, setJobToDelete] = useState<JobAd | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter strictly to jobs owned by the currently logged-in employer account
  const employerJobs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return jobs;
    if (currentUser.role !== 'employer') return [];
    return jobs.filter(job => Boolean(job.userId) && job.userId === currentUser.id);
  }, [jobs, currentUser]);

  // Apply search query and status filter
  const filteredJobs = useMemo(() => {
    return employerJobs.filter(job => {
      // Status filter
      const now = new Date();
      const isExpired = job.status === 'expired' || new Date(job.expiresAt) < now;
      if (statusFilter === 'active' && (job.status !== 'active' || isExpired)) return false;
      if (statusFilter === 'expired' && (!isExpired && job.status === 'active')) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inTitle = (job.title || '').toLowerCase().includes(q);
        const inId = (job.id || '').toLowerCase().includes(q);
        const inCity = (job.city || '').toLowerCase().includes(q);
        const inCat = (job.category || '').toLowerCase().includes(q);
        if (!inTitle && !inId && !inCity && !inCat) return false;
      }

      return true;
    });
  }, [employerJobs, statusFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = employerJobs.length;
    const now = new Date();
    const active = employerJobs.filter(j => j.status === 'active' && new Date(j.expiresAt) >= now).length;
    const totalViews = employerJobs.reduce((acc, j) => acc + (j.viewsCount || 0), 0);
    const totalApplicants = employerJobs.reduce((acc, j) => acc + (j.inquiriesCount || 0), 0);
    return { total, active, totalViews, totalApplicants };
  }, [employerJobs]);

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await onDeleteJob(jobToDelete.id);
      if (result && result.success === false) {
        setDeleteError(result.error || 'Failed to delete this job post.');
        return;
      }
      setJobToDelete(null);
    } catch {
      setDeleteError('Failed to delete this job post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                type="button"
                onClick={onNavigateHome}
                className="font-semibold text-slate-600 hover:text-teal-700 transition-colors"
              >
                Home
              </button>
              <span>/</span>
              <span className="text-teal-700 font-bold">My Job Posts</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <Briefcase className="w-7 h-7 text-teal-600 shrink-0" />
                <span>Manage Job Advertisements</span>
              </h1>
              {currentUser && currentUser.emailVerified !== false && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                  title="Verified Gulfaro Employer Account"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser?.companyName ? `${currentUser.companyName} · ` : ''}
              Review, edit, renew, or remove your live 30-day GCC job classifieds and track applicant volume.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              onClick={onOpenPostJob}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Post New Vacancy</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Total Posts</span>
              <Building className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Vacancies registered</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Active Listings</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-600">{stats.active}</p>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">Live on GCC search</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Applicants / Leads</span>
              <Users className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl font-extrabold text-teal-600">{stats.totalApplicants}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Direct WhatsApp & applications</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Total Views</span>
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalViews}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Candidate impressions</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, Ref ID (e.g. GF-901), or city..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({employerJobs.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Expired / Closed ({employerJobs.length - stats.active})
            </button>
          </div>
        </div>

        {/* Main Job Table / List */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
            <div className="w-14 h-14 bg-teal-50 border border-teal-200 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {searchTerm ? 'No job posts matched your search' : 'No job advertisements found'}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchTerm 
                  ? 'Try clearing the search query or changing your status filter.' 
                  : 'You have not published any job classifieds yet. Post your first vacancy to start receiving direct WhatsApp applications.'}
              </p>
            </div>
            <div>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={onOpenPostJob}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Post Your First Free Vacancy
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <div className="col-span-5">Job Details & Title</div>
              <div className="col-span-2">Date Posted</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Applicants</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Job Rows */}
            <div className="divide-y divide-slate-100">
              {filteredJobs.map(job => {
                const now = new Date();
                const expDate = new Date(job.expiresAt);
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = job.status === 'expired' || diffDays <= 0;
                const countryObj = GCC_COUNTRIES[job.country as GccCountry];

                return (
                  <div 
                    key={job.id} 
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-3"
                  >
                    {/* Column 1: Job Details & Title */}
                    <div className="col-span-5 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{countryObj?.flag || '🌐'}</span>
                        <span className="font-semibold text-slate-700">
                          {job.city?.trim() ? `${job.city.trim()}, ` : ''}
                          {countryObj?.name || job.country}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-400 font-semibold text-[11px]">{job.id}</span>
                        {job.isFeatured && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Featured
                          </span>
                        )}
                        {job.isUrgent && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            ⚡ Urgent
                          </span>
                        )}
                      </div>

                      <h3 
                        onClick={() => onSelectJob(job)}
                        className="font-bold text-slate-900 text-sm sm:text-base hover:text-teal-700 cursor-pointer transition-colors leading-snug"
                      >
                        {job.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {job.company && (
                          <>
                            <span className="font-medium text-slate-700">{job.company}</span>
                            <span>·</span>
                          </>
                        )}
                        <span className="capitalize">{job.employmentType}</span>
                        {job.vacanciesCount && job.vacanciesCount > 1 && (
                          <>
                            <span>·</span>
                            <span>{job.vacanciesCount} vacancies</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-semibold text-teal-700">
                          {job.salaryDisplay && !job.salaryMin
                            ? `${job.currency} ${job.salaryDisplay}`
                            : job.salaryNegotiable && !job.salaryMin
                            ? 'Negotiable'
                            : `${job.currency} ${job.salaryMin?.toLocaleString() || ''}${job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ''}`}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Date Posted */}
                    <div className="col-span-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isExpired ? 'Expired' : `${diffDays} days left`}
                      </p>
                    </div>

                    {/* Column 3: Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isExpired 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : job.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isExpired ? 'bg-rose-500' : job.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        <span>{isExpired ? 'Closed' : job.status}</span>
                      </span>
                    </div>

                    {/* Column 4: Number of Applicants / Leads */}
                    <div className="col-span-1 md:text-center text-xs">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 font-bold text-teal-800">
                        {job.inquiriesCount || 0}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {job.viewsCount || 0} views
                      </p>
                    </div>

                    {/* Column 5: Manage Actions (Edit & Delete) */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {/* View Link */}
                      <button
                        onClick={() => onSelectJob(job)}
                        className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Live Advertisement"
                        aria-label="View live job post"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      {/* EDIT Button */}
                      <button
                        onClick={() => onEditJob(job)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors shadow-2xs active:scale-95"
                        title="Edit this job advertisement"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* DELETE Button */}
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setJobToDelete(job);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs active:scale-95"
                        title="Delete this job advertisement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Delete Modal */}
      {jobToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            {/* Top red danger bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Job Advertisement?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete this job post? This action will permanently remove:
                </p>
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800">{jobToDelete.title}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Ref ID: <span className="font-mono">{jobToDelete.id}</span> ·{' '}
                    {jobToDelete.city?.trim() ? `${jobToDelete.city.trim()}, ` : ''}
                    {GCC_COUNTRIES[jobToDelete.country as GccCountry]?.name}
                  </p>
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-2">
                  Warning: Candidates will no longer be able to discover or contact you for this vacancy.
                </p>
                {deleteError && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2 font-medium">
                    {deleteError}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setJobToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Job'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
