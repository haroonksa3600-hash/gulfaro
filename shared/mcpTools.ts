import { GCC_COUNTRIES, GccCountry, JobAd } from '../src/types/job';
import {
  GCC_COUNTRY_DIRECTORY,
  PUBLIC_JOB_CATEGORIES,
  findCategoryMetaBySlug,
  findCountryMetaBySlug,
  isJobActiveAndUnexpired
} from '../src/data/gccDirectory';
import { getJobCategoryName, jobMatchesCategoryFilter } from './jobCategories';

export const VALID_GCC_COUNTRIES: readonly GccCountry[] = [
  'saudi-arabia',
  'uae',
  'qatar',
  'kuwait',
  'bahrain',
  'oman'
] as const;

export const VALID_EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'temporary',
  'remote',
  'walk-in'
] as const;

export type ValidEmploymentType = (typeof VALID_EMPLOYMENT_TYPES)[number];

export interface SearchJobsInput {
  query?: string;
  country?: GccCountry | 'all';
  city?: string;
  category?: string;
  employmentType?: ValidEmploymentType;
  limit: number;
}

export interface GetJobDetailsInput {
  jobIdOrSlug: string;
}

export interface BrowseJobsByCountryInput {
  country: GccCountry;
  city?: string;
  category?: string;
  limit: number;
}

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

export interface AgentToolDefinition {
  name: 'search_jobs' | 'get_job_details' | 'browse_jobs_by_country';
  title: string;
  description: string;
  inputSchema: Record<string, any>;
  annotations: {
    readOnlyHint: true;
    destructiveHint: false;
    idempotentHint: true;
    openWorldHint: false;
  };
}

export const GULFARO_AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'search_jobs',
    title: 'Search Gulfaro GCC Jobs',
    description:
      'Search active, unexpired job vacancies across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman by keyword, country, city, category, or employment type. Read-only and returns only public job listings.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          maxLength: 120,
          description: 'Optional keyword to match job title, company, skills, city, or description (max 120 characters).'
        },
        country: {
          type: 'string',
          enum: ['all', 'saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman'],
          description: 'Optional GCC country identifier or "all".'
        },
        city: {
          type: 'string',
          maxLength: 80,
          description: 'Optional city filter (e.g. Riyadh, Jeddah, Dubai, Abu Dhabi, Doha).'
        },
        category: {
          type: 'string',
          maxLength: 80,
          description: 'Optional job category slug or name (e.g. engineering, healthcare-medical, accounting-finance).'
        },
        employmentType: {
          type: 'string',
          enum: ['full-time', 'part-time', 'contract', 'temporary', 'remote', 'walk-in'],
          description: 'Optional employment type filter.'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 25,
          description: 'Maximum number of active jobs to return (1-25, default 10).'
        }
      }
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  {
    name: 'get_job_details',
    title: 'Get Gulfaro Job Details',
    description:
      'Retrieve full public details for a single active, unexpired Gulfaro job vacancy using its Job ID (e.g. GF-901) or URL slug. Read-only.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        jobIdOrSlug: {
          type: 'string',
          minLength: 1,
          maxLength: 160,
          description: 'Public Gulfaro Job ID (e.g. GF-901) or URL slug.'
        }
      },
      required: ['jobIdOrSlug']
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  {
    name: 'browse_jobs_by_country',
    title: 'Browse Gulfaro Jobs by GCC Country',
    description:
      'Browse active, unexpired job listings and regional market metadata for one GCC country: saudi-arabia, uae, qatar, kuwait, bahrain, or oman. Read-only.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        country: {
          type: 'string',
          enum: ['saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman'],
          description: 'Required GCC country slug: saudi-arabia, uae, qatar, kuwait, bahrain, or oman.'
        },
        city: {
          type: 'string',
          maxLength: 80,
          description: 'Optional city filter within the selected country.'
        },
        category: {
          type: 'string',
          maxLength: 80,
          description: 'Optional job category slug within the selected country.'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 25,
          description: 'Maximum number of active jobs to return (1-25, default 10).'
        }
      },
      required: ['country']
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasControlChars(str: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(str);
}

function normalizeCountryAlias(raw: string): GccCountry | 'all' | null {
  const clean = raw.trim().toLowerCase();
  if (!clean || clean === 'all') return 'all';
  if (clean === 'ksa' || clean === 'sa' || clean === 'saudi arabia' || clean === 'saudi-arabia') {
    return 'saudi-arabia';
  }
  if (clean === 'ae' || clean === 'uae' || clean === 'united arab emirates' || clean === 'united-arab-emirates') {
    return 'uae';
  }
  if (clean === 'qa' || clean === 'qatar') return 'qatar';
  if (clean === 'kw' || clean === 'kuwait') return 'kuwait';
  if (clean === 'bh' || clean === 'bahrain') return 'bahrain';
  if (clean === 'om' || clean === 'oman') return 'oman';
  return null;
}

function parseOptionalBoundedString(
  raw: unknown,
  fieldName: string,
  maxLength: number
): ValidationResult<string | undefined> {
  if (raw === undefined || raw === null) {
    return { valid: true, data: undefined };
  }
  if (typeof raw !== 'string') {
    return { valid: false, error: `Parameter "${fieldName}" must be a string.` };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, data: undefined };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Parameter "${fieldName}" must not exceed ${maxLength} characters.` };
  }
  if (hasControlChars(trimmed)) {
    return { valid: false, error: `Parameter "${fieldName}" contains invalid control characters.` };
  }
  return { valid: true, data: trimmed };
}

function parseLimit(raw: unknown): ValidationResult<number> {
  if (raw === undefined || raw === null) {
    return { valid: true, data: 10 };
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || !Number.isFinite(raw)) {
    return { valid: false, error: 'Parameter "limit" must be an integer between 1 and 25.' };
  }
  if (raw < 1 || raw > 25) {
    return { valid: false, error: 'Parameter "limit" must be between 1 and 25.' };
  }
  return { valid: true, data: raw };
}

function resolveCategorySlugIfValid(rawCategory: string): string | null {
  const byMeta = findCategoryMetaBySlug(rawCategory);
  if (byMeta) return byMeta.id;
  const clean = rawCategory.trim().toLowerCase();
  const byName = PUBLIC_JOB_CATEGORIES.find(c => c.name.toLowerCase() === clean);
  return byName ? byName.id : null;
}

export function validateSearchJobsInput(raw: unknown): ValidationResult<SearchJobsInput> {
  const input = raw === undefined ? {} : raw;
  if (!isPlainObject(input)) {
    return { valid: false, error: 'Tool arguments must be a JSON object.' };
  }

  const allowedKeys = new Set(['query', 'country', 'city', 'category', 'employmentType', 'limit']);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unsupported parameter "${key}".` };
    }
  }

  const queryRes = parseOptionalBoundedString(input.query, 'query', 120);
  if (!queryRes.valid) return queryRes;

  const cityRes = parseOptionalBoundedString(input.city, 'city', 80);
  if (!cityRes.valid) return cityRes;

  const categoryRes = parseOptionalBoundedString(input.category, 'category', 80);
  if (!categoryRes.valid) return categoryRes;

  let resolvedCategory: string | undefined;
  if (categoryRes.data) {
    const matched = resolveCategorySlugIfValid(categoryRes.data);
    if (!matched) {
      return {
        valid: false,
        error: `Unknown category "${categoryRes.data}". Use one of the 30 Gulfaro category slugs (e.g. engineering, healthcare-medical, accounting-finance).`
      };
    }
    resolvedCategory = matched;
  }

  let country: GccCountry | 'all' | undefined;
  if (input.country !== undefined && input.country !== null) {
    if (typeof input.country !== 'string') {
      return { valid: false, error: 'Parameter "country" must be a string.' };
    }
    const normalized = normalizeCountryAlias(input.country);
    if (!normalized) {
      return {
        valid: false,
        error: 'Parameter "country" must be one of: all, saudi-arabia, uae, qatar, kuwait, bahrain, oman.'
      };
    }
    country = normalized;
  }

  let employmentType: ValidEmploymentType | undefined;
  if (input.employmentType !== undefined && input.employmentType !== null) {
    if (typeof input.employmentType !== 'string') {
      return { valid: false, error: 'Parameter "employmentType" must be a string.' };
    }
    const cleanType = input.employmentType.trim().toLowerCase() as ValidEmploymentType;
    if (!VALID_EMPLOYMENT_TYPES.includes(cleanType)) {
      return {
        valid: false,
        error: `Parameter "employmentType" must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}.`
      };
    }
    employmentType = cleanType;
  }

  const limitRes = parseLimit(input.limit);
  if (!limitRes.valid) return limitRes;

  return {
    valid: true,
    data: {
      query: queryRes.data,
      country,
      city: cityRes.data,
      category: resolvedCategory,
      employmentType,
      limit: limitRes.data
    }
  };
}

export function validateGetJobDetailsInput(raw: unknown): ValidationResult<GetJobDetailsInput> {
  if (!isPlainObject(raw)) {
    return { valid: false, error: 'Tool arguments must be a JSON object.' };
  }

  const allowedKeys = new Set(['jobIdOrSlug']);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unsupported parameter "${key}".` };
    }
  }

  if (typeof raw.jobIdOrSlug !== 'string') {
    return { valid: false, error: 'Parameter "jobIdOrSlug" is required and must be a string.' };
  }

  const cleaned = raw.jobIdOrSlug
    .trim()
    .replace(/^https?:\/\/[^/]+\/jobs?\//i, '')
    .replace(/^\/jobs?\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.html$/i, '');

  if (!cleaned || cleaned.length > 160) {
    return { valid: false, error: 'Parameter "jobIdOrSlug" must be 1 to 160 characters long.' };
  }
  if (hasControlChars(cleaned) || /\.\.|[<>{}"'`\\]/.test(cleaned) || cleaned.includes('/')) {
    return { valid: false, error: 'Parameter "jobIdOrSlug" contains invalid characters.' };
  }

  return {
    valid: true,
    data: { jobIdOrSlug: cleaned }
  };
}

export function validateBrowseJobsByCountryInput(raw: unknown): ValidationResult<BrowseJobsByCountryInput> {
  if (!isPlainObject(raw)) {
    return { valid: false, error: 'Tool arguments must be a JSON object.' };
  }

  const allowedKeys = new Set(['country', 'city', 'category', 'limit']);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unsupported parameter "${key}".` };
    }
  }

  if (typeof raw.country !== 'string' || !raw.country.trim()) {
    return {
      valid: false,
      error: 'Parameter "country" is required and must be one of: saudi-arabia, uae, qatar, kuwait, bahrain, oman.'
    };
  }

  const normalizedCountry = normalizeCountryAlias(raw.country);
  if (!normalizedCountry || normalizedCountry === 'all') {
    return {
      valid: false,
      error: 'Parameter "country" must be one of: saudi-arabia, uae, qatar, kuwait, bahrain, oman.'
    };
  }

  const cityRes = parseOptionalBoundedString(raw.city, 'city', 80);
  if (!cityRes.valid) return cityRes;

  const categoryRes = parseOptionalBoundedString(raw.category, 'category', 80);
  if (!categoryRes.valid) return categoryRes;

  let resolvedCategory: string | undefined;
  if (categoryRes.data) {
    const matched = resolveCategorySlugIfValid(categoryRes.data);
    if (!matched) {
      return {
        valid: false,
        error: `Unknown category "${categoryRes.data}". Use one of the 30 Gulfaro category slugs.`
      };
    }
    resolvedCategory = matched;
  }

  const limitRes = parseLimit(raw.limit);
  if (!limitRes.valid) return limitRes;

  return {
    valid: true,
    data: {
      country: normalizedCountry,
      city: cityRes.data,
      category: resolvedCategory,
      limit: limitRes.data
    }
  };
}

const CITY_ALIASES: Record<string, string[]> = {
  makkah: ['makkah', 'mecca'],
  mecca: ['makkah', 'mecca'],
  madinah: ['madinah', 'medina'],
  medina: ['madinah', 'medina'],
  ahmadi: ['ahmadi', 'al ahmadi']
};

function matchesCityQuery(job: JobAd, cityQuery: string): boolean {
  const target = cityQuery.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!target || target === 'all cities') return true;
  const jobCity = String(job.city || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const jobDistrict = String(job.district || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const aliases = CITY_ALIASES[target] || [target];
  return aliases.some(term => jobCity === term || jobCity.includes(term) || jobDistrict.includes(term));
}

function formatPublicSalary(job: JobAd): string {
  if (job.salaryDisplay && job.salaryDisplay.trim()) {
    return job.salaryDisplay.trim();
  }
  const currency = job.currency || GCC_COUNTRIES[job.country]?.currencyCode || 'SAR';
  if (job.salaryMin && job.salaryMin > 0) {
    const minFormatted = job.salaryMin.toLocaleString('en-US');
    const maxFormatted = job.salaryMax && job.salaryMax > job.salaryMin
      ? ` - ${job.salaryMax.toLocaleString('en-US')}`
      : '';
    return `${minFormatted}${maxFormatted} ${currency} / ${job.salaryPeriod || 'monthly'}`;
  }
  return job.salaryNegotiable ? 'Negotiable' : 'Competitive';
}

export function sanitizePublicJobForAgent(
  job: JobAd,
  origin: string,
  includeFullDetails = false
): Record<string, any> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const slugOrId = job.slug || job.id;
  const countryMeta = GCC_COUNTRIES[job.country];
  const categoryName = getJobCategoryName(job.category, {
    title: job.title,
    subcategory: job.subcategory
  });
  const cleanDesc = String(job.description || '').replace(/\s+/g, ' ').trim();
  const contactMethod = job.contactMethod || (job.contactPhone && !job.contactEmail ? 'phone' : 'email');

  const base: Record<string, any> = {
    id: job.id,
    slug: job.slug,
    url: `${cleanOrigin}/job/${encodeURIComponent(slugOrId)}`,
    title: job.title,
    company: job.company || 'Direct GCC Employer',
    companyType: job.companyType || 'direct-employer',
    country: job.country,
    countryName: countryMeta?.name || job.country,
    city: job.city,
    ...(job.district ? { district: job.district } : {}),
    category: job.category,
    categoryName,
    ...(job.subcategory ? { subcategory: job.subcategory } : {}),
    employmentType: job.employmentType,
    workMode: job.workMode || 'on-site',
    vacanciesCount: job.vacanciesCount || 1,
    salaryDisplay: formatPublicSalary(job),
    isEmployerVerified: Boolean(job.isEmployerVerified),
    isFeatured: Boolean(job.isFeatured),
    isUrgent: Boolean(job.isUrgent),
    postedAt: job.postedAt,
    expiresAt: job.expiresAt
  };

  if (!includeFullDetails) {
    base.descriptionSnippet = cleanDesc.length > 220 ? `${cleanDesc.slice(0, 217)}...` : cleanDesc;
    return base;
  }

  return {
    ...base,
    description: String(job.description || '').trim(),
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
    skills: Array.isArray(job.skills) ? job.skills : [],
    experienceLevel: job.experienceLevel || undefined,
    educationLevel: job.educationLevel || undefined,
    iqamaRequirement: job.iqamaRequirement,
    drivingLicenseRequired: Boolean(job.drivingLicenseRequired),
    genderPreference: job.genderPreference || 'any',
    contactMethod,
    ...(contactMethod === 'phone'
      ? {
          contactPhone: job.contactPhone || undefined,
          contactWhatsapp: job.contactWhatsapp || job.contactPhone || undefined
        }
      : {
          contactEmail: job.contactEmail || undefined
        }),
    ...(job.contactPerson ? { contactPerson: job.contactPerson } : {}),
    ...(job.walkInInterview ? { walkInInterview: job.walkInInterview } : {})
  };
}

export function sortAndFilterPublicJobs(
  jobs: JobAd[],
  filters: {
    query?: string;
    country?: GccCountry | 'all';
    city?: string;
    category?: string;
    employmentType?: ValidEmploymentType;
  },
  nowMs = Date.now()
): JobAd[] {
  const q = filters.query?.toLowerCase() || '';
  return jobs
    .filter(job => {
      if (!isJobActiveAndUnexpired(job, nowMs)) return false;
      if (filters.country && filters.country !== 'all' && job.country !== filters.country) return false;
      if (filters.city && !matchesCityQuery(job, filters.city)) return false;
      if (filters.category && !jobMatchesCategoryFilter(job, filters.category)) return false;
      if (filters.employmentType && job.employmentType !== filters.employmentType) return false;
      if (q) {
        const hay = [
          job.title,
          job.description,
          job.company,
          job.city,
          job.district,
          job.subcategory,
          getJobCategoryName(job.category, { title: job.title, subcategory: job.subcategory }),
          ...(Array.isArray(job.requirements) ? job.requirements : []),
          ...(Array.isArray(job.skills) ? job.skills : [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.packageType === 'sponsored' && b.packageType !== 'sponsored') return -1;
      if (b.packageType === 'sponsored' && a.packageType !== 'sponsored') return 1;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (b.isFeatured && !a.isFeatured) return 1;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
}

export function findPublicActiveJobBySlugOrId(
  jobs: JobAd[],
  jobIdOrSlug: string,
  nowMs = Date.now()
): JobAd | undefined {
  const clean = decodeURIComponent(jobIdOrSlug)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.html$/i, '')
    .toLowerCase();
  if (!clean) return undefined;

  const activeJobs = jobs.filter(j => isJobActiveAndUnexpired(j, nowMs));

  const exactSlug = activeJobs.find(j => j.slug && j.slug.toLowerCase() === clean);
  if (exactSlug) return exactSlug;

  const exactId = activeJobs.find(j => j.id && j.id.toLowerCase() === clean);
  if (exactId) return exactId;

  const pureDigitsMatch = clean.match(/^(?:gf-)?(\d+)$/);
  const trailingDigitsMatch = clean.match(/-(\d+)$/);
  const idDigits = pureDigitsMatch?.[1] || trailingDigitsMatch?.[1];
  if (idDigits) {
    const matchDigits = activeJobs.find(j => j.id && j.id.replace(/[^0-9]/g, '') === idDigits);
    if (matchDigits) return matchDigits;
  }

  if (clean.length >= 4) {
    return activeJobs.find(j => {
      const jSlug = (j.slug || '').trim().toLowerCase();
      return jSlug.length >= 4 && (jSlug.includes(clean) || clean.includes(jSlug));
    });
  }

  return undefined;
}

export function getCountryMetadataForAgent(country: GccCountry, origin: string) {
  const meta = findCountryMetaBySlug(country) || GCC_COUNTRY_DIRECTORY.find(c => c.id === country);
  const info = GCC_COUNTRIES[country];
  const cleanOrigin = origin.replace(/\/+$/, '');
  return {
    id: country,
    name: meta?.name || info.name,
    shortName: meta?.shortName || info.name,
    currency: info.currencyCode,
    capital: info.capital,
    majorHubs: meta?.majorHubs || info.topCities,
    laborAuthority: meta?.laborAuthority || '',
    overview: meta?.overview || '',
    portalUrl: `${cleanOrigin}/country/${meta?.slug || country}`
  };
}
