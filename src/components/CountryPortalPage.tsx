import React, { useState, useMemo } from 'react';
import { GccCountry, JobAd } from '../types/job';
import {
  GCC_COUNTRY_DIRECTORY,
  PUBLIC_JOB_CATEGORIES,
  findCountryMetaBySlug,
  isJobActiveAndUnexpired
} from '../data/gccDirectory';
import { jobMatchesCategoryFilter } from '../data/categories';
import { findArticleBySlug } from '../data/careerArticles';
import { JobCard } from './JobCard';
import { AdBanner } from './AdBanner';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Globe,
  MapPin,
  Search,
  ShieldCheck
} from 'lucide-react';

interface CountryPortalPageProps {
  countrySlug?: string;
  jobs: JobAd[];
  savedJobIds: string[];
  onToggleSave: (id: string) => void;
  onSelectJob: (job: JobAd) => void;
  onNavigate: (path: string) => void;
}

export const CountryPortalPage: React.FC<CountryPortalPageProps> = ({
  countrySlug,
  jobs,
  savedJobIds,
  onToggleSave,
  onSelectJob,
  onNavigate
}) => {
  const [cityFilter, setCityFilter] = useState<string>('');
  const [categorySlugFilter, setCategorySlugFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const activeJobs = useMemo(
    () => jobs.filter(j => isJobActiveAndUnexpired(j)),
    [jobs]
  );

  const selectedMeta = countrySlug ? findCountryMetaBySlug(countrySlug) : undefined;

  const filteredCountryJobs = useMemo(() => {
    if (!selectedMeta) return [];
    return activeJobs
      .filter(job => {
        if (job.country !== selectedMeta.id) return false;
        if (cityFilter && job.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
        if (categorySlugFilter && !jobMatchesCategoryFilter(job, categorySlugFilter)) {
          return false;
        }
        if (searchInput.trim()) {
          const q = searchInput.toLowerCase();
          const hit =
            job.title.toLowerCase().includes(q) ||
            job.company.toLowerCase().includes(q) ||
            job.city.toLowerCase().includes(q) ||
            job.description.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [activeJobs, selectedMeta, cityFilter, categorySlugFilter, searchInput]);

  if (!selectedMeta) {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
              <Globe className="w-4 h-4" />
              <span>GCC Country Gateways</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Browse Jobs Across All Six GCC Countries
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Explore open job vacancies, local labor market regulations, key hiring cities, and regional employment resources across Saudi Arabia, United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GCC_COUNTRY_DIRECTORY.map(country => {
              const countryJobsCount = activeJobs.filter(j => j.country === country.id).length;
              return (
                <article
                  key={country.id}
                  onClick={() => onNavigate(`/country/${country.slug}`)}
                  className="bg-white border border-slate-200 hover:border-teal-600 rounded-2xl p-6 cursor-pointer transition-colors flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl leading-none" role="img" aria-label={country.name}>
                        {country.flag}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {country.currency} · {country.code}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">{country.name}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{country.overview}</p>
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">Major Hubs:</strong> {country.majorHubs.slice(0, 4).join(' · ')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {countryJobsCount} Active {countryJobsCount === 1 ? 'Vacancy' : 'Vacancies'}
                    </span>
                    <span className="font-bold text-teal-700 inline-flex items-center gap-1">
                      Explore {country.shortName} <ArrowRight className="w-3.5 h-3.5" />
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

  const relatedArticle = findArticleBySlug(selectedMeta.relatedArticleSlug);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Navy Header */}
      <section className="bg-slate-950 text-white border-b border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <button onClick={() => onNavigate('/')} className="hover:text-teal-400">
                Home
              </button>
              <span>/</span>
              <button onClick={() => onNavigate('/countries')} className="hover:text-teal-400">
                GCC Countries
              </button>
              <span>/</span>
              <span className="text-slate-200 font-semibold">{selectedMeta.name}</span>
            </nav>

            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All GCC Jobs
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="max-w-3xl space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-4xl leading-none" role="img" aria-label={selectedMeta.name}>
                  {selectedMeta.flag}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {selectedMeta.name} Career Portal · Currency: {selectedMeta.currency}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                {selectedMeta.headline}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {selectedMeta.overview}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 shrink-0 text-left">
              <div className="text-xs text-slate-400">Active Vacancies</div>
              <div className="text-2xl font-extrabold text-teal-400 tabular-nums">
                {activeJobs.filter(j => j.country === selectedMeta.id).length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Direct Employer Listings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Listings + Filters */}
          <div className="lg:col-span-2 space-y-5">
            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={`Search in ${selectedMeta.shortName}...`}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                aria-label="Filter by City"
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="">All Cities in {selectedMeta.shortName}</option>
                {selectedMeta.majorHubs.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select
                value={categorySlugFilter}
                onChange={e => setCategorySlugFilter(e.target.value)}
                aria-label="Filter by Category"
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="">All Categories</option>
                {PUBLIC_JOB_CATEGORIES.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Active Jobs List */}
            {filteredCountryJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                <p className="text-base font-bold text-slate-900">
                  No active vacancies currently match those filters in {selectedMeta.name}.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Gulfaro only publishes real employer vacancies. Clear your city or category filters, or browse opportunities in neighboring GCC countries.
                </p>
                {(cityFilter || categorySlugFilter || searchInput) && (
                  <button
                    onClick={() => {
                      setCityFilter('');
                      setCategorySlugFilter('');
                      setSearchInput('');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                  >
                    Show All {selectedMeta.shortName} Vacancies
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCountryJobs.map((job, idx) => (
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

          {/* Country Employment Guide Sidebar */}
          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                <Building2 className="w-4 h-4" />
                <span>{selectedMeta.name} Hiring Guide</span>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div>
                  <h2 className="font-bold text-slate-900 mb-1">Key Hiring Industries</h2>
                  <ul className="space-y-1">
                    {selectedMeta.keyIndustries.map(ind => (
                      <li key={ind}>· {ind}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h2 className="font-bold text-slate-900 mb-1">Labor Authority & Contracts</h2>
                  <p className="font-semibold text-slate-800 mb-1">{selectedMeta.laborAuthority}</p>
                  <p>{selectedMeta.contractNote}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h2 className="font-bold text-slate-900 mb-1.5">Major Cities</h2>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {selectedMeta.majorHubs.map(hub => (
                      <button
                        key={hub}
                        onClick={() => setCityFilter(cityFilter === hub ? '' : hub)}
                        className={`text-xs hover:underline ${
                          cityFilter === hub ? 'font-bold text-teal-700 underline' : 'text-slate-600'
                        }`}
                      >
                        <MapPin className="w-3 h-3 inline mr-0.5 text-teal-600" />
                        {hub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {relatedArticle && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
                  <BookOpen className="w-4 h-4" />
                  <span>Recommended Reading</span>
                </div>
                <h2 className="font-bold text-sm text-slate-900">{relatedArticle.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{relatedArticle.summary}</p>
                <button
                  onClick={() => onNavigate(`/career-advice/${relatedArticle.slug}`)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 pt-1"
                >
                  Read Full Guide <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-teal-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Candidate Safety Notice</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Contact employers directly using the email or phone number listed on each vacancy. Never pay visa or processing fees to any intermediary.
              </p>
            </div>

            <AdBanner type="rectangle" />
          </aside>
        </div>

        {/* Cross-Links to Other 5 GCC Countries */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Explore Other GCC Country Portals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GCC_COUNTRY_DIRECTORY.filter(c => c.id !== selectedMeta.id).map(other => (
              <button
                key={other.id}
                onClick={() => {
                  setCityFilter('');
                  setCategorySlugFilter('');
                  onNavigate(`/country/${other.slug}`);
                }}
                className="p-3 rounded-xl border border-slate-200 hover:border-teal-600 text-left transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{other.flag}</span>
                  <span className="font-bold text-xs text-slate-900">{other.name}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {activeJobs.filter(j => j.country === other.id).length} active jobs
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
