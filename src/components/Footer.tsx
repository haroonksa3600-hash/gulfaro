import React from 'react';
import { GccCountry, User } from '../types/job';
import { GCC_COUNTRY_DIRECTORY, PUBLIC_JOB_CATEGORIES } from '../data/gccDirectory';
import { CAREER_ARTICLES } from '../data/careerArticles';
import { Mail, PlusCircle } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onSelectCountry: (c: GccCountry | 'all') => void;
  onNavigatePath: (path: string) => void;
  onOpenPostJob: () => void;
  onOpenSafetyGuide: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onOpenInstall?: () => void;
  currentUser?: User | null;
  cmsOverrides?: {
    logoUrl?: string;
    footerDescription?: string;
    footerContactEmail?: string;
    footerCopyright?: string;
  };
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCountry,
  onNavigatePath,
  onOpenPostJob,
  onOpenSafetyGuide,
  onOpenAuth,
  onOpenInstall,
  currentUser,
  cmsOverrides
}) => {
  const contactEmail = cmsOverrides?.footerContactEmail || 'admingulfaro@gmail.com';

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      {/* Top Recruitment Call-to-Action Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {currentUser?.role === 'job_seeker' ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Preparing for Your Next Career Step in the Gulf?
                </h2>
                <p className="text-xs text-slate-400">
                  Review our original GCC CV guides, interview preparation articles, and employment contract checklists.
                </p>
              </div>
              <button
                onClick={() => onNavigatePath('/career-advice')}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg whitespace-nowrap transition-colors"
              >
                Explore Career Resources
              </button>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Hiring Across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain or Oman?
                </h2>
                <p className="text-xs text-slate-400">
                  Publish your job opening and connect directly with qualified candidates via official email and telephone.
                </p>
              </div>
              <button
                onClick={currentUser?.role === 'employer' ? onOpenPostJob : () => onOpenAuth?.('signup')}
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg whitespace-nowrap transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{currentUser?.role === 'employer' ? 'Post a New Job' : 'Employer Sign Up'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Multi-Column Structured Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Column 1: Brand & Official Email Only */}
        <div className="col-span-2 md:col-span-1 space-y-3">
          <button
            onClick={() => onNavigatePath('/')}
            className="text-left focus:outline-none hover:opacity-90 transition-opacity"
            aria-label="Gulfaro Homepage"
          >
            <img
              src={cmsOverrides?.logoUrl || '/assets/aistudio/Gulfaro_logo_white_clean.png'}
              alt="Gulfaro"
              className="h-8 w-auto object-contain"
            />
          </button>
          <p className="text-xs text-slate-400 leading-relaxed">
            {cmsOverrides?.footerDescription ||
              'Gulfaro is an independent GCC job portal and career information resource connecting job seekers and employers across six Gulf nations.'}
          </p>
          <div className="flex items-center gap-2 text-slate-300 text-xs pt-1">
            <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <a href={`mailto:${contactEmail}`} className="hover:text-teal-300 transition-colors font-mono text-[11px] truncate">
              {contactEmail}
            </a>
          </div>
        </div>

        {/* Column 2: 6 GCC Countries */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            GCC Countries
          </h3>
          <ul className="space-y-1.5">
            {GCC_COUNTRY_DIRECTORY.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => onNavigatePath(`/country/${c.slug}`)}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  {c.name} Jobs
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Top Job Categories */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Job Categories
          </h3>
          <ul className="space-y-1.5">
            {PUBLIC_JOB_CATEGORIES.slice(0, 6).map(cat => (
              <li key={cat.slug}>
                <button
                  onClick={() => onNavigatePath(`/category/${cat.slug}`)}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  {cat.name}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => onNavigatePath('/categories')}
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left"
              >
                View All 30 Categories →
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Career Resources */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Career Advice
          </h3>
          <ul className="space-y-1.5">
            {CAREER_ARTICLES.slice(0, 5).map(art => (
              <li key={art.slug}>
                <button
                  onClick={() => onNavigatePath(`/career-advice/${art.slug}`)}
                  className="hover:text-teal-300 transition-colors text-left line-clamp-1"
                >
                  {art.title}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => onNavigatePath('/career-advice')}
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left"
              >
                All Career Articles →
              </button>
            </li>
          </ul>
        </div>

        {/* Column 5: Public Trust & Legal Pages */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Company & Legal
          </h3>
          <ul className="space-y-1.5">
            <li>
              <button onClick={() => onNavigatePath('/about')} className="hover:text-teal-300 transition-colors">
                About Gulfaro
              </button>
            </li>
            <li>
              <button onClick={() => onNavigatePath('/contact')} className="hover:text-teal-300 transition-colors">
                Contact Us
              </button>
            </li>
            <li>
              <button onClick={() => onNavigatePath('/privacy-policy')} className="hover:text-teal-300 transition-colors">
                Privacy Policy
              </button>
            </li>
            <li>
              <button onClick={() => onNavigatePath('/terms')} className="hover:text-teal-300 transition-colors">
                Terms and Conditions
              </button>
            </li>
            <li>
              <button onClick={() => onNavigatePath('/disclaimer')} className="hover:text-teal-300 transition-colors">
                Disclaimer
              </button>
            </li>
            <li>
              <button onClick={() => onNavigatePath('/cookie-policy')} className="hover:text-teal-300 transition-colors">
                Cookie Policy
              </button>
            </li>
            <li>
              <button onClick={onOpenSafetyGuide} className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
                Anti-Scam Hiring Guide
              </button>
            </li>
            {onOpenInstall && (
              <li className="pt-2 border-t border-slate-800">
                <PWAInstallButton onClick={onOpenInstall} variant="footer" />
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-slate-800/80 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>{cmsOverrides?.footerCopyright || `© ${new Date().getFullYear()} GULFARO. All rights reserved.`}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { onSelectCountry('all'); onNavigatePath('/'); }} className="hover:text-slate-300">
              All GCC Jobs
            </button>
            <span>·</span>
            <button onClick={() => onNavigatePath('/privacy-policy')} className="hover:text-slate-300">
              Privacy
            </button>
            <span>·</span>
            <button onClick={() => onNavigatePath('/terms')} className="hover:text-slate-300">
              Terms
            </button>
            <span>·</span>
            <button onClick={() => onNavigatePath('/cookie-policy')} className="hover:text-slate-300">
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
