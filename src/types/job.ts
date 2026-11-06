export type GccCountry = 'saudi-arabia' | 'uae' | 'qatar' | 'kuwait' | 'bahrain' | 'oman';

export interface CountryInfo {
  id: GccCountry;
  name: string;
  nameAr: string;
  flag: string;
  code: string;
  currency: string;
  currencyCode: string;
  phoneCode: string;
  topCities: string[];
  capital: string;
  tagline: string;
}

export const GCC_COUNTRIES: Record<GccCountry, CountryInfo> = {
  'saudi-arabia': {
    id: 'saudi-arabia',
    name: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    code: 'SA',
    currency: 'SAR',
    currencyCode: 'SAR',
    phoneCode: '+966',
    topCities: ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina', 'Jubail', 'Yanbu', 'Tabuk', 'Al-Ahsa'],
    capital: 'Riyadh',
    tagline: 'Kingdom of Saudi Arabia · Vision 2030 Hub'
  },
  'uae': {
    id: 'uae',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    code: 'AE',
    currency: 'AED',
    currencyCode: 'AED',
    phoneCode: '+971',
    topCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'],
    capital: 'Abu Dhabi',
    tagline: 'UAE · Global Business & Innovation Hub'
  },
  'qatar': {
    id: 'qatar',
    name: 'Qatar',
    nameAr: 'دولة قطر',
    flag: '🇶🇦',
    code: 'QA',
    currency: 'QAR',
    currencyCode: 'QAR',
    phoneCode: '+974',
    topCities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Lusail', 'Al Khor', 'Umm Salal'],
    capital: 'Doha',
    tagline: 'Qatar · Energy, Infrastructure & World Trade'
  },
  'kuwait': {
    id: 'kuwait',
    name: 'Kuwait',
    nameAr: 'دولة الكويت',
    flag: '🇰🇼',
    code: 'KW',
    currency: 'KWD',
    currencyCode: 'KWD',
    phoneCode: '+965',
    topCities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Al Ahmadi', 'Farwaniya', 'Al Jahra'],
    capital: 'Kuwait City',
    tagline: 'Kuwait · High Value & Strategic Commerce'
  },
  'bahrain': {
    id: 'bahrain',
    name: 'Bahrain',
    nameAr: 'مملكة البحرين',
    flag: '🇧🇭',
    code: 'BH',
    currency: 'BHD',
    currencyCode: 'BHD',
    phoneCode: '+973',
    topCities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'Seef', 'Juffair'],
    capital: 'Manama',
    tagline: 'Bahrain · Financial Gateway of the Gulf'
  },
  'oman': {
    id: 'oman',
    name: 'Oman',
    nameAr: 'سلطنة عُمان',
    flag: '🇴🇲',
    code: 'OM',
    currency: 'OMR',
    currencyCode: 'OMR',
    phoneCode: '+968',
    topCities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Seeb', 'Barka'],
    capital: 'Muscat',
    tagline: 'Sultanate of Oman · Maritime & Industrial Hub'
  }
};

export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'remote' | 'walk-in';

export type IqamaStatus =
  | 'transferable'
  | 'non-transferable'
  | 'visit-visa'
  | 'employment-visa'
  | 'citizen-only'
  | 'any';

export type ExperienceLevel =
  | 'fresher'
  | '1-3-years'
  | '3-5-years'
  | '5-10-years'
  | '10-plus-years';

export type CompanyType = 'direct-employer' | 'recruitment-agency' | 'confidential';

export type AdStatus = 'active' | 'pending' | 'expired' | 'rejected';
export type AdPackage = 'standard' | 'featured' | 'sponsored';

export interface JobAd {
  id: string;
  slug: string;
  title: string;
  company: string;
  companyType: CompanyType;
  country: GccCountry;
  city: string;
  district?: string;
  category: string;
  subcategory?: string;
  employmentType: EmploymentType;
  workMode: 'on-site' | 'hybrid' | 'remote';
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable: boolean;
  currency: string;
  salaryPeriod: 'monthly' | 'yearly' | 'daily';
  description: string;
  requirements: string[];
  benefits: string[];
  iqamaRequirement: IqamaStatus;
  drivingLicenseRequired: boolean;
  genderPreference: 'any' | 'male' | 'female';
  educationLevel: string;
  experienceLevel: ExperienceLevel;
  contactPerson: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  walkInInterview?: {
    dates: string;
    timing: string;
    venue: string;
  };
  isFeatured: boolean;
  isUrgent: boolean;
  status: AdStatus;
  packageType: AdPackage;
  postedAt: string;
  expiresAt: string;
  viewsCount: number;
  inquiriesCount: number;
  userId: string;
  rejectionReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'job_seeker' | 'employer' | 'admin';
  companyName?: string;
  companyType?: CompanyType;
  phone?: string;
  whatsapp?: string;
  country: GccCountry;
  city: string;
  headline?: string;
  bio?: string;
  iqamaStatus?: IqamaStatus;
  experienceYears?: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  applicantUserId?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantWhatsapp: string;
  currentCountry: GccCountry;
  currentCity: string;
  iqamaStatus: IqamaStatus;
  yearsExperience: string;
  coverNote: string;
  resumeFileName?: string;
  appliedAt: string;
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected';
}

export interface JobCategory {
  id: string;
  name: string;
  nameAr: string;
  iconName: string;
  description: string;
  popularRoles: string[];
}

export interface JobFilterState {
  searchQuery: string;
  country?: GccCountry | 'all';
  city?: string;
  category?: string;
  employmentType?: string;
  iqamaRequirement?: string;
  experienceLevel?: string;
  minSalary?: number;
  isUrgentOnly?: boolean;
  isFeaturedOnly?: boolean;
  sortBy: 'recent' | 'salary-high' | 'urgent' | 'expiring';
}
