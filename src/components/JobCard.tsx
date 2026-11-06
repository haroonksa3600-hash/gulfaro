import React from 'react';
import { JobAd, GCC_COUNTRIES } from '../types/job';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Bookmark, 
  MessageCircle, 
  PhoneCall, 
  Sparkles, 
  Zap, 
  ExternalLink,
  Building,
  CheckCircle2,
  Calendar
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

  // Calculate days until expiry
  const now = new Date();
  const expiryDate = new Date(job.expiresAt);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Time posted relative formatting
  const getRelativeTime = (isoString: string) => {
    const postDate = new Date(isoString);
    const diffHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const days = Math.floor(diffHours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  // Build clean WhatsApp message URL
  const whatsappText = encodeURIComponent(
    `Hello, I am contacting you regarding your job advertisement on Gulfaro:\n"${job.title}" (Ref: ${job.id})\nLocation: ${job.city}, ${countryInfo?.name || ''}.\nIs this position still vacant?`
  );
  const cleanPhone = job.contactWhatsapp.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

  // Format salary display
  const formatSalary = () => {
    if (job.salaryNegotiable && !job.salaryMin) return 'Salary Negotiable';
    if (job.salaryMin && job.salaryMax) {
      return `${job.currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}/${job.salaryPeriod === 'monthly' ? 'mo' : job.salaryPeriod}`;
    }
    if (job.salaryMin) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}+/${job.salaryPeriod === 'monthly' ? 'mo' : job.salaryPeriod}`;
    }
    return 'Salary Negotiable';
  };

  const isSponsored = job.packageType === 'sponsored' || job.isFeatured;

  return (
    <article
      onClick={() => onSelectJob(job)}
      className={`group relative p-4 sm:p-5 rounded-xl border cursor-pointer transition-all duration-150 ${
        isSponsored
          ? 'bg-amber-50/20 border-amber-300/80 hover:border-amber-400 hover:shadow-md ring-1 ring-amber-400/20'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Top Banner Ribbon for Sponsored / Featured / Urgent */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs">
          {/* Flag & Location */}
          <span className="text-base" role="img" aria-label={countryInfo?.name}>
            {countryInfo?.flag}
          </span>
          <span className="font-semibold text-slate-700">
            {job.city}, {countryInfo?.name}
          </span>
          {job.district && (
            <span className="hidden sm:inline text-slate-400 text-[11px]">
              ({job.district})
            </span>
          )}

          {isSponsored && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Featured Listing
              </span>
            </>
          )}

          {job.isUrgent && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                <Zap className="w-3 h-3 text-rose-600" />
                Urgent Hiring
              </span>
            </>
          )}
        </div>

        {/* Action: Bookmark */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(job.id);
          }}
          aria-label={isSaved ? 'Remove from saved jobs' : 'Save this job'}
          className={`p-1.5 rounded-lg border transition-colors ${
            isSaved
              ? 'bg-teal-50 border-teal-300 text-teal-600'
              : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-teal-600' : ''}`} />
        </button>
      </div>

      {/* Job Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug mb-1">
        {job.title}
      </h3>

      {/* Company Name */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-3">
        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">{job.company}</span>
        <span className="text-slate-400 text-[11px] capitalize">
          ({job.companyType.replace('-', ' ')})
        </span>
      </div>

      {/* Clean Unboxed Metadata with Typographic Separator (Zero-Pill Compliance) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-3.5">
        <span className="font-semibold text-teal-700">
          {formatSalary()}
        </span>
        <span aria-hidden="true">·</span>
        <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
        <span aria-hidden="true">·</span>
        <span className="capitalize text-slate-700 font-medium">
          {job.iqamaRequirement === 'transferable' ? 'Transferable Iqama' : `${job.iqamaRequirement.replace('-', ' ')} Visa`}
        </span>
        <span aria-hidden="true">·</span>
        <span className="capitalize">{job.experienceLevel.replace('-', ' ')} Exp</span>
        {job.drivingLicenseRequired && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700">Driving License Req.</span>
          </>
        )}
      </div>

      {/* Key Performed Duty / Snippet */}
      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
        {job.description}
      </p>

      {/* Benefits Preview */}
      {job.benefits && job.benefits.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-4 pb-3 border-b border-slate-100">
          <span className="font-semibold text-slate-600">Perks:</span>
          {job.benefits.slice(0, 3).map((benefit, idx) => (
            <span key={idx} className="flex items-center gap-1 text-slate-600">
              <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
              <span>{benefit}</span>
            </span>
          ))}
          {job.benefits.length > 3 && (
            <span className="text-slate-400">+{job.benefits.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer Strip: Direct Contact Channels & Time */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Freshness & Expiry */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            {getRelativeTime(job.postedAt)}
          </span>
          <span aria-hidden="true">·</span>
          <span className={`font-medium ${diffDays <= 5 ? 'text-rose-600' : 'text-slate-500'}`}>
            {diffDays > 0 ? `Expires in ${diffDays}d` : 'Expired'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-400 font-mono text-[10px]">
            Ref #{job.id}
          </span>
        </div>

        {/* Direct Action Buttons: WhatsApp & Call */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Direct WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>

          {/* Direct Phone Call Button */}
          <a
            href={`tel:${job.contactPhone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
            title={`Call advertiser: ${job.contactPhone}`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Call</span>
          </a>

          {/* View Details Link */}
          <button
            onClick={() => onSelectJob(job)}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2 py-1.5 hover:underline"
          >
            Details →
          </button>
        </div>
      </div>
    </article>
  );
};
