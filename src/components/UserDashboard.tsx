import React, { useState } from 'react';
import { User, JobAd, JobApplication, GCC_COUNTRIES } from '../types/job';
import { storageService } from '../services/storage';
import { 
  Building, 
  Bookmark, 
  Send, 
  UserCheck, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  MessageCircle, 
  PhoneCall, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  PlusCircle,
  UserPlus
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User | null;
  onOpenPostJob: () => void;
  onSelectJob: (job: JobAd) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onOpenPostJob,
  onSelectJob,
  onOpenAuth
}) => {
  if (!currentUser) {
    return (
      <div className="bg-slate-50 min-h-[70vh] py-16 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
            <Building className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Your Dashboard</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Employers can manage 30-day live job postings and candidate leads. Job seekers can view saved advertisements and direct application status.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenAuth?.('signup')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Join</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEmployer = currentUser.role === 'employer';
  const isSeeker = currentUser.role === 'job_seeker';

  const [activeTab, setActiveTab] = useState<'my_ads' | 'applications_received' | 'saved_jobs' | 'my_applications' | 'profile'>(
    isEmployer ? 'my_ads' : 'saved_jobs'
  );

  const [jobs, setJobs] = useState<JobAd[]>(storageService.getJobs());
  const [applications, setApplications] = useState<JobApplication[]>(storageService.getApplications());
  const [savedJobIds, setSavedJobIds] = useState<string[]>(storageService.getSavedJobIds());

  // Refresh data helper
  const reloadData = () => {
    setJobs(storageService.getJobs());
    setApplications(storageService.getApplications());
    setSavedJobIds(storageService.getSavedJobIds());
  };

  // Employer Actions
  const handleRenew = (jobId: string) => {
    storageService.renewJob(jobId);
    reloadData();
  };

  const handleDelete = (jobId: string) => {
    if (confirm('Are you sure you want to delete this job advertisement?')) {
      storageService.deleteJob(jobId);
      reloadData();
    }
  };

  const handleToggleFeatured = (jobId: string) => {
    storageService.adminToggleFeatured(jobId);
    reloadData();
  };

  const handleUpdateAppStatus = (appId: string, status: JobApplication['status']) => {
    storageService.updateApplicationStatus(appId, status);
    reloadData();
  };

  // Filter jobs relevant to current user
  const myAds = jobs.filter(j => j.userId === currentUser.id || currentUser.role === 'employer');
  const myApplicationsReceived = applications.filter(a => {
    const job = jobs.find(j => j.id === a.jobId);
    return job && (job.userId === currentUser.id || currentUser.role === 'employer');
  });

  const savedJobsList = jobs.filter(j => savedJobIds.includes(j.id));
  const mySubmittedApplications = applications.filter(a => a.applicantUserId === currentUser.id);

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* User Profile Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-teal-400 font-extrabold text-2xl flex items-center justify-center border border-slate-700 shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wide">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.companyName ? `${currentUser.companyName} · ` : ''}
                {currentUser.city}, {GCC_COUNTRIES[currentUser.country]?.name} · {currentUser.email}
              </p>
              {currentUser.headline && (
                <p className="text-xs text-slate-700 font-medium mt-1">
                  {currentUser.headline}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPostJob}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Classified</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto text-xs font-semibold gap-2">
          {isEmployer && (
            <>
              <button
                onClick={() => setActiveTab('my_ads')}
                className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'my_ads'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                My Advertisements ({myAds.length})
              </button>

              <button
                onClick={() => setActiveTab('applications_received')}
                className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'applications_received'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Candidates & Leads ({myApplicationsReceived.length})
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('saved_jobs')}
            className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'saved_jobs'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Saved Bookmarks ({savedJobsList.length})
          </button>

          <button
            onClick={() => setActiveTab('my_applications')}
            className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'my_applications'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            My Job Applications ({mySubmittedApplications.length})
          </button>
        </div>

        {/* TAB 1: Employer - My Ads */}
        {activeTab === 'my_ads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Manage your active 30-day classified listings and inquiries</span>
              <span className="font-semibold text-slate-700">{myAds.length} Total Listings</span>
            </div>

            {myAds.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500 text-sm mb-4">You have not posted any job advertisements yet.</p>
                <button
                  onClick={onOpenPostJob}
                  className="bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-lg"
                >
                  Post Your First Free Ad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {myAds.map(job => {
                  const now = new Date();
                  const expDate = new Date(job.expiresAt);
                  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = job.status === 'expired' || diffDays <= 0;

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700">{job.city}, {GCC_COUNTRIES[job.country]?.name}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-slate-400">Ref: {job.id}</span>
                          <span className="text-slate-300">·</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            isExpired 
                              ? 'bg-rose-100 text-rose-700' 
                              : job.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isExpired ? 'Expired' : job.status}
                          </span>
                          {job.isFeatured && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                            </span>
                          )}
                        </div>

                        <h3 
                          onClick={() => onSelectJob(job)}
                          className="font-bold text-slate-900 text-base hover:text-teal-700 cursor-pointer transition-colors"
                        >
                          {job.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{job.viewsCount} Views</span>
                          <span>·</span>
                          <span>{job.inquiriesCount} Inquiries</span>
                          <span>·</span>
                          <span className={`font-medium ${isExpired ? 'text-rose-600' : 'text-slate-700'}`}>
                            {isExpired ? 'Listing Expired' : `Expires in ${diffDays} days`}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => onSelectJob(job)}
                          className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                        >
                          View Public Ad
                        </button>

                        <button
                          onClick={() => handleRenew(job.id)}
                          className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          title="Extend ad for another 30 days"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renew (+30d)</span>
                        </button>

                        <button
                          onClick={() => handleToggleFeatured(job.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                            job.isFeatured
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>{job.isFeatured ? 'Featured' : 'Boost Ad'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(job.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete ad"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Employer - Applications Received */}
        {activeTab === 'applications_received' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Direct candidate submissions for your posted vacancies</span>
              <span className="font-semibold text-slate-700">{myApplicationsReceived.length} Leads</span>
            </div>

            {myApplicationsReceived.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                No candidate applications received yet. Qualified candidates can submit directly or chat via WhatsApp.
              </div>
            ) : (
              <div className="space-y-3">
                {myApplicationsReceived.map(app => (
                  <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[11px] font-bold text-teal-600 uppercase">Applied for: {app.jobTitle}</span>
                        <h3 className="font-bold text-base text-slate-900 mt-0.5">{app.applicantName}</h3>
                        <p className="text-xs text-slate-500">
                          {app.currentCity}, {GCC_COUNTRIES[app.currentCountry]?.name} · Experience: {app.yearsExperience} · Iqama: <span className="capitalize font-medium text-slate-700">{app.iqamaStatus}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value as any)}
                          className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                        >
                          <option value="new">Status: New</option>
                          <option value="reviewed">Status: Reviewed</option>
                          <option value="shortlisted">Status: Shortlisted</option>
                          <option value="rejected">Status: Rejected</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      "{app.coverNote}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span className="font-mono text-slate-800">{app.resumeFileName || 'CV_Document.pdf'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${app.applicantWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${app.applicantName}, regarding your application for ${app.jobTitle} on Gulfaro:`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Applicant</span>
                        </a>

                        <a
                          href={`tel:${app.applicantPhone.replace(/\s+/g, '')}`}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                          <span>Call</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Saved Jobs (Bookmarks) */}
        {activeTab === 'saved_jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Classifieds you have bookmarked for later review or contact</span>
              <span className="font-semibold text-slate-700">{savedJobsList.length} Saved</span>
            </div>

            {savedJobsList.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                You have not saved any jobs yet. Click the bookmark icon on any job card to save it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {savedJobsList.map(job => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                        <span>{GCC_COUNTRIES[job.country]?.flag}</span>
                        <span>{job.city}, {GCC_COUNTRIES[job.country]?.name}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700">{job.company}</span>
                      </div>
                      <h3
                        onClick={() => onSelectJob(job)}
                        className="font-bold text-slate-900 text-base hover:text-teal-700 cursor-pointer"
                      >
                        {job.title}
                      </h3>
                      <p className="text-xs text-teal-700 font-semibold mt-1">
                        {job.salaryNegotiable ? 'Salary Negotiable' : `${job.currency} ${job.salaryMin?.toLocaleString() || ''} - ${job.salaryMax?.toLocaleString() || ''}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectJob(job)}
                        className="text-xs font-bold text-white bg-slate-900 hover:bg-teal-600 px-4 py-2 rounded-lg transition-colors"
                      >
                        View & Contact
                      </button>
                      <button
                        onClick={() => {
                          storageService.toggleSaveJob(job.id);
                          reloadData();
                        }}
                        className="text-xs text-slate-500 hover:text-rose-600 px-2 py-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: My Submitted Applications */}
        {activeTab === 'my_applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Applications you submitted directly to GCC employers</span>
              <span className="font-semibold text-slate-700">{mySubmittedApplications.length} Applications</span>
            </div>

            {mySubmittedApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                You haven't submitted any applications through the portal yet.
              </div>
            ) : (
              <div className="space-y-3">
                {mySubmittedApplications.map(app => (
                  <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-teal-600 uppercase">
                        {app.companyName}
                      </span>
                      <h3 className="font-bold text-base text-slate-900">
                        {app.jobTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submitted on {new Date(app.appliedAt).toLocaleDateString()} · Iqama Status: <span className="capitalize">{app.iqamaStatus}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                        app.status === 'shortlisted' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'reviewed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
