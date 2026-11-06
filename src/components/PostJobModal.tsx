import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES, CompanyType, EmploymentType, IqamaStatus, ExperienceLevel, AdPackage, JobAd, User } from '../types/job';
import { JOB_CATEGORIES } from '../data/categories';
import { storageService } from '../services/storage';
import { 
  PlusCircle, 
  MapPin, 
  CheckCircle2, 
  MessageCircle, 
  PhoneCall, 
  Mail, 
  Sparkles, 
  Zap, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  FileText,
  DollarSign,
  Building,
  HelpCircle
} from 'lucide-react';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (newJob: JobAd) => void;
  currentUser: User | null;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  currentUser
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  // Form Fields: Step 1 - Job Identity
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(JOB_CATEGORIES[0].id);
  const [subcategory, setSubcategory] = useState('General');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time');
  const [workMode, setWorkMode] = useState<'on-site' | 'hybrid' | 'remote'>('on-site');
  const [isUrgent, setIsUrgent] = useState(false);

  // Form Fields: Step 2 - Location
  const userCountry = currentUser?.country || 'saudi-arabia';
  const [country, setCountry] = useState<GccCountry>(userCountry);
  const [city, setCity] = useState(GCC_COUNTRIES[userCountry].topCities[0]);
  const [district, setDistrict] = useState('');

  // Form Fields: Step 3 - Candidate Qualifications
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('3-5-years');
  const [educationLevel, setEducationLevel] = useState('Bachelor Degree');
  const [iqamaRequirement, setIqamaRequirement] = useState<IqamaStatus>('transferable');
  const [drivingLicenseRequired, setDrivingLicenseRequired] = useState(false);
  const [genderPreference, setGenderPreference] = useState<'any' | 'male' | 'female'>('any');

  // Form Fields: Step 4 - Compensation & Benefits
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [salaryMin, setSalaryMin] = useState<number | undefined>(6000);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(9000);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([
    'Accommodation Provided',
    'Medical Insurance',
    'Annual Flight Ticket'
  ]);

  // Form Fields: Step 5 - Description & Walk-In
  const [description, setDescription] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [hasWalkIn, setHasWalkIn] = useState(false);
  const [walkInDates, setWalkInDates] = useState('');
  const [walkInTiming, setWalkInTiming] = useState('9:00 AM – 2:00 PM');
  const [walkInVenue, setWalkInVenue] = useState('');

  // Form Fields: Step 6 - Contact Channels
  const [company, setCompany] = useState(currentUser?.companyName || 'Al-Rayyan Business Enterprise');
  const [companyType, setCompanyType] = useState<CompanyType>(currentUser?.companyType || 'direct-employer');
  const [contactPerson, setContactPerson] = useState(currentUser?.name || 'Recruitment Department');
  const [contactWhatsapp, setContactWhatsapp] = useState(currentUser?.whatsapp || GCC_COUNTRIES[country].phoneCode + ' 5');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || GCC_COUNTRIES[country].phoneCode + ' ');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || 'careers@example.com');

  // Form Fields: Step 7 - Package
  const [packageType, setPackageType] = useState<AdPackage>('standard');

  // Update city options when country changes
  const handleCountryChange = (newCountry: GccCountry) => {
    setCountry(newCountry);
    setCity(GCC_COUNTRIES[newCountry].topCities[0]);
    if (!contactWhatsapp.startsWith(GCC_COUNTRIES[newCountry].phoneCode)) {
      setContactWhatsapp(GCC_COUNTRIES[newCountry].phoneCode + ' ');
      setContactPhone(GCC_COUNTRIES[newCountry].phoneCode + ' ');
    }
  };

  const toggleBenefit = (benefit: string) => {
    if (selectedBenefits.includes(benefit)) {
      setSelectedBenefits(selectedBenefits.filter(b => b !== benefit));
    } else {
      setSelectedBenefits([...selectedBenefits, benefit]);
    }
  };

  const commonBenefits = [
    'Accommodation Provided',
    'Transportation Provided',
    'Medical Insurance',
    'Annual Flight Ticket',
    'Food / Mess Allowance',
    'Transferable Iqama Supported',
    'Overtime Pay',
    'End of Service Gratuity'
  ];

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('Please fill out the job title and description');
      return;
    }

    const requirements = requirementsText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const countryInfo = GCC_COUNTRIES[country];

    const newAd = storageService.createJob({
      title,
      company,
      companyType,
      country,
      city,
      district: district.trim() || undefined,
      category,
      subcategory,
      employmentType,
      workMode,
      salaryMin: salaryNegotiable ? undefined : salaryMin,
      salaryMax: salaryNegotiable ? undefined : salaryMax,
      salaryNegotiable,
      currency: countryInfo.currency,
      salaryPeriod: 'monthly',
      description,
      requirements: requirements.length > 0 ? requirements : ['Valid credentials in field', 'Immediate joiner preferred'],
      benefits: selectedBenefits,
      iqamaRequirement,
      drivingLicenseRequired,
      genderPreference,
      educationLevel,
      experienceLevel,
      contactPerson,
      contactPhone,
      contactWhatsapp,
      contactEmail,
      walkInInterview: hasWalkIn ? {
        dates: walkInDates || 'November 10 - 15, 2026',
        timing: walkInTiming,
        venue: walkInVenue || `${city}, Head Office`
      } : undefined,
      isFeatured: packageType !== 'standard',
      isUrgent,
      packageType,
      status: 'active',
      userId: currentUser?.id || 'guest-advertiser'
    });

    onJobCreated(newAd);
    onClose();
  };

  if (!isOpen) return null;

  const totalSteps = 7;
  const countryInfo = GCC_COUNTRIES[country];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              GF
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Post a Job Advertisement on Gulfaro
              </h2>
              <p className="text-[11px] text-slate-400">
                Step-by-step verified GCC advertiser workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-teal-300 hover:text-white flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Back to Editor' : 'Live Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 text-base leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Location' },
              { num: 3, label: 'Criteria' },
              { num: 4, label: 'Salary' },
              { num: 5, label: 'Details' },
              { num: 6, label: 'Contact' },
              { num: 7, label: 'Package' }
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0 ${
                  currentStep === s.num
                    ? 'bg-teal-600 text-white'
                    : currentStep > s.num
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
            Step {currentStep} of {totalSteps}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800">
          
          {showPreview ? (
            /* Live Ad Preview */
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg text-xs text-teal-800">
                This is a live preview of how your advertisement card and WhatsApp contact button will appear to job seekers.
              </div>

              <div className="p-5 rounded-xl border border-slate-300 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-xl">{countryInfo.flag}</span>
                    <span className="font-bold text-slate-800">{city}, {countryInfo.name}</span>
                    {district && <span className="text-slate-400">({district})</span>}
                    {isUrgent && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        ⚡ Urgent
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Preview</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {title || 'Job Title Placeholder'}
                </h3>

                <p className="text-xs font-semibold text-slate-600">
                  {company} · <span className="capitalize">{companyType.replace('-', ' ')}</span>
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="font-bold text-teal-700">
                    {salaryNegotiable ? 'Salary Negotiable' : `${countryInfo.currency} ${salaryMin || ''} - ${salaryMax || ''}/mo`}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{employmentType}</span>
                  <span>·</span>
                  <span className="capitalize">{iqamaRequirement} Iqama</span>
                  <span>·</span>
                  <span className="capitalize">{experienceLevel.replace('-', ' ')}</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3">
                  {description || 'No description provided yet.'}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Advertiser: {contactPerson}</span>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp ({contactWhatsapp})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-step Form */
            <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
              
              {/* STEP 1: Basic Job Identity */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">1. Job Title & Category</h3>
                    <p className="text-[11px] text-slate-500">Define the core position and industry classification</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Job Advertisement Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Civil Site Engineer – High Rise, General Accountant, Light Driver..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tip: Include key skills or project specifics to attract qualified candidates faster.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sector / Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        {JOB_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subcategory / Specialization</label>
                      <input
                        type="text"
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        placeholder="e.g. Structural Concrete, VAT & Zakat, Delivery"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500 capitalize"
                      >
                        <option value="full-time">Full-Time</option>
                        <option value="contract">Contractual / Project-Based</option>
                        <option value="part-time">Part-Time</option>
                        <option value="walk-in">Direct Walk-In Interview</option>
                        <option value="remote">Remote</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Work Arrangement</label>
                      <select
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500 capitalize"
                      >
                        <option value="on-site">On-Site (Office / Project Site)</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Fully Remote</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="font-bold text-rose-900 block">Mark as Urgent Hiring (Immediate Joining)</span>
                        <span className="text-[11px] text-rose-700">Displays a red badge for candidates who can join immediately without notice period.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: GCC Country & Location */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">2. GCC Country & City Location</h3>
                    <p className="text-[11px] text-slate-500">Specify where the job is located within the Gulf</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target GCC Country *</label>
                      <select
                        value={country}
                        onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-500"
                      >
                        <option value="saudi-arabia">🇸🇦 Saudi Arabia (KSA)</option>
                        <option value="uae">🇦🇪 United Arab Emirates (UAE)</option>
                        <option value="qatar">🇶🇦 Qatar</option>
                        <option value="kuwait">🇰🇼 Kuwait</option>
                        <option value="bahrain">🇧🇭 Bahrain</option>
                        <option value="oman">🇴🇲 Oman</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">City / Region *</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-500"
                      >
                        {countryInfo.topCities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      District / Commercial Zone / Project Area (Optional)
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Al Olaya, Business Bay, West Bay, Industrial Area 2..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 mb-0.5">GCC Cross-Border Search Note:</p>
                    <p>
                      Your ad will be indexed under <strong>{countryInfo.name}</strong> and visible to local resident job seekers as well as overseas expats seeking work in the Gulf.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: Requirements & Iqama */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">3. Candidate Criteria & Visa Status</h3>
                    <p className="text-[11px] text-slate-500">Iqama transferability and candidate prerequisites</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Iqama / Visa Requirement *</label>
                      <select
                        value={iqamaRequirement}
                        onChange={(e) => setIqamaRequirement(e.target.value as IqamaStatus)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="transferable">Transferable Iqama / NOC available</option>
                        <option value="non-transferable">Non-Transferable (Company Visa Provided)</option>
                        <option value="visit-visa">Visit Visa Holders Welcome</option>
                        <option value="employment-visa">Employment Visa Provided by Company</option>
                        <option value="citizen-only">GCC Nationals Only (Saudization/Emiratization)</option>
                        <option value="any">Any Status Accepted</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Experience Level Required</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="fresher">Fresher (0 - 1 Year)</option>
                        <option value="1-3-years">1 to 3 Years</option>
                        <option value="3-5-years">3 to 5 Years</option>
                        <option value="5-10-years">5 to 10 Years</option>
                        <option value="10-plus-years">10+ Years (Senior / Director)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Education Level</label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="High School">High School</option>
                        <option value="Diploma">Diploma / ITI</option>
                        <option value="Bachelor Degree">Bachelor's Degree</option>
                        <option value="Master Degree">Master's / Post-Grad</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driving License</label>
                      <select
                        value={drivingLicenseRequired ? 'yes' : 'no'}
                        onChange={(e) => setDrivingLicenseRequired(e.target.value === 'yes')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="no">Not Mandatory</option>
                        <option value="yes">Valid GCC / Local License Required</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Gender Preference</label>
                      <select
                        value={genderPreference}
                        onChange={(e) => setGenderPreference(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="any">Any / Open</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Salary & Benefits */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">4. Salary & Benefits Package</h3>
                    <p className="text-[11px] text-slate-500">Currency is automatically set to {countryInfo.currency} for {countryInfo.name}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={salaryNegotiable}
                        onChange={(e) => setSalaryNegotiable(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-semibold text-slate-700">Salary Negotiable / To be Discussed</span>
                    </label>
                  </div>

                  {!salaryNegotiable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Minimum Monthly Salary ({countryInfo.currency})
                        </label>
                        <input
                          type="number"
                          value={salaryMin || ''}
                          onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g. 5000"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Maximum Monthly Salary ({countryInfo.currency})
                        </label>
                        <input
                          type="number"
                          value={salaryMax || ''}
                          onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g. 8000"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-2">
                      Included Allowances & Perks (Check all that apply)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {commonBenefits.map(benefit => (
                        <button
                          key={benefit}
                          type="button"
                          onClick={() => toggleBenefit(benefit)}
                          className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                            selectedBenefits.includes(benefit)
                              ? 'bg-teal-50 border-teal-500 text-teal-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{benefit}</span>
                          {selectedBenefits.includes(benefit) && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 ml-1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Description & Walk-In */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">5. Detailed Job Description</h3>
                    <p className="text-[11px] text-slate-500">Provide complete duties, responsibilities, and interview instructions</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Job Duties & Scope of Work *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail the daily responsibilities, project scope, software used, and day-to-day expectations..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Key Qualifications (1 per line)
                    </label>
                    <textarea
                      rows={3}
                      value={requirementsText}
                      onChange={(e) => setRequirementsText(e.target.value)}
                      placeholder="Valid SCE / DHA / QCHP license&#10;Transferable Iqama via Qiwa&#10;5+ years experience in GCC"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasWalkIn}
                        onChange={(e) => setHasWalkIn(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-slate-800">
                        Include Walk-In Interview Dates & Venue Location
                      </span>
                    </label>

                    {hasWalkIn && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-amber-900 mb-0.5">Interview Dates</label>
                            <input
                              type="text"
                              value={walkInDates}
                              onChange={(e) => setWalkInDates(e.target.value)}
                              placeholder="e.g. Nov 10 - Nov 14, 2026"
                              className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-amber-900 mb-0.5">Timings</label>
                            <input
                              type="text"
                              value={walkInTiming}
                              onChange={(e) => setWalkInTiming(e.target.value)}
                              placeholder="e.g. 9:00 AM - 3:00 PM"
                              className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-semibold text-amber-900 mb-0.5">Venue Address / Location</label>
                          <input
                            type="text"
                            value={walkInVenue}
                            onChange={(e) => setWalkInVenue(e.target.value)}
                            placeholder="e.g. Office #402, Al-Tawfeeq Tower, King Fahd Road, Riyadh"
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: Direct Contact Channels */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">6. Direct Advertiser Contact Channels</h3>
                    <p className="text-[11px] text-slate-500">Job seekers will contact you directly via these channels</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Company / Advertiser Name *</label>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company name or 'Confidential'"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Advertiser Type</label>
                      <select
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      >
                        <option value="direct-employer">Direct Employer / Enterprise</option>
                        <option value="recruitment-agency">Licensed Recruitment Agency</option>
                        <option value="confidential">Confidential Hiring</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Contact Person / Department</label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="e.g. Eng. Tariq, HR Recruitment Team"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Direct WhatsApp Number * (With Country Code)
                      </label>
                      <input
                        type="text"
                        required
                        value={contactWhatsapp}
                        onChange={(e) => setContactWhatsapp(e.target.value)}
                        placeholder="+966501234567"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Powers the 1-click WhatsApp button on your ad.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Direct Phone Number</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+966 11..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Direct Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="careers@company.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: Promotion Package */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">7. Listing Package & Expiry</h3>
                    <p className="text-[11px] text-slate-500">Every ad remains live for 30 days and can be renewed at any time</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Free Standard */}
                    <div
                      onClick={() => setPackageType('standard')}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        packageType === 'standard'
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-sm">Free Standard</span>
                        <span className="text-xs font-bold text-emerald-600">FREE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        30-day live listing in GCC search & category listings.
                      </p>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        <li>✓ 30 Days Auto-Life</li>
                        <li>✓ Direct WhatsApp & Call</li>
                        <li>✓ Expatriates Indexing</li>
                      </ul>
                    </div>

                    {/* Featured */}
                    <div
                      onClick={() => setPackageType('featured')}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        packageType === 'featured'
                          ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Featured Ad
                        </span>
                        <span className="text-xs font-bold text-amber-700">★ Popular</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Highlighted with gold badge & placed at top of country sections.
                      </p>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        <li>✓ 3x More Inquiries</li>
                        <li>✓ Golden Card Highlight</li>
                        <li>✓ Top Placement</li>
                      </ul>
                    </div>

                    {/* Sponsored */}
                    <div
                      onClick={() => setPackageType('sponsored')}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        packageType === 'sponsored'
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-teal-600" />
                          Sponsored Priority
                        </span>
                        <span className="text-xs font-bold text-teal-700">VIP</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Priority feed banner, WhatsApp fast-track, and pinned across all 6 GCC portals.
                      </p>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        <li>✓ Maximum Exposure</li>
                        <li>✓ Pinned Top 1-3 Slots</li>
                        <li>✓ Instant Push Notification</li>
                      </ul>
                    </div>

                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Automatic Expiration Policy:</p>
                    <p>
                      Your ad will expire after 30 days. You can renew or extend it with one click from your Employer Dashboard at any time.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : <div />}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Continue to Step {currentStep + 1}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 rounded-lg font-black text-xs shadow-md transition-all active:scale-95"
                  >
                    🚀 Publish Advertisement Live on Gulfaro
                  </button>
                )}
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
