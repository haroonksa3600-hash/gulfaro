import React, { useEffect, useRef } from 'react';
import { AdSenseConfig } from '../types/adsense';
import { storageService } from '../services/storage';
import { ExternalLink, Info, Sparkles } from 'lucide-react';

interface AdBannerProps {
  type: 'leaderboard' | 'in-feed' | 'rectangle';
  slotId?: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  type,
  slotId,
  className = ''
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const config = storageService.getAdSenseConfig();

  // If ads are disabled in admin settings, do not render
  if (!config.enabled) {
    return null;
  }

  const effectiveSlotId = slotId || (
    type === 'leaderboard' 
      ? config.slots.headerLeaderboard 
      : type === 'in-feed' 
      ? config.slots.inFeedClassified 
      : config.slots.sidebarRectangle
  );

  useEffect(() => {
    // If not in testMode and adsbygoogle script is loaded, push ad
    if (!config.testMode && window.adsbygoogle && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('AdSense push error or adblock active:', err);
      }
    }
  }, [config.testMode, effectiveSlotId]);

  // If test mode or no active AdSense script is present, render styled compliant ad placeholder
  if (config.testMode) {
    if (type === 'leaderboard') {
      return (
        <div className={`w-full max-w-5xl mx-auto my-4 ${className}`}>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 px-1">
            <span>Advertisement</span>
            <span className="text-teal-600 font-mono">Google AdSense Leaderboard (728×90 / Responsive)</span>
          </div>
          <div className="bg-slate-100 hover:bg-slate-200/80 border border-dashed border-slate-300 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Target 250,000+ Expatriates & GCC Employers
                </p>
                <p className="text-[11px] text-slate-500">
                  Google AdSense slot active · ID: #{effectiveSlotId} · Publisher: {config.publisherId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                Responsive Display
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'in-feed') {
      return (
        <div className={`p-4 rounded-xl border border-dashed border-teal-300/80 bg-teal-50/30 my-3 text-xs ${className}`}>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            <span className="text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded font-semibold">
              Sponsored Ad · Google AdSense In-Feed
            </span>
            <span className="font-mono text-slate-400">Slot #{effectiveSlotId}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div>
              <h4 className="font-bold text-slate-900 text-sm hover:text-teal-700 cursor-pointer">
                Relocate, Study or Certify for GCC High-Salary Jobs
              </h4>
              <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">
                Fast-track PMP, NEBOSH, SCFHS Mumaris+, and KHDA verified certifications. Discover top training partners across Saudi Arabia & UAE.
              </p>
            </div>

            <button
              onClick={() => window.open('https://google.com/adsense', '_blank')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-colors self-end sm:self-center"
            >
              Learn More →
            </button>
          </div>
        </div>
      );
    }

    // Default 'rectangle' (300x250) for sidebar & detail page
    return (
      <div className={`w-full bg-slate-100 border border-dashed border-slate-300 rounded-xl p-4 text-center my-3 ${className}`}>
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
          Advertisement (300×250)
        </div>
        <div className="py-6 px-2 bg-white rounded-lg border border-slate-200/80 space-y-2">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Info className="w-4 h-4" />
          </div>
          <p className="font-bold text-xs text-slate-800">AdSense Medium Rectangle</p>
          <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
            Google Ad unit ready for display. Slot #{effectiveSlotId}
          </p>
        </div>
      </div>
    );
  }

  // Live Google AdSense Container
  return (
    <div className={`adsense-wrapper overflow-hidden my-3 ${className}`}>
      <div className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-wider mb-1">
        Advertisement
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={config.publisherId}
        data-ad-slot={effectiveSlotId}
        data-ad-format={type === 'in-feed' ? 'fluid' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
};
