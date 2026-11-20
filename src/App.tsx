import React, { useState, useEffect, useMemo } from 'react';
import { GccCountry, GCC_COUNTRIES, JobAd, User } from './types/job';
import {
  PUBLIC_JOB_CATEGORIES,
  findCountryMetaBySlug,
  findCategoryMetaBySlug,
  isJobActiveAndUnexpired
} from './data/gccDirectory';
import { jobMatchesCategoryFilter, getJobCategoryName } from './data/categories';
import { findArticleBySlug } from './data/careerArticles';
import {
  applyRouteSeo,
  buildArticleSchema,
  buildJobPostingSchema,
  buildOrganizationSchema
} from './utils/seo';
import { storageService } from './services/storage';
import { fetchPublicPlatformConfig, PublicPlatformConfig } from './services/siteConfig';
import { Navbar } from './components/Navbar';
import { HeroSection, jobMatchesCityFilter } from './components/HeroSection';
import { JobCard } from './components/JobCard';
import { JobCompactRow } from './components/JobCompactRow';
import { JobDetailView } from './components/JobDetailView';
import { CountryPortalPage } from './components/CountryPortalPage';
import { CategoryPortalPage } from './components/CategoryPortalPage';
import { CareerResourcesPage } from './components/CareerResourcesPage';
import { PublicInfoPages, PublicInfoRouteType } from './components/PublicInfoPages';
import { HomepageEditorialSections } from './components/HomepageEditorialSections';
import { PostJobPage } from './components/PostJobPage';
import { PostJobModal } from './components/PostJobModal';
import { UserDashboard } from './components/UserDashboard';
import { SuperAdminPortal } from './components/super-admin/SuperAdminPortal';
import { SafetyGuideModal } from './components/SafetyGuideModal';
import { RegisterModal } from './components/RegisterModal';
import { AuthPage } from './components/AuthPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AdBanner } from './components/AdBanner';
import { LegalModal, CookieConsentBanner } from './components/LegalModals';
import { Footer } from './components/Footer';
import { JobNotFoundView } from './components/JobNotFoundView';
import { ManageJobsView } from './components/ManageJobsView';
import { UnauthorizedView } from './components/UnauthorizedView';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PWAInstallModal } from './components/PWAInstallModal';
import {
  Filter,
  LayoutGrid,
  List,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const {
    isInstalled: isPWAInstalled,
    hasNativePrompt,
    isIOS,
    isAndroid,
    isModalOpen: isInstallModalOpen,
    modalPlatform,
    openModal: openInstallModal,
    closeModal: closeInstallModal,
    promptInstall
  } = usePWAInstall();

  const [jobs, setJobs] = useState<JobAd[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(storageService.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>(storageService.getSavedJobIds());
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Job Detail / Not Found State
  const [selectedJob, setSelectedJob] = useState<JobAd | null>(null);
  const [jobNotFoundSlug, setJobNotFoundSlug] = useState<string | null>(null);
  const [isJobLoading, setIsJobLoading] = useState(false);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'jobs' | 'dashboard' | 'safety' | 'countries' | 'auth' | 'my-jobs'>('jobs');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authRole, setAuthRole] = useState<'job_seeker' | 'employer'>('job_seeker');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Modals & CMS State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobAd | null>(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicPlatformConfig | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<GccCountry | 'all'>('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>('all');
  const [filterIqama, setFilterIqama] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');
  const [filterMinSalary, setFilterMinSalary] = useState<number>(0);
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterFeaturedOnly, setFilterFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'salary-high' | 'urgent' | 'expiring'>('recent');
  const [jobBatchIndex, setJobBatchIndex] = useState(0);

  const extractJobSlugOrId = (pathnameArg?: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const rawPath = pathnameArg ?? window.location.pathname;
      const pathname = rawPath.split('?')[0].replace(/\/+$/, '') || '/';
      const search = window.location.search;
      const hash = window.location.hash;

      const pathMatch = pathname.match(/^\/jobs?\/([^/?#]+)$/i);
      if (pathMatch && pathMatch[1]) {
        const candidate = decodeURIComponent(pathMatch[1]).replace(/\.html$/i, '').trim();
        if (candidate && candidate !== 'all') return candidate;
      }

      if (!pathnameArg && search) {
        const params = new URLSearchParams(search);
        const queryJob = params.get('job') || params.get('id') || params.get('ref');
        if (queryJob) return decodeURIComponent(queryJob).trim();
      }

      if (!pathnameArg && hash) {
        const hashClean = hash.replace(/^#\/?/, '');
        const hashPathMatch = hashClean.match(/^jobs?\/([^/?#&]+)/i);
        if (hashPathMatch && hashPathMatch[1]) {
          return decodeURIComponent(hashPathMatch[1]).trim();
        }
        const hashParams = new URLSearchParams(hashClean.includes('?') ? hashClean.split('?')[1] : hashClean);
        const hashJob = hashParams.get('job') || hashParams.get('id');
        if (hashJob) return decodeURIComponent(hashJob).trim();
      }
    } catch (err) {
      console.warn('Error parsing job URL:', err);
    }
    return null;
  };

  const resolveJobRoute = async (slugOrId: string) => {
    setIsJobLoading(true);
    setJobNotFoundSlug(null);

    const found = await storageService.fetchJob(slugOrId, true);

    setIsJobLoading(false);

    if (found) {
      setSelectedJob(found);
      setJobNotFoundSlug(null);
      setActiveTab('jobs');
    } else {
      setSelectedJob(null);
      setJobNotFoundSlug(slugOrId);
      setActiveTab('jobs');
    }
  };

  useEffect(() => {
    const handlePopState = async () => {
      const pathname = window.location.pathname;
      setCurrentPath(pathname);

      const slugOrId = extractJobSlugOrId(pathname);
      if (slugOrId) {
        await resolveJobRoute(slugOrId);
      } else {
        setSelectedJob(null);
        setJobNotFoundSlug(null);
        setActiveTab('jobs');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', normalized);
      setCurrentPath(normalized);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const jobSlug = extractJobSlugOrId(normalized);
    if (jobSlug) {
      resolveJobRoute(jobSlug);
    } else {
      setSelectedJob(null);
      setJobNotFoundSlug(null);
      if (activeTab === 'auth' || activeTab === 'dashboard' || activeTab === 'my-jobs' || activeTab === 'countries') {
        setActiveTab('jobs');
      }
    }
  };

  useEffect(() => {
    const allJobs = storageService.getJobs();
    setJobs(allJobs);
    setSavedJobIds(storageService.getSavedJobIds());

    fetchPublicPlatformConfig().then(cfg => {
      if (cfg) {
        setPublicConfig(cfg);
        if (cfg.adsense) {
          storageService.updateAdSenseConfig(cfg.adsense);
        }
      }
    });

    storageService.syncWithServer()
      .then(updated => setJobs(updated))
      .catch(() => {});
    storageService.syncUsersWithServer().catch(() => {});

    const slugOrId = extractJobSlugOrId();
    if (slugOrId) {
      resolveJobRoute(slugOrId);
    } else {
      try {
        const params = new URLSearchParams(window.location.search);
        const countryParam = params.get('country') as GccCountry | null;
        const catParam = params.get('category');
        if (countryParam && GCC_COUNTRIES[countryParam]) setSelectedCountry(countryParam);
        if (catParam) setSelectedCategory(catParam);
      } catch {
        // Ignore query error
      }
    }
  }, []);

  // Route-aware SEO & JSON-LD synchronization
  useEffect(() => {
    const cleanPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

    if (selectedJob) {
      const countryName = GCC_COUNTRIES[selectedJob.country]?.name || 'GCC';
      const locationLabel = selectedJob.city?.trim()
        ? `${selectedJob.city.trim()}, ${countryName}`
        : countryName;
      const active = isJobActiveAndUnexpired(selectedJob);
      applyRouteSeo({
        title: `${selectedJob.title}${selectedJob.company ? ` – ${selectedJob.company}` : ''} (${locationLabel}) | Gulfaro`,
        description: (selectedJob.description || '').replace(/\s+/g, ' ').slice(0, 155),
        canonicalPath: `/job/${selectedJob.slug || selectedJob.id}`,
        robots: active ? 'index, follow' : 'noindex, follow',
        ogType: 'article',
        jsonLd: active ? buildJobPostingSchema(selectedJob) : null
      });
      return;
    }

    if (cleanPath === '/countries') {
      applyRouteSeo({
        title: 'GCC Country Job Portals — Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman | Gulfaro',
        description: 'Browse verified direct-employer job openings and labor guides across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.',
        canonicalPath: '/countries',
        jsonLd: buildOrganizationSchema()
      });
      return;
    }

    if (cleanPath.startsWith('/country/')) {
      const slug = cleanPath.replace('/country/', '');
      const meta = findCountryMetaBySlug(slug);
      if (meta) {
        applyRouteSeo({
          title: `Jobs in ${meta.name} (${meta.shortName}) | Gulfaro GCC Career Portal`,
          description: meta.overview.slice(0, 158),
          canonicalPath: `/country/${meta.slug}`,
          jsonLd: buildOrganizationSchema()
        });
        return;
      }
    }

    if (cleanPath === '/categories') {
      applyRouteSeo({
        title: 'All 30 GCC Job Categories | Accounting, Engineering, IT, Healthcare & More | Gulfaro',
        description: 'Browse active vacancies across 30 Gulf job sectors including Accounting, Engineering, Construction, IT, Healthcare, Oil & Gas, Hospitality, Logistics, and more.',
        canonicalPath: '/categories',
        jsonLd: buildOrganizationSchema()
      });
      return;
    }

    if (cleanPath.startsWith('/category/')) {
      const slug = cleanPath.replace('/category/', '');
      const cat = findCategoryMetaBySlug(slug);
      if (cat) {
        applyRouteSeo({
          title: `${cat.name} Jobs in Saudi Arabia, UAE & GCC | Gulfaro`,
          description: cat.overview.slice(0, 158),
          canonicalPath: `/category/${cat.slug}`,
          jsonLd: buildOrganizationSchema()
        });
        return;
      }
    }

    if (cleanPath === '/career-advice') {
      applyRouteSeo({
        title: 'GCC Career Advice, CV Writing & Interview Preparation Guides | Gulfaro',
        description: 'Original articles covering how to find jobs in Saudi Arabia and the UAE, professional CV formatting, common interview answers, and GCC labor contract basics.',
        canonicalPath: '/career-advice',
        jsonLd: buildOrganizationSchema()
      });
      return;
    }

    if (cleanPath.startsWith('/career-advice/')) {
      const slug = cleanPath.replace('/career-advice/', '');
      const art = findArticleBySlug(slug);
      if (art) {
        applyRouteSeo({
          title: `${art.title} | Gulfaro Career Advice`,
          description: art.summary.slice(0, 158),
          canonicalPath: `/career-advice/${art.slug}`,
          ogType: 'article',
          jsonLd: buildArticleSchema(art)
        });
        return;
      }
    }

    const staticSeo: Record<string, { title: string; description: string }> = {
      '/about': {
        title: 'About Gulfaro — Direct GCC Job Portal & Career Resources',
        description: 'Learn how Gulfaro connects employers and job seekers across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman with transparent hiring rules.'
      },
      '/contact': {
        title: 'Contact Gulfaro — Support & Trust Desk',
        description: 'Reach Gulfaro administration by official email or submit an inquiry regarding job listings, employer verification, or privacy requests.'
      },
      '/privacy-policy': {
        title: 'Privacy Policy & Google AdSense Advertising Disclosure | Gulfaro',
        description: 'Read Gulfaro’s Privacy Policy covering account data protection, cookies, regional compliance, and third-party Google AdSense advertising disclosures.'
      },
      '/terms': {
        title: 'Terms and Conditions | Gulfaro GCC Job Portal',
        description: 'Review Gulfaro’s Terms and Conditions, strict ban on charging recruitment fees to candidates, and job posting guidelines.'
      },
      '/disclaimer': {
        title: 'Legal & Editorial Disclaimer | Gulfaro',
        description: 'Important disclaimers regarding independent job postings, employer verification, and educational career guides on Gulfaro.'
      },
      '/cookie-policy': {
        title: 'Cookie Policy | Gulfaro',
        description: 'Learn how Gulfaro uses essential browser storage and third-party advertising cookies, and how you can manage your preferences.'
      }
    };

    if (staticSeo[cleanPath]) {
      applyRouteSeo({
        title: staticSeo[cleanPath].title,
        description: staticSeo[cleanPath].description,
        canonicalPath: cleanPath,
        jsonLd: buildOrganizationSchema()
      });
      return;
    }

    if (['/post-job', '/post', '/my-job-posts', '/manage-jobs', '/unauthorized', '/forgot-password', '/reset-password', '/super-admin'].some(p => cleanPath.startsWith(p))) {
      applyRouteSeo({
        title: `${publicConfig?.cms?.siteName || 'Gulfaro'} — GCC Job Portal`,
        description: 'Gulfaro account and job management portal.',
        canonicalPath: cleanPath,
        robots: 'noindex, nofollow',
        jsonLd: null
      });
      return;
    }

    applyRouteSeo({
      title: 'Gulfaro – GCC Job Portal | Jobs in Saudi Arabia, UAE, Qatar, Kuwait, Bahrain & Oman',
      description: 'Find direct employer jobs across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman alongside original GCC CV writing, contract, and interview career guides.',
      canonicalPath: '/',
      jsonLd: buildOrganizationSchema()
    });
  }, [currentPath, selectedJob, publicConfig]);

  const reloadJobs = () => {
    setJobs(storageService.getJobs());
    setSavedJobIds(storageService.getSavedJobIds());
  };

  const employerJobCount = useMemo(() => {
    if (!currentUser || currentUser.role !== 'employer') return 0;
    return jobs.filter(j => Boolean(j.userId) && j.userId === currentUser.id).length;
  }, [jobs, currentUser]);

  const handleOpenPostJob = () => {
    if (currentUser?.role !== 'employer') {
      navigateTo('/unauthorized');
      return;
    }
    setEditingJob(null);
    setSelectedJob(null);
    setJobNotFoundSlug(null);
    navigateTo('/post-job');
  };

  const handleEditJob = (job: JobAd) => {
    const isOwner =
      currentUser?.role === 'employer' &&
      Boolean(job.userId) &&
      job.userId === currentUser.id;
    if (!isOwner && currentUser?.role !== 'admin') {
      navigateTo('/unauthorized');
      return;
    }
    setEditingJob(job);
    setSelectedJob(null);
    setJobNotFoundSlug(null);
    navigateTo('/post-job');
  };

  const handleDeleteJob = async (jobId: string): Promise<{ success: boolean; error?: string }> => {
    const res = await storageService.deleteJobAsync(jobId);
    if (res.success) {
      reloadJobs();
    }
    return res;
  };

  const handleJobCreated = () => reloadJobs();
  const handleJobUpdated = () => reloadJobs();

  const handleSignOutAndOpenEmployerAuth = () => {
    storageService.logoutUser();
    setCurrentUser(null);
    setEditingJob(null);
    setAuthMode('login');
    setAuthRole('employer');
    setActiveTab('auth');
    navigateTo('/');
  };

  const handleOpenAuth = (
    mode: 'login' | 'signup',
    preferredRole: 'job_seeker' | 'employer' = 'job_seeker'
  ) => {
    setAuthMode(mode);
    setAuthRole(preferredRole);
    setActiveTab('auth');
    setSelectedJob(null);
    setJobNotFoundSlug(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
      setCurrentPath('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'employer') {
      setActiveTab('my-jobs');
      navigateTo('/my-job-posts');
      storageService.fetchEmployerJobsAsync().then(() => reloadJobs()).catch(() => {});
    } else {
      setActiveTab('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    storageService.logoutUser();
    setCurrentUser(null);
    setActiveTab('jobs');
    navigateTo('/');
  };

  const handleToggleSaveJob = (id: string) => {
    storageService.toggleSaveJob(id);
    setSavedJobIds(storageService.getSavedJobIds());
  };

  const handleHeroSearch = (filters: {
    query: string;
    country: GccCountry | 'all';
    city: string;
    category: string;
  }) => {
    const normalizedCity = !filters.city || filters.city === 'All Cities' ? '' : filters.city;
    setSearchQuery(filters.query);
    setSelectedCountry(filters.country);
    setSelectedCity(normalizedCity);
    setSelectedCategory(filters.category);
    setJobBatchIndex(0);
    setActiveTab('jobs');
    setSelectedJob(null);
    setJobNotFoundSlug(null);
    if (typeof document !== 'undefined') {
      const feed = document.getElementById('jobs-directory');
      if (feed) feed.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCountry('all');
    setSelectedCity('');
    setSelectedCategory('');
    setFilterEmploymentType('all');
    setFilterIqama('all');
    setFilterExperience('all');
    setFilterMinSalary(0);
    setFilterUrgentOnly(false);
    setFilterFeaturedOnly(false);
    setSortBy('recent');
    setJobBatchIndex(0);
  };

  const handleSelectJob = (job: JobAd) => {
    setSelectedJob(job);
    setJobNotFoundSlug(null);
    setActiveTab('jobs');
    if (typeof window !== 'undefined') {
      const jobPath = `/job/${job.slug || job.id}`;
      window.history.pushState(null, '', jobPath);
      setCurrentPath(jobPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active & unexpired jobs only for public feed
  const filteredJobs = useMemo(() => {
    if (publicConfig?.emergency?.hideAllPublicJobs) return [];
    const nowMs = Date.now();
    return jobs
      .filter(job => {
        if (!isJobActiveAndUnexpired(job, nowMs)) return false;
        if (selectedCountry !== 'all' && job.country !== selectedCountry) return false;
        if (!jobMatchesCityFilter(job, selectedCity)) return false;

        if (selectedCategory && !jobMatchesCategoryFilter(job, selectedCategory)) {
          return false;
        }

        if (filterEmploymentType !== 'all' && job.employmentType !== filterEmploymentType) return false;

        if (filterIqama !== 'all') {
          if (filterIqama === 'transferable' && job.iqamaRequirement !== 'transferable') return false;
          if (filterIqama === 'visit-visa' && job.iqamaRequirement !== 'visit-visa' && job.iqamaRequirement !== 'any') return false;
          if (filterIqama === 'citizen-only' && job.iqamaRequirement !== 'citizen-only') return false;
        }

        if (filterExperience !== 'all' && job.experienceLevel !== filterExperience) return false;
        if (filterUrgentOnly && !job.isUrgent) return false;
        if (filterFeaturedOnly && !job.isFeatured && job.packageType === 'standard') return false;

        if (filterMinSalary > 0) {
          const effectiveSal = job.salaryMax || job.salaryMin || 0;
          if (effectiveSal > 0 && effectiveSal < filterMinSalary) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const inTitle = (job.title || '').toLowerCase().includes(q);
          const inDesc = (job.description || '').toLowerCase().includes(q);
          const inComp = (job.company || '').toLowerCase().includes(q);
          const inCity = (job.city || '').toLowerCase().includes(q);
          const inCat = getJobCategoryName(job.category, { title: job.title, subcategory: job.subcategory }).toLowerCase().includes(q);
          const inSub = job.subcategory?.toLowerCase().includes(q) || false;
          const inReq = job.requirements?.some(r => r.toLowerCase().includes(q)) || false;
          if (!inTitle && !inDesc && !inComp && !inCity && !inCat && !inSub && !inReq) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'salary-high') {
          return (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0);
        }
        if (sortBy === 'urgent') {
          if (a.isUrgent && !b.isUrgent) return -1;
          if (!a.isUrgent && b.isUrgent) return 1;
        }
        if (sortBy === 'expiring') {
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        }
        if (a.packageType === 'sponsored' && b.packageType !== 'sponsored') return -1;
        if (b.packageType === 'sponsored' && a.packageType !== 'sponsored') return 1;
        if (a.isFeatured && !b.isFeatured) return -1;
        if (b.isFeatured && !a.isFeatured) return 1;
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      });
  }, [
    jobs,
    publicConfig,
    selectedCountry,
    selectedCity,
    selectedCategory,
    filterEmploymentType,
    filterIqama,
    filterExperience,
    filterMinSalary,
    filterUrgentOnly,
    filterFeaturedOnly,
    searchQuery,
    sortBy
  ]);

  useEffect(() => {
    setJobBatchIndex(0);
  }, [
    searchQuery,
    selectedCountry,
    selectedCity,
    selectedCategory,
    filterEmploymentType,
    filterIqama,
    filterExperience,
    filterMinSalary,
    filterUrgentOnly,
    filterFeaturedOnly,
    sortBy
  ]);

  const JOBS_PER_BATCH = 5;
  const totalBatches = Math.ceil(filteredJobs.length / JOBS_PER_BATCH);
  const safeBatchIndex = totalBatches > 0 ? Math.min(jobBatchIndex, totalBatches - 1) : 0;
  const batchStart = safeBatchIndex * JOBS_PER_BATCH;
  const batchEnd = batchStart + JOBS_PER_BATCH;
  const paginatedJobs = filteredJobs.slice(batchStart, batchEnd);
  const hasMoreJobBatches = batchEnd < filteredJobs.length;

  const handleNextJobBatch = () => {
    if (!hasMoreJobBatches) return;
    setJobBatchIndex(prev => prev + 1);
    if (typeof document !== 'undefined') {
      const feed = document.getElementById('jobs-directory');
      if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeFiltersCount = [
    selectedCountry !== 'all',
    selectedCity !== '',
    selectedCategory !== '',
    filterEmploymentType !== 'all',
    filterIqama !== 'all',
    filterExperience !== 'all',
    filterMinSalary > 0,
    filterUrgentOnly,
    filterFeaturedOnly,
    searchQuery.trim() !== ''
  ].filter(Boolean).length;

  // Super Admin Portal (completely isolated)
  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/super-admin');
    }
    return <SuperAdminPortal onNavigateHome={() => navigateTo('/')} />;
  }

  if (currentPath === '/super-admin' || currentPath.startsWith('/super-admin/')) {
    return <SuperAdminPortal onNavigateHome={() => navigateTo('/')} />;
  }

  // Maintenance / Emergency Shutdown Gate
  if (publicConfig?.emergency?.emergencyShutdown || publicConfig?.emergency?.maintenanceMode) {
    const isShutdown = publicConfig.emergency.emergencyShutdown;
    const noticeMsg = isShutdown
      ? publicConfig.emergency.emergencyShutdownMessage
      : publicConfig.emergency.maintenanceMessage;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <img
            src={publicConfig.cms?.logoUrl || '/assets/aistudio/Gulfaro_logo_white_clean.png'}
            alt="Gulfaro"
            className="h-9 mx-auto object-contain"
          />
          <h1 className="text-xl font-bold text-white">
            {publicConfig.cms?.siteName || 'Gulfaro'} is Temporarily Unavailable
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {noticeMsg || 'Scheduled platform maintenance is underway. Please check back shortly.'}
          </p>
          <p className="text-xs text-slate-400 pt-2">
            Email: {publicConfig.cms?.contactUsEmail || 'admingulfaro@gmail.com'}
          </p>
        </div>
      </div>
    );
  }

  // Public Path Routing Helpers
  const normalizedPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/';
  const publicInfoRoutes: PublicInfoRouteType[] = [
    'about',
    'contact',
    'privacy-policy',
    'terms',
    'disclaimer',
    'cookie-policy'
  ];
  const matchedInfoRoute = publicInfoRoutes.find(r => normalizedPath === `/${r}`);

  const renderMainBody = () => {
    if (normalizedPath === '/forgot-password' || currentPath.startsWith('/forgot-password')) {
      return (
        <ForgotPasswordPage
          onNavigateToSignIn={() => handleOpenAuth('login')}
          onNavigateToSignUp={() => handleOpenAuth('signup')}
          onNavigateToResetPassword={(tok, em) => {
            navigateTo(`/reset-password?token=${encodeURIComponent(tok)}&email=${encodeURIComponent(em)}`);
          }}
          onNavigateHome={() => navigateTo('/')}
        />
      );
    }

    if (normalizedPath === '/reset-password' || currentPath.startsWith('/reset-password')) {
      return (
        <ResetPasswordPage
          tokenProp={new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token')}
          emailProp={new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('email')}
          onNavigateToSignIn={() => handleOpenAuth('login')}
          onNavigateToForgotPassword={() => navigateTo('/forgot-password')}
        />
      );
    }

    if (normalizedPath === '/unauthorized') {
      return (
        <UnauthorizedView
          currentUser={currentUser}
          onNavigateHome={() => navigateTo('/')}
          onOpenAuth={handleOpenAuth}
          onSwitchToEmployer={handleSignOutAndOpenEmployerAuth}
        />
      );
    }

    if (normalizedPath === '/post-job' || normalizedPath === '/post') {
      return currentUser?.role === 'employer' ? (
        <PostJobPage
          currentUser={currentUser}
          editingJob={editingJob}
          onJobCreated={handleJobCreated}
          onJobUpdated={handleJobUpdated}
          onViewJob={job => {
            setEditingJob(null);
            handleSelectJob(job);
          }}
          onManageJobs={() => {
            setEditingJob(null);
            setActiveTab('my-jobs');
            navigateTo('/my-job-posts');
          }}
          onCancel={() => {
            setEditingJob(null);
            setActiveTab('my-jobs');
            navigateTo('/my-job-posts');
          }}
        />
      ) : (
        <UnauthorizedView
          currentUser={currentUser}
          onNavigateHome={() => navigateTo('/')}
          onOpenAuth={handleOpenAuth}
          onSwitchToEmployer={handleSignOutAndOpenEmployerAuth}
        />
      );
    }

    if (normalizedPath === '/my-job-posts' || normalizedPath === '/manage-jobs' || activeTab === 'my-jobs') {
      return currentUser?.role === 'employer' ? (
        <ManageJobsView
          currentUser={currentUser}
          jobs={jobs}
          onEditJob={handleEditJob}
          onDeleteJob={handleDeleteJob}
          onOpenPostJob={handleOpenPostJob}
          onSelectJob={handleSelectJob}
          onNavigateHome={() => navigateTo('/')}
        />
      ) : (
        <UnauthorizedView
          currentUser={currentUser}
          onNavigateHome={() => navigateTo('/')}
          onOpenAuth={handleOpenAuth}
          onSwitchToEmployer={handleSignOutAndOpenEmployerAuth}
        />
      );
    }

    if (activeTab === 'auth') {
      return (
        <AuthPage
          initialMode={authMode}
          initialRole={authRole}
          onAuthSuccess={handleAuthSuccess}
          onCancel={() => setActiveTab('jobs')}
          onNavigateToForgotPassword={() => navigateTo('/forgot-password')}
        />
      );
    }

    if (isJobLoading) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading job details...</p>
        </div>
      );
    }

    if (jobNotFoundSlug) {
      return (
        <JobNotFoundView
          requestedSlugOrId={jobNotFoundSlug}
          onBrowseAll={() => {
            setJobNotFoundSlug(null);
            setSelectedJob(null);
            navigateTo('/');
          }}
          onSearch={query => {
            setJobNotFoundSlug(null);
            setSelectedJob(null);
            setSearchQuery(query);
            navigateTo('/');
          }}
          onSelectCountry={country => {
            setJobNotFoundSlug(null);
            setSelectedJob(null);
            navigateTo(`/country/${country}`);
          }}
        />
      );
    }

    if (selectedJob) {
      return (
        <JobDetailView
          job={selectedJob}
          currentUser={currentUser}
          onBack={() => navigateTo('/')}
          onSelectSimilarJob={j => handleSelectJob(j)}
          isSaved={savedJobIds.includes(selectedJob.id)}
          onToggleSave={handleToggleSaveJob}
          allJobs={jobs}
        />
      );
    }

    if (activeTab === 'dashboard') {
      if (currentUser?.role === 'employer') {
        return (
          <ManageJobsView
            currentUser={currentUser}
            jobs={jobs}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            onOpenPostJob={handleOpenPostJob}
            onSelectJob={handleSelectJob}
            onNavigateHome={() => navigateTo('/')}
          />
        );
      }
      return (
        <UserDashboard
          currentUser={currentUser}
          onSelectJob={handleSelectJob}
          onOpenAuth={handleOpenAuth}
        />
      );
    }

    // Dedicated Public Info / Legal Pages (No Login Required)
    if (matchedInfoRoute) {
      return (
        <PublicInfoPages
          page={matchedInfoRoute}
          publicConfig={publicConfig}
          onNavigate={navigateTo}
        />
      );
    }

    // Dedicated Career Advice Hub & Articles
    if (normalizedPath === '/career-advice') {
      return <CareerResourcesPage onNavigate={navigateTo} />;
    }
    if (normalizedPath.startsWith('/career-advice/')) {
      const articleSlug = normalizedPath.replace('/career-advice/', '');
      return <CareerResourcesPage articleSlug={articleSlug} onNavigate={navigateTo} />;
    }

    // Dedicated GCC Country Browsing Pages
    if (normalizedPath === '/countries' || activeTab === 'countries') {
      return (
        <CountryPortalPage
          jobs={jobs}
          savedJobIds={savedJobIds}
          onToggleSave={handleToggleSaveJob}
          onSelectJob={handleSelectJob}
          onNavigate={navigateTo}
        />
      );
    }
    if (normalizedPath.startsWith('/country/')) {
      const countrySlug = normalizedPath.replace('/country/', '');
      return (
        <CountryPortalPage
          countrySlug={countrySlug}
          jobs={jobs}
          savedJobIds={savedJobIds}
          onToggleSave={handleToggleSaveJob}
          onSelectJob={handleSelectJob}
          onNavigate={navigateTo}
        />
      );
    }

    // Dedicated Category Browsing Pages (All 30 Categories)
    if (normalizedPath === '/categories') {
      return (
        <CategoryPortalPage
          jobs={jobs}
          savedJobIds={savedJobIds}
          onToggleSave={handleToggleSaveJob}
          onSelectJob={handleSelectJob}
          onNavigate={navigateTo}
        />
      );
    }
    if (normalizedPath.startsWith('/category/')) {
      const categorySlug = normalizedPath.replace('/category/', '');
      return (
        <CategoryPortalPage
          categorySlug={categorySlug}
          jobs={jobs}
          savedJobIds={savedJobIds}
          onToggleSave={handleToggleSaveJob}
          onSelectJob={handleSelectJob}
          onNavigate={navigateTo}
        />
      );
    }

    // Main Homepage
    const activeTotal = jobs.filter(j => isJobActiveAndUnexpired(j)).length;

    return (
      <div>
        <HeroSection
          onSearch={handleHeroSearch}
          selectedCountry={selectedCountry}
          onQuickCountrySelect={c => {
            setSelectedCountry(c);
          }}
          onNavigatePath={navigateTo}
          totalJobsCount={activeTotal}
          heroTitle={publicConfig?.cms?.heroTitle}
          heroSubtitle={publicConfig?.cms?.heroSubtitle}
        />

        {/* Separated Leaderboard Advertisement */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AdBanner type="leaderboard" />
        </div>

        {/* Latest Job Opportunities & Interactive Filter Explorer */}
        <section id="jobs-directory" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedCountry !== 'all'
                  ? `${GCC_COUNTRIES[selectedCountry].name} Job Opportunities`
                  : 'Latest Job Opportunities Across the GCC'}
                {selectedCity ? ` · ${selectedCity}` : ''}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-bold text-slate-800 tabular-nums">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'vacancy' : 'vacancies'}
                </span>
                <span>available</span>
                {activeFiltersCount > 0 && (
                  <>
                    <span>·</span>
                    <button
                      onClick={handleResetFilters}
                      className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset filters ({activeFiltersCount})</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                <Filter className="w-3.5 h-3.5 text-teal-700" />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Sort jobs by"
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="recent">Most Recent First</option>
                <option value="urgent">Urgent Hiring First</option>
                <option value="salary-high">Highest Salary</option>
                <option value="expiring">Closing Soonest</option>
              </select>

              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-slate-600">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white text-slate-900 font-bold' : ''}`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-white text-slate-900 font-bold' : ''}`}
                  title="Compact List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar */}
            <aside className={`lg:block ${showMobileFilters ? 'block' : 'hidden'} bg-white rounded-xl border border-slate-200 p-5 space-y-5 text-xs text-slate-700`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-teal-700" />
                  <span>Filter Vacancies</span>
                </div>
                {activeFiltersCount > 0 && (
                  <button onClick={handleResetFilters} className="text-[11px] text-teal-700 hover:underline font-semibold">
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={e => {
                    setSelectedCountry(e.target.value as any);
                    setSelectedCity('');
                  }}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-slate-50 text-xs font-semibold"
                >
                  <option value="all">All 6 GCC Countries</option>
                  {Object.values(GCC_COUNTRIES).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="pt-1">
                  <label
                    htmlFor="sidebar-city-input"
                    className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1"
                  >
                    CITY / REGION
                  </label>
                  <input
                    id="sidebar-city-input"
                    type="text"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    placeholder="Enter city or region"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs"
                >
                  <option value="">All Categories</option>
                  {PUBLIC_JOB_CATEGORIES.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Employment Type
                </label>
                <select
                  value={filterEmploymentType}
                  onChange={e => setFilterEmploymentType(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="remote">Remote</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Experience
                </label>
                <select
                  value={filterExperience}
                  onChange={e => setFilterExperience(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs"
                >
                  <option value="all">Any Experience</option>
                  <option value="fresher">Fresher (0 - 1 Yr)</option>
                  <option value="1-3-years">1 to 3 Years</option>
                  <option value="3-5-years">3 to 5 Years</option>
                  <option value="5-10-years">5 to 10 Years</option>
                  <option value="10-plus-years">10+ Years</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUrgentOnly}
                    onChange={e => setFilterUrgentOnly(e.target.checked)}
                    className="rounded text-rose-600"
                  />
                  <span className="font-semibold text-rose-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Urgent Only
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterFeaturedOnly}
                    onChange={e => setFilterFeaturedOnly(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Featured Only
                  </span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <label className="font-bold text-slate-800 uppercase tracking-wider">Min Monthly Salary</label>
                  <span className="font-mono font-bold text-teal-700">
                    {filterMinSalary > 0 ? `${filterMinSalary.toLocaleString()}+` : 'Any'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20000}
                  step={1000}
                  value={filterMinSalary}
                  onChange={e => setFilterMinSalary(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <AdBanner type="rectangle" />
            </aside>

            {/* Job Feed */}
            <div className="lg:col-span-3 space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                  <p className="text-slate-800 font-bold text-base">
                    No active job vacancies matched your current filters.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Gulfaro only displays verified active positions. Try clearing filters or exploring another GCC country.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 gap-4">
                      {paginatedJobs.map((job, idx) => (
                        <React.Fragment key={job.id}>
                          <JobCard
                            job={job}
                            isSaved={savedJobIds.includes(job.id)}
                            onToggleSave={handleToggleSaveJob}
                            onSelectJob={handleSelectJob}
                          />
                          {idx === 3 && <AdBanner type="in-feed" />}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-200">
                        <span>Date & Country</span>
                        <span>Vacancy & Employer</span>
                        <span>Actions</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {paginatedJobs.map(job => (
                          <JobCompactRow
                            key={job.id}
                            job={job}
                            isSaved={savedJobIds.includes(job.id)}
                            onToggleSave={handleToggleSaveJob}
                            onSelectJob={handleSelectJob}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {hasMoreJobBatches && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={handleNextJobBatch}
                        className="group w-full sm:w-auto min-w-[220px] px-8 py-3 bg-slate-900 hover:bg-teal-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl border border-slate-800 hover:border-teal-600 shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <span>More</span>
                        <ArrowRight className="w-4 h-4 text-teal-400 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* CV Writing & Interview Preparation Resources */}
        <HomepageEditorialSections onNavigatePath={navigateTo} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-600 selection:text-white">
      {publicConfig?.cms?.announcementBanner?.enabled && publicConfig.cms.announcementBanner.text && (
        <div
          className={`text-xs font-semibold text-center px-4 py-2 ${
            publicConfig.cms.announcementBanner.variant === 'urgent'
              ? 'bg-rose-700 text-white'
              : publicConfig.cms.announcementBanner.variant === 'warning'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-teal-700 text-white'
          }`}
        >
          {publicConfig.cms.announcementBanner.text}
        </div>
      )}

      <Navbar
        currentPath={currentPath}
        currentCountry={selectedCountry}
        onNavigatePath={navigateTo}
        onSelectCountry={c => {
          setSelectedCountry(c);
          setSelectedCity('');
          navigateTo('/');
        }}
        currentUser={currentUser}
        onOpenPostJob={handleOpenPostJob}
        onNavigateTab={tab => {
          setActiveTab(tab);
          setSelectedJob(null);
          setJobNotFoundSlug(null);
          if (tab === 'my-jobs') {
            if (currentUser?.role === 'employer') {
              navigateTo('/my-job-posts');
            } else {
              navigateTo('/unauthorized');
            }
          } else if (tab === 'countries') {
            navigateTo('/countries');
          } else {
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
            }
            if (tab === 'safety') {
              setIsSafetyModalOpen(true);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        activeTab={activeTab}
        savedCount={savedJobIds.length}
        employerJobCount={employerJobCount}
        onInstallAndroid={promptInstall}
        onOpenIOSInstall={() => openInstallModal('ios')}
        isAppInstalled={isPWAInstalled}
        isIOSDevice={isIOS}
        isAndroidDevice={isAndroid}
        hasNativeInstallPrompt={hasNativePrompt}
      />

      <main className="flex-1">{renderMainBody()}</main>

      <Footer
        onSelectCountry={c => {
          setSelectedCountry(c);
          setSelectedCity('');
        }}
        onNavigatePath={navigateTo}
        onOpenPostJob={handleOpenPostJob}
        onOpenSafetyGuide={() => setIsSafetyModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        cmsOverrides={publicConfig?.cms}
      />

      <PostJobModal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setEditingJob(null);
        }}
        editingJob={editingJob}
        onJobCreated={handleJobCreated}
        onJobUpdated={handleJobUpdated}
        currentUser={currentUser}
      />

      <SafetyGuideModal isOpen={isSafetyModalOpen} onClose={() => setIsSafetyModalOpen(false)} />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserRegistered={user => setCurrentUser(user)}
      />

      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />

      <CookieConsentBanner />

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={closeInstallModal}
        onInstall={promptInstall}
        hasNativePrompt={hasNativePrompt}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isInstalled={isPWAInstalled}
        platformOverride={modalPlatform}
      />
    </div>
  );
}
