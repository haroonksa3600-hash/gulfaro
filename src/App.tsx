import React, { useState, useEffect, useMemo } from 'react';
import { GccCountry, GCC_COUNTRIES, JobAd, User, EmploymentType, IqamaStatus, ExperienceLevel } from './types/job';
import { JOB_CATEGORIES } from './data/categories';
import { storageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CountrySection } from './components/CountrySection';
import { CategorySection } from './components/CategorySection';
import { JobCard } from './components/JobCard';
import { JobCompactRow } from './components/JobCompactRow';
import { JobDetailView } from './components/JobDetailView';
import { PostJobModal } from './components/PostJobModal';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SafetyGuideModal } from './components/SafetyGuideModal';
import { RegisterModal } from './components/RegisterModal';
import { AuthPage } from './components/AuthPage';
import { AdBanner } from './components/AdBanner';
import { LegalModal, CookieConsentBanner } from './components/LegalModals';
import { Footer } from './components/Footer';
import { 
  Filter, 
  LayoutGrid, 
  List, 
  Search, 
  X, 
  ArrowUpDown, 
  Sparkles, 
  Zap, 
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building,
  CheckCircle2,
  Calendar,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

export default function App() {
  // Core State
  const [jobs, setJobs] = useState<JobAd[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(storageService.getCurrentUser());
  const [savedJobIds, setSavedJobIds] = useState<string[]>(storageService.getSavedJobIds());
  
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'jobs' | 'dashboard' | 'admin' | 'safety' | 'countries' | 'auth'>('jobs');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedJob, setSelectedJob] = useState<JobAd | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Modals
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

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

  // Load initial data and handle URL query params for SEO deep links
  useEffect(() => {
    const allJobs = storageService.getJobs();
    setJobs(allJobs);
    setSavedJobIds(storageService.getSavedJobIds());

    // Check URL parameters (e.g. ?job=GF-901 or ?country=saudi-arabia)
    try {
      const params = new URLSearchParams(window.location.search);
      const jobSlugOrId = params.get('job');
      const countryParam = params.get('country') as GccCountry | null;
      const catParam = params.get('category');

      if (jobSlugOrId) {
        const found = allJobs.find(j => j.slug === jobSlugOrId || j.id === jobSlugOrId);
        if (found) {
          setSelectedJob(found);
        }
      }

      if (countryParam && GCC_COUNTRIES[countryParam]) {
        setSelectedCountry(countryParam);
      }

      if (catParam) {
        setSelectedCategory(catParam);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync jobs from storage whenever needed
  const reloadJobs = () => {
    setJobs(storageService.getJobs());
    setSavedJobIds(storageService.getSavedJobIds());
  };

  // Switch demo persona
  const handleSwitchUserRole = (role: 'job_seeker' | 'employer' | 'admin') => {
    const user = storageService.switchDemoUser(role);
    setCurrentUser(user);
    if (role === 'admin') {
      setActiveTab('admin');
    }
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setActiveTab('auth');
    setSelectedJob(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'employer') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('jobs');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    storageService.logoutUser();
    setCurrentUser(null);
    setActiveTab('jobs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle save job
  const handleToggleSaveJob = (id: string) => {
    storageService.toggleSaveJob(id);
    setSavedJobIds(storageService.getSavedJobIds());
  };

  // Search handler from Hero Section
  const handleHeroSearch = (filters: {
    query: string;
    country: GccCountry | 'all';
    city: string;
    category: string;
  }) => {
    setSearchQuery(filters.query);
    setSelectedCountry(filters.country);
    setSelectedCity(filters.city);
    setSelectedCategory(filters.category);
    setActiveTab('jobs');
    setSelectedJob(null);
  };

  // Reset filters
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
  };

  // Open individual job detail view
  const handleSelectJob = (job: JobAd) => {
    setSelectedJob(job);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter and sort active jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Must be active to show in public classifieds
      if (job.status !== 'active') return false;

      // Country filter
      if (selectedCountry !== 'all' && job.country !== selectedCountry) {
        return false;
      }

      // City filter
      if (selectedCity && job.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Category filter
      if (selectedCategory && job.category !== selectedCategory) {
        return false;
      }

      // Employment Type
      if (filterEmploymentType !== 'all' && job.employmentType !== filterEmploymentType) {
        return false;
      }

      // Iqama / Visa
      if (filterIqama !== 'all') {
        if (filterIqama === 'transferable' && job.iqamaRequirement !== 'transferable') return false;
        if (filterIqama === 'visit-visa' && job.iqamaRequirement !== 'visit-visa' && job.iqamaRequirement !== 'any') return false;
        if (filterIqama === 'citizen-only' && job.iqamaRequirement !== 'citizen-only') return false;
      }

      // Experience Level
      if (filterExperience !== 'all' && job.experienceLevel !== filterExperience) {
        return false;
      }

      // Urgent only
      if (filterUrgentOnly && !job.isUrgent) {
        return false;
      }

      // Featured only
      if (filterFeaturedOnly && !job.isFeatured && job.packageType === 'standard') {
        return false;
      }

      // Min Salary
      if (filterMinSalary > 0) {
        const effectiveSal = job.salaryMax || job.salaryMin || 0;
        if (effectiveSal > 0 && effectiveSal < filterMinSalary) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = job.title.toLowerCase().includes(q);
        const inDesc = job.description.toLowerCase().includes(q);
        const inComp = job.company.toLowerCase().includes(q);
        const inCity = job.city.toLowerCase().includes(q);
        const inSub = job.subcategory?.toLowerCase().includes(q) || false;
        const inReq = job.requirements?.some(r => r.toLowerCase().includes(q)) || false;
        if (!inTitle && !inDesc && !inComp && !inCity && !inSub && !inReq) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort logic
      if (sortBy === 'salary-high') {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        return salB - salA;
      }
      if (sortBy === 'urgent') {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
      }
      if (sortBy === 'expiring') {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      // Default: Sponsored/Featured first, then most recent postedAt
      if (a.packageType === 'sponsored' && b.packageType !== 'sponsored') return -1;
      if (b.packageType === 'sponsored' && a.packageType !== 'sponsored') return 1;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (b.isFeatured && !a.isFeatured) return 1;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [
    jobs,
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-600 selection:text-white">
      
      {/* Universal Top Navigation */}
      <Navbar
        currentCountry={selectedCountry}
        onSelectCountry={(c) => {
          setSelectedCountry(c);
          setSelectedCity('');
          setSelectedJob(null);
          setActiveTab('jobs');
        }}
        currentUser={currentUser}
        onSwitchUserRole={handleSwitchUserRole}
        onOpenPostJob={() => setIsPostModalOpen(true)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setSelectedJob(null);
          if (tab === 'safety') {
            setIsSafetyModalOpen(true);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        activeTab={activeTab}
        savedCount={savedJobIds.length}
      />

      {/* Main Body Routing */}
      <main className="flex-1">
        
        {/* VIEW 0: Login and Sign Up Page */}
        {activeTab === 'auth' ? (
          <AuthPage
            initialMode={authMode}
            onAuthSuccess={handleAuthSuccess}
            onCancel={() => setActiveTab('jobs')}
          />
        ) : selectedJob ? (
          /* VIEW 1: Individual Job Detail Page */
          <JobDetailView
            job={selectedJob}
            currentUser={currentUser}
            onBack={() => setSelectedJob(null)}
            onSelectSimilarJob={(j) => setSelectedJob(j)}
            isSaved={savedJobIds.includes(selectedJob.id)}
            onToggleSave={handleToggleSaveJob}
            allJobs={jobs}
          />
        ) : activeTab === 'dashboard' ? (
          /* VIEW 2: Employer & Job Seeker Dashboard */
          <UserDashboard
            currentUser={currentUser}
            onOpenPostJob={() => setIsPostModalOpen(true)}
            onSelectJob={handleSelectJob}
            onOpenAuth={handleOpenAuth}
          />
        ) : activeTab === 'admin' ? (
          /* VIEW 3: Super Admin Moderation Panel */
          <AdminDashboard
            onSelectJob={handleSelectJob}
          />
        ) : activeTab === 'countries' ? (
          /* VIEW 4: GCC Countries Hub */
          <div className="py-8 bg-slate-50">
            <CountrySection
              jobs={jobs}
              selectedCountry={selectedCountry}
              onSelectCountry={(c) => {
                setSelectedCountry(c);
                setActiveTab('jobs');
              }}
              onSelectCity={(country, city) => {
                setSelectedCountry(country);
                setSelectedCity(city);
                setActiveTab('jobs');
              }}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Latest Classifieds in GCC</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.slice(0, 6).map(j => (
                  <JobCard
                    key={j.id}
                    job={j}
                    isSaved={savedJobIds.includes(j.id)}
                    onToggleSave={handleToggleSaveJob}
                    onSelectJob={handleSelectJob}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 5: Main Homepage & Job Search Listings */
          <div>
            {/* Hero Section with Skyline and Multi-field Search */}
            <HeroSection
              onSearch={handleHeroSearch}
              selectedCountry={selectedCountry}
              onQuickCountrySelect={(c) => {
                setSelectedCountry(c);
                setSelectedCity('');
              }}
              totalJobsCount={jobs.filter(j => j.status === 'active').length}
            />

            {/* 6 GCC Country Section */}
            <CountrySection
              jobs={jobs}
              selectedCountry={selectedCountry}
              onSelectCountry={(c) => {
                setSelectedCountry(c);
                setSelectedCity('');
              }}
              onSelectCity={(c, city) => {
                setSelectedCountry(c);
                setSelectedCity(city);
              }}
            />

            {/* Job Categories Section */}
            <CategorySection
              jobs={jobs}
              selectedCategory={selectedCategory}
              onSelectCategory={(catId) => setSelectedCategory(catId)}
            />

            {/* Google AdSense Responsive Leaderboard (728x90) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
              <AdBanner type="leaderboard" />
            </div>

            {/* Main Classifieds Marketplace Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              
              {/* Header Strip: Active Filter Summary, View Switcher & Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-6">
                
                {/* Active Context Label */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>
                      {selectedCountry !== 'all' 
                        ? `${GCC_COUNTRIES[selectedCountry].flag} Jobs in ${GCC_COUNTRIES[selectedCountry].name}` 
                        : 'Latest GCC Job Advertisements'}
                    </span>
                    {selectedCity && (
                      <span className="text-teal-700 font-bold text-lg">· {selectedCity}</span>
                    )}
                  </h2>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-bold text-slate-800 tabular-nums">
                      {filteredJobs.length} {filteredJobs.length === 1 ? 'vacancy' : 'vacancies'}
                    </span>
                    <span>available right now</span>
                    {activeFiltersCount > 0 && (
                      <>
                        <span>·</span>
                        <button
                          onClick={handleResetFilters}
                          className="text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset all ({activeFiltersCount})</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Controls: Mobile Filter Button, Sort Dropdown & Card/List Toggle */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  
                  {/* Mobile Filter Button */}
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <Filter className="w-3.5 h-3.5 text-teal-600" />
                    <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                  </button>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-500 hidden md:inline">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort jobs by"
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                    >
                      <option value="recent">Most Recent First</option>
                      <option value="urgent">Urgent Hiring First</option>
                      <option value="salary-high">Highest Salary</option>
                      <option value="expiring">Expiring Soonest</option>
                    </select>
                  </div>

                  {/* Card vs Compact Classified View Toggle */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-slate-600">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                      }`}
                      title="Modern Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                      }`}
                      title="Compact Expatriates Classified View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>

              {/* Layout: Filter Sidebar + Job Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                {/* Advanced Filter Sidebar */}
                <aside className={`lg:block ${showMobileFilters ? 'block' : 'hidden'} bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 text-xs text-slate-700`}>
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                      <span>Refine Classifieds</span>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleResetFilters}
                        className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Country & City Filter */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      GCC Country
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value as any);
                        setSelectedCity('');
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-slate-50 text-xs font-semibold focus:outline-none focus:border-teal-500"
                    >
                      <option value="all">🌐 All GCC Countries</option>
                      {Object.values(GCC_COUNTRIES).map(c => (
                        <option key={c.id} value={c.id}>{c.flag} {c.name}</option>
                      ))}
                    </select>

                    {selectedCountry !== 'all' && (
                      <div className="pt-1">
                        <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
                          City in {GCC_COUNTRIES[selectedCountry].name}
                        </label>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs focus:outline-none"
                        >
                          <option value="">All Cities</option>
                          {GCC_COUNTRIES[selectedCountry].topCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Iqama / Visa Status */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Iqama / Visa Status
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'all', label: 'Any Status' },
                        { id: 'transferable', label: 'Transferable Iqama / NOC' },
                        { id: 'visit-visa', label: 'Visit Visa Accepted' },
                        { id: 'citizen-only', label: 'GCC Nationals Only' }
                      ].map(opt => (
                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="iqamaFilter"
                            checked={filterIqama === opt.id}
                            onChange={() => setFilterIqama(opt.id)}
                            className="text-teal-600 focus:ring-teal-500"
                          />
                          <span className={filterIqama === opt.id ? 'font-bold text-teal-800' : 'text-slate-600'}>
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Employment Type
                    </label>
                    <select
                      value={filterEmploymentType}
                      onChange={(e) => setFilterEmploymentType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs focus:outline-none capitalize"
                    >
                      <option value="all">All Employment Types</option>
                      <option value="full-time">Full-Time</option>
                      <option value="contract">Contract / Freelance</option>
                      <option value="part-time">Part-Time</option>
                      <option value="walk-in">Walk-In Interviews</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Experience Level
                    </label>
                    <select
                      value={filterExperience}
                      onChange={(e) => setFilterExperience(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-xs focus:outline-none capitalize"
                    >
                      <option value="all">Any Experience</option>
                      <option value="fresher">Fresher (0 - 1 Yr)</option>
                      <option value="1-3-years">1 to 3 Years</option>
                      <option value="3-5-years">3 to 5 Years</option>
                      <option value="5-10-years">5 to 10 Years</option>
                      <option value="10-plus-years">10+ Years</option>
                    </select>
                  </div>

                  {/* Fast Checkboxes: Urgent & Featured */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterUrgentOnly}
                        onChange={(e) => setFilterUrgentOnly(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-700 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-rose-600" /> Urgent Vacancies Only
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterFeaturedOnly}
                        onChange={(e) => setFilterFeaturedOnly(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Featured Advertisements
                      </span>
                    </label>
                  </div>

                  {/* Min Monthly Salary Slider */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <label className="font-bold text-slate-800 uppercase tracking-wider">
                        Min. Monthly Salary
                      </label>
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
                      onChange={(e) => setFilterMinSalary(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>

                  {/* Expatriates Advice Callout */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-800">Direct Contact Tip:</p>
                    <p>
                      Send a polite message introducing yourself with your Iqama status and attach your CV when messaging on WhatsApp.
                    </p>
                  </div>

                  {/* Google AdSense Medium Rectangle (300x250) */}
                  <div className="pt-2">
                    <AdBanner type="rectangle" />
                  </div>

                </aside>

                {/* Job Listings Column */}
                <div className="lg:col-span-3 space-y-4">
                  
                  {filteredJobs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                      <p className="text-slate-700 font-bold text-base">No classified advertisements matched your filters.</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Try clearing some filters, expanding your city search, or browsing all 6 GCC countries.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : viewMode === 'cards' ? (
                    /* Modern Responsive Cards with In-Feed AdSense units */
                    <div className="grid grid-cols-1 gap-4">
                      {filteredJobs.map((job, idx) => (
                        <React.Fragment key={job.id}>
                          <JobCard
                            job={job}
                            isSaved={savedJobIds.includes(job.id)}
                            onToggleSave={handleToggleSaveJob}
                            onSelectJob={handleSelectJob}
                          />
                          {(idx === 2 || idx === 6) && (
                            <AdBanner type="in-feed" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    /* Compact Expatriates Classified Table */
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="bg-slate-100/90 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-200">
                        <span>Date & Location</span>
                        <span>Job Title, Company & Qualifications</span>
                        <span>Fast Actions</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {filteredJobs.map((job) => (
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

                  {/* Trust Banner Below Listings */}
                  <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">Direct Employer Connections</h3>
                        <p className="text-xs text-slate-400">
                          Gulfaro connects you directly with recruitment decision makers in KSA, UAE, Qatar, Kuwait, Bahrain & Oman.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsPostModalOpen(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg whitespace-nowrap"
                    >
                      Post an Advertisement
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Universal Footer */}
      <Footer
        onSelectCountry={(c) => {
          setSelectedCountry(c);
          setSelectedCity('');
          setSelectedJob(null);
          setActiveTab('jobs');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPostJob={() => setIsPostModalOpen(true)}
        onOpenSafetyGuide={() => setIsSafetyModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Post a Job Modal (Step-by-step user journey) */}
      <PostJobModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onJobCreated={(newJob) => {
          reloadJobs();
          setSelectedJob(newJob);
          setActiveTab('jobs');
        }}
        currentUser={currentUser}
      />

      {/* Expatriate Safety & Legal Guidelines Modal */}
      <SafetyGuideModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      {/* User Registration Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserRegistered={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Google AdSense Compliance: Privacy Policy & Terms of Service */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Google AdSense Cookie Consent Banner */}
      <CookieConsentBanner />

    </div>
  );
}
