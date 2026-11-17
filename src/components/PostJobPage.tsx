import React, { useState, useEffect, useMemo } from 'react';
import {
  GccCountry,
  GCC_COUNTRIES,
  EmploymentType,
  ExperienceLevel,
  JobAd,
  User
} from '../types/job';
import {
  JOB_CATEGORIES,
  getSubcategoriesForCategory,
  getJobCategoryName,
  isValidJobCategoryId,
  resolveJobCategoryId
} from '../data/categories';
import { getCitiesForCountry } from './HeroSection';
import { storageService } from '../services/storage';
import {
  validateJobFieldsForExternalLinks,
  EXTERNAL_LINK_ERROR_MESSAGE
} from '../../shared/externalLinkValidator';
import {
  Briefcase,
  Building2,
  MapPin,
  Wallet,
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Send,
  ExternalLink,
  PlusCircle,
  Loader2,
  Mail,
  PhoneCall
} from 'lucide-react';

interface PostJobPageProps {
  currentUser: User | null;
  editingJob?: JobAd | null;
  onJobCreated: (newJob: JobAd) => void;
  onJobUpdated?: (updatedJob: JobAd) => void;
  onViewJob: (job: JobAd) => void;
  onManageJobs: () => void;
  onCancel: () => void;
}

const GCC_CURRENCIES = ['SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR'] as const;

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'fresher', label: 'Fresher (0 - 1 Year)' },
  { value: '1-3-years', label: '1 to 3 Years' },
  { value: '3-5-years', label: '3 to 5 Years' },
  { value: '5-10-years', label: '5 to 10 Years' },
  { value: '10-plus-years', label: '10+ Years' }
];

const EDUCATION_OPTIONS = [
  'High School',
  'Diploma / Vocational',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD / Doctorate',
  'Not Specified'
];

function parseMonthlySalaryInput(raw: string): {
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable: boolean;
  salaryDisplay: string;
} {
  const trimmed = raw.trim();
  if (!trimmed || /negotiable/i.test(trimmed)) {
    return {
      salaryMin: undefined,
      salaryMax: undefined,
      salaryNegotiable: true,
      salaryDisplay: trimmed || 'Negotiable'
    };
  }

  const numbers = trimmed
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(n => Math.round(Number(n)))
    .filter(n => !Number.isNaN(n) && n > 0);

  if (numbers && numbers.length >= 2) {
    const min = Math.min(numbers[0], numbers[1]);
    const max = Math.max(numbers[0], numbers[1]);
    return {
      salaryMin: min,
      salaryMax: max,
      salaryNegotiable: false,
      salaryDisplay: trimmed
    };
  }

  if (numbers && numbers.length === 1) {
    return {
      salaryMin: numbers[0],
      salaryMax: undefined,
      salaryNegotiable: false,
      salaryDisplay: trimmed
    };
  }

  return {
    salaryMin: undefined,
    salaryMax: undefined,
    salaryNegotiable: true,
    salaryDisplay: trimmed
  };
}

function formatInitialSalary(job: JobAd): string {
  if (job.salaryDisplay) return job.salaryDisplay;
  if (job.salaryNegotiable && !job.salaryMin) return 'Negotiable';
  if (job.salaryMin && job.salaryMax) return `${job.salaryMin} - ${job.salaryMax}`;
  if (job.salaryMin) return `${job.salaryMin}`;
  return '';
}

function buildInitialPositionDetails(job: JobAd): string {
  const parts: string[] = [];
  const baseDesc = (job.description || '').trim();
  if (baseDesc) parts.push(baseDesc);

  const responsibilities = (job.responsibilities || []).map(r => r.trim()).filter(Boolean);
  if (responsibilities.length > 0 && !/key responsibilities:/i.test(baseDesc)) {
    parts.push(`Key Responsibilities:\n${responsibilities.map(r => `• ${r}`).join('\n')}`);
  }

  const skills = (job.skills || []).map(s => s.trim()).filter(Boolean);
  const requirements = (job.requirements || [])
    .map(r => r.trim())
    .filter(r => r && r !== 'Relevant GCC experience preferred');

  const combinedQuals = Array.from(new Set([...requirements, ...skills]));
  if (combinedQuals.length > 0 && !/required skills:|qualifications:/i.test(baseDesc)) {
    parts.push(`Skills & Qualifications:\n${combinedQuals.map(q => `• ${q}`).join('\n')}`);
  }

  return parts.join('\n\n');
}

export const PostJobPage: React.FC<PostJobPageProps> = ({
  currentUser,
  editingJob,
  onJobCreated,
  onJobUpdated,
  onViewJob,
  onManageJobs,
  onCancel
}) => {
  const defaultCountry: GccCountry = currentUser?.country || 'saudi-arabia';

  // Section 1: Job Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time');
  const [vacanciesCount, setVacanciesCount] = useState<string>('1');

  // Section 2: Company Details (Optional) & Section 3: Application Contact Details
  const [company, setCompany] = useState(currentUser?.companyName || '');
  const [contactPerson, setContactPerson] = useState(currentUser?.name || '');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');

  // Section 4: Job Location
  const [country, setCountry] = useState<GccCountry>(defaultCountry);
  const [city, setCity] = useState(
    currentUser?.city || GCC_COUNTRIES[defaultCountry].topCities[0]
  );
  const [workMode, setWorkMode] = useState<'on-site' | 'remote' | 'hybrid'>('on-site');

  // Section 5: Salary & Requirements (Required Experience & Education are optional)
  const [monthlySalary, setMonthlySalary] = useState('');
  const [currency, setCurrency] = useState(GCC_COUNTRIES[defaultCountry].currencyCode);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [educationLevel, setEducationLevel] = useState('');

  // Section 6: Job Details (Single combined Position Details field)
  const [positionDetails, setPositionDetails] = useState('');
  const howToApply: 'email' = 'email';

  // Validation & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkErrorFields, setLinkErrorFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publishedJob, setPublishedJob] = useState<JobAd | null>(null);

  const resetFormToDefaults = () => {
    const uCountry: GccCountry = currentUser?.country || 'saudi-arabia';
    setTitle('');
    setCategory('');
    setSubcategory('');
    setEmploymentType('full-time');
    setVacanciesCount('1');
    setCompany(currentUser?.companyName || '');
    setContactPerson(currentUser?.name || '');
    setContactMethod('email');
    setContactEmail(currentUser?.email || '');
    setContactPhone(currentUser?.phone || '');
    setCountry(uCountry);
    setCity(currentUser?.city || GCC_COUNTRIES[uCountry].topCities[0]);
    setWorkMode('on-site');
    setMonthlySalary('');
    setCurrency(GCC_COUNTRIES[uCountry].currencyCode);
    setExperienceLevel('');
    setEducationLevel('');
    setPositionDetails('');
    setSubmitError(null);
    setLinkErrorFields(new Set());
    setFieldErrors({});
  };

  useEffect(() => {
    setPublishedJob(null);
    setSubmitError(null);
    setLinkErrorFields(new Set());
    setFieldErrors({});

    if (editingJob) {
      setTitle(editingJob.title || '');
      const resolvedCat = editingJob.category
        ? resolveJobCategoryId(editingJob.category, {
            title: editingJob.title,
            subcategory: editingJob.subcategory
          })
        : '';
      setCategory(resolvedCat);
      setSubcategory(editingJob.subcategory || '');
      const validType: EmploymentType =
        editingJob.employmentType === 'part-time' ||
        editingJob.employmentType === 'contract' ||
        editingJob.employmentType === 'temporary' ||
        editingJob.employmentType === 'full-time'
          ? editingJob.employmentType
          : 'full-time';
      setEmploymentType(validType);
      setVacanciesCount(String(editingJob.vacanciesCount || 1));
      setCompany(editingJob.company || '');
      setContactPerson(editingJob.contactPerson || '');
      const inferredMethod: 'email' | 'phone' =
        editingJob.contactMethod === 'phone' ||
        (Boolean(editingJob.contactPhone && editingJob.contactPhone.trim()) &&
          !String(editingJob.contactEmail || '').trim())
          ? 'phone'
          : 'email';
      setContactMethod(inferredMethod);
      setContactEmail(editingJob.contactEmail || '');
      setContactPhone(editingJob.contactPhone || '');
      setCountry(editingJob.country || 'saudi-arabia');
      setCity(editingJob.city || GCC_COUNTRIES[editingJob.country || 'saudi-arabia'].topCities[0]);
      setWorkMode(editingJob.workMode || 'on-site');
      setMonthlySalary(formatInitialSalary(editingJob));
      setCurrency(editingJob.currency || GCC_COUNTRIES[editingJob.country || 'saudi-arabia'].currencyCode);
      setExperienceLevel((editingJob.experienceLevel as ExperienceLevel | '') || '');
      setEducationLevel(editingJob.educationLevel || '');
      setPositionDetails(buildInitialPositionDetails(editingJob));
    } else {
      resetFormToDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingJob, currentUser?.id]);

  const countryInfo = useMemo(() => GCC_COUNTRIES[country], [country]);
  const availableSubcategories = useMemo(() => getSubcategoriesForCategory(category), [category]);
  const availableCities = useMemo(() => {
    const baseCities = getCitiesForCountry(country).filter(c => c !== 'All Cities');
    if (city && !baseCities.includes(city)) {
      return [...baseCities, city];
    }
    return baseCities;
  }, [country, city]);

  const handleCountryChange = (newCountry: GccCountry) => {
    const info = GCC_COUNTRIES[newCountry];
    const newCities = getCitiesForCountry(newCountry).filter(c => c !== 'All Cities');
    setCountry(newCountry);
    setCurrency(info.currencyCode);
    setCity(newCities[0] || info.topCities[0]);
    clearFieldError('city');
    if (!contactPhone.trim() || contactPhone.trim().startsWith('+')) {
      const hasOnlyCode = Object.values(GCC_COUNTRIES).some(
        c => contactPhone.trim() === c.phoneCode
      );
      if (!contactPhone.trim() || hasOnlyCode) {
        setContactPhone(`${info.phoneCode} `);
      }
    }
  };

  const clearFieldError = (fieldKey: string) => {
    if (linkErrorFields.has(fieldKey)) {
      const next = new Set(linkErrorFields);
      next.delete(fieldKey);
      setLinkErrorFields(next);
      if (next.size === 0 && submitError === EXTERNAL_LINK_ERROR_MESSAGE) {
        setSubmitError(null);
      }
    }
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });
    }
  };

  const isAuthorizedToEdit =
    !editingJob ||
    (Boolean(currentUser) &&
      (currentUser?.role === 'admin' ||
        (currentUser?.role === 'employer' && Boolean(editingJob.userId) && editingJob.userId === currentUser.id)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setLinkErrorFields(new Set());
    setFieldErrors({});

    if (!isAuthorizedToEdit) {
      setSubmitError('Forbidden: You can only edit job posts owned by your employer account.');
      return;
    }

    // 1. Validate Required Fields (Company Name, Contact Person, Required Experience, and Education are optional)
    const missingErrors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 2) {
      missingErrors.title = 'Please enter a valid Job Title.';
    }
    if (!category || !isValidJobCategoryId(category)) {
      missingErrors.category = 'Please select a Job Category from the list.';
    }
    const parsedVacancies = Number(vacanciesCount);
    if (!vacanciesCount.trim() || Number.isNaN(parsedVacancies) || parsedVacancies < 1) {
      missingErrors.vacanciesCount = 'Number of Vacancies must be at least 1.';
    }
    if (contactMethod === 'email') {
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        missingErrors.contactEmail = 'Please enter a valid Contact Email address.';
      }
    } else {
      if (!contactPhone.trim() || contactPhone.replace(/\D/g, '').length < 6) {
        missingErrors.contactPhone = 'Please enter a valid Contact Phone Number.';
      }
    }
    if (!city.trim()) {
      missingErrors.city = 'City is required.';
    }
    if (!monthlySalary.trim()) {
      missingErrors.monthlySalary = 'Monthly Salary is required (or enter Negotiable).';
    }
    if (!positionDetails.trim() || positionDetails.trim().length < 10) {
      missingErrors.description = 'Please enter Position Details (at least 10 characters).';
    }

    // 2. Strict No External Links Check across active fields
    const activeEmail = contactMethod === 'email' ? contactEmail : '';
    const activePhone = contactMethod === 'phone' ? contactPhone : '';
    const linkCheck = validateJobFieldsForExternalLinks({
      title,
      category,
      subcategory,
      company,
      contactPerson,
      contactEmail: activeEmail,
      contactPhone: activePhone,
      city,
      monthlySalary,
      educationLevel,
      description: positionDetails
    });

    if (!linkCheck.valid) {
      setLinkErrorFields(new Set(linkCheck.invalidFields));
      setSubmitError(EXTERNAL_LINK_ERROR_MESSAGE);
      setFieldErrors(missingErrors);
      return;
    }

    if (Object.keys(missingErrors).length > 0) {
      setFieldErrors(missingErrors);
      setSubmitError('Please complete all required fields highlighted below before publishing.');
      return;
    }

    const salaryParsed = parseMonthlySalaryInput(monthlySalary);
    const trimmedEmail = contactMethod === 'email' ? contactEmail.trim() : '';
    const trimmedPhone = contactMethod === 'phone' ? contactPhone.trim() : '';
    const cleanPhoneDigits = trimmedPhone ? trimmedPhone.replace(/[^0-9+]/g, '') : '';

    const payload = {
      title: title.trim(),
      company: company.trim(),
      companyType: editingJob?.companyType || currentUser?.companyType || ('direct-employer' as const),
      country,
      city: city.trim(),
      category,
      subcategory: subcategory.trim() || undefined,
      employmentType,
      vacanciesCount: Math.max(1, Math.floor(parsedVacancies)),
      workMode,
      salaryMin: salaryParsed.salaryMin,
      salaryMax: salaryParsed.salaryMax,
      salaryDisplay: salaryParsed.salaryDisplay,
      salaryNegotiable: salaryParsed.salaryNegotiable,
      currency,
      salaryPeriod: 'monthly' as const,
      description: positionDetails.trim(),
      responsibilities: [],
      skills: [],
      requirements: [],
      benefits: editingJob?.benefits || [],
      howToApply,
      contactMethod,
      iqamaRequirement: editingJob?.iqamaRequirement || ('any' as const),
      drivingLicenseRequired: editingJob?.drivingLicenseRequired || false,
      genderPreference: editingJob?.genderPreference || ('any' as const),
      educationLevel: educationLevel.trim(),
      experienceLevel,
      contactPerson: contactPerson.trim(),
      contactPhone: trimmedPhone,
      contactWhatsapp: cleanPhoneDigits,
      contactEmail: trimmedEmail,
      isFeatured: editingJob?.isFeatured || false,
      isUrgent: editingJob?.isUrgent || false,
      packageType: editingJob?.packageType || ('standard' as const),
      status: 'active' as const,
      userId: currentUser?.id || ''
    };

    setIsSubmitting(true);

    if (editingJob) {
      const updateResult = await storageService.updateJobAsync(editingJob.id, payload);
      setIsSubmitting(false);

      if (!updateResult.success || !updateResult.job) {
        if (updateResult.invalidFields?.length) {
          setLinkErrorFields(new Set(updateResult.invalidFields));
        }
        setSubmitError(updateResult.error || 'Failed to update job posting.');
        return;
      }

      setPublishedJob(updateResult.job);
      if (onJobUpdated) {
        onJobUpdated(updateResult.job);
      } else {
        onJobCreated(updateResult.job);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const createResult = await storageService.createJobAsync(payload);
    setIsSubmitting(false);

    if (!createResult.success || !createResult.job) {
      if (createResult.invalidFields?.length) {
        setLinkErrorFields(new Set(createResult.invalidFields));
      }
      setSubmitError(createResult.error || 'Failed to publish job advertisement.');
      return;
    }

    setPublishedJob(createResult.job);
    onJobCreated(createResult.job);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getInputClass = (fieldKey: string, extra = '') => {
    const hasLinkViolation = linkErrorFields.has(fieldKey);
    const hasRequiredError = Boolean(fieldErrors[fieldKey]);
    if (hasLinkViolation || hasRequiredError) {
      return `w-full px-3.5 py-2.5 rounded-lg text-sm border border-rose-500 bg-rose-50/60 text-slate-900 ring-2 ring-rose-500/20 focus:outline-none focus:border-rose-600 transition-colors ${extra}`;
    }
    return `w-full px-3.5 py-2.5 rounded-lg text-sm border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-colors ${extra}`;
  };

  const renderFieldError = (fieldKey: string) => {
    if (linkErrorFields.has(fieldKey)) {
      return (
        <p className="mt-1.5 text-xs font-semibold text-rose-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>External link detected in this field. Please remove any website, app, or platform link.</span>
        </p>
      );
    }
    if (fieldErrors[fieldKey]) {
      return (
        <p className="mt-1.5 text-xs font-medium text-rose-600">
          {fieldErrors[fieldKey]}
        </p>
      );
    }
    return null;
  };

  if (editingJob && !isAuthorizedToEdit) {
    return (
      <div className="bg-slate-50 min-h-[70vh] py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-7 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">Access Denied</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have permission to edit this job advertisement. Employers can only edit job posts created by their own account.
          </p>
          <button
            type="button"
            onClick={onManageJobs}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Back to My Job Posts
          </button>
        </div>
      </div>
    );
  }

  // Published Success Confirmation View
  if (publishedJob) {
    return (
      <div className="bg-slate-50 min-h-[75vh] py-10 sm:py-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-7 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                {editingJob ? 'Job Updated Successfully' : 'Published Immediately · Live Now'}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {publishedJob.title}
              </h1>
              <p className="text-sm text-slate-600">
                {publishedJob.company ? `${publishedJob.company} · ` : ''}
                {publishedJob.city}, {GCC_COUNTRIES[publishedJob.country]?.name} · Ref{' '}
                <span className="font-mono font-semibold text-slate-800">{publishedJob.id}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
              <p>
                <strong>Category:</strong> {getJobCategoryName(publishedJob.category, publishedJob)}
                {publishedJob.subcategory ? ` · ${publishedJob.subcategory}` : ''}
              </p>
              <p>
                <strong>Status:</strong> Active on Gulfaro GCC Search (No admin approval delay)
              </p>
              <p>
                <strong>Contact Method:</strong>{' '}
                {publishedJob.contactMethod === 'phone' || (!publishedJob.contactEmail && publishedJob.contactPhone)
                  ? `Phone Number (${publishedJob.contactPhone})`
                  : `Email (${publishedJob.contactEmail})`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onViewJob(publishedJob)}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Live Job</span>
              </button>

              <button
                type="button"
                onClick={onManageJobs}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Briefcase className="w-4 h-4 text-teal-400" />
                <span>My Job Posts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPublishedJob(null);
                  resetFormToDefaults();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-teal-600" />
                <span>Post Another Job</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Job Posts</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-7 h-7 text-teal-600 shrink-0" />
              <span>{editingJob ? 'Edit Job Posting' : 'Post a New Job'}</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {editingJob
                ? `Updating listing Ref #${editingJob.id}. All changes take effect immediately.`
                : 'Complete the sections below on this single page and publish your vacancy immediately across the GCC.'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 shrink-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Employer Account
            </span>
            <span className="font-bold text-slate-900 block">
              {currentUser?.companyName || currentUser?.name}
            </span>
          </div>
        </div>

        {/* Strict No-External-Links Policy Notice */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 sm:p-5 border border-slate-800 flex items-start gap-3.5 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold text-white">
              Gulfaro Direct-Contact Policy — No External Links Allowed
            </p>
            <p className="text-slate-300 leading-relaxed">
              For candidate safety, website URLs, social media links, WhatsApp links, and external application links are strictly prohibited in any field. Provide your official <strong>contact email address</strong> or <strong>phone number</strong> only.
            </p>
          </div>
        </div>

        {/* Top Error Banner (when validation fails) */}
        {submitError && (
          <div
            role="alert"
            className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 text-rose-950 flex items-start gap-3 shadow-xs"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold text-rose-900">Unable to Publish Job</p>
              <p className="text-rose-800 font-medium">{submitError}</p>
            </div>
          </div>
        )}

        {/* Single-Page Vertical Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* SECTION 1: JOB OVERVIEW */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Job Overview</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Core vacancy title, category, employment type, and openings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div className="md:col-span-2">
                <label htmlFor="job-title" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Job Title *
                </label>
                <input
                  id="job-title"
                  type="text"
                  required
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    clearFieldError('title');
                  }}
                  placeholder="e.g. Senior Civil Site Engineer, General Accountant, Heavy Driver"
                  className={getInputClass('title')}
                />
                {renderFieldError('title')}
              </div>

              <div>
                <label htmlFor="job-category" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Job Category *
                </label>
                <select
                  id="job-category"
                  required
                  value={category}
                  onChange={e => {
                    const nextCat = e.target.value;
                    setCategory(nextCat);
                    clearFieldError('category');
                    const nextSubs = getSubcategoriesForCategory(nextCat);
                    if (!nextCat || !nextSubs.includes(subcategory)) {
                      setSubcategory('');
                    }
                  }}
                  className={getInputClass('category')}
                >
                  <option value="">Select a Job Category</option>
                  {JOB_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {renderFieldError('category')}
              </div>

              <div>
                <label htmlFor="job-subcategory" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Subcategory (Optional)
                </label>
                <select
                  id="job-subcategory"
                  value={subcategory}
                  disabled={!category}
                  onChange={e => {
                    setSubcategory(e.target.value);
                    clearFieldError('subcategory');
                  }}
                  className={getInputClass('subcategory', !category ? 'opacity-60 cursor-not-allowed bg-slate-100' : '')}
                >
                  <option value="">
                    {category ? 'Optional — Select a Subcategory' : 'Select a Job Category first'}
                  </option>
                  {subcategory && !availableSubcategories.includes(subcategory) && (
                    <option value={subcategory}>{subcategory}</option>
                  )}
                  {availableSubcategories.map(sub => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                {renderFieldError('subcategory')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="job-type" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Job Type *
                  </label>
                  <select
                    id="job-type"
                    required
                    value={employmentType}
                    onChange={e => setEmploymentType(e.target.value as EmploymentType)}
                    className={getInputClass('employmentType')}
                  >
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="job-vacancies" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Number of Vacancies *
                  </label>
                  <input
                    id="job-vacancies"
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={vacanciesCount}
                    onChange={e => {
                      setVacanciesCount(e.target.value);
                      clearFieldError('vacanciesCount');
                    }}
                    placeholder="e.g. 2"
                    className={getInputClass('vacanciesCount')}
                  />
                  {renderFieldError('vacanciesCount')}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: COMPANY DETAILS (OPTIONAL) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Company Details</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Optional employer and contact person identification
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label htmlFor="company-name" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Company Name (Optional)
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={company}
                  onChange={e => {
                    setCompany(e.target.value);
                    clearFieldError('company');
                  }}
                  placeholder="e.g. Al-Bawani Contracting Co."
                  className={getInputClass('company')}
                />
                {renderFieldError('company')}
              </div>

              <div>
                <label htmlFor="contact-person" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Contact Person (Optional)
                </label>
                <input
                  id="contact-person"
                  type="text"
                  value={contactPerson}
                  onChange={e => {
                    setContactPerson(e.target.value);
                    clearFieldError('contactPerson');
                  }}
                  placeholder="e.g. Muhammad Haroon"
                  className={getInputClass('contactPerson')}
                />
                {renderFieldError('contactPerson')}
              </div>
            </div>
          </section>

          {/* SECTION 3: APPLICATION CONTACT DETAILS */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Application Contact Details</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select your preferred contact method for job seeker applications
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Preferred Contact Method *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Preferred Contact Method">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={contactMethod === 'email'}
                    onClick={() => {
                      setContactMethod('email');
                      clearFieldError('contactPhone');
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      contactMethod === 'email'
                        ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        contactMethod === 'email'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Email</span>
                      <span className="block text-xs text-slate-500">Receive CVs via email</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={contactMethod === 'phone'}
                    onClick={() => {
                      setContactMethod('phone');
                      clearFieldError('contactEmail');
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      contactMethod === 'phone'
                        ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        contactMethod === 'phone'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Phone Number</span>
                      <span className="block text-xs text-slate-500">Receive direct phone calls</span>
                    </div>
                  </button>
                </div>
              </div>

              {contactMethod === 'email' ? (
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Contact Email *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={e => {
                      setContactEmail(e.target.value);
                      clearFieldError('contactEmail');
                    }}
                    placeholder="admingulfaro@gmail.com"
                    className={getInputClass('contactEmail')}
                  />
                  {renderFieldError('contactEmail')}
                </div>
              ) : (
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Contact Phone Number *
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={e => {
                      setContactPhone(e.target.value);
                      clearFieldError('contactPhone');
                    }}
                    placeholder="+966 50 123 4567"
                    className={getInputClass('contactPhone')}
                  />
                  {renderFieldError('contactPhone')}
                </div>
              )}
            </div>
          </section>

          {/* SECTION 4: JOB LOCATION */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Job Location</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select the GCC country, city, and work arrangement
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div>
                <label htmlFor="job-country" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Country *
                </label>
                <select
                  id="job-country"
                  required
                  value={country}
                  onChange={e => handleCountryChange(e.target.value as GccCountry)}
                  className={getInputClass('country')}
                >
                  <option value="saudi-arabia">🇸🇦 Saudi Arabia</option>
                  <option value="uae">🇦🇪 UAE</option>
                  <option value="qatar">🇶🇦 Qatar</option>
                  <option value="kuwait">🇰🇼 Kuwait</option>
                  <option value="bahrain">🇧🇭 Bahrain</option>
                  <option value="oman">🇴🇲 Oman</option>
                </select>
              </div>

              <div>
                <label htmlFor="job-city" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  City / Region *
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <select
                    id="job-city"
                    required
                    value={city}
                    onChange={e => {
                      setCity(e.target.value);
                      clearFieldError('city');
                    }}
                    className={getInputClass('city', 'pl-9')}
                  >
                    <option value="">Select City / Region</option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {renderFieldError('city')}
              </div>

              <div>
                <label htmlFor="work-location" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Work Location *
                </label>
                <select
                  id="work-location"
                  required
                  value={workMode}
                  onChange={e => setWorkMode(e.target.value as 'on-site' | 'remote' | 'hybrid')}
                  className={getInputClass('workMode')}
                >
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION 5: SALARY & REQUIREMENTS */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                5
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Salary & Requirements</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Compensation package, optional experience, and education preferences
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label htmlFor="monthly-salary" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Monthly Salary *
                </label>
                <input
                  id="monthly-salary"
                  type="text"
                  required
                  value={monthlySalary}
                  onChange={e => {
                    setMonthlySalary(e.target.value);
                    clearFieldError('monthlySalary');
                  }}
                  placeholder="e.g. 6000 - 9000 or 8500 or Negotiable"
                  className={getInputClass('monthlySalary')}
                />
                {renderFieldError('monthlySalary')}
              </div>

              <div>
                <label htmlFor="salary-currency" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Salary Currency *
                </label>
                <select
                  id="salary-currency"
                  required
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className={getInputClass('currency')}
                >
                  {GCC_CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="required-experience" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Required Experience (Optional)
                </label>
                <select
                  id="required-experience"
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value as ExperienceLevel | '')}
                  className={getInputClass('experienceLevel')}
                >
                  <option value="">Optional — Select Required Experience</option>
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="education-level" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Education (Optional)
                </label>
                <select
                  id="education-level"
                  value={educationLevel}
                  onChange={e => {
                    setEducationLevel(e.target.value);
                    clearFieldError('educationLevel');
                  }}
                  className={getInputClass('educationLevel')}
                >
                  <option value="">Optional — Select Education</option>
                  {EDUCATION_OPTIONS.map(edu => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
                {renderFieldError('educationLevel')}
              </div>
            </div>
          </section>

          {/* SECTION 6: JOB DETAILS (Single combined Position Details field) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                6
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Job Details</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Provide complete position details, required skills, qualifications, and responsibilities
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="position-details" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Position Details *
              </label>
              <textarea
                id="position-details"
                rows={8}
                required
                value={positionDetails}
                onChange={e => {
                  setPositionDetails(e.target.value);
                  clearFieldError('description');
                }}
                placeholder="Describe the position, required skills, qualifications, job duties, key responsibilities, and project scope..."
                className={getInputClass('description')}
              />
              {renderFieldError('description')}
            </div>
          </section>

          {/* Bottom Error Alert (close to Publish button so employer sees it immediately) */}
          {submitError && (
            <div
              role="alert"
              className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 text-rose-950 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-rose-900">{submitError}</p>
            </div>
          )}

          {/* Bottom Single Publish Action */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              <p className="font-semibold text-slate-700">
                Ready to publish your vacancy on Gulfaro?
              </p>
              <p>
                Your job posting goes live immediately across {countryInfo.name} & all GCC portals.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 disabled:opacity-60 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{editingJob ? 'Saving Changes...' : 'Publishing Job...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{editingJob ? 'Save & Update Job' : 'Publish Job'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
