import { JobAd, JobApplication, User, GccCountry, GCC_COUNTRIES } from '../types/job';
import { INITIAL_JOB_ADS } from '../data/seedJobs';
import { AdSenseConfig, DEFAULT_ADSENSE_CONFIG } from '../types/adsense';

const STORAGE_KEY_JOBS = 'golfaro_jobs_v1';
const STORAGE_KEY_SAVED = 'golfaro_saved_jobs_v1';
const STORAGE_KEY_APPS = 'golfaro_applications_v1';
const STORAGE_KEY_USER = 'golfaro_current_user_v1';
const STORAGE_KEY_ALL_USERS = 'golfaro_all_users_v1';
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
    createdAt: '2026-09-01T00:00:00Z'
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
    createdAt: '2026-08-15T00:00:00Z'
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
    createdAt: '2026-08-20T00:00:00Z'
  },
  {
    id: 'user-admin-1',
    name: 'Gulfaro Moderator (Admin)',
    email: 'admin@gulfaro.com',
    password: 'password123',
    role: 'admin',
    country: 'saudi-arabia',
    city: 'Riyadh',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

class StorageService {
  private jobs: JobAd[] = [];
  private savedJobIds: Set<string> = new Set();
  private applications: JobApplication[] = [];
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

    // Load users
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEY_ALL_USERS);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        this.users = [...DEMO_USERS];
        localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(this.users));
      }
    } catch {
      this.users = [...DEMO_USERS];
    }
    // Load jobs
    try {
      const storedJobs = localStorage.getItem(STORAGE_KEY_JOBS);
      if (storedJobs) {
        this.jobs = JSON.parse(storedJobs);
      } else {
        this.jobs = [...INITIAL_JOB_ADS];
        this.saveJobsToStorage();
      }
    } catch {
      this.jobs = [...INITIAL_JOB_ADS];
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

    // Load applications
    try {
      const storedApps = localStorage.getItem(STORAGE_KEY_APPS);
      if (storedApps) {
        this.applications = JSON.parse(storedApps);
      } else {
        // Seed 1 initial demo application
        this.applications = [
          {
            id: 'app-101',
            jobId: 'GF-901',
            jobTitle: 'Senior Civil Site Engineer – High-Rise & Infrastructure',
            companyName: 'Al-Bawani Contracting Co.',
            applicantUserId: 'user-seeker-1',
            applicantName: 'Zaid Al-Mansoor',
            applicantEmail: 'zaid.almansoor@example.com',
            applicantPhone: '+966 50 123 4567',
            applicantWhatsapp: '+966501234567',
            currentCountry: 'saudi-arabia',
            currentCity: 'Riyadh',
            iqamaStatus: 'transferable',
            yearsExperience: '5 years',
            coverNote: 'Dear Hiring Team, I am an SCE-registered Civil Engineer with 5 years of site execution experience in Riyadh. My Iqama is transferable immediately via Qiwa.',
            resumeFileName: 'Zaid_AlMansoor_Civil_Engineer_CV.pdf',
            appliedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            status: 'shortlisted'
          }
        ];
        this.saveAppsToStorage();
      }
    } catch {
      this.applications = [];
    }

    // Load current user
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      } else {
        this.currentUser = DEMO_USERS[0];
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
    } catch {
      this.currentUser = DEMO_USERS[0];
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

  private saveAppsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(this.applications));
    } catch (e) {
      console.error('Failed to save applications', e);
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

  // --- Jobs CRUD ---

  public getJobs(): JobAd[] {
    this.checkAndUpdateExpiries();
    return [...this.jobs];
  }

  public getActiveJobs(): JobAd[] {
    return this.getJobs().filter(j => j.status === 'active');
  }

  public getJobById(id: string): JobAd | undefined {
    return this.getJobs().find(j => j.id === id);
  }

  public getJobBySlug(slug: string): JobAd | undefined {
    return this.getJobs().find(j => j.slug === slug || j.id === slug);
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
    return newJob;
  }

  public updateJob(id: string, updates: Partial<JobAd>): JobAd | null {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index === -1) return null;

    this.jobs[index] = {
      ...this.jobs[index],
      ...updates
    };
    this.saveJobsToStorage();
    return this.jobs[index];
  }

  public deleteJob(id: string): boolean {
    const initialLen = this.jobs.length;
    this.jobs = this.jobs.filter(j => j.id !== id);
    if (this.jobs.length !== initialLen) {
      this.saveJobsToStorage();
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

  // --- Applications ---

  public getApplications(): JobApplication[] {
    return [...this.applications];
  }

  public getApplicationsForJob(jobId: string): JobApplication[] {
    return this.applications.filter(a => a.jobId === jobId);
  }

  public getApplicationsByUser(userId: string): JobApplication[] {
    return this.applications.filter(a => a.applicantUserId === userId);
  }

  public submitApplication(app: Omit<JobApplication, 'id' | 'appliedAt' | 'status'>): JobApplication {
    const id = `app-${Date.now()}`;
    const newApp: JobApplication = {
      ...app,
      id,
      appliedAt: new Date().toISOString(),
      status: 'new'
    };
    this.applications.unshift(newApp);
    this.saveAppsToStorage();
    this.incrementInquiries(app.jobId);
    return newApp;
  }

  public updateApplicationStatus(appId: string, status: JobApplication['status']): boolean {
    const app = this.applications.find(a => a.id === appId);
    if (app) {
      app.status = status;
      this.saveAppsToStorage();
      return true;
    }
    return false;
  }

  // --- User & Auth ---

  private saveUsersToStorage() {
    try {
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
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.error(e);
    }
  }

  public loginUser(identifier: string, password?: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, '');

    const found = this.users.find(u => {
      const emailMatch = u.email.toLowerCase() === cleanId;
      const phoneMatch = cleanDigits && u.phone && u.phone.replace(/[^0-9]/g, '').includes(cleanDigits);
      const whatsappMatch = cleanDigits && u.whatsapp && u.whatsapp.replace(/[^0-9]/g, '').includes(cleanDigits);
      return emailMatch || phoneMatch || whatsappMatch;
    });

    if (!found) {
      return { success: false, error: 'No Gulfaro account found with this email or phone number.' };
    }

    // Verify password if provided
    if (password && found.password && found.password !== password && password !== 'password123') {
      return { success: false, error: 'Incorrect password. Try "password123" for demo accounts.' };
    }

    this.setCurrentUser(found);
    return { success: true, user: found };
  }

  public registerUser(userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; user?: User; error?: string } {
    const emailLower = userData.email.trim().toLowerCase();
    
    // Check if email already exists
    if (this.users.some(u => u.email.toLowerCase() === emailLower)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      email: emailLower,
      password: userData.password || 'password123',
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsersToStorage();
    this.setCurrentUser(newUser);

    return { success: true, user: newUser };
  }

  public logoutUser(): void {
    this.setCurrentUser(null);
  }

  public switchDemoUser(role: 'job_seeker' | 'employer' | 'admin'): User {
    const found = this.users.find(u => u.role === role) || DEMO_USERS[0];
    this.setCurrentUser(found);
    return found;
  }

  public registerCustomUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const res = this.registerUser(userData);
    return res.user || DEMO_USERS[0];
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

  // --- Admin Moderation ---

  public adminApproveJob(id: string): boolean {
    return !!this.updateJob(id, { status: 'active', rejectionReason: undefined });
  }

  public adminRejectJob(id: string, reason: string): boolean {
    return !!this.updateJob(id, { status: 'rejected', rejectionReason: reason });
  }

  public adminToggleFeatured(id: string): boolean {
    const job = this.getJobById(id);
    if (!job) return false;
    const isFeatured = !job.isFeatured;
    return !!this.updateJob(id, { 
      isFeatured,
      packageType: isFeatured ? 'featured' : 'standard'
    });
  }

  public adminPurgeExpired(): number {
    const initialLen = this.jobs.length;
    this.jobs = this.jobs.filter(j => j.status !== 'expired');
    const removed = initialLen - this.jobs.length;
    if (removed > 0) {
      this.saveJobsToStorage();
    }
    return removed;
  }

  public resetToDefaultSeed(): void {
    this.jobs = [...INITIAL_JOB_ADS];
    this.saveJobsToStorage();
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
}

export const storageService = new StorageService();
