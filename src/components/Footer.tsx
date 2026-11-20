import React, { useState } from 'react';
import { GccCountry, User } from '../types/job';
import { GCC_COUNTRY_DIRECTORY, PUBLIC_JOB_CATEGORIES } from '../data/gccDirectory';
import { CAREER_ARTICLES } from '../data/careerArticles';
import { Mail, ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectCountry: (c: GccCountry | 'all') => void;
  onNavigatePath: (path: string) => void;
  onOpenPostJob: () => void;
  onOpenSafetyGuide: () => void;
  onOpenAuth?: (mode: 'login' | 'signup', preferredRole?: 'job_seeker' | 'employer') => void;
  onOpenInstall?: () => void;
  currentUser?: User | null;
  cmsOverrides?: {
    logoUrl?: string;
    footerDescription?: string;
    footerContactEmail?: string;
    footerCopyright?: string;
  };
}

type FooterSectionKey = 'countries' | 'categories' | 'career' | 'legal';

const DEFAULT_FOOTER_DESCRIPTION =
  'Gulfaro is a modern GCC job marketplace connecting skilled expatriate and national talent with verified employers across the Arabian Gulf, making recruitment simpler, faster, and more reliable.';

const DEFAULT_FOOTER_COPYRIGHT =
  '© 2026 GULFARO. All rights reserved. GCC Job Classifieds Marketplace.';

export const Footer: React.FC<FooterProps> = ({
  onSelectCountry,
  onNavigatePath,
  onOpenSafetyGuide,
  cmsOverrides
}) => {
  const [openMobileSections, setOpenMobileSections] = useState<Record<FooterSectionKey, boolean>>({
    countries: false,
    categories: false,
    career: false,
    legal: false
  });

  const contactEmail = cmsOverrides?.footerContactEmail || 'admingulfaro@gmail.com';
  const descriptionText = cmsOverrides?.footerDescription || DEFAULT_FOOTER_DESCRIPTION;
  const copyrightText = cmsOverrides?.footerCopyright || DEFAULT_FOOTER_COPYRIGHT;

  const toggleMobileSection = (key: FooterSectionKey) => {
    setOpenMobileSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const countryLinks = (
    <ul className="space-y-2">
      {GCC_COUNTRY_DIRECTORY.map(c => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onNavigatePath(`/country/${c.slug}`)}
            className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
          >
            {c.name} Jobs
          </button>
        </li>
      ))}
    </ul>
  );

  const categoryLinks = (
    <ul className="space-y-2">
      {PUBLIC_JOB_CATEGORIES.slice(0, 6).map(cat => (
        <li key={cat.slug}>
          <button
            type="button"
            onClick={() => onNavigatePath(`/category/${cat.slug}`)}
            className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
          >
            {cat.name}
          </button>
        </li>
      ))}
      <li className="pt-1">
        <button
          type="button"
          onClick={() => onNavigatePath('/categories')}
          className="text-[13px] text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left inline-flex items-center gap-1 py-0.5 cursor-pointer"
        >
          <span>View All 30 Categories</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </li>
    </ul>
  );

  const careerLinks = (
    <ul className="space-y-2">
      {CAREER_ARTICLES.slice(0, 5).map(art => (
        <li key={art.slug}>
          <button
            type="button"
            onClick={() => onNavigatePath(`/career-advice/${art.slug}`)}
            className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
          >
            {art.title}
          </button>
        </li>
      ))}
      <li className="pt-1">
        <button
          type="button"
          onClick={() => onNavigatePath('/career-advice')}
          className="text-[13px] text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left inline-flex items-center gap-1 py-0.5 cursor-pointer"
        >
          <span>All Career Articles</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </li>
    </ul>
  );

  const legalLinks = (
    <ul className="space-y-2">
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/about')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          About Gulfaro
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/contact')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Contact Us
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/privacy-policy')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Privacy Policy
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/terms')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Terms and Conditions
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/disclaimer')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Disclaimer
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => onNavigatePath('/cookie-policy')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Cookie Policy
        </button>
      </li>
      <li className="pt-1">
        <button
          type="button"
          onClick={onOpenSafetyGuide}
          className="text-[13px] text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left inline-flex items-center gap-1.5 py-0.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Anti-Scam Hiring Guide</span>
        </button>
      </li>
    </ul>
  );

  const brandBlock = (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onNavigatePath('/')}
        className="text-left focus:outline-none hover:opacity-90 transition-opacity inline-flex items-center cursor-pointer"
        aria-label="Gulfaro Homepage"
      >
        <img
          src={cmsOverrides?.logoUrl || '/assets/aistudio/Gulfaro_logo_white_clean.png'}
          alt="Gulfaro"
          className="h-8 w-auto object-contain"
        />
      </button>

      <p className="text-[13px] text-slate-300/90 leading-relaxed max-w-md">
        {descriptionText}
      </p>

      <div className="pt-1">
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-teal-500/60 text-slate-200 hover:text-teal-300 transition-colors text-xs sm:text-[13px] font-medium"
        >
          <Mail className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="break-all">{contactEmail}</span>
        </a>
      </div>
    </div>
  );

  const mobileSections: Array<{
    key: FooterSectionKey;
    title: string;
    content: React.ReactNode;
  }> = [
    { key: 'countries', title: 'GCC Countries', content: countryLinks },
    { key: 'categories', title: 'Job Categories', content: categoryLinks },
    { key: 'career', title: 'Career Advice', content: careerLinks },
    { key: 'legal', title: 'Company & Legal', content: legalLinks }
  ];

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      {/* Main Footer Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Mobile Vertically Organized Layout with Expandable Accordions */}
        <div className="md:hidden py-8 space-y-6">
          <div>{brandBlock}</div>

          <div className="border-t border-b border-slate-800/80 divide-y divide-slate-800/80">
            {mobileSections.map(section => {
              const isOpen = openMobileSections[section.key];
              const panelId = `footer-accordion-${section.key}`;
              return (
                <div key={section.key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleMobileSection(section.key)}
                    className="w-full flex items-center justify-between py-3.5 text-left text-xs font-bold uppercase tracking-wider text-white hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-teal-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div id={panelId} className="pb-4 pt-1 pl-1">
                      {section.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tablet & Desktop Balanced Multi-Column Layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1.15fr_1.45fr_1fr] gap-8 lg:gap-10 py-12">
          {/* Column 1: Brand & Contact */}
          <div className="md:col-span-2 lg:col-span-1">{brandBlock}</div>

          {/* Column 2: 6 GCC Countries */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-2.5 border-b border-slate-800/80">
              GCC Countries
            </h3>
            {countryLinks}
          </div>

          {/* Column 3: Top Job Categories */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-2.5 border-b border-slate-800/80">
              Job Categories
            </h3>
            {categoryLinks}
          </div>

          {/* Column 4: Career Resources */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-2.5 border-b border-slate-800/80">
              Career Advice
            </h3>
            {careerLinks}
          </div>

          {/* Column 5: Public Trust & Legal Pages */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-2.5 border-b border-slate-800/80">
              Company & Legal
            </h3>
            {legalLinks}
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Quick Legal Links */}
      <div className="border-t border-slate-800/80 bg-slate-950 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p className="text-center sm:text-left leading-relaxed">{copyrightText}</p>
          <nav
            aria-label="Footer legal links"
            className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5"
          >
            <button
              type="button"
              onClick={() => {
                onSelectCountry('all');
                onNavigatePath('/');
              }}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              All GCC Jobs
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => onNavigatePath('/privacy-policy')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Privacy
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => onNavigatePath('/terms')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Terms
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => onNavigatePath('/cookie-policy')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Cookies
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
};
