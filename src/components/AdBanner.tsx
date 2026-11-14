import React, { useEffect, useRef } from 'react';
import { storageService } from '../services/storage';
import { Info } from 'lucide-react';

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

  if (!config.enabled) {
    return null;
  }

  const effectiveSlotId =
    slotId ||
    (type === 'leaderboard'
      ? config.slots.headerLeaderboard
      : type === 'in-feed'
      ? config.slots.inFeedClassified
      : config.slots.sidebarRectangle);

  useEffect(() => {
    if (!config.testMode && window.adsbygoogle && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ignore adblock / script load error
      }
    }
  }, [config.testMode, effectiveSlotId]);

  if (config.testMode) {
    return (
      <aside aria-label="Advertisement Space" className={`w-full my-6 ${className}`}>
        <div className="bg-slate-100/90 border border-slate-200 rounded-xl px-4 py-3 text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Advertisement
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Display Ad Slot ({type === 'leaderboard' ? 'Responsive Leaderboard' : type === 'in-feed' ? 'In-Feed' : '300×250'}) · #{effectiveSlotId}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Advertisement" className={`adsense-wrapper overflow-hidden my-6 ${className}`}>
      <div className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-wider mb-1.5">
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
    </aside>
  );
};
