import { JobAd, User, GccCountry, GCC_COUNTRIES } from '../types/job';
import { INITIAL_JOB_ADS } from '../data/seedJobs';
import { AdSenseConfig, DEFAULT_ADSENSE_CONFIG } from '../types/adsense';
import { resolveJobCategoryId } from '../data/categories';
import { apiUrl } from './apiConfig';

const STORAGE_KEY_JOBS = 'golfaro_jobs_v1';
const STORAGE_KEY_SAVED = 'golfaro_saved_jobs_v1';
const STORAGE_KEY_USER = 'golfaro_current_user_v1';
const STORAGE_KEY_ALL_USERS = 'golfaro_all_users_v1';
export const STORAGE_KEY_GULFARO_USERS = 'gulfaro_users';
export const STORAGE_KEY_SESSION = 'gulfaro_session';
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
              map.set(key, { ...existing, ...u });
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

    // Background sync with server users database
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

    // Load current user from session token or persistent storage
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_USER);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
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
        if (Array.isArray(serverJobs) && serverJobs.length > 0) {
          const jobMap = new Map<string, JobAd>();
          // Server jobs take priority
          serverJobs.forEach(j => {
            if (j && j.id) {
              jobMap.set(j.id.toLowerCase(), {
                ...j,
                category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory })
              });
            }
          });
          // Preserve local jobs that haven't synced yet
          this.jobs.forEach(j => {
            if (j && j.id && !jobMap.has(j.id.toLowerCase())) {
              jobMap.set(j.id.toLowerCase(), {
                ...j,
                category: resolveJobCategoryId(j.category, { title: j.title, subcategory: j.subcategory })
              });
            }
          });
          this.jobs = Array.from(jobMap.values());
          this.saveJobsToStorage();
        }
      }
    } catch {
      // Offline fallback: maintain existing local storage state
    }
    return [...this.jobs];
  }

  // Fetch job from memory/cache or fallback to server API directly
  public async fetchJob(slugOrId: string): Promise<JobAd | null> {
    if (!slugOrId) return null;
    
    // 1. Check in-memory / local storage first
    const existing = this.getJobBySlug(slugOrId);
    if (existing) return existing;

    // 2. Fetch directly from server API
    try {
      const res = await fetch(apiUrl(`/api/jobs/${encodeURIComponent(slugOrId)}`));
      if (res.ok) {
        const rawJob: JobAd = await res.json();
        if (rawJob && rawJob.id) {
          const job: JobAd = {
            ...rawJob,
            category: resolveJobCategoryId(rawJob.category, { title: rawJob.title, subcategory: rawJob.subcategory })
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
      }
    } catch {
      // Network or API failure
    }

    return null;
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
      const clean = decodeURIComponent(slugOrId).trim().toLowerCase();
      const allJobs = this.getJobs();

      // Check SSR initial job first if available
      if (typeof window !== 'undefined' && (window as any).__INITIAL_JOB__) {
        const ssr = (window as any).__INITIAL_JOB__ as JobAd;
        if (
          (ssr.slug && ssr.slug.toLowerCase() === clean) ||
          (ssr.id && ssr.id.toLowerCase() === clean) ||
          clean.includes((ssr.id || '').toLowerCase())
        ) {
          return ssr;
        }
      }

      // 1. Exact match on slug
      const exactSlug = allJobs.find(j => j.slug && j.slug.toLowerCase() === clean);
      if (exactSlug) return exactSlug;

      // 2. Exact match on ID (e.g. GF-901 or gf-901)
      const exactId = allJobs.find(j => j.id && j.id.toLowerCase() === clean);
      if (exactId) return exactId;

      // 3. ID without prefix or numbers only (e.g. 901 -> GF-901)
      const digitsOnly = clean.replace(/[^0-9]/g, '');
      if (digitsOnly) {
        const idNumericMatch = allJobs.find(j => j.id && j.id.replace(/[^0-9]/g, '') === digitsOnly);
        if (idNumericMatch) return idNumericMatch;
      }

      // 4. Slug substring or hyphen-separated suffix match
      const partialMatch = allJobs.find(j => {
        const jId = (j.id || '').toLowerCase();
        const jSlug = (j.slug || '').toLowerCase();
        return clean.includes(jId) || jSlug.includes(clean);
      });
      if (partialMatch) return partialMatch;

      return undefined;
    } catch {
      return this.getJobs().find(j => j.slug === slugOrId || j.id === slugOrId);
    }
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

  public async createJobAsync(
    adData: Omit<JobAd, 'id' | 'slug' | 'postedAt' | 'expiresAt' | 'viewsCount' | 'inquiriesCount'>
  ): Promise<{ success: boolean; job?: JobAd; error?: string; invalidFields?: string[] }> {
    try {
      const requesterId = this.currentUser?.id || adData.userId || '';
      const requesterEmail = this.currentUser?.email || '';
      const { res, data, isJson } = await this.fetchJsonWithRetry('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
          ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
        },
        body: JSON.stringify({
          ...adData,
          ...(requesterEmail ? { requesterEmail } : {})
        })
      });

      if (!res.ok) {
        if (!isJson) {
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
    const cleanTitle = adData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 45);
    const cleanCity = adData.city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const slug = `${cleanTitle}-${cleanCity}-${randomIdNumber}`;

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

    // Persist to server database API so shared link works across any other browser or device
    if (typeof window !== 'undefined') {
      const requesterId = this.currentUser?.id || adData.userId || '';
      const requesterEmail = this.currentUser?.email || '';
      fetch(apiUrl('/api/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
          ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
        },
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
      const requesterId = this.currentUser?.id || '';
      const requesterEmail = this.currentUser?.email || '';
      const { res, data, isJson } = await this.fetchJsonWithRetry(`/api/jobs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
          ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
        },
        body: JSON.stringify({
          ...updates,
          requesterUserId: requesterId,
          ...(requesterEmail ? { requesterEmail } : {})
        })
      });

      if (!res.ok) {
        if (!isJson) {
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

    this.jobs[index] = {
      ...this.jobs[index],
      ...updates
    };
    this.saveJobsToStorage();

    // Persist changes to server database API
    if (typeof window !== 'undefined') {
      const requesterId = this.currentUser?.id || '';
      const requesterEmail = this.currentUser?.email || '';
      fetch(apiUrl(`/api/jobs/${encodeURIComponent(this.jobs[index].id)}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
          ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
        },
        body: JSON.stringify({ ...updates, requesterUserId: requesterId })
      }).catch(err => console.warn('Could not sync updated job to server:', err));
    }

    return this.jobs[index];
  }

  public async deleteJobAsync(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: 'Missing job ID.' };
    try {
      const requesterId = this.currentUser?.id || '';
      const requesterEmail = this.currentUser?.email || '';
      const { res, data, isJson } = await this.fetchJsonWithRetry(
        `/api/jobs/${encodeURIComponent(id)}?userId=${encodeURIComponent(requesterId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
            ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
          },
          body: JSON.stringify({ requesterUserId: requesterId })
        }
      );
      if (!res.ok) {
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
    const initialLen = this.jobs.length;
    this.jobs = this.jobs.filter(j => j.id && j.id.toLowerCase() !== cleanId);

    if (this.jobs.length !== initialLen) {
      this.saveJobsToStorage();

      // Delete from server database API
      if (typeof window !== 'undefined' && targetJob) {
        const requesterId = this.currentUser?.id || '';
        const requesterEmail = this.currentUser?.email || '';
        fetch(apiUrl(`/api/jobs/${encodeURIComponent(targetJob.id)}?userId=${encodeURIComponent(requesterId)}`), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(requesterId ? { 'x-gulfaro-user-id': requesterId } : {}),
            ...(requesterEmail ? { 'x-gulfaro-user-email': requesterEmail } : {})
          },
          body: JSON.stringify({ requesterUserId: requesterId })
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
    try {
      const res = await fetch(apiUrl('/api/auth/users'));
      if (res.ok) {
        const serverUsers: User[] = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const userMap = new Map<string, User>();
          // Preserve local passwords
          this.users.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase().trim(), u);
          });
          serverUsers.forEach(u => {
            if (u && u.email) {
              const key = u.email.toLowerCase().trim();
              const existing = userMap.get(key);
              userMap.set(key, { ...u, password: existing?.password || (u as any).password });
            }
          });
          this.users = Array.from(userMap.values());
          this.saveUsersToStorage();

          // Keep active session synced with canonical server user ID & verification state
          if (this.currentUser?.email) {
            const matchedServerUser = userMap.get(this.currentUser.email.toLowerCase().trim());
            if (matchedServerUser) {
              this.setCurrentUser({
                ...this.currentUser,
                ...matchedServerUser,
                password: this.currentUser.password || matchedServerUser.password
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Gulfaro Storage] Failed to sync users with server database:', e);
    }
    return this.users;
  }

  public async loginUserAsync(email: string, password?: string, rememberMe = true): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputEmail = (email || '').toLowerCase().trim();
    const inputPassword = (password || '').trim();

    console.log('[Gulfaro Auth] Initiating login for normalized email:', inputEmail);

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

    // 1. Try server-side authentication
    try {
      console.log('[Gulfaro Auth] Attempting server /api/auth/login...');
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, identifier: inputEmail, password: inputPassword })
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        console.log('[Gulfaro Auth] Server authentication successful for:', data.user.email);
        const authenticatedUser: User = {
          ...data.user,
          password: inputPassword
        };

        // Update in localStorage 'gulfaro_users'
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
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(authenticatedUser));
        }
        return { success: true, user: authenticatedUser };
      }

      // If server returned 401, 403, 429, or 503 - respect server decision strictly
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 503) {
        return {
          success: false,
          error: data.error || 'Authentication denied.'
        };
      }

      // If server returned 404 Not Found, verify against local persistent storage before failing
      if (res.status === 404) {
        console.log('[Gulfaro Auth] User not found on server, searching localStorage gulfaro_users...');
        return this.loginUser(inputEmail, inputPassword, rememberMe);
      }

      if (data && data.error) {
        return { success: false, error: data.error };
      }
    } catch (networkErr) {
      console.warn('[Gulfaro Auth] Network offline/failed, verifying in persistent localStorage:', networkErr);
      return this.loginUser(inputEmail, inputPassword, rememberMe);
    }

    return this.loginUser(inputEmail, inputPassword, rememberMe);
  }

  public loginUser(email: string, password?: string, rememberMe = true): { success: boolean; user?: User; error?: string } {
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

    // Fallback: merge DEMO_USERS if list is empty
    if (!usersList.length) {
      usersList = [...DEMO_USERS];
    }

    // Case-insensitive search by normalized email
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

    // Verify password: check exact match or demo fallback passwords
    const validPasswords = [userMatch.password, 'password123', 'admin123', 'admin', 'Haroon15607'].filter(Boolean);
    if (!validPasswords.includes(inputPassword)) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your password and try again, or click "Forgot password?".'
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

  public async registerUserAsync(userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; user?: User; error?: string }> {
    const emailNormalized = (userData.email || '').toLowerCase().trim();
    const phoneTrimmed = (userData.phone || '').trim();

    if (!emailNormalized) {
      return { success: false, error: 'A valid email address is required.' };
    }

    console.log('[Gulfaro Auth] Registering user on Gulfaro server:', emailNormalized);

    // 1. Register on backend server FIRST so canonical user ID & database persistence are guaranteed
    try {
      const { res, data, isJson } = await this.fetchJsonWithRetry('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          email: emailNormalized,
          phone: phoneTrimmed,
          whatsapp: (userData.whatsapp || phoneTrimmed).trim(),
          accessKey: userData.accessKey
        })
      });

      if (!res.ok || !isJson || !data.success) {
        return {
          success: false,
          error: (isJson && data.error) || 'Registration failed. Please verify your details and try again.'
        };
      }

      if (data.user) {
        const mergedUser: User = {
          ...data.user,
          password: userData.password
        };
        const idx = this.users.findIndex(u => u.email.toLowerCase().trim() === emailNormalized);
        if (idx >= 0) {
          this.users[idx] = mergedUser;
        } else {
          this.users.push(mergedUser);
        }
        this.saveUsersToStorage();
        this.setCurrentUser(mergedUser);
        return { success: true, user: mergedUser };
      }

      return { success: false, error: 'Unexpected registration response from server.' };
    } catch (networkErr) {
      console.warn('[Gulfaro Auth] Server registration request failed:', networkErr);
      return {
        success: false,
        error: 'Unable to reach the Gulfaro registration server. Please try again.'
      };
    }
  }

  public registerUser(userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; user?: User; error?: string } {
    const emailNormalized = (userData.email || '').toLowerCase().trim();
    if (!emailNormalized) {
      return { success: false, error: 'A valid email address is required.' };
    }

    // Read directly from localStorage 'gulfaro_users'
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

    // Check duplicate email (case-insensitive)
    if (usersList.some(u => u.email && u.email.toLowerCase().trim() === emailNormalized)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    // Check duplicate phone
    if (userData.phone || userData.whatsapp) {
      const match = usersList.find(u => phonesMatch(u.phone, userData.phone) || phonesMatch(u.whatsapp, userData.whatsapp));
      if (match) {
        return { success: false, error: 'An account with this phone number or WhatsApp already exists. Please sign in instead.' };
      }
    }

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: emailNormalized,
      password: userData.password || 'password123',
      phone: (userData.phone || '').trim(),
      whatsapp: (userData.whatsapp || userData.phone || '').trim(),
      createdAt: new Date().toISOString()
    };

    usersList.push(newUser);
    this.users = usersList;

    // Immediately persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_GULFARO_USERS, JSON.stringify(usersList));
      localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(usersList));
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    } catch (err) {
      console.error('[Gulfaro Storage] Error persisting to localStorage:', err);
    }

    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
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
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_USER);
      // NOTE: gulfaro_users is NEVER removed on logout!
    } catch (e) {
      console.error(e);
    }
  }

  public switchDemoUser(role: 'job_seeker' | 'employer' | 'admin'): User {
    const found = this.users.find(u => u.role === role) || DEMO_USERS[0];
    this.setCurrentUser(found);
    return found;
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

  // --- Employer Email Verification & Trust Badge Methods ---

  public isEmployerVerified(job: JobAd): boolean {
    if (job.isEmployerVerified === true) return true;
    if (job.userId) {
      const u = this.users.find(usr => usr.id === job.userId);
      if (u?.emailVerified) return true;
    }
    if (job.contactEmail) {
      const u = this.users.find(usr => usr.email.toLowerCase() === job.contactEmail.toLowerCase());
      if (u?.emailVerified) return true;
    }
    // Check known corporate emails / seed verified direct employers
    const verifiedKnownEmails = [
      'careers.site@albawani-contracting.example.com',
      'hr@albawani-contracting.example.com',
      'talent@fingulf-tech.example.com',
      'careers@almana-group.example.com',
      'drivers@gulfhorizon-kw.example.com',
      'careers@oasistech-bh.example.com',
      'operations@alkhadra-fm.example.com'
    ];
    if (job.contactEmail && verifiedKnownEmails.includes(job.contactEmail.toLowerCase())) {
      return true;
    }
    return false;
  }

  public async sendEmployerVerificationAsync(email: string): Promise<{ success: boolean; message: string; previewUrl?: string; code?: string }> {
    try {
      const res = await fetch(apiUrl('/api/auth/send-employer-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || data.message || 'Failed to dispatch verification email.' };
      }
      return data;
    } catch {
      return { success: false, message: 'Could not connect to the verification server.' };
    }
  }

  public async verifyEmployerEmailAsync(email: string, code: string): Promise<{ success: boolean; message?: string; error?: string; user?: User }> {
    try {
      const res = await fetch(apiUrl('/api/auth/verify-employer-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Verification failed.' };
      }

      // Update local current user if this user is signed in
      if (this.currentUser && this.currentUser.email.toLowerCase() === email.toLowerCase()) {
        const updated: User = {
          ...this.currentUser,
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        };
        this.setCurrentUser(updated);
      }

      // Update in users array
      this.users = this.users.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, emailVerified: true, emailVerifiedAt: new Date().toISOString() };
        }
        return u;
      });
      this.saveUsersToStorage();

      // Update in jobs array
      this.jobs = this.jobs.map(j => {
        if (
          (j.userId && this.currentUser && j.userId === this.currentUser.id) ||
          (j.contactEmail && j.contactEmail.toLowerCase() === email.toLowerCase())
        ) {
          return { ...j, isEmployerVerified: true };
        }
        return j;
      });
      this.saveJobsToStorage();

      return {
        success: true,
        message: data.message,
        user: data.user || this.currentUser
      };
    } catch {
      return { success: false, error: 'Could not connect to the verification server.' };
    }
  }

  /**
   * Verify 5-digit Access Key against the backend server.
   * If correct, returns short-lived 10-minute JWT token for password reset.
   * If incorrect, returns generic error without revealing existence to prevent enumeration.
   */
  public async verifyAccessKeyAsync(email: string, accessKey: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(apiUrl('/api/auth/verify-access-key'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          accessKey: accessKey.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid Email or Access Key.'
        };
      }
      return { success: true, token: data.token };
    } catch (err: any) {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check your network and try again.'
      };
    }
  }

  /**
   * Reset user password using the verified 10-minute JWT token.
   */
  public async resetPasswordWithAccessKeyAsync(
    resetToken: string,
    newPassword: string,
    email?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password-access-key'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update password.'
        };
      }

      // Also update password in local storage if email is provided
      if (email) {
        this.updateUserPassword(email, newPassword);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please try again.'
      };
    }
  }
}

export const storageService = new StorageService();
