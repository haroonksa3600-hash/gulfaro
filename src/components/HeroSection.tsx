import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES } from '../types/job';
import { JOB_CATEGORIES } from '../data/categories';
import { Search, MapPin, Briefcase, PhoneCall, MessageCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onSearch: (filters: {
    query: string;
    country: GccCountry | 'all';
    city: string;
    category: string;
  }) => void;
  selectedCountry: GccCountry | 'all';
  onQuickCountrySelect: (country: GccCountry | 'all') => void;
  totalJobsCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  selectedCountry,
  onQuickCountrySelect,
  totalJobsCount
}) => {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<GccCountry | 'all'>(selectedCountry);
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');

  // Update country when prop changes
  React.useEffect(() => {
    setCountry(selectedCountry);
    setCity('');
  }, [selectedCountry]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as GccCountry | 'all';
    setCountry(val);
    setCity('');
    onQuickCountrySelect(val);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query,
      country,
      city,
      category
    });
  };

  const availableCities = country !== 'all' 
    ? GCC_COUNTRIES[country].topCities 
    : ['Riyadh', 'Dubai', 'Doha', 'Jeddah', 'Kuwait City', 'Abu Dhabi', 'Manama', 'Muscat', 'Dammam', 'Sharjah'];

  const popularSearches = [
    { label: 'Transferable Iqama', query: 'Transferable' },
    { label: 'Civil Engineer', query: 'Civil Engineer' },
    { label: 'Heavy Driver', query: 'Driver' },
    { label: 'General Accountant', query: 'Accountant' },
    { label: 'Staff Nurse', query: 'Nurse' },
    { label: 'HVAC Technician', query: 'HVAC' },
    { label: 'Walk-In Interview', query: 'Walk-in' }
  ];

  return (
    <div className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
      {/* Background Hero Skyline with Gradient Contrast Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/hero_gcc_skyline_1793920055571.jpg"
          alt="Modern Gulf Skylines in Riyadh, Dubai, and Doha at dusk"
          className="w-full h-full object-cover object-center opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/90" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="max-w-3xl">
          {/* Subtle Trust Eyebrow */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-3 py-1 rounded-full mb-4">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Expatriate & GCC Employment Marketplace · 6 Gulf Countries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white text-balance leading-tight mb-4">
            Direct Job Classifieds Across Saudi Arabia, UAE & The Gulf
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-8 max-w-2xl">
            Browse verified vacancies across KSA, UAE, Qatar, Kuwait, Bahrain & Oman. Contact employers and recruiters directly through WhatsApp, direct phone call, or email.
          </p>
        </div>

        {/* Unified Search Box */}
        <form 
          onSubmit={handleFormSubmit}
          className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-xl shadow-2xl border border-slate-200 text-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3"
        >
          {/* Keyword Search */}
          <div className="lg:col-span-4 relative">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Job Title or Keywords
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Civil Engineer, Accountant, Driver..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Country Selector */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              GCC Country
            </label>
            <div className="relative flex items-center">
              <select
                value={country}
                onChange={handleCountryChange}
                aria-label="Select GCC Country"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-lg text-sm text-slate-900 font-medium focus:outline-none transition-colors"
              >
                <option value="all">🌐 All 6 GCC Countries</option>
                <option value="saudi-arabia">🇸🇦 Saudi Arabia (KSA)</option>
                <option value="uae">🇦🇪 United Arab Emirates</option>
                <option value="qatar">🇶🇦 Qatar</option>
                <option value="kuwait">🇰🇼 Kuwait</option>
                <option value="bahrain">🇧🇭 Bahrain</option>
                <option value="oman">🇴🇲 Oman</option>
              </select>
            </div>
          </div>

          {/* City Selector */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              City / Region
            </label>
            <div className="relative flex items-center">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Select City or Region"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-lg text-sm text-slate-900 focus:outline-none transition-colors"
              >
                <option value="">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-3 flex flex-col justify-end">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Select Job Category"
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-lg text-sm text-slate-900 focus:outline-none transition-colors"
                >
                  <option value="">All Sectors</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Submit Search Button */}
              <div className="self-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 text-white font-bold text-sm rounded-lg shadow transition-colors flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                >
                  <Search className="w-4 h-4 text-teal-400" />
                  <span>Search</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Popular Search Chips & Counter Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-300">Popular:</span>
            {popularSearches.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setQuery(item.query);
                  onSearch({ query: item.query, country, city, category });
                }}
                className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1 text-teal-400">
              <MessageCircle className="w-3.5 h-3.5" />
              Direct WhatsApp Access
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-semibold text-white">
              {totalJobsCount} Active Classifieds
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
