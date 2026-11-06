import React from 'react';
import { JobAd, GCC_COUNTRIES } from '../types/job';
import { MessageCircle, PhoneCall, Bookmark, Sparkles, Zap } from 'lucide-react';

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

  const whatsappText = encodeURIComponent(
    `Hello, inquiring about your Gulfaro ad "${job.title}" (Ref: ${job.id}).`
  );
  const cleanPhone = job.contactWhatsapp.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

  const formatSalary = () => {
    if (job.salaryNegotiable && !job.salaryMin) return 'Negotiable';
    if (job.salaryMin && job.salaryMax) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}+`;
    }
    return 'Negotiable';
  };

  const isSponsored = job.packageType === 'sponsored' || job.isFeatured;

  // Format date e.g. Nov 05
  const postDate = new Date(job.postedAt);
  const formattedDate = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      onClick={() => onSelectJob(job)}
      className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 border-b cursor-pointer transition-colors text-xs ${
        isSponsored
          ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200'
          : 'bg-white hover:bg-slate-50 border-slate-200'
      }`}
    >
      {/* Date & Country Flag */}
      <div className="flex items-center gap-2.5 shrink-0 w-24 sm:w-28 text-slate-500">
        <span className="text-sm" role="img" aria-label={countryInfo?.name}>
          {countryInfo?.flag}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {formattedDate}
        </span>
      </div>

      {/* Title & Key details */}
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2">
          {isSponsored && (
            <span className="shrink-0 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
              ★ Featured
            </span>
          )}
          {job.isUrgent && (
            <span className="shrink-0 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
              ⚡ Urgent
            </span>
          )}
          <span className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
            {job.title}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
          <span className="text-slate-700 font-medium">{job.city}</span>
          <span>·</span>
          <span>{job.company}</span>
          <span>·</span>
          <span className="capitalize">{job.iqamaRequirement} Iqama</span>
          <span>·</span>
          <span className="font-semibold text-teal-700">{formatSalary()}</span>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Direct WhatsApp"
          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </a>

        <a
          href={`tel:${job.contactPhone.replace(/\s+/g, '')}`}
          title="Direct Call"
          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
        </a>

        <button
          onClick={() => onToggleSave(job.id)}
          title="Bookmark Job"
          className="p-1.5 text-slate-400 hover:text-teal-600 rounded transition-colors"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-teal-600 text-teal-600' : ''}`} />
        </button>
      </div>
    </div>
  );
};
