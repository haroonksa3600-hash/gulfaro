import React, { useState, useEffect } from 'react';
import { JobAd, GCC_COUNTRIES, User } from '../types/job';
import { storageService } from '../services/storage';
import { AdBanner } from './AdBanner';
import { 
  MapPin, 
  Clock, 
  Building, 
  MessageCircle, 
  PhoneCall, 
  Mail, 
  Bookmark, 
  Share2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ChevronLeft,
  Briefcase,
  FileText,
  UserCheck,
  Send,
  Sparkles,
  Zap,
  Eye,
  Check
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
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyName, setApplyName] = useState(currentUser?.name || '');
  const [applyEmail, setApplyEmail] = useState(currentUser?.email || '');
  const [applyPhone, setApplyPhone] = useState(currentUser?.phone || '+966 ');
  const [applyWhatsapp, setApplyWhatsapp] = useState(currentUser?.whatsapp || '+966 ');
  const [applyIqama, setApplyIqama] = useState<'transferable' | 'non-transferable' | 'visit-visa' | 'employment-visa' | 'citizen-only' | 'any'>('transferable');
  const [applyExp, setApplyExp] = useState('3-5 years');
  const [applyCoverNote, setApplyCoverNote] = useState(
    `Dear Hiring Manager, I am writing to apply for the position of "${job.title}". I am currently based in ${job.city} and available for immediate joining.`
  );
  const [applyResumeName, setApplyResumeName] = useState('My_Updated_GCC_Resume.pdf');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const countryInfo = GCC_COUNTRIES[job.country];

  // Increment views on load
  useEffect(() => {
    storageService.incrementViews(job.id);
  }, [job.id]);

  // Inject Schema.org JobPosting JSON-LD into DOM for Google Job Search indexability
  useEffect(() => {
    const scriptId = 'google-job-posting-ld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const jobSchema = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description,
      "identifier": {
        "@type": "PropertyValue",
        "name": "Gulfaro",
        "value": job.id
      },
      "datePosted": job.postedAt,
      "validThrough": job.expiresAt,
      "employmentType": job.employmentType === 'full-time' ? 'FULL_TIME' : 'CONTRACTOR',
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company,
        "sameAs": "https://gulfaro.com"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": job.district || job.city,
          "addressLocality": job.city,
          "addressCountry": countryInfo?.code || "SA"
        }
      },
      ...(job.salaryMin ? {
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": job.currency,
          "value": {
            "@type": "QuantitativeValue",
            "minValue": job.salaryMin,
            "maxValue": job.salaryMax || job.salaryMin,
            "unitText": "MONTH"
          }
        }
      } : {})
    };

    script.textContent = JSON.stringify(jobSchema);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [job, countryInfo]);

  // WhatsApp Pre-filled URL
  const whatsappMsg = encodeURIComponent(
    `Hello ${job.contactPerson || 'Hiring Team'}, I saw your advertisement on Gulfaro:\n"${job.title}" (Ref: ${job.id})\nLocation: ${job.city}, ${countryInfo?.name}\nI am interested in this vacancy. Is it still available?`
  );
  const cleanPhone = job.contactWhatsapp.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  // Copy share link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin + '?job=' + job.slug);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Submit Application Form
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.submitApplication({
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.company,
      applicantUserId: currentUser?.id,
      applicantName: applyName,
      applicantEmail: applyEmail,
      applicantPhone: applyPhone,
      applicantWhatsapp: applyWhatsapp,
      currentCountry: job.country,
      currentCity: job.city,
      iqamaStatus: applyIqama,
      yearsExperience: applyExp,
      coverNote: applyCoverNote,
      resumeFileName: applyResumeName
    });

    setAppliedSuccess(true);
    setTimeout(() => {
      setShowApplyModal(false);
      setAppliedSuccess(false);
    }, 2000);
  };

  // Find similar jobs in the same country
  const similarJobs = allJobs
    .filter(j => j.id !== job.id && (j.country === job.country || j.category === job.category) && j.status === 'active')
    .slice(0, 3);

  // Expiry calculation
  const now = new Date();
  const expiryDate = new Date(job.expiresAt);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Back Link & Breadcrumbs */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Classifieds</span>
          </button>

          {/* Breadcrumb text */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
            <span>Gulfaro</span>
            <span>/</span>
            <span>{countryInfo?.name}</span>
            <span>/</span>
            <span>{job.city}</span>
            <span>/</span>
            <span className="font-mono text-slate-700">#{job.id}</span>
          </nav>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Ad Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              
              {/* Badges & Reference */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-xl leading-none" role="img" aria-label={countryInfo?.name}>
                    {countryInfo?.flag}
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.city}, {countryInfo?.name}
                  </span>
                  {job.district && (
                    <span className="text-slate-400">· {job.district}</span>
                  )}
                  {job.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Featured Ad
                    </span>
                  )}
                  {job.isUrgent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      <Zap className="w-3 h-3 text-rose-600" />
                      Urgent Joining
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShare}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs flex items-center gap-1"
                    title="Copy ad link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied!' : 'Share'}</span>
                  </button>

                  <button
                    onClick={() => onToggleSave(job.id)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                      isSaved ? 'bg-teal-50 border-teal-300 text-teal-600 font-medium' : 'border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-teal-600' : ''}`} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2">
                {job.title}
              </h1>

              {/* Company & Meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-4 pb-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800 text-sm">{job.company}</span>
                <span className="text-slate-400 capitalize">({job.companyType.replace('-', ' ')})</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">Posted on {new Date(job.postedAt).toLocaleDateString()}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400">Ref ID: {job.id}</span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  {job.viewsCount} views
                </span>
              </div>

              {/* Quick Spec Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Salary Package</span>
                  <span className="font-bold text-teal-700 text-sm">
                    {job.salaryNegotiable && !job.salaryMin 
                      ? 'Negotiable'
                      : `${job.currency} ${job.salaryMin?.toLocaleString() || 'Negotiable'} ${job.salaryMax ? `- ${job.salaryMax.toLocaleString()}` : ''}`}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Iqama / Visa</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {job.iqamaRequirement === 'transferable' ? 'Transferable Iqama' : job.iqamaRequirement}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Experience</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {job.experienceLevel.replace('-', ' ')}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Employment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {job.employmentType.replace('-', ' ')}
                  </span>
                </div>
              </div>

            </div>

            {/* Walk-in Interview Notification Card if present */}
            {job.walkInInterview && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-sm text-amber-950 mb-1">
                      Direct Walk-In Interview Scheduled
                    </h2>
                    <p className="mb-1"><span className="font-semibold">Interview Dates:</span> {job.walkInInterview.dates}</p>
                    <p className="mb-1"><span className="font-semibold">Interview Timings:</span> {job.walkInInterview.timing}</p>
                    <p><span className="font-semibold">Interview Venue:</span> {job.walkInInterview.venue}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Job Description & Responsibilities
              </h2>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {/* Candidate Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Required Qualifications & Skills
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

            {/* Benefits & Allowances */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Compensation, Allowances & Benefits
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  {job.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Warning (Standard Expatriates Notice) */}
            <div className="bg-slate-100 border border-slate-300/80 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-slate-900 mb-0.5">Gulfaro Anti-Fraud & Scam Warning</h2>
                <p className="leading-relaxed">
                  Never pay any money for visas, medical certificates, work permits, or interview processing. Legitimate GCC companies and accredited recruitment agencies never demand cash or bank transfers from job seekers. Report any suspicious requests immediately.
                </p>
              </div>
            </div>

          </div>

          {/* Right 1 Column: Direct Contact & Apply Box (Sticky) */}
          <div className="space-y-6">
            
            {/* Direct Contact Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-20 space-y-4">
              
              <div className="pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">
                  Direct Employer Contact
                </span>
                <h2 className="font-bold text-slate-900 text-sm">
                  {job.contactPerson || job.company}
                </h2>
                <p className="text-xs text-slate-500">
                  Contact advertiser directly without any middleman
                </p>
              </div>

              {/* Action 1: Direct WhatsApp Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => storageService.incrementInquiries(job.id)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat on WhatsApp</span>
              </a>

              {/* Action 2: Direct Call Button */}
              <a
                href={`tel:${job.contactPhone.replace(/\s+/g, '')}`}
                onClick={() => storageService.incrementInquiries(job.id)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-xs"
              >
                <PhoneCall className="w-4 h-4 text-teal-400" />
                <span>Call: {job.contactPhone}</span>
              </a>

              {/* Action 3: Direct Email */}
              <a
                href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application for ${job.title} (Ref: ${job.id})`)}`}
                onClick={() => storageService.incrementInquiries(job.id)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition-colors text-xs border border-slate-200"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span>Send Email Application</span>
              </a>

              {/* Action 4: Quick In-App Application Modal Trigger */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold py-2 px-3 rounded-lg text-xs border border-teal-200 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Profile & CV Direct to Employer</span>
                </button>
              </div>

              {/* Ad Status & Expiry Note */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Ad Status:</span>
                  <span className="font-bold text-emerald-600 capitalize">{job.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires In:</span>
                  <span className="font-bold text-slate-700">{diffDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Employer Verified:</span>
                  <span className="text-slate-700 font-medium">✓ Phone & WhatsApp</span>
                </div>
              </div>

            </div>

            {/* Google AdSense Medium Rectangle (300x250) */}
            <AdBanner type="rectangle" />

            {/* Similar Jobs in this Country */}
            {similarJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                  More Vacancies in {countryInfo?.name}
                </h2>
                <div className="space-y-3">
                  {similarJobs.map(sim => (
                    <div
                      key={sim.id}
                      onClick={() => onSelectSimilarJob(sim)}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <h4 className="font-bold text-slate-900 line-clamp-1 hover:text-teal-700">
                        {sim.title}
                      </h4>
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

      {/* Direct Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Direct Job Application
                </h2>
                <p className="text-xs text-slate-500">
                  Applying to: <span className="font-semibold text-slate-800">{job.title}</span> ({job.company})
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {appliedSuccess ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Application Submitted!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your credentials and CV have been transmitted to {job.contactPerson || job.company}. The employer will reach you via WhatsApp or phone call.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-3.5 text-xs text-slate-700">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={applyName}
                      onChange={(e) => setApplyName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp Number *</label>
                    <input
                      type="text"
                      required
                      value={applyWhatsapp}
                      onChange={(e) => setApplyWhatsapp(e.target.value)}
                      placeholder="+966 50..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={applyPhone}
                      onChange={(e) => setApplyPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Iqama / Visa Status</label>
                    <select
                      value={applyIqama}
                      onChange={(e) => setApplyIqama(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="transferable">Transferable Iqama</option>
                      <option value="non-transferable">Non-Transferable</option>
                      <option value="visit-visa">Visit Visa</option>
                      <option value="employment-visa">Employment Visa</option>
                      <option value="citizen-only">GCC Citizen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Years of Experience</label>
                    <input
                      type="text"
                      value={applyExp}
                      onChange={(e) => setApplyExp(e.target.value)}
                      placeholder="e.g. 4 years"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attached CV / Resume</label>
                  <div className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-mono text-slate-700 text-xs truncate">{applyResumeName}</span>
                    <button
                      type="button"
                      onClick={() => setApplyResumeName('Updated_Resume_2026.pdf')}
                      className="ml-auto text-[11px] text-teal-600 hover:underline font-semibold shrink-0"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brief Introduction / Cover Message</label>
                  <textarea
                    rows={3}
                    value={applyCoverNote}
                    onChange={(e) => setApplyCoverNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Send Application to Advertiser
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
