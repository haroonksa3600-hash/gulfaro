import React, { useState, useEffect } from 'react';
import { GccCountry } from '../types/job';
import { PUBLIC_JOB_CATEGORIES } from '../data/gccDirectory';
import { Search, ShieldCheck, BookOpen, ArrowRight } from 'lucide-react';
import heroSkylineImg from '../assets/images/hero_gcc_skyline_1793920055571.jpg';

interface HeroSectionProps {
  onSearch: (filters: {
    query: string;
    country: GccCountry | 'all';
    city: string;
    category: string;
  }) => void;
  selectedCountry: GccCountry | 'all';
  onQuickCountrySelect: (country: GccCountry | 'all') => void;
  onNavigatePath: (path: string) => void;
  totalJobsCount: number;
  heroTitle?: string;
  heroSubtitle?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  selectedCountry,
  onQuickCountrySelect,
  onNavigatePath,
  totalJobsCount,
  heroTitle,
  heroSubtitle
}) => {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<GccCountry | 'all'>(selectedCountry);
  const [categorySlug, setCategorySlug] = useState('');

  useEffect(() => {
    setCountry(selectedCountry);
  }, [selectedCountry]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as GccCountry | 'all';
    setCountry(val);
    onQuickCountrySelect(val);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query,
      country,
      city: '',
      category: categorySlug
    });
  };

  return (
    <section className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
      {/* Bundled Hero Skyline Backdrop with Navy Gradient Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroSkylineImg}
          alt="GCC business districts across Riyadh, Dubai, and Doha"
          className="w-full h-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/88 to-slate-900/90" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-7">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>GCC Job Portal & Career Resources · 6 Gulf Countries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {heroTitle || 'Find Your Next Career Opportunity Across the GCC'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {heroSubtitle ||
              'Explore direct employer vacancies across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman—alongside practical GCC CV and interview guidance.'}
          </p>
        </div>

        {/* Clean Multi-Field Job Search Form */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-200 text-slate-900 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label htmlFor="hero-job-query" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Job Title or Keyword
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="hero-job-query"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Civil Engineer, Accountant, Nurse, Driver..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-600 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="hero-country-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              GCC Country
            </label>
            <select
              id="hero-country-select"
              value={country}
              onChange={handleCountryChange}
              className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-600 rounded-lg text-sm text-slate-900 font-medium focus:outline-none"
            >
              <option value="all">All 6 GCC Countries</option>
              <option value="saudi-arabia">Saudi Arabia</option>
              <option value="uae">United Arab Emirates</option>
              <option value="qatar">Qatar</option>
              <option value="kuwait">Kuwait</option>
              <option value="bahrain">Bahrain</option>
              <option value="oman">Oman</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="hero-category-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Job Category
            </label>
            <select
              id="hero-category-select"
              value={categorySlug}
              onChange={e => setCategorySlug(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-600 rounded-lg text-sm text-slate-900 focus:outline-none"
            >
              <option value="">All Categories</option>
              {PUBLIC_JOB_CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-teal-600 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4 text-teal-400" />
              <span className="md:hidden">Search Jobs</span>
            </button>
          </div>
        </form>

        {/* Quiet Informational Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-white tabular-nums">
              {totalJobsCount} Active {totalJobsCount === 1 ? 'Vacancy' : 'Vacancies'}
            </span>
            <span className="text-slate-600">·</span>
            <span>Direct Email & Phone Employer Contact</span>
            <span className="text-slate-600">·</span>
            <span>Free Public Access Without Login</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigatePath('/career-advice')}
            className="text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read GCC Career & CV Guides</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
