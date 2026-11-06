import React from 'react';
import { GccCountry, GCC_COUNTRIES } from '../types/job';
import { ShieldCheck, MessageCircle, Globe, PlusCircle } from 'lucide-react';

interface FooterProps {
  onSelectCountry: (c: GccCountry | 'all') => void;
  onOpenPostJob: () => void;
  onOpenSafetyGuide: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onOpenLegal?: (type: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCountry,
  onOpenPostJob,
  onOpenSafetyGuide,
  onOpenAuth,
  onOpenLegal
}) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      
      {/* Top CTA Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              Hiring in Saudi Arabia, UAE or the Gulf?
            </h2>
            <p className="text-xs text-slate-400">
              Post your job vacancy for free and receive direct inquiries via WhatsApp and phone from qualified candidates.
            </p>
          </div>

          <button
            onClick={onOpenPostJob}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-sm whitespace-nowrap active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post a Free Classified Now</span>
          </button>
        </div>
      </div>

      {/* Main Links Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        
        {/* Col 1: Brand & Identity */}
        <div className="col-span-2 md:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-500 text-slate-950 flex items-center justify-center font-black text-sm">
              G
            </div>
            <span className="text-xl font-black text-white tracking-tight">GULFARO</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The modern GCC job marketplace inspired by Expatriates.com. Connecting skilled expat and national talent with direct verified employers across the Arabian Gulf.
          </p>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
            <MessageCircle className="w-4 h-4" />
            <span>Direct WhatsApp & Call Connections</span>
          </div>
        </div>

        {/* Col 2: 6 GCC Countries */}
        <div className="space-y-2">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
            GCC Country Portals
          </h3>
          <ul className="space-y-1.5">
            {Object.values(GCC_COUNTRIES).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelectCountry(c.id)}
                  className="hover:text-teal-300 transition-colors flex items-center gap-1.5"
                >
                  <span>{c.flag}</span>
                  <span>{c.name} Jobs</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Popular Classified Sectors */}
        <div className="space-y-2">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
            Popular Job Categories
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>Civil & Structural Engineering</li>
            <li>IT, React & Cloud Software</li>
            <li>General & VAT Accountants</li>
            <li>Licensed Staff Nurses (SCFHS/DHA)</li>
            <li>Heavy & Light Vehicle Drivers</li>
            <li>Specialty Baristas & Hotel F&B</li>
            <li>Oil & Gas Rig Technicians</li>
          </ul>
        </div>

        {/* Col 4: Trust, Safety & Rules */}
        <div className="space-y-2">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
            Expat Safety & Policies
          </h3>
          <ul className="space-y-1.5 text-xs">
            <li>
              <button
                onClick={onOpenSafetyGuide}
                className="hover:text-teal-300 transition-colors flex items-center gap-1 text-teal-400 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Scam Guidelines</span>
              </button>
            </li>
            <li>Qiwa Transfer Protocol (KSA)</li>
            <li>MOHRE Standard Contracts (UAE)</li>
            <li>Labor Law Compliance</li>
            <li>
              <button
                onClick={() => onOpenLegal?.('privacy')}
                className="hover:text-teal-300 transition-colors"
              >
                Privacy Policy & AdSense Disclosure
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenLegal?.('terms')}
                className="hover:text-teal-300 transition-colors"
              >
                Terms of Service & Anti-Fee Rules
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenAuth?.('signup')}
                className="hover:text-teal-300 transition-colors font-medium text-teal-400"
              >
                Join
              </button>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-slate-800/80 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} GULFARO. All rights reserved. GCC Job Classifieds Marketplace.</p>
          <p className="flex items-center gap-2">
            <span>Saudi Arabia</span>
            <span>·</span>
            <span>United Arab Emirates</span>
            <span>·</span>
            <span>Qatar</span>
            <span>·</span>
            <span>Kuwait</span>
            <span>·</span>
            <span>Bahrain</span>
            <span>·</span>
            <span>Oman</span>
          </p>
        </div>
      </div>

    </footer>
  );
};
