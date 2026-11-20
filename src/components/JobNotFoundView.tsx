import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES } from '../types/job';
import { 
  FileQuestion, 
  ArrowLeft, 
  Search, 
  Globe, 
  Briefcase, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface JobNotFoundViewProps {
  requestedSlugOrId?: string | null;
  onBrowseAll: () => void;
  onSearch: (query: string) => void;
  onSelectCountry: (country: GccCountry) => void;
}

export const JobNotFoundView: React.FC<JobNotFoundViewProps> = ({
  requestedSlugOrId,
  onBrowseAll,
  onSearch,
  onSelectCountry
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    } else {
      onBrowseAll();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      
      {/* Top back navigation */}
      <div className="mb-6">
        <a
          href="/"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onBrowseAll();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Homepage</span>
        </a>
      </div>

      {/* Main Not Found Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        
        {/* Amber top highlight strip */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-teal-500 to-teal-600" />

        <div className="p-6 sm:p-10 text-center space-y-6">
          
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <FileQuestion className="w-8 h-8 text-amber-600" />
          </div>

          {/* Heading & Requested Reference */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Job Advertisement Not Found
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              The vacancy you are looking for is no longer accepting applications, has been archived by the employer, or the direct link may be incorrect.
            </p>
            {requestedSlugOrId && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-md border border-slate-200">
                  <span>Requested Reference:</span>
                  <strong className="text-slate-900">{decodeURIComponent(requestedSlugOrId)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Inline Quick Search Box */}
          <div className="max-w-md mx-auto pt-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search other jobs (e.g. Nurse, Engineer, Driver)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white shadow-2xs transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl whitespace-nowrap shadow-xs transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {/* Primary Action Link */}
          <div className="pt-2">
            <a
              href="/"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onBrowseAll();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-teal-600 text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98]"
            >
              <Briefcase className="w-4 h-4 text-teal-400" />
              <span>Go to Homepage &amp; Browse All Jobs</span>
            </a>
          </div>

          {/* GCC Country Shortcuts */}
          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Or Explore Active Vacancies by GCC Country
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.values(GCC_COUNTRIES).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCountry(c.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-xs font-medium text-slate-700 transition-colors"
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trust Banner Note */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-left flex items-start gap-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800">100% Free Public Job Listings</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                All published vacancies on Gulfaro are publicly accessible. You do not need to register or pay any fee to read job descriptions or contact employers directly by email or phone.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
