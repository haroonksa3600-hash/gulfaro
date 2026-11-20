import React from 'react';
import { JobAd, GCC_COUNTRIES } from '../types/job';
import { storageService } from '../services/storage';
import { buildTelHref } from '../utils/phoneContact';
import { Mail, PhoneCall, Bookmark, ShieldCheck } from 'lucide-react';

interface JobCompactRowProps {
  job: JobAd;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectJob: (job: JobAd) => void;
}

export const JobCompactRow: React.FC<JobCompactRowProps> = ({
  job,
  isSaved,
  onToggleSave,
  onSelectJob
}) => {
  const countryInfo = GCC_COUNTRIES[job.country];

  const formatSalary = () => {
    if (job.salaryNegotiable && !job.salaryMin) {
      return job.salaryDisplay && !/negotiable/i.test(job.salaryDisplay)
        ? `${job.currency} ${job.salaryDisplay}`
        : 'Negotiable';
    }
    if (job.salaryMin && job.salaryMax) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}`;
    }
    return 'Negotiable';
  };

  const isFeatured = job.packageType === 'sponsored' || job.isFeatured;
  const isEmployerVerified = storageService.isEmployerVerified(job);
  const showEmailContact = Boolean(job.contactEmail) && job.contactMethod !== 'phone';
  const showPhoneContact = Boolean(job.contactPhone) && job.contactMethod !== 'email';
  const telHref = showPhoneContact ? buildTelHref(job.contactPhone) : null;

  const postDate = new Date(job.postedAt);
  const formattedDate = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      onClick={() => onSelectJob(job)}
      className={`group flex items-center justify-between px-4 py-3 border-b cursor-pointer transition-colors text-xs ${
        isFeatured
          ? 'bg-teal-50/20 hover:bg-teal-50/40 border-slate-200'
          : 'bg-white hover:bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2.5 shrink-0 w-24 sm:w-28 text-slate-500">
        <span className="text-sm" role="img" aria-label={countryInfo?.name}>
          {countryInfo?.flag}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {formattedDate}
        </span>
      </div>

      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2">
          {isFeatured && (
            <span className="shrink-0 text-[11px] font-bold text-teal-700">
              Featured ·
            </span>
          )}
          {job.isUrgent && (
            <span className="shrink-0 text-[11px] font-bold text-rose-700">
              Urgent ·
            </span>
          )}
          <span className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
            {job.title}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
          <span className="text-slate-700 font-medium">{job.city?.trim() || countryInfo?.name}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <span>{job.company}</span>
            {isEmployerVerified && (
              <span title="Verified Employer" className="inline-flex items-center">
                <ShieldCheck className="w-3 h-3 text-emerald-600 inline shrink-0" />
              </span>
            )}
          </span>
          <span>·</span>
          <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
          <span>·</span>
          <span className="font-semibold text-teal-700">{formatSalary()}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
        {showEmailContact && (
          <a
            href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application for ${job.title} (Ref: ${job.id})`)}`}
            title="Direct Email"
            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded transition-colors"
          >
            <Mail className="w-4 h-4" />
          </a>
        )}

        {showPhoneContact && telHref && (
          <a
            href={telHref}
            title="Direct Call"
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
        )}

        <button
          type="button"
          onClick={() => onToggleSave(job.id)}
          title="Bookmark Job"
          className="p-1.5 text-slate-400 hover:text-teal-700 rounded transition-colors"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-teal-700 text-teal-700' : ''}`} />
        </button>
      </div>
    </div>
  );
};
