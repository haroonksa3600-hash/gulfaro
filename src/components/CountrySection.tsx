import React from 'react';
import { GccCountry, GCC_COUNTRIES, CountryInfo, JobAd } from '../types/job';
import { MapPin, ArrowRight, TrendingUp } from 'lucide-react';

interface CountrySectionProps {
  jobs: JobAd[];
  selectedCountry: GccCountry | 'all';
  onSelectCountry: (country: GccCountry | 'all') => void;
  onSelectCity: (country: GccCountry, city: string) => void;
}

export const CountrySection: React.FC<CountrySectionProps> = ({
  jobs,
  selectedCountry,
  onSelectCountry,
  onSelectCity
}) => {
  const countryList = Object.values(GCC_COUNTRIES);

  const getCountryJobCount = (countryId: GccCountry) => {
    return jobs.filter(j => j.country === countryId && j.status === 'active').length;
  };

  return (
    <section className="py-8 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-1">
              Regional Job Gateways
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Explore Vacancies Across the 6 GCC Nations
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Click any country to filter live classified advertisements instantly
          </p>
        </div>

        {/* 6 Country Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {countryList.map((country) => {
            const count = getCountryJobCount(country.id);
            const isSelected = selectedCountry === country.id;

            return (
              <div
                key={country.id}
                onClick={() => onSelectCountry(isSelected ? 'all' : country.id)}
                className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/60 shadow-md ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                }`}
              >
                {/* Flag + Code */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl leading-none" role="img" aria-label={country.name}>
                    {country.flag}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {country.code}
                  </span>
                </div>

                {/* Country Name */}
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors line-clamp-1">
                  {country.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-arabic mb-2" dir="rtl">
                  {country.nameAr}
                </p>

                {/* Job Count & Currency */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800">
                    {count} {count === 1 ? 'Job' : 'Jobs'}
                  </span>
                  <span className="text-[11px] font-medium text-teal-600">
                    {country.currency}
                  </span>
                </div>

                {/* Top Cities Quick Links */}
                <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Top Cities:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {country.topCities.slice(0, 3).map((city) => (
                      <button
                        key={city}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCity(country.id, city);
                        }}
                        className="text-[10px] text-slate-600 hover:text-teal-600 hover:underline"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
