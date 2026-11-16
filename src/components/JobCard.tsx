import React from 'react';
import { JobAd, GCC_COUNTRIES } from '../types/job';
import { getJobCategoryName } from '../data/categories';
import { isJobActiveAndUnexpired } from '../data/gccDirectory';
import { storageService } from '../services/storage';
import {
  Clock,
  Bookmark,
  Mail,
  PhoneCall,
  Building,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface JobCardProps {
  job: JobAd;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectJob: (job: JobAd) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onSelectJob
}) => {
  const countryInfo = GCC_COUNTRIES[job.country];
  const categoryName = getJobCategoryName(job.category, {
    title: job.title,
    subcategory: job.subcategory
  });
  const isActive = isJobActiveAndUnexpired(job);

  const now = new Date();
  const expiryDate = new Date(job.expiresAt);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getRelativeTime = (isoString: string) => {
    const postDate = new Date(isoString);
    const diffHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Today';
    if (diffHours < 24) return `${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const formatSalary = () => {
    if (job.salaryNegotiable && !job.salaryMin) {
      return job.salaryDisplay && !/negotiable/i.test(job.salaryDisplay)
        ? `${job.currency} ${job.salaryDisplay}/mo`
        : 'Competitive / Negotiable';
    }
    if (job.salaryMin && job.salaryMax) {
      return `${job.currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}/${job.salaryPeriod === 'monthly' ? 'mo' : job.salaryPeriod}`;
    }
    if (job.salaryMin) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}/${job.salaryPeriod === 'monthly' ? 'mo' : job.salaryPeriod}`;
    }
    return 'Competitive / Negotiable';
  };

  const isFeatured = job.packageType === 'sponsored' || job.isFeatured;
  const isEmployerVerified = storageService.isEmployerVerified(job);
  const showEmailContact = Boolean(job.contactEmail) && job.contactMethod !== 'phone';
  const showPhoneContact = Boolean(job.contactPhone) && job.contactMethod !== 'email';

  return (
    <article
      onClick={() => onSelectJob(job)}
      className={`group relative p-5 rounded-xl border cursor-pointer transition-colors ${
        isFeatured
          ? 'bg-white border-teal-600/50 hover:border-teal-700'
          : 'bg-white border-slate-200 hover:border-slate-400'
      }`}
    >
      {/* Top Location & Actions Row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="text-base leading-none" role="img" aria-label={countryInfo?.name}>
            {countryInfo?.flag}
          </span>
          <span className="font-semibold text-slate-800">
            {job.city}, {countryInfo?.name}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500">
            {categoryName}
            {job.subcategory && job.subcategory.toLowerCase() !== categoryName.toLowerCase()
              ? ` · ${job.subcategory}`
              : ''}
          </span>
          {isFeatured && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-bold text-teal-700">Featured</span>
            </>
          )}
          {job.isUrgent && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-bold text-rose-700">Urgent Hiring</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleSave(job.id);
          }}
          aria-label={isSaved ? 'Remove from saved jobs' : 'Save this job'}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            isSaved
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-teal-700' : ''}`} />
        </button>
      </div>

      {/* Job Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug mb-1.5">
        {job.title}
      </h3>

      {/* Company Name & Optional Verification */}
      {(job.company || isEmployerVerified) && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-3 flex-wrap">
          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {job.company && <span className="font-semibold text-slate-800">{job.company}</span>}
          {isEmployerVerified && (
            <span
              className="inline-flex items-center gap-1 text-emerald-700 font-semibold"
              title="Corporate email validated on Gulfaro"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified Employer</span>
            </span>
          )}
        </div>
      )}

      {/* Clean Unboxed Metadata */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 mb-3">
        <span className="font-bold text-teal-700">{formatSalary()}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="capitalize">{(job.employmentType || 'full-time').replace(/-/g, ' ')}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="capitalize">{job.workMode || 'On-site'}</span>
        {job.experienceLevel && (
          <>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="capitalize">{job.experienceLevel.replace(/-/g, ' ')} Exp</span>
          </>
        )}
      </div>

      {/* Description Excerpt */}
      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 pb-3 border-b border-slate-100">
        {job.description}
      </p>

      {/* Footer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {getRelativeTime(job.postedAt)}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className={diffDays <= 5 ? 'text-rose-700 font-semibold' : 'text-slate-500'}>
            {isActive && diffDays > 0 ? `Deadline in ${diffDays}d` : 'Expired'}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-mono text-slate-400">#{job.id}</span>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {showEmailContact && (
            <a
              href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application for ${job.title} (Ref: ${job.id})`)}`}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              title={`Email ${job.contactEmail}`}
            >
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              <span>Email</span>
            </a>
          )}

          {showPhoneContact && (
            <a
              href={`tel:${job.contactPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              title={`Call ${job.contactPhone}`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => onSelectJob(job)}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 px-2 py-1.5"
          >
            <span>View Job</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
