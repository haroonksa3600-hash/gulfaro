import { GccCountry, GCC_COUNTRIES, JobAd } from '../types/job';
import {
  JOB_CATEGORIES,
  jobMatchesCategoryFilter,
  resolveJobCategoryId
} from '../../shared/jobCategories';

export interface GccCountryPageMeta {
  id: GccCountry;
  slug: string;
  name: string;
  shortName: string;
  nameAr: string;
  flag: string;
  code: string;
  currency: string;
  capital: string;
  majorHubs: string[];
  headline: string;
  overview: string;
  keyIndustries: string[];
  laborAuthority: string;
  contractNote: string;
  relatedArticleSlug: string;
}

export const GCC_COUNTRY_DIRECTORY: GccCountryPageMeta[] = [
  {
    id: 'saudi-arabia',
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    shortName: 'KSA',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    code: 'SA',
    currency: 'SAR',
    capital: 'Riyadh',
    majorHubs: GCC_COUNTRIES['saudi-arabia'].topCities,
    headline: 'Jobs in Saudi Arabia — Riyadh, Jeddah, Dammam & Eastern Province',
    overview:
      'Saudi Arabia hosts the largest employment market in the Gulf Cooperation Council, supported by Vision 2030 infrastructure, healthcare, industrial manufacturing, logistics, and digital transformation programs.',
    keyIndustries: ['Civil & Infrastructure Engineering', 'Healthcare (SCFHS)', 'Finance & ZATCA Accounting', 'Logistics & Supply Chain'],
    laborAuthority: 'Ministry of Human Resources & Social Development (Qiwa & Muqeem)',
    contractNote: 'Standard employment contracts are registered electronically on Qiwa, clearly detailing basic salary, housing allowance, notice period, and end-of-service benefits.',
    relatedArticleSlug: 'how-to-find-a-job-in-saudi-arabia'
  },
  {
    id: 'uae',
    slug: 'uae',
    name: 'United Arab Emirates',
    shortName: 'UAE',
    nameAr: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    code: 'AE',
    currency: 'AED',
    capital: 'Abu Dhabi',
    majorHubs: GCC_COUNTRIES['uae'].topCities,
    headline: 'Jobs in the United Arab Emirates — Dubai, Abu Dhabi & Sharjah',
    overview:
      'The United Arab Emirates serves as a regional headquarters for technology, financial services, hospitality, international education, and trade across Dubai, Abu Dhabi, and the Northern Emirates.',
    keyIndustries: ['Information Technology & FinTech', 'Hospitality & Tourism', 'Education & Training', 'Real Estate & Corporate Sales'],
    laborAuthority: 'Ministry of Human Resources & Emiratisation (MOHRE) & Free Zone Authorities',
    contractNote: 'Private-sector mainland roles follow MOHRE fixed-term employment contracts specifying working hours, annual leave, and medical coverage.',
    relatedArticleSlug: 'how-to-prepare-for-a-job-interview-in-the-uae'
  },
  {
    id: 'qatar',
    slug: 'qatar',
    name: 'Qatar',
    shortName: 'Qatar',
    nameAr: 'دولة قطر',
    flag: '🇶🇦',
    code: 'QA',
    currency: 'QAR',
    capital: 'Doha',
    majorHubs: GCC_COUNTRIES['qatar'].topCities,
    headline: 'Jobs in Qatar — Doha, Lusail, Al Wakrah & Industrial Cities',
    overview:
      'Qatar maintains consistent demand for engineering, energy, corporate finance, facilities management, and hospitality professionals across Doha, Lusail, Ras Laffan, and Mesaieed.',
    keyIndustries: ['Energy & LNG Infrastructure', 'Corporate Accounting & Audit', 'Facilities Management', 'Hospitality & Aviation'],
    laborAuthority: 'Ministry of Labour (Qatar Labor Law & WPS)',
    contractNote: 'Employment contracts in Qatar must be authenticated through the Ministry of Labour and define base pay, accommodation provisions, and repatriation terms.',
    relatedArticleSlug: 'understanding-employment-contracts'
  },
  {
    id: 'kuwait',
    slug: 'kuwait',
    name: 'Kuwait',
    shortName: 'Kuwait',
    nameAr: 'دولة الكويت',
    flag: '🇰🇼',
    code: 'KW',
    currency: 'KWD',
    capital: 'Kuwait City',
    majorHubs: GCC_COUNTRIES['kuwait'].topCities,
    headline: 'Jobs in Kuwait — Kuwait City, Al Ahmadi, Hawalli & Salmiya',
    overview:
      'Kuwait offers long-term opportunities in petroleum contracting, heavy transport and logistics, healthcare, banking, and commercial operations paid in Kuwaiti Dinar (KWD).',
    keyIndustries: ['Oilfield Contracting & Transport', 'Banking & Finance', 'Healthcare Services', 'Retail & Commercial Operations'],
    laborAuthority: 'Public Authority for Manpower (PAM · Ashal Portal)',
    contractNote: 'Private-sector expatriate employment operates under Article 18 work permits regulated by the Public Authority for Manpower.',
    relatedArticleSlug: 'job-search-tips-for-gcc-countries'
  },
  {
    id: 'bahrain',
    slug: 'bahrain',
    name: 'Bahrain',
    shortName: 'Bahrain',
    nameAr: 'مملكة البحرين',
    flag: '🇧🇭',
    code: 'BH',
    currency: 'BHD',
    capital: 'Manama',
    majorHubs: GCC_COUNTRIES['bahrain'].topCities,
    headline: 'Jobs in Bahrain — Manama, Seef District, Muharraq & Riffa',
    overview:
      'Bahrain is an established Gulf financial, FinTech, and enterprise technology hub with strong demand for bilingual sales executives, auditors, ICT specialists, and hospitality teams.',
    keyIndustries: ['Banking & Financial Services', 'Enterprise IT & Cloud Sales', 'Hospitality & Service', 'Light Manufacturing'],
    laborAuthority: 'Labour Market Regulatory Authority (LMRA)',
    contractNote: 'Bahrain LMRA provides transparent permit verification and structured mobility procedures between licensed employers.',
    relatedArticleSlug: 'professional-skills-employers-look-for'
  },
  {
    id: 'oman',
    slug: 'oman',
    name: 'Oman',
    shortName: 'Oman',
    nameAr: 'سلطنة عُمان',
    flag: '🇴🇲',
    code: 'OM',
    currency: 'OMR',
    capital: 'Muscat',
    majorHubs: GCC_COUNTRIES['oman'].topCities,
    headline: 'Jobs in Oman — Muscat, Sohar, Salalah & Duqm',
    overview:
      'The Sultanate of Oman features growing industrial zones in Sohar and Duqm alongside steady hiring across Muscat and Salalah in facilities maintenance, MEP trades, logistics, and tourism.',
    keyIndustries: ['Facilities Maintenance & HVAC', 'Ports & Maritime Logistics', 'Industrial Manufacturing', 'Tourism & Hospitality'],
    laborAuthority: 'Ministry of Labour (Sultanate of Oman)',
    contractNote: 'Contracts registered with the Omani Ministry of Labour detail salary components, leave entitlements, and Omanisation sector rules.',
    relatedArticleSlug: 'understanding-employment-contracts'
  }
];

export interface PublicCategoryMeta {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  summary: string;
  overview: string;
  typicalRoles: string[];
  matchCategoryIds: string[];
}

export const PUBLIC_JOB_CATEGORIES: PublicCategoryMeta[] = JOB_CATEGORIES.map(cat => ({
  id: cat.id,
  slug: cat.slug,
  name: cat.name,
  iconName: cat.iconName,
  summary: cat.description,
  overview: `${cat.description} Explore direct employer vacancies across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.`,
  typicalRoles: cat.subcategories.slice(0, 5),
  matchCategoryIds: [cat.id]
}));

export function isJobActiveAndUnexpired(job: JobAd, nowMs = Date.now()): boolean {
  if (!job || job.status !== 'active') return false;
  if (!job.expiresAt) return true;
  const expiryMs = new Date(job.expiresAt).getTime();
  if (Number.isNaN(expiryMs)) return true;
  return expiryMs > nowMs;
}

export function jobMatchesPublicCategory(job: JobAd, category: PublicCategoryMeta): boolean {
  return jobMatchesCategoryFilter(job, category.id);
}

export function findCountryMetaBySlug(slug: string): GccCountryPageMeta | undefined {
  const clean = decodeURIComponent(slug || '').trim().toLowerCase();
  if (clean === 'united-arab-emirates') {
    return GCC_COUNTRY_DIRECTORY.find(c => c.id === 'uae');
  }
  return GCC_COUNTRY_DIRECTORY.find(c => c.slug === clean || c.id === clean);
}

export function findCategoryMetaBySlug(slug: string): PublicCategoryMeta | undefined {
  const clean = decodeURIComponent(slug || '').trim().toLowerCase();
  if (!clean) return undefined;
  const direct = PUBLIC_JOB_CATEGORIES.find(c => c.slug === clean || c.id === clean);
  if (direct) return direct;
  const resolvedId = resolveJobCategoryId(clean);
  if (resolvedId && (resolvedId !== 'other-jobs' || ['other', 'others', 'general', 'other-jobs'].includes(clean))) {
    return PUBLIC_JOB_CATEGORIES.find(c => c.id === resolvedId);
  }
  return undefined;
}
