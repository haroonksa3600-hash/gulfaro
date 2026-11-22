import React, { useState } from 'react';
import { GccCountry, User } from '../types/job';
import { GCC_COUNTRY_DIRECTORY, PUBLIC_JOB_CATEGORIES } from '../data/gccDirectory';
import { CAREER_ARTICLES } from '../data/careerArticles';
import { ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectCountry: (c: GccCountry | 'all') => void;
  onNavigatePath: (path: string) => void;
  onOpenPostJob: () => void;
  onOpenSafetyGuide: () => void;
  onOpenAuth?: (mode: 'login' | 'signup', preferredRole?: 'job_seeker' | 'employer') => void;
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

  const descriptionText = cmsOverrides?.footerDescription || DEFAULT_FOOTER_DESCRIPTION;
  const copyrightText = cmsOverrides?.footerCopyright || DEFAULT_FOOTER_COPYRIGHT;

  const toggleMobileSection = (key: FooterSectionKey) => {
    setOpenMobileSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSpaLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onNavigatePath(path);
    }
  };

  const countryLinks = (
    <ul className="space-y-2">
      {GCC_COUNTRY_DIRECTORY.map(c => {
        const href = `/country/${c.slug}`;
        return (
          <li key={c.id}>
            <a
              href={href}
              onClick={e => handleSpaLinkClick(e, href)}
              className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
            >
              {c.name} Jobs
            </a>
          </li>
        );
      })}
    </ul>
  );

  const categoryLinks = (
    <ul className="space-y-2">
      {PUBLIC_JOB_CATEGORIES.slice(0, 6).map(cat => {
        const href = `/category/${cat.slug}`;
        return (
          <li key={cat.slug}>
            <a
              href={href}
              onClick={e => handleSpaLinkClick(e, href)}
              className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
            >
              {cat.name}
            </a>
          </li>
        );
      })}
      <li className="pt-1">
        <a
          href="/categories"
          onClick={e => handleSpaLinkClick(e, '/categories')}
          className="text-[13px] text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left inline-flex items-center gap-1 py-0.5 cursor-pointer"
        >
          <span>View All 30 Categories</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </a>
      </li>
    </ul>
  );

  const careerLinks = (
    <ul className="space-y-2">
      {CAREER_ARTICLES.slice(0, 5).map(art => {
        const href = `/career-advice/${art.slug}`;
        return (
          <li key={art.slug}>
            <a
              href={href}
              onClick={e => handleSpaLinkClick(e, href)}
              className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
            >
              {art.title}
            </a>
          </li>
        );
      })}
      <li className="pt-1">
        <a
          href="/career-advice"
          onClick={e => handleSpaLinkClick(e, '/career-advice')}
          className="text-[13px] text-teal-400 hover:text-teal-300 font-semibold transition-colors text-left inline-flex items-center gap-1 py-0.5 cursor-pointer"
        >
          <span>All Career Articles</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </a>
      </li>
    </ul>
  );

  const legalLinks = (
    <ul className="space-y-2">
      <li>
        <a
          href="/about"
          onClick={e => handleSpaLinkClick(e, '/about')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          About Us
        </a>
      </li>
      <li>
        <a
          href="/contact"
          onClick={e => handleSpaLinkClick(e, '/contact')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Contact Us
        </a>
      </li>
      <li>
        <a
          href="/privacy-policy"
          onClick={e => handleSpaLinkClick(e, '/privacy-policy')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Privacy Policy
        </a>
      </li>
      <li>
        <a
          href="/terms"
          onClick={e => handleSpaLinkClick(e, '/terms')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Terms &amp; Conditions
        </a>
      </li>
      <li>
        <a
          href="/disclaimer"
          onClick={e => handleSpaLinkClick(e, '/disclaimer')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Disclaimer
        </a>
      </li>
      <li>
        <a
          href="/cookie-policy"
          onClick={e => handleSpaLinkClick(e, '/cookie-policy')}
          className="text-[13px] text-slate-300 hover:text-teal-300 transition-colors text-left leading-snug py-0.5 block w-full cursor-pointer"
        >
          Cookie Policy
        </a>
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
      <a
        href="/"
        onClick={e => handleSpaLinkClick(e, '/')}
        className="text-left focus:outline-none hover:opacity-90 transition-opacity inline-flex items-center cursor-pointer"
        aria-label="Gulfaro Homepage"
      >
        <img
          src={cmsOverrides?.logoUrl || '/assets/aistudio/Gulfaro_logo_white_clean.png'}
          alt="Gulfaro"
          className="h-8 w-auto object-contain"
        />
      </a>

      <p className="text-[13px] text-slate-300/90 leading-relaxed max-w-md">
        {descriptionText}
      </p>
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
              Company &amp; Legal
            </h3>
            {legalLinks}
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Always-Visible Quick Legal Links */}
      <div className="border-t border-slate-800/80 bg-slate-950 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p className="text-center sm:text-left leading-relaxed">{copyrightText}</p>
          <nav
            aria-label="Footer legal links"
            className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5"
          >
            <a
              href="/"
              onClick={e => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  onSelectCountry('all');
                  onNavigatePath('/');
                }
              }}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              All GCC Jobs
            </a>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <a
              href="/about"
              onClick={e => handleSpaLinkClick(e, '/about')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              About Us
            </a>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <a
              href="/contact"
              onClick={e => handleSpaLinkClick(e, '/contact')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Contact Us
            </a>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <a
              href="/terms"
              onClick={e => handleSpaLinkClick(e, '/terms')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Terms &amp; Conditions
            </a>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <a
              href="/privacy-policy"
              onClick={e => handleSpaLinkClick(e, '/privacy-policy')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Privacy Policy
            </a>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <a
              href="/cookie-policy"
              onClick={e => handleSpaLinkClick(e, '/cookie-policy')}
              className="hover:text-teal-300 transition-colors py-0.5 cursor-pointer"
            >
              Cookies
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
