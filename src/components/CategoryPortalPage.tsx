import React, { useState, useMemo } from 'react';
import { GccCountry, GCC_COUNTRIES, JobAd } from '../types/job';
import {
  PUBLIC_JOB_CATEGORIES,
  findCategoryMetaBySlug,
  isJobActiveAndUnexpired,
  jobMatchesPublicCategory
} from '../data/gccDirectory';
import { JobCard } from './JobCard';
import { AdBanner } from './AdBanner';
import { ArrowLeft, ArrowRight, Briefcase, Search } from 'lucide-react';

interface CategoryPortalPageProps {
  categorySlug?: string;
  jobs: JobAd[];
  savedJobIds: string[];
  onToggleSave: (id: string) => void;
  onSelectJob: (job: JobAd) => void;
  onNavigate: (path: string) => void;
}

export const CategoryPortalPage: React.FC<CategoryPortalPageProps> = ({
  categorySlug,
  jobs,
  savedJobIds,
  onToggleSave,
  onSelectJob,
  onNavigate
}) => {
  const [countryFilter, setCountryFilter] = useState<GccCountry | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');

  const activeJobs = useMemo(
    () => jobs.filter(j => isJobActiveAndUnexpired(j)),
    [jobs]
  );

  const selectedCategory = categorySlug ? findCategoryMetaBySlug(categorySlug) : undefined;

  const matchingJobs = useMemo(() => {
    if (!selectedCategory) return [];
    return activeJobs
      .filter(job => {
        if (!jobMatchesPublicCategory(job, selectedCategory)) return false;
        if (countryFilter !== 'all' && job.country !== countryFilter) return false;
        if (searchInput.trim()) {
          const q = searchInput.toLowerCase();
          return (
            job.title.toLowerCase().includes(q) ||
            job.company.toLowerCase().includes(q) ||
            job.city.toLowerCase().includes(q) ||
            job.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [activeJobs, selectedCategory, countryFilter, searchInput]);

  if (!selectedCategory) {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
              <Briefcase className="w-4 h-4" />
              <span>GCC Employment Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              All 30 GCC Job Categories
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Browse active openings across core Gulf industries. Select any sector to view verified direct-employer roles, role expectations, and regional requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PUBLIC_JOB_CATEGORIES.map(cat => {
              const count = activeJobs.filter(j => jobMatchesPublicCategory(j, cat)).length;
              return (
                <article
                  key={cat.slug}
                  onClick={() => onNavigate(`/category/${cat.slug}`)}
                  className="bg-white border border-slate-200 hover:border-teal-600 rounded-2xl p-5 cursor-pointer transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-1.5">{cat.name}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{cat.summary}</p>
                    <p className="text-[11px] text-slate-500">
                      {cat.typicalRoles.slice(0, 3).join(' · ')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {count} Active {count === 1 ? 'Listing' : 'Listings'}
                    </span>
                    <span className="font-bold text-teal-700 inline-flex items-center gap-1">
                      View Sector <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white border-b border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <button onClick={() => onNavigate('/')} className="hover:text-teal-400">
                Home
              </button>
              <span>/</span>
              <button onClick={() => onNavigate('/categories')} className="hover:text-teal-400">
                Categories
              </button>
              <span>/</span>
              <span className="text-slate-200 font-semibold">{selectedCategory.name}</span>
            </nav>

            <button
              onClick={() => onNavigate('/categories')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All 30 Categories
            </button>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {selectedCategory.name} Jobs in the GCC
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            {selectedCategory.overview}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            {/* Search & Country Filter */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={`Search ${selectedCategory.name} roles...`}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value as GccCountry | 'all')}
                aria-label="Filter by GCC Country"
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="all">All 6 GCC Countries</option>
                {Object.values(GCC_COUNTRIES).map(c => (
                  <option key={c.id} value={c.id}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            {matchingJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                <p className="text-base font-bold text-slate-900">
                  No active {selectedCategory.name} vacancies match your current selection.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Gulfaro only publishes real vacancies submitted by employers. Try broadening your country filter or check back soon.
                </p>
                {(countryFilter !== 'all' || searchInput) && (
                  <button
                    onClick={() => {
                      setCountryFilter('all');
                      setSearchInput('');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {matchingJobs.map((job, idx) => (
                  <React.Fragment key={job.id}>
                    <JobCard
                      job={job}
                      isSaved={savedJobIds.includes(job.id)}
                      onToggleSave={onToggleSave}
                      onSelectJob={onSelectJob}
                    />
                    {idx === 2 && <AdBanner type="in-feed" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Common Roles in This Sector</h2>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {selectedCategory.typicalRoles.map(role => (
                  <li key={role}>· {role}</li>
                ))}
              </ul>
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => onNavigate('/career-advice/how-to-prepare-a-professional-cv')}
                  className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  Prepare Your CV for GCC Employers <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <AdBanner type="rectangle" />
          </aside>
        </div>
      </div>
    </div>
  );
};
