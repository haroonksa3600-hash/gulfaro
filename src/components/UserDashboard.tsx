import React, { useState } from 'react';
import { User, JobAd, GCC_COUNTRIES } from '../types/job';
import { storageService } from '../services/storage';
import { 
  Building, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  PlusCircle,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Loader2,
  Check,
  Pencil
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User | null;
  onOpenPostJob: () => void;
  onSelectJob: (job: JobAd) => void;
  onEditJob?: (job: JobAd) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onOpenPostJob,
  onSelectJob,
  onEditJob,
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

  const [activeUser, setActiveUser] = useState<User>(currentUser);
  const isEmployer = activeUser.role === 'employer';
  const isSeeker = activeUser.role === 'job_seeker';

  // Email Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'my_ads' | 'saved_jobs'>(
    isEmployer ? 'my_ads' : 'saved_jobs'
  );

  const [jobs, setJobs] = useState<JobAd[]>(storageService.getJobs());
  const [savedJobIds, setSavedJobIds] = useState<string[]>(storageService.getSavedJobIds());

  // Refresh data helper
  const reloadData = () => {
    setJobs(storageService.getJobs());
    setSavedJobIds(storageService.getSavedJobIds());
  };

  // Send verification code
  const handleSendVerificationCode = async () => {
    setIsSendingCode(true);
    setVerifyError(null);
    setVerifyMessage(null);
    try {
      const res = await storageService.sendEmployerVerificationAsync(activeUser.email);
      if (res.success) {
        setVerifyMessage(res.message || 'Verification code sent to your email.');
      } else {
        setVerifyError(res.message || 'Failed to dispatch verification code.');
      }
    } catch {
      setVerifyError('Network error while requesting verification.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Submit verification code
  const handleSubmitVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setVerifyError('Please enter the 6-digit verification code.');
      return;
    }
    setIsSubmittingCode(true);
    setVerifyError(null);
    try {
      const res = await storageService.verifyEmployerEmailAsync(activeUser.email, verificationCode.trim());
      if (res.success) {
        setActiveUser({ ...activeUser, emailVerified: true, emailVerifiedAt: new Date().toISOString() });
        setVerifyMessage('Corporate email verified successfully! Your job classifieds now display the Verified Employer badge.');
        reloadData();
        setTimeout(() => {
          setShowVerifyModal(false);
          setVerifyMessage(null);
          setVerificationCode('');
        }, 2200);
      } else {
        setVerifyError(res.error || 'Invalid or expired verification code.');
      }
    } catch {
      setVerifyError('An error occurred during verification.');
    } finally {
      setIsSubmittingCode(false);
    }
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
    const target = jobs.find(j => j.id === jobId);
    if (!target) return;
    storageService.updateJob(jobId, {
      isFeatured: !target.isFeatured,
      packageType: !target.isFeatured ? 'featured' : 'standard'
    });
    reloadData();
  };

  // Filter jobs relevant to current user
  const myAds = jobs.filter(j => j.userId === activeUser.id || activeUser.role === 'employer');
  const savedJobsList = jobs.filter(j => savedJobIds.includes(j.id));

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* User Profile Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-teal-400 font-extrabold text-2xl flex items-center justify-center border border-slate-700 shadow-sm shrink-0">
              {activeUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{activeUser.name}</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wide">
                  {activeUser.role.replace('_', ' ')}
                </span>

                {/* Email Verification Status Indicator */}
                {isEmployer && (
                  activeUser.emailVerified ? (
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs"
                      title="Corporate email validated via Gulfaro Email Security Gateway"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Verified Employer (Email Validated)</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowVerifyModal(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                      title="Click to verify corporate email and unlock the Verified Employer badge"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Verify Email to Get Badge</span>
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeUser.companyName ? `${activeUser.companyName} · ` : ''}
                {activeUser.city}, {GCC_COUNTRIES[activeUser.country]?.name} · {activeUser.email}
              </p>
              {activeUser.headline && (
                <p className="text-xs text-slate-700 font-medium mt-1">
                  {activeUser.headline}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isEmployer && !activeUser.emailVerified && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Corporate Email</span>
              </button>
            )}
            {isEmployer && (
              <button
                onClick={onOpenPostJob}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post New Classified</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Callout if Employer Email is Unverified */}
        {isEmployer && !activeUser.emailVerified && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-amber-950">
                  Boost Candidate Trust with the "Verified Employer" Badge
                </h2>
                <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                  Your corporate email (<strong>{activeUser.email}</strong>) is currently pending validation. Verify ownership via a 6-digit code to award all your active job advertisements the official <strong>Verified Employer</strong> trust badge.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowVerifyModal(true);
                handleSendVerificationCode();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
            >
              Verify Email Now
            </button>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto text-xs font-semibold gap-2">
          {isEmployer && (
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

                        {isEmployer && onEditJob && (
                          <button
                            onClick={() => onEditJob(job)}
                            className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
                            title="Edit this job advertisement"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

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

      </div>

      {/* Employer Corporate Email Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

            <div className="text-center mb-5">
              <div className="w-13 h-13 mx-auto bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Verify Employer Corporate Email
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Validate <span className="font-semibold text-slate-800">{activeUser.email}</span> to display the official <strong>Verified Employer</strong> badge on all your job vacancies.
              </p>
            </div>

            {/* Success Message Banner */}
            {verifyMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{verifyMessage}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {verifyError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitVerificationCode} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline disabled:opacity-50"
                  >
                    {isSendingCode ? 'Sending...' : 'Send / Resend Code'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 549821"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-center text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Check your inbox for an email from <strong>Gulfaro Official</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyModal(false);
                    setVerifyError(null);
                    setVerifyMessage(null);
                  }}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCode || !verificationCode.trim()}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Activate Badge</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400">
                Email verification secured by Gulfaro GCC Corporate Standards
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
