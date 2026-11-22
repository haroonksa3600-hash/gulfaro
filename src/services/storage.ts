import { JobAd, User, GccCountry, GCC_COUNTRIES } from '../types/job';
import { INITIAL_JOB_ADS } from '../data/seedJobs';
import { AdSenseConfig, DEFAULT_ADSENSE_CONFIG } from '../types/adsense';
import { resolveJobCategoryId } from '../data/categories';
import { apiUrl, isMissingProductionBackendConfig } from './apiConfig';

const STORAGE_KEY_JOBS = 'golfaro_jobs_v1';
const STORAGE_KEY_SAVED = 'golfaro_saved_jobs_v1';
const STORAGE_KEY_USER = 'golfaro_current_user_v1';
const STORAGE_KEY_ALL_USERS = 'golfaro_all_users_v1';
export const STORAGE_KEY_GULFARO_USERS = 'gulfaro_users';
export const STORAGE_KEY_SESSION = 'gulfaro_session';
const STORAGE_KEY_AUTH_TOKEN = 'gulfaro_auth_token_v1';
const STORAGE_KEY_ADSENSE = 'golfaro_adsense_config_v1';

export const DEMO_USERS: User[] = [
  {
    id: 'user-seeker-1',
    name: 'Zaid Al-Mansoor',
    email: 'zaid.almansoor@example.com',
    password: 'password123',
    role: 'job_seeker',
    phone: '+966 50 123 4567',
    whatsapp: '+966501234567',
    country: 'saudi-arabia',
    city: 'Riyadh',
    iqamaStatus: 'transferable',
    experienceYears: '5 years',
    headline: 'Civil Site Engineer | B.Sc Civil | 5 Yrs KSA Experience (Transferable Iqama)',
    bio: 'SCE certified site engineer with hands-on experience in KAFD and high-rise commercial structures.',
    createdAt: '2026-09-01T00:00:00Z',
    emailVerified: true,
    emailVerifiedAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'user-emp-1',
    name: 'Abdulrahman Al-Harbi',
    email: 'hr@albawani-contracting.example.com',
    password: 'password123',
    role: 'employer',
    companyName: 'Al-Bawani Contracting Co.',
    companyType: 'direct-employer',
    phone: '+966 11 498 7700',
    whatsapp: '+966548921104',
    country: 'saudi-arabia',
    city: 'Riyadh',
    headline: 'Senior Talent Acquisition Manager at Al-Bawani Group',
    createdAt: '2026-08-15T00:00:00Z',
    emailVerified: true,
    emailVerifiedAt: '2026-08-15T00:00:00Z'
  },
  {
    id: 'user-emp-2',
    name: 'Sarah Jenkins',
    email: 'talent@fingulf-tech.example.com',
    password: 'password123',
    role: 'employer',
    companyName: 'FinGulf Technologies FZ-LLC',
    companyType: 'direct-employer',
    phone: '+971 4 489 3320',
    whatsapp: '+971508219402',
    country: 'uae',
    city: 'Dubai',
    headline: 'VP People & Talent at FinGulf Dubai Internet City',
    createdAt: '2026-08-20T00:00:00Z',
    emailVerified: true,
    emailVerifiedAt: '2026-08-20T00:00:00Z'
  },
  {
    id: 'user-haroon-1',
    name: 'Haroon',
    email: 'haroon.ksa.3900@gmail.com',
    password: 'Haroon15607',
    role: 'employer',
    companyName: 'Gulfaro Enterprise',
    companyType: 'direct-employer',
    country: 'saudi-arabia',
    city: 'Riyadh',
    phone: '+966 50 000 3900',
    whatsapp: '+966500003900',
    createdAt: '2026-11-10T11:00:00Z',
    emailVerified: true,
    emailVerifiedAt: '2026-11-10T11:00:00Z'
  },
  {
    id: 'user-haroon-2',
    name: 'Haroon',
    email: 'haroon.ksa.3600@gmail.com',
    password: 'Haroon15607',
    role: 'employer',
    companyName: 'Gulfaro Enterprise',
    companyType: 'direct-employer',
    country: 'saudi-arabia',
    city: 'Riyadh',
    phone: '+966 50 000 3600',
    whatsapp: '+966500003600',
    createdAt: '2026-11-10T11:00:00Z',
    emailVerified: true,
    emailVerifiedAt: '2026-11-10T11:00:00Z'
  }
];

/**
 * Normalizes phone numbers for matching and formatting across GCC patterns (+966, +971, etc.)
 */
export function normalizePhone(rawPhone?: string | null): { digits: string; nationalDigits: string; e164: string } | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 7) return null;

  let national = digits;
  const gccCodes = ['966', '971', '974', '965', '973', '968'];
  for (const code of gccCodes) {
    if (digits.startsWith(code) && digits.length >= code.length + 7) {
      national = digits.slice(code.length);
      break;
    }
  }

  if (national.startsWith('0') && national.length > 7) {
    national = national.slice(1);
  }

  return {
    digits,
    nationalDigits: national,
    e164: `+${digits}`
  };
}

/**
 * Robust GCC phone comparison comparing full digits, country codes, and local trunk prefixes.
 */
export function phonesMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const cleanA = phoneA.trim();
  const cleanB = phoneB.trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  const normA = normalizePhone(cleanA);
  const normB = normalizePhone(cleanB);
  if (!normA || !normB) return false;

  if (normA.digits === normB.digits) return true;

  if (normA.nationalDigits.length >= 7 && normA.nationalDigits === normB.nationalDigits) {
    return true;
  }

  if (
    (normA.digits.length > normB.nationalDigits.length && normA.digits.endsWith(normB.nationalDigits)) ||
    (normB.digits.length > normA.nationalDigits.length && normB.digits.endsWith(normA.nationalDigits))
  ) {
    return true;
  }

  return false;
}

class StorageService {
  private jobs: JobAd[] = [];
  private savedJobIds: Set<string> = new Set();
  private users: User[] = [];
  private currentUser: User | null = null;
  private adSenseConfig: AdSenseConfig = DEFAULT_ADSENSE_CONFIG;

  constructor() {
    this.init();
  }

  private init() {
    // Load AdSense configuration
    try {
      const storedAdSense = localStorage.getItem(STORAGE_KEY_ADSENSE);
      if (storedAdSense) {
        this.adSenseConfig = {
          ...DEFAULT_ADSENSE_CONFIG,
          ...JSON.parse(storedAdSense)
        };
      } else {
        this.adSenseConfig = { ...DEFAULT_ADSENSE_CONFIG };
        localStorage.setItem(STORAGE_KEY_ADSENSE, JSON.stringify(this.adSenseConfig));
      }
    } catch {
      this.adSenseConfig = { ...DEFAULT_ADSENSE_CONFIG };
    }

    // Load users (checks gulfaro_users first, fallback to golfaro_all_users_v1, or seeds DEMO_USERS)
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEY_GULFARO_USERS) || localStorage.getItem(STORAGE_KEY_ALL_USERS);
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, User>();
          DEMO_USERS.forEach(u => map.set(u.email.toLowerCase().trim(), u));
          parsed.forEach((u: User) => {
            if (u && u.email) {
              const key = u.email.toLowerCase().trim();
              const existing = map.get(key);
              const merged = { ...existing, ...u };
              map.set(key, {
                ...merged,
                emailVerified: Boolean(merged.emailVerified),
                emailVerifiedAt: merged.emailVerified
                  ? merged.emailVerifiedAt || merged.createdAt || new Date().toISOString()
                  : undefined
              });
            }
          });
          this.users = Array.from(map.values());
        } else {
          this.users = [...DEMO_USERS];
        }
      } else {
        this.users = [...DEMO_USERS];
      }
      this.saveUsersToStorage();
    } catch {
      this.users = [...DEMO_USERS];
      this.saveUsersToStorage();
    }

    // Background sync of authenticated user session (/api/auth/me)
    this.syncUsersWithServer().catch(() => {});
    // Load jobs
    try {
      const storedJobs = localStorage.getItem(STORAGE_KEY_JOBS);
      if (storedJobs) {
        const parsedJobs: JobAd[] = JSON.parse(storedJobs);
        this.jobs = Array.isArray(parsedJobs)
          ? parsedJobs.map(j => ({
              ...j,
              category: resolveJobCategoryId(j?.category, { title: j?.title, subcategory: j?.subcategory })
            }))
          : [...INITIAL_JOB_ADS];
      } else {
        this.jobs = INITIAL_JOB_ADS.map(j => ({
          ...j,
          category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory })
        }));
        this.saveJobsToStorage();
      }
    } catch {
      this.jobs = INITIAL_JOB_ADS.map(j => ({
        ...j,
        category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory })
      }));
    }

    // Check for SSR initial job injected by server for direct links
    if (typeof window !== 'undefined' && (window as any).__INITIAL_JOB__) {
      const rawSsr = (window as any).__INITIAL_JOB__;
      const ssrJob: JobAd = {
        ...rawSsr,
        category: resolveJobCategoryId(rawSsr?.category, { title: rawSsr?.title, subcategory: rawSsr?.subcategory })
      };
      const existingIdx = this.jobs.findIndex(j => j.id.toLowerCase() === ssrJob.id.toLowerCase());
      if (existingIdx >= 0) {
        this.jobs[existingIdx] = ssrJob;
      } else {
        this.jobs.unshift(ssrJob);
      }
    }

    // Trigger async sync with backend server database
    if (typeof window !== 'undefined') {
      this.syncWithServer().catch(() => {});
    }

    // Auto-check expiry
    this.checkAndUpdateExpiries();

    // Load saved jobs
    try {
      const storedSaved = localStorage.getItem(STORAGE_KEY_SAVED);
      if (storedSaved) {
        this.savedJobIds = new Set(JSON.parse(storedSaved));
      }
    } catch {
      this.savedJobIds = new Set();
    }

    // Load current user from session token or persistent storage (never restore unverified accounts)
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_USER);
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser && parsedUser.emailVerified === true) {
          this.currentUser = {
            ...parsedUser,
            emailVerified: true,
            emailVerifiedAt: parsedUser.emailVerifiedAt || parsedUser.createdAt || new Date().toISOString()
          };
        } else {
          this.currentUser = null;
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_USER);
        }
      } else {
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }
  }

  private saveJobsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(this.jobs));
    } catch (e) {
      console.error('Failed to save jobs to localStorage', e);
    }
  }

  private saveSavedToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(Array.from(this.savedJobIds)));
    } catch (e) {
      console.error('Failed to save saved job IDs', e);
    }
  }

  // Auto-expire jobs past their expiresAt date
  private checkAndUpdateExpiries() {
    const now = new Date();
    let modified = false;
    this.jobs.forEach(job => {
      if (job.status === 'active' && new Date(job.expiresAt) < now) {
        job.status = 'expired';
        modified = true;
      }
    });
    if (modified) {
      this.saveJobsToStorage();
    }
  }

  // --- Server Database Synchronization ---

  public async syncWithServer(): Promise<JobAd[]> {
    try {
      const res = await fetch(apiUrl('/api/jobs'));
      if (res.ok) {
        const serverJobs: JobAd[] = await res.json();
        if (Array.isArray(serverJobs)) {
          this.jobs = serverJobs
            .filter(j => j && j.id)
            .map(j => ({
              ...j,
              category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory })
            }));
          this.saveJobsToStorage();
        }
      }
    } catch {
      // Offline fallback: maintain existing local storage state
    }
    return [...this.jobs];
  }

  private removeCachedJobBySlugOrId(slugOrId: string) {
    const clean = decodeURIComponent(slugOrId).trim().replace(/\/+$/, '').replace(/\.html$/i, '').toLowerCase();
    if (!clean) return;
    const prevLen = this.jobs.length;
    this.jobs = this.jobs.filter(j => {
      const jSlug = (j.slug || '').trim().toLowerCase();
      const jId = (j.id || '').trim().toLowerCase();
      return jSlug !== clean && jId !== clean;
    });
    if (this.jobs.length !== prevLen) {
      this.saveJobsToStorage();
    }
  }

  // Fetch job from server API (with retry for cold starts) and keep local cache accurate
  public async fetchJob(slugOrId: string, forceRefresh = false): Promise<JobAd | null> {
    if (!slugOrId) return null;
    const normalizedParam = decodeURIComponent(slugOrId).trim().replace(/\/+$/, '').replace(/\.html$/i, '');
    if (!normalizedParam) return null;

    if (!forceRefresh) {
      const existing = this.getJobBySlug(normalizedParam);
      if (existing) return existing;
    }

    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry(
        `/api/jobs/${encodeURIComponent(normalizedParam)}`,
        { method: 'GET' },
        2
      );
      if (res.ok && isJson && data && data.id) {
        const job: JobAd = {
          ...data,
          category: resolveJobCategoryId(data.category, { title: data.title, subcategory: data.subcategory })
        };
        const idx = this.jobs.findIndex(j => j.id.toLowerCase() === job.id.toLowerCase());
        if (idx >= 0) {
          this.jobs[idx] = job;
        } else {
          this.jobs.unshift(job);
        }
        this.saveJobsToStorage();
        return job;
      }

      // Authoritative 404 from backend means job is deleted, hidden, or invalid
      if (res.status === 404 && isJson) {
        this.removeCachedJobBySlugOrId(normalizedParam);
        return null;
      }
    } catch {
      // Network or transient server failure: fall back cleanly to local cache if available
    }

    return this.getJobBySlug(normalizedParam) || null;
  }

  // --- Jobs CRUD ---

  public getJobs(): JobAd[] {
    this.checkAndUpdateExpiries();
    return [...this.jobs];
  }

  public getActiveJobs(): JobAd[] {
    return this.getJobs().filter(j => j.status === 'active');
  }

  public getJobById(id: string): JobAd | undefined {
    if (!id) return undefined;
    const cleanId = id.trim().toLowerCase();
    return this.getJobs().find(j => j.id.toLowerCase() === cleanId);
  }

  public getJobBySlug(slugOrId: string): JobAd | undefined {
    if (!slugOrId) return undefined;
    try {
      const clean = decodeURIComponent(slugOrId)
        .trim()
        .replace(/\/+$/, '')
        .replace(/\.html$/i, '')
        .toLowerCase();
      if (!clean) return undefined;

      const allJobs = this.getJobs();

      // Check SSR initial job first if available
      if (typeof window !== 'undefined' && (window as any).__INITIAL_JOB__) {
        const ssr = (window as any).__INITIAL_JOB__ as JobAd;
        const ssrSlug = (ssr.slug || '').toLowerCase();
        const ssrId = (ssr.id || '').toLowerCase();
        if (ssrSlug === clean || ssrId === clean) {
          return ssr;
        }
      }

      // 1. Exact match on slug
      const exactSlug = allJobs.find(j => j.slug && j.slug.toLowerCase() === clean);
      if (exactSlug) return exactSlug;

      // 2. Exact match on ID (e.g. GF-8136 or gf-8136)
      const exactId = allJobs.find(j => j.id && j.id.toLowerCase() === clean);
      if (exactId) return exactId;

      // 3. Exact numeric ID (8136) or trailing -<digits> slug ID suffix (e.g. building-surveyor-riyadh-8136 -> GF-8136)
      const pureDigitsMatch = clean.match(/^(?:gf-)?(\d+)$/);
      const trailingDigitsMatch = clean.match(/-(\d+)$/);
      const idDigits = pureDigitsMatch?.[1] || trailingDigitsMatch?.[1];
      if (idDigits) {
        const idNumericMatch = allJobs.find(j => j.id && j.id.replace(/[^0-9]/g, '') === idDigits);
        if (idNumericMatch) return idNumericMatch;
      }

      // 4. Safe partial slug fallback (require meaningful length >= 4 and non-empty strings)
      if (clean.length >= 4) {
        const partialMatch = allJobs.find(j => {
          const jSlug = (j.slug || '').trim().toLowerCase();
          return jSlug.length >= 4 && (jSlug.includes(clean) || clean.includes(jSlug));
        });
        if (partialMatch) return partialMatch;
      }

      return undefined;
    } catch {
      return this.getJobs().find(j => j.slug === slugOrId || j.id === slugOrId);
    }
  }

  private getAuthToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    } catch {
      return null;
    }
  }

  private setAuthToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
      }
    } catch (e) {
      console.error('Failed to persist auth token:', e);
    }
  }

  private buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const token = this.getAuthToken();
    return {
      ...(extra || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private async fetchJsonWithRetry(
    url: string,
    init: RequestInit,
    retries = 1
  ): Promise<{ res: Response; data: any; isJson: boolean }> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch(apiUrl(url), {
          ...init,
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const rawText = await res.text();
        let data: any = null;
        let isJson = false;
        if (rawText) {
          try {
            data = JSON.parse(rawText);
            isJson = true;
          } catch {
            isJson = false;
          }
        } else {
          data = {};
        }

        const isTransientGateway = !isJson && (res.status === 502 || res.status === 503 || res.status === 504);
        if (isTransientGateway && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 700));
          continue;
        }

        return { res, data: isJson ? data : {}, isJson };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        const isAbort = err?.name === 'AbortError';
        if (!isAbort && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 700));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Network request failed');
  }

  public async fetchEmployerJobsAsync(): Promise<{ success: boolean; jobs: JobAd[]; error?: string }> {
    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry('/api/employer/jobs', {
        method: 'GET',
        headers: this.buildAuthHeaders()
      });
      if (!res.ok) {
        if (res.status === 401) {
          this.logoutUser();
        }
        return {
          success: false,
          jobs: [],
          error: (isJson && data?.error) || 'Failed to load employer job posts.'
        };
      }
      if (isJson && Array.isArray(data)) {
        const scopedIds = new Set(data.map((j: JobAd) => j.id));
        const others = this.jobs.filter(j => !scopedIds.has(j.id));
        this.jobs = [...data, ...others];
        this.saveJobsToStorage();
        return { success: true, jobs: data };
      }
      return { success: false, jobs: [], error: 'Unexpected response from server.' };
    } catch {
      return { success: false, jobs: [], error: 'Unable to reach server to load your job posts.' };
    }
  }

  public async createJobAsync(
    adData: Omit<JobAd, 'id' | 'slug' | 'postedAt' | 'expiresAt' | 'viewsCount' | 'inquiriesCount'>
  ): Promise<{ success: boolean; job?: JobAd; error?: string; invalidFields?: string[] }> {
    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry('/api/jobs', {
        method: 'POST',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(adData)
      });

      if (!res.ok) {
        if (!isJson) {
          const targetUrl = apiUrl('/api/jobs');
          console.error(`[Gulfaro API] Expected JSON from POST ${targetUrl} but received HTTP ${res.status}.`);
          if (res.status === 404 && isMissingProductionBackendConfig()) {
            return {
              success: false,
              error:
                'Backend server is not connected yet (HTTP 404 on /api/jobs). Hostinger static hosting cannot run the Node.js API — deploy your backend on Render and set its URL in public/gulfaro-config.js or VITE_API_BASE_URL.'
            };
          }
          return {
            success: false,
            error:
              res.status === 502 || res.status === 503 || res.status === 504
                ? 'The Gulfaro server is temporarily restarting. Please wait a few seconds and click Publish Job again.'
                : `Unexpected response from the Gulfaro server (HTTP ${res.status}). Please try again.`
          };
        }
        return {
          success: false,
          error: data.error || 'Failed to publish job advertisement.',
          invalidFields: Array.isArray(data.invalidFields) ? data.invalidFields : undefined
        };
      }

      if (!isJson || !data || !data.id) {
        return {
          success: false,
          error: 'The Gulfaro server returned an invalid job response. Please try again.'
        };
      }

      this.jobs.unshift(data);
      this.saveJobsToStorage();
      return { success: true, job: data };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          error: 'Publishing timed out while waiting for the Gulfaro server. Please check your connection and try again.'
        };
      }
      return {
        success: false,
        error: 'Unable to reach the Gulfaro server to validate and publish your job. Please try again.'
      };
    }
  }

  public createJob(adData: Omit<JobAd, 'id' | 'slug' | 'postedAt' | 'expiresAt' | 'viewsCount' | 'inquiriesCount'>): JobAd {
    const randomIdNumber = Math.floor(1000 + Math.random() * 9000);
    const id = `GF-${randomIdNumber}`;
    
    // Create SEO-friendly slug
    const cleanTitle =
      (adData.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 45) || 'job';
    const cleanCity =
      (adData.city || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'gcc';
    const slug = `${cleanTitle}-${cleanCity}-${randomIdNumber}`.replace(/-+/g, '-');

    const now = new Date();
    // Default 30 days active lifecycle
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newJob: JobAd = {
      ...adData,
      id,
      slug,
      postedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      viewsCount: 1,
      inquiriesCount: 0,
      status: adData.status || 'active'
    };

    this.jobs.unshift(newJob);
    this.saveJobsToStorage();

    if (typeof window !== 'undefined') {
      fetch(apiUrl('/api/jobs'), {
        method: 'POST',
        credentials: 'include',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newJob)
      }).catch(err => console.warn('Could not sync created job to server:', err));
    }

    return newJob;
  }

  public async updateJobAsync(
    id: string,
    updates: Partial<JobAd>
  ): Promise<{ success: boolean; job?: JobAd; error?: string; invalidFields?: string[] }> {
    if (!id) return { success: false, error: 'Missing job ID.' };
    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry(`/api/jobs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        if (!isJson) {
          const targetUrl = apiUrl(`/api/jobs/${encodeURIComponent(id)}`);
          console.error(`[Gulfaro API] Expected JSON from PUT ${targetUrl} but received HTTP ${res.status}.`);
          if (res.status === 404 && isMissingProductionBackendConfig()) {
            return {
              success: false,
              error:
                'Backend server is not connected yet (HTTP 404 on /api/jobs). Deploy your backend on Render and set its URL in public/gulfaro-config.js or VITE_API_BASE_URL.'
            };
          }
          return {
            success: false,
            error:
              res.status === 502 || res.status === 503 || res.status === 504
                ? 'The Gulfaro server is temporarily restarting. Please wait a few seconds and try again.'
                : `Unexpected response from the Gulfaro server (HTTP ${res.status}). Please try again.`
          };
        }
        return {
          success: false,
          error: data.error || 'Failed to update job advertisement.',
          invalidFields: Array.isArray(data.invalidFields) ? data.invalidFields : undefined
        };
      }

      if (!isJson || !data || !data.id) {
        return {
          success: false,
          error: 'The Gulfaro server returned an invalid job update response. Please try again.'
        };
      }

      const cleanId = id.trim().toLowerCase();
      const index = this.jobs.findIndex(j => j.id && j.id.toLowerCase() === cleanId);
      if (index !== -1) {
        this.jobs[index] = data;
      } else {
        this.jobs.unshift(data);
      }
      this.saveJobsToStorage();
      return { success: true, job: data };
    } catch {
      return {
        success: false,
        error: 'Unable to reach the Gulfaro server to save job updates. Please try again.'
      };
    }
  }

  public updateJob(id: string, updates: Partial<JobAd>): JobAd | null {
    if (!id) return null;
    const cleanId = id.trim().toLowerCase();
    const index = this.jobs.findIndex(j => j.id && j.id.toLowerCase() === cleanId);
    if (index === -1) return null;
    const existing = this.jobs[index];
    if (this.currentUser && this.currentUser.role !== 'admin' && existing.userId !== this.currentUser.id) {
      return null;
    }

    this.jobs[index] = {
      ...existing,
      ...updates
    };
    this.saveJobsToStorage();

    if (typeof window !== 'undefined') {
      fetch(apiUrl(`/api/jobs/${encodeURIComponent(this.jobs[index].id)}`), {
        method: 'PUT',
        credentials: 'include',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updates)
      }).catch(err => console.warn('Could not sync updated job to server:', err));
    }

    return this.jobs[index];
  }

  public async deleteJobAsync(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: 'Missing job ID.' };
    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry(
        `/api/jobs/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' })
        }
      );
      if (!res.ok) {
        if (!isJson && res.status === 404 && isMissingProductionBackendConfig()) {
          return {
            success: false,
            error:
              'Backend server is not connected yet (HTTP 404 on /api/jobs). Deploy your backend on Render and set its URL in public/gulfaro-config.js or VITE_API_BASE_URL.'
          };
        }
        return {
          success: false,
          error: (isJson && data.error) || 'Failed to delete job advertisement.'
        };
      }

      const cleanId = id.trim().toLowerCase();
      this.jobs = this.jobs.filter(j => j.id && j.id.toLowerCase() !== cleanId);
      this.saveJobsToStorage();
      return { success: true };
    } catch {
      return { success: false, error: 'Unable to reach the Gulfaro server to delete this job.' };
    }
  }

  public deleteJob(id: string): boolean {
    if (!id) return false;
    const cleanId = id.trim().toLowerCase();
    const targetJob = this.jobs.find(j => j.id && j.id.toLowerCase() === cleanId);
    if (!targetJob) return false;
    if (this.currentUser && this.currentUser.role !== 'admin' && targetJob.userId !== this.currentUser.id) {
      return false;
    }
    const initialLen = this.jobs.length;
    this.jobs = this.jobs.filter(j => j.id && j.id.toLowerCase() !== cleanId);

    if (this.jobs.length !== initialLen) {
      this.saveJobsToStorage();

      if (typeof window !== 'undefined') {
        fetch(apiUrl(`/api/jobs/${encodeURIComponent(targetJob.id)}`), {
          method: 'DELETE',
          credentials: 'include',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' })
        }).catch(err => console.warn('Could not sync deleted job to server:', err));
      }

      return true;
    }
    return false;
  }

  public renewJob(id: string): JobAd | null {
    const job = this.getJobById(id);
    if (!job) return null;
    const now = new Date();
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.updateJob(id, {
      postedAt: now.toISOString(),
      expiresAt: newExpiry.toISOString(),
      status: 'active'
    });
  }

  public incrementViews(id: string): void {
    const job = this.getJobById(id);
    if (job) {
      job.viewsCount = (job.viewsCount || 0) + 1;
      this.saveJobsToStorage();
    }
  }

  public incrementInquiries(id: string): void {
    const job = this.getJobById(id);
    if (job) {
      job.inquiriesCount = (job.inquiriesCount || 0) + 1;
      this.saveJobsToStorage();
    }
  }

  // --- Saved Jobs (Bookmarks) ---

  public getSavedJobIds(): string[] {
    return Array.from(this.savedJobIds);
  }

  public isJobSaved(id: string): boolean {
    return this.savedJobIds.has(id);
  }

  public toggleSaveJob(id: string): boolean {
    if (this.savedJobIds.has(id)) {
      this.savedJobIds.delete(id);
      this.saveSavedToStorage();
      return false;
    } else {
      this.savedJobIds.add(id);
      this.saveSavedToStorage();
      return true;
    }
  }

  // --- User & Auth ---

  private saveUsersToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_GULFARO_USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(this.users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.error(e);
    }
  }

  public async syncUsersWithServer(): Promise<User[]> {
    const token = this.getAuthToken();
    if (!token && !this.currentUser) {
      return this.users;
    }
    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include',
        headers: this.buildAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user?.id && data.user.emailVerified === true) {
          this.setCurrentUser({
            ...(this.currentUser || {}),
            ...data.user,
            emailVerified: true
          });
        } else {
          this.logoutUser();
        }
      } else if (res.status === 401) {
        this.logoutUser();
      }
    } catch (e) {
      console.warn('[Gulfaro Storage] Failed to refresh authenticated session from server:', e);
    }
    return this.users;
  }

  public async loginUserAsync(
    email: string,
    password?: string,
    rememberMe = true
  ): Promise<{ success: boolean; user?: User; error?: string; code?: string }> {
    const inputEmail = (email || '').toLowerCase().trim();
    const inputPassword = (password || '').trim();

    if (!inputEmail.includes('@') && inputEmail !== 'admin' && inputEmail !== 'superadmin') {
      return {
        success: false,
        error: 'Please enter your registered email address to sign in. Phone number login is not supported.'
      };
    }

    if (!inputPassword) {
      return {
        success: false,
        error: 'Please enter your password.'
      };
    }

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, identifier: inputEmail, password: inputPassword, rememberMe })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (data.user.emailVerified !== true) {
          return {
            success: false,
            code: 'EMAIL_NOT_VERIFIED',
            error: 'Please verify your email address before signing in.'
          };
        }
        if (data.token) {
          this.setAuthToken(data.token);
        }
        const authenticatedUser: User = {
          ...data.user,
          emailVerified: true,
          emailVerifiedAt: data.user.emailVerifiedAt || data.user.createdAt || new Date().toISOString()
        };

        let usersList: User[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY_GULFARO_USERS);
          usersList = raw ? JSON.parse(raw) : [...this.users];
        } catch {
          usersList = [...this.users];
        }
        const idx = usersList.findIndex(u => u.email.toLowerCase().trim() === inputEmail);
        if (idx >= 0) {
          usersList[idx] = { ...usersList[idx], ...authenticatedUser };
        } else {
          usersList.push(authenticatedUser);
        }
        this.users = usersList;
        this.saveUsersToStorage();
        this.setCurrentUser(authenticatedUser);
        return { success: true, user: authenticatedUser };
      }

      return {
        success: false,
        code: data?.code,
        error: data?.error || 'Authentication failed. Please check your email and password.'
      };
    } catch {
      return {
        success: false,
        error: 'Unable to reach the Gulfaro authentication server. Please try again.'
      };
    }
  }

  public loginUser(
    email: string,
    password?: string,
    rememberMe = true
  ): { success: boolean; user?: User; error?: string; code?: string } {
    const inputEmail = (email || '').toLowerCase().trim();
    const inputPassword = (password || '').trim();

    if (!inputEmail.includes('@') && inputEmail !== 'admin' && inputEmail !== 'superadmin') {
      return {
        success: false,
        error: 'Please enter your registered email address to sign in. Phone number login is not supported.'
      };
    }

    if (!inputPassword) {
      return {
        success: false,
        error: 'Please enter your password.'
      };
    }

    // Read directly from persistent localStorage 'gulfaro_users'
    let usersList: User[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GULFARO_USERS) || localStorage.getItem(STORAGE_KEY_ALL_USERS);
      usersList = raw ? JSON.parse(raw) : [...this.users];
    } catch {
      usersList = [...this.users];
    }

    if (!usersList.length) {
      usersList = [...DEMO_USERS];
    }

    const userMatch = usersList.find(u => {
      const emailMatch = u.email && u.email.toLowerCase().trim() === inputEmail;
      const adminMatch = (inputEmail === 'admin' || inputEmail === 'superadmin') && u.role === 'admin';
      return emailMatch || adminMatch;
    });

    if (!userMatch) {
      return {
        success: false,
        error: 'No Gulfaro account found with this email address. Please check your spelling or click "Create Account".'
      };
    }

    if (!userMatch.password || userMatch.password !== inputPassword) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your password and try again, or click "Forgot password?".'
      };
    }

    if (userMatch.emailVerified !== true) {
      return {
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Please verify your email address before signing in.'
      };
    }

    this.setCurrentUser(userMatch);
    if (rememberMe) {
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userMatch));
      } catch (e) {
        console.error(e);
      }
    }

    return { success: true, user: userMatch };
  }

  public async registerUserAsync(
    userData: Omit<User, 'id' | 'createdAt'> & { confirmPassword?: string }
  ): Promise<{
    success: boolean;
    requiresVerification?: boolean;
    emailSent?: boolean;
    message?: string;
    user?: User;
    error?: string;
  }> {
    const emailNormalized = (userData.email || '').toLowerCase().trim();
    const phoneTrimmed = (userData.phone || '').trim();

    if (!emailNormalized) {
      return { success: false, error: 'A valid email address is required.' };
    }

    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          email: emailNormalized,
          phone: phoneTrimmed,
          whatsapp: (userData.whatsapp || phoneTrimmed).trim()
        })
      });

      if (!res.ok || !isJson || !data.success) {
        return {
          success: false,
          error: (isJson && data.error) || 'Registration failed. Please verify your details and try again.'
        };
      }

      const returnedUser: User | undefined = data.user
        ? {
            ...data.user,
            emailVerified: Boolean(data.user.emailVerified),
            emailVerifiedAt: data.user.emailVerified ? data.user.emailVerifiedAt : undefined
          }
        : undefined;

      if (returnedUser) {
        const idx = this.users.findIndex(u => u.email.toLowerCase().trim() === emailNormalized);
        if (idx >= 0) {
          this.users[idx] = returnedUser;
        } else {
          this.users.push(returnedUser);
        }
        this.saveUsersToStorage();
      }

      // Only log user in immediately if account is already verified and server issued a session token
      if (!data.requiresVerification && data.token && returnedUser?.emailVerified === true) {
        this.setAuthToken(data.token);
        this.setCurrentUser(returnedUser);
      }

      return {
        success: true,
        requiresVerification: Boolean(data.requiresVerification ?? true),
        emailSent: Boolean(data.emailSent),
        message:
          data.message ||
          'Your registration was successful. Please check your email and click the verification link to activate your Gulfaro account.',
        user: returnedUser
      };
    } catch (networkErr) {
      console.warn('[Gulfaro Auth] Server registration request failed:', networkErr);
      return {
        success: false,
        error: 'Unable to reach the Gulfaro registration server. Please try again.'
      };
    }
  }

  public registerUser(userData: Omit<User, 'id' | 'createdAt'>): {
    success: boolean;
    requiresVerification?: boolean;
    message?: string;
    user?: User;
    error?: string;
  } {
    const emailNormalized = (userData.email || '').toLowerCase().trim();
    if (!emailNormalized) {
      return { success: false, error: 'A valid email address is required.' };
    }

    let usersList: User[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GULFARO_USERS);
      usersList = raw ? JSON.parse(raw) : [];
    } catch {
      usersList = [];
    }
    if (!usersList.length) {
      usersList = [...DEMO_USERS];
    }

    if (usersList.some(u => u.email && u.email.toLowerCase().trim() === emailNormalized)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    if (userData.phone || userData.whatsapp) {
      const match = usersList.find(u => phonesMatch(u.phone, userData.phone) || phonesMatch(u.whatsapp, userData.whatsapp));
      if (match) {
        return { success: false, error: 'An account with this phone number or WhatsApp already exists. Please sign in instead.' };
      }
    }

    const nowIso = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: emailNormalized,
      password: userData.password,
      phone: (userData.phone || '').trim(),
      whatsapp: (userData.whatsapp || userData.phone || '').trim(),
      emailVerified: false,
      emailVerifiedAt: undefined,
      createdAt: nowIso
    };

    usersList.push(newUser);
    this.users = usersList;

    try {
      localStorage.setItem(STORAGE_KEY_GULFARO_USERS, JSON.stringify(usersList));
      localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(usersList));
    } catch (err) {
      console.error('[Gulfaro Storage] Error persisting to localStorage:', err);
    }

    return {
      success: true,
      requiresVerification: true,
      message:
        'Your registration was successful. Please check your email and click the verification link to activate your Gulfaro account.',
      user: newUser
    };
  }

  public isPhoneRegistered(phone: string): boolean {
    if (!phone || !phone.trim()) return false;
    return this.users.some(u => phonesMatch(u.phone, phone) || phonesMatch(u.whatsapp, phone));
  }

  public async checkDuplicateAccountAsync(email?: string, phone?: string): Promise<{ exists: boolean; field?: 'email' | 'phone'; message?: string }> {
    try {
      const res = await fetch(apiUrl('/api/auth/check-duplicate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email ? email.toLowerCase().trim() : undefined, phone })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[Gulfaro Storage] Failed to call check-duplicate API, checking local storage:', e);
    }

    if (email && this.isEmailRegistered(email)) {
      return { exists: true, field: 'email', message: 'An account with this email address already exists. Please sign in instead.' };
    }
    if (phone && this.isPhoneRegistered(phone)) {
      return { exists: true, field: 'phone', message: 'An account with this phone number or WhatsApp already exists. Please sign in instead.' };
    }
    return { exists: false };
  }

  public logoutUser(): void {
    this.currentUser = null;
    this.setAuthToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_USER);
      // NOTE: gulfaro_users is NEVER removed on logout!
    } catch (e) {
      console.error(e);
    }
    if (typeof window !== 'undefined') {
      fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' }).catch(() => {});
    }
  }

  public registerCustomUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    // Synchronously create and fire async persistence to server
    const res = this.registerUser(userData);
    this.registerUserAsync(userData).catch(() => {});
    return res.user || DEMO_USERS[0];
  }

  public isEmailRegistered(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    // Check in-memory users list
    if (this.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return true;
    }
    // Also check raw localStorage gulfaro_users to guarantee sync
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GULFARO_USERS);
      if (raw) {
        const parsed: User[] = JSON.parse(raw);
        return parsed.some(u => u.email.toLowerCase() === cleanEmail);
      }
    } catch {}
    return false;
  }

  public getUserByEmail(email: string): User | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.users.find(u => u.email.toLowerCase() === cleanEmail);
  }

  public updateUserPassword(email: string, newPassword: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    let updated = false;

    // Update in-memory list
    this.users = this.users.map(u => {
      if (u.email.toLowerCase() === cleanEmail) {
        updated = true;
        return { ...u, password: newPassword };
      }
      return u;
    });

    if (updated) {
      this.saveUsersToStorage();
      if (this.currentUser && this.currentUser.email.toLowerCase() === cleanEmail) {
        this.currentUser.password = newPassword;
        this.setCurrentUser(this.currentUser);
      }
      return true;
    }

    // Also fallback check localStorage directly if not found in memory
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GULFARO_USERS);
      if (raw) {
        const parsed: User[] = JSON.parse(raw);
        let foundIdx = -1;
        parsed.forEach((u, idx) => {
          if (u.email.toLowerCase() === cleanEmail) {
            foundIdx = idx;
          }
        });
        if (foundIdx >= 0) {
          parsed[foundIdx].password = newPassword;
          this.users = parsed;
          this.saveUsersToStorage();
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to update user password in localStorage', e);
    }

    return false;
  }

  public requestPasswordReset(email: string): { success: boolean; message: string } {
    const found = this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      return { 
        success: true, 
        message: `Password reset instructions and verification code have been dispatched to ${found.email} and WhatsApp ${found.whatsapp || ''}.` 
      };
    }
    return {
      success: true,
      message: `If an account exists for ${email}, a password reset code has been sent.`
    };
  }

  // --- User Management Helper ---

  public deleteUser(userId: string): boolean {
    const initialLen = this.users.length;
    this.users = this.users.filter(u => u.id !== userId);
    if (this.users.length !== initialLen) {
      this.saveUsersToStorage();
      return true;
    }
    return false;
  }

  // --- AdSense Monetization Methods ---

  public getAdSenseConfig(): AdSenseConfig {
    return { ...this.adSenseConfig };
  }

  public updateAdSenseConfig(updates: Partial<AdSenseConfig>): AdSenseConfig {
    this.adSenseConfig = {
      ...this.adSenseConfig,
      ...updates,
      slots: {
        ...this.adSenseConfig.slots,
        ...(updates.slots || {})
      }
    };
    try {
      localStorage.setItem(STORAGE_KEY_ADSENSE, JSON.stringify(this.adSenseConfig));
    } catch (e) {
      console.error('Failed to save AdSense config', e);
    }
    return { ...this.adSenseConfig };
  }

  // --- Verified Employer Trust Badge Methods ---

  public isEmployerVerified(job: JobAd): boolean {
    if (job.isEmployerVerified === true) return true;
    if (job.userId && this.currentUser && this.currentUser.id === job.userId) {
      return (this.currentUser.role === 'employer' || this.currentUser.role === 'admin') && this.currentUser.emailVerified === true;
    }
    if (job.userId) {
      const u = this.users.find(usr => usr.id === job.userId);
      if (u && (u.role === 'employer' || u.role === 'admin') && u.emailVerified === true) return true;
    }
    return false;
  }

  public async verifyEmailTokenAsync(
    token: string
  ): Promise<{ success: boolean; code?: string; message?: string; error?: string }> {
    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      return {
        success: false,
        code: 'INVALID_TOKEN',
        error: 'Invalid or missing verification token. Please check the link or request a new verification email.'
      };
    }
    try {
      const res = await fetch(apiUrl('/api/auth/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          code: data?.code,
          error: data?.error || 'This verification link is invalid or has expired.'
        };
      }
      return {
        success: true,
        message:
          data?.message ||
          'Your email address has been verified! Your Gulfaro account is now active and ready to sign in.'
      };
    } catch {
      return {
        success: false,
        error: 'Unable to reach the Gulfaro verification server. Please check your connection and try again.'
      };
    }
  }

  public async resendVerificationEmailAsync(
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return {
        success: false,
        error: 'Please enter a valid email address.'
      };
    }
    try {
      const res = await fetch(apiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data?.error || 'Unable to resend verification email. Please try again.'
        };
      }
      return {
        success: true,
        message:
          data?.message ||
          'If an unverified Gulfaro account exists with that email address, a new verification link has been sent.'
      };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the Gulfaro email server. Please check your network and try again.'
      };
    }
  }
}

export const storageService = new StorageService();
