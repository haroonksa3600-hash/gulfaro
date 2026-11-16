import React, { useState, useEffect } from 'react';
import { JobAd, GCC_COUNTRIES, User } from '../types/job';
import { apiUrl } from '../services/apiConfig';
import { getJobCategoryName, jobMatchesCategoryFilter } from '../data/categories';
import { isJobActiveAndUnexpired } from '../data/gccDirectory';
import { storageService } from '../services/storage';
import { AdBanner } from './AdBanner';
import {
  PhoneCall,
  Mail,
  Bookmark,
  Share2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  Eye,
  Check,
  Copy,
  Flag
} from 'lucide-react';

interface JobDetailViewProps {
  job: JobAd;
  currentUser: User | null;
  onBack: () => void;
  onSelectSimilarJob: (job: JobAd) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  allJobs: JobAd[];
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  currentUser,
  onBack,
  onSelectSimilarJob,
  isSaved,
  onToggleSave,
  allJobs
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<'scam_fraud' | 'visa_fee' | 'fake_job' | 'spam' | 'other'>('scam_fraud');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState(currentUser?.email || '');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const countryInfo = GCC_COUNTRIES[job.country];
  const categoryName = getJobCategoryName(job.category, {
    title: job.title,
    subcategory: job.subcategory
  });
  const isEmployerVerified = storageService.isEmployerVerified(job);
  const isActiveListing = isJobActiveAndUnexpired(job);

  useEffect(() => {
    storageService.incrementViews(job.id);
  }, [job.id]);

  const getPublicJobUrl = (): string => {
    const slugOrId = encodeURIComponent(job.slug || job.id);
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      if (hostname === 'gulfaro.net' || hostname === 'www.gulfaro.net') {
        return `https://www.gulfaro.net/job/${slugOrId}`;
      }
      if (
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        !hostname.includes('ais-dev-') &&
        !hostname.includes('webcontainer') &&
        !hostname.includes('local')
      ) {
        return `${window.location.origin}/job/${slugOrId}`;
      }
    }
    return `https://www.gulfaro.net/job/${slugOrId}`;
  };

  const canonicalShareUrl = getPublicJobUrl();
  const companySuffix = job.company ? ` – ${job.company}` : '';
  const companyLocationClause = job.company ? ` at ${job.company}` : '';
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${job.title}${companySuffix} (${job.city}, ${countryInfo?.name || 'GCC'})\nApply directly on Gulfaro:\n${canonicalShareUrl}`
  )}`;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `${job.title}${companySuffix}`,
          text: `View vacancy on Gulfaro: ${job.title}${companyLocationClause} (${job.city}, ${countryInfo?.name || 'GCC'})`,
          url: canonicalShareUrl
        });
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(canonicalShareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        return;
      } catch {
        // Fallback below
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = canonicalShareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    setReportSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'job',
          targetId: job.id,
          targetTitle: `${job.title}${job.company ? ` — ${job.company}` : ''}`,
          category: reportCategory,
          reason: reportReason.trim() || reportCategory.replace('_', ' '),
          details: reportDetails.trim(),
          reporterName: currentUser?.name || 'Gulfaro Visitor',
          reporterEmail: reportEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error || 'Could not submit report.');
      } else {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
          setReportReason('');
          setReportDetails('');
        }, 1800);
      }
    } catch {
      setReportError('Network error submitting report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const similarJobs = allJobs
    .filter(
      j =>
        j.id !== job.id &&
        isJobActiveAndUnexpired(j) &&
        (j.country === job.country || jobMatchesCategoryFilter(j, job.category))
    )
    .slice(0, 3);

  const now = new Date();
  const expiryDate = new Date(job.expiresAt);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const deadlineFormatted = !Number.isNaN(expiryDate.getTime())
    ? expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not specified';

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Back Link & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Jobs</span>
          </button>

          <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
            <span>Gulfaro</span>
            <span>/</span>
            <span>{countryInfo?.name}</span>
            <span>/</span>
            <span>{categoryName}</span>
            <span>/</span>
            <span className="font-mono text-slate-700">#{job.id}</span>
          </nav>
        </div>

        {/* Expired Listing Banner (SEO & User Honesty) */}
        {!isActiveListing && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-950 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-amber-950">This Job Vacancy Has Expired</h2>
              <p className="text-amber-900 mt-0.5">
                The application deadline ({deadlineFormatted}) has passed or the employer closed this posting. Browse active opportunities on the homepage or country directory.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                  <span className="text-lg leading-none" role="img" aria-label={countryInfo?.name}>
                    {countryInfo?.flag}
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.city}, {countryInfo?.name}
                  </span>
                  {job.district && <span className="text-slate-400">· {job.district}</span>}
                  {job.isFeatured && <span className="text-teal-700 font-bold">· Featured</span>}
                  {job.isUrgent && isActiveListing && <span className="text-rose-700 font-bold">· Urgent Hiring</span>}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShare}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                      copiedLink
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>

                  <button
                    onClick={() => onToggleSave(job.id)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                      isSaved ? 'bg-teal-50 border-teal-300 text-teal-700 font-medium' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-teal-700' : ''}`} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 mb-5 pb-4 border-b border-slate-100">
                {(job.company || isEmployerVerified) && (
                  <>
                    {job.company && <span className="font-bold text-slate-900 text-sm">{job.company}</span>}
                    {isEmployerVerified && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Verified Employer</span>
                      </span>
                    )}
                    <span className="text-slate-300">·</span>
                  </>
                )}
                <span>
                  {categoryName}
                  {job.subcategory && job.subcategory.toLowerCase() !== categoryName.toLowerCase()
                    ? ` · ${job.subcategory}`
                    : ''}
                </span>
                <span className="text-slate-300">·</span>
                <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Eye className="w-3.5 h-3.5" />
                  {job.viewsCount} views
                </span>
              </div>

              {/* Structured Key Facts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Monthly Salary</span>
                  <span className="font-bold text-teal-700 text-sm">
                    {job.salaryNegotiable && !job.salaryMin
                      ? job.salaryDisplay && !/negotiable/i.test(job.salaryDisplay)
                        ? `${job.currency} ${job.salaryDisplay}`
                        : 'Negotiable'
                      : `${job.currency} ${job.salaryMin?.toLocaleString() || 'Negotiable'}${job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : ''}`}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Employment Type</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {(job.employmentType || 'full-time').replace(/-/g, ' ')}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Work Location</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {job.workMode === 'on-site' ? 'On-site' : job.workMode || 'On-site'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Experience Required</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {job.experienceLevel ? job.experienceLevel.replace(/-/g, ' ') : 'Not Specified'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Education</span>
                  <span className="font-semibold text-slate-900">
                    {job.educationLevel || 'Not Specified'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Application Deadline</span>
                  <span className={`font-semibold ${isActiveListing ? 'text-slate-900' : 'text-rose-700'}`}>
                    {deadlineFormatted}
                  </span>
                </div>
              </div>
            </div>

            {job.walkInInterview && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-sm text-amber-950 mb-1">Walk-In Interview Details</h2>
                    <p className="mb-1"><span className="font-semibold">Dates:</span> {job.walkInInterview.dates}</p>
                    <p className="mb-1"><span className="font-semibold">Timings:</span> {job.walkInInterview.timing}</p>
                    <p><span className="font-semibold">Venue:</span> {job.walkInInterview.venue}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Job Description */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Job Description
              </h2>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {/* Key Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Key Responsibilities
                </h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  {job.responsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Qualifications & Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Qualifications and Requirements
                </h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Required Skills
                </h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  {job.skills.map((skill, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2 shrink-0" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Benefits & Allowances
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  {job.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anti-Fraud Notice */}
            <div className="bg-slate-100 border border-slate-300/80 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-slate-900 mb-0.5">Candidate Safety Notice</h2>
                <p className="leading-relaxed">
                  Never pay any money for visas, medical certificates, work permits, or interview processing. Legitimate GCC employers never charge job seekers recruitment fees.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Application Instructions & Direct Contact */}
          <div className="space-y-6">
            {(() => {
              const showEmail = Boolean(job.contactEmail) && job.contactMethod !== 'phone';
              const showPhone = Boolean(job.contactPhone) && job.contactMethod !== 'email';
              const contactInstruction =
                showEmail && !showPhone
                  ? 'Send your CV and cover note directly to the employer via email.'
                  : !showEmail && showPhone
                  ? 'Contact the employer directly by phone number regarding this vacancy.'
                  : 'Send your CV and cover note directly to the employer via email or telephone.';

              return (
                <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-20 space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                      Application Contact Details
                    </span>
                    <h2 className="font-bold text-slate-900 text-sm">
                      {job.contactPerson || job.company || 'Direct Employer Contact'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {contactInstruction}
                    </p>
                  </div>

                  {isActiveListing ? (
                    <>
                      {showEmail && (
                        <a
                          href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application for ${job.title} (Ref: ${job.id})`)}`}
                          onClick={() => storageService.incrementInquiries(job.id)}
                          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Apply via Direct Email</span>
                        </a>
                      )}

                      {showPhone && (
                        <a
                          href={`tel:${job.contactPhone.replace(/\s+/g, '')}`}
                          onClick={() => storageService.incrementInquiries(job.id)}
                          className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-colors ${
                            !showEmail
                              ? 'bg-teal-600 hover:bg-teal-700 text-white text-sm'
                              : 'bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5'
                          }`}
                        >
                          <PhoneCall className={`w-4 h-4 ${!showEmail ? 'text-white' : 'text-teal-400'}`} />
                          <span>Call: {job.contactPhone}</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                      Applications for this vacancy are closed because the deadline has passed.
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    {showEmail && (
                      <p className="truncate">
                        <strong className="text-slate-800">Email:</strong> {job.contactEmail}
                      </p>
                    )}
                    {showPhone && (
                      <p>
                        <strong className="text-slate-800">Phone:</strong> {job.contactPhone}
                      </p>
                    )}
                    <p>
                      <strong className="text-slate-800">Vacancies:</strong> {job.vacanciesCount || 1}
                    </p>
                    <p>
                      <strong className="text-slate-800">Reference ID:</strong> #{job.id}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span>Listing Status:</span>
                      <span className={`font-bold capitalize ${isActiveListing ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isActiveListing ? `Active (${diffDays}d left)` : 'Expired'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Deadline:</span>
                      <span className="font-semibold text-slate-700">{deadlineFormatted}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Share Direct Link */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Share Vacancy Link</span>
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={canonicalShareUrl}
                  aria-label="Direct job link"
                  className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 select-all focus:outline-none"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-teal-700 text-white shrink-0 flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </a>
            </div>

            {/* Ad Container (Separated with generous margin) */}
            <AdBanner type="rectangle" />

            {/* Similar Active Vacancies */}
            {similarJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                  Related Active Vacancies
                </h2>
                <div className="space-y-3">
                  {similarJobs.map(sim => (
                    <div
                      key={sim.id}
                      onClick={() => onSelectSimilarJob(sim)}
                      className="p-3 rounded-lg border border-slate-200 hover:border-teal-600 cursor-pointer transition-colors text-xs"
                    >
                      <h3 className="font-bold text-slate-900 line-clamp-1">{sim.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sim.city} · {sim.company}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="font-bold text-base text-slate-900">Report Job Listing</h2>
                <p className="text-xs text-slate-500 truncate max-w-xs">{job.title} ({job.id})</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Report Submitted</h3>
                <p className="text-xs text-slate-600">Our Trust & Safety team has received this report.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                {reportError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
                    {reportError}
                  </div>
                )}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Violation Category *</label>
                  <select
                    value={reportCategory}
                    onChange={e => setReportCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="scam_fraud">Scam or Fraudulent Activity</option>
                    <option value="visa_fee">Demanding Visa / Recruitment Fee</option>
                    <option value="fake_job">Fake or Expired Job Listing</option>
                    <option value="spam">Spam or Misleading Information</option>
                    <option value="other">Other Policy Violation</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Summary Reason *</label>
                  <input
                    type="text"
                    required
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Briefly describe the issue"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Provide helpful details for review..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Email (Optional)</label>
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={e => setReportEmail(e.target.value)}
                    placeholder="Optional contact for follow-up"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-60"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
