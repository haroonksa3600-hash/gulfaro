import React from 'react';
import { GccCountry, JobAd } from '../types/job';
import { GCC_COUNTRY_DIRECTORY, isJobActiveAndUnexpired } from '../data/gccDirectory';
import { ArrowRight } from 'lucide-react';

interface CountrySectionProps {
  jobs: JobAd[];
  selectedCountry: GccCountry | 'all';
  onSelectCountry: (country: GccCountry | 'all') => void;
  onSelectCity: (country: GccCountry, city: string) => void;
  onOpenCountryPage?: (slug: string) => void;
}

export const CountrySection: React.FC<CountrySectionProps> = ({
  jobs,
  selectedCountry,
  onSelectCountry,
  onSelectCity,
  onOpenCountryPage
}) => {
  const activeJobs = jobs.filter(j => isJobActiveAndUnexpired(j));

  const getCountryJobCount = (countryId: GccCountry) => {
    return activeJobs.filter(j => j.country === countryId).length;
  };

  return (
    <section className="py-10 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-200 gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Regional Job Gateways
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Browse Jobs by GCC Country
            </h2>
          </div>
          {onOpenCountryPage ? (
            <button
              onClick={() => onOpenCountryPage('')}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
            >
              View All Country Guides <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              Select a country to browse regional vacancies and local hiring details
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {GCC_COUNTRY_DIRECTORY.map(country => {
            const count = getCountryJobCount(country.id);
            const isSelected = selectedCountry === country.id;

            return (
              <div
                key={country.id}
                onClick={() => {
                  if (onOpenCountryPage) {
                    onOpenCountryPage(country.slug);
                  } else {
                    onSelectCountry(isSelected ? 'all' : country.id);
                  }
                }}
                className={`group p-4 rounded-xl border text-left cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/40'
                    : 'border-slate-200 bg-white hover:border-teal-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl leading-none" role="img" aria-label={country.name}>
                      {country.flag}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {country.currency}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                    {country.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {country.majorHubs.slice(0, 3).map((city, idx) => (
                      <React.Fragment key={city}>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onSelectCity(country.id, city);
                          }}
                          className="hover:text-teal-700 hover:underline"
                        >
                          {city}
                        </button>
                        {idx < 2 && <span className="mx-1">·</span>}
                      </React.Fragment>
                    ))}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                  <span className="font-bold text-slate-900 tabular-nums">
                    {count} {count === 1 ? 'Job' : 'Jobs'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
