import React from 'react';
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Smartphone, 
  Zap, 
  MessageCircle, 
  BellRing,
  ArrowRight
} from 'lucide-react';

import { PWAInstallPlatform } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  hasNativePrompt: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstalled: boolean;
  platformOverride?: PWAInstallPlatform;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  hasNativePrompt,
  isIOS,
  isInstalled,
  platformOverride = 'auto'
}) => {
  if (!isOpen) return null;

  const showIOSView = platformOverride === 'ios' || (platformOverride !== 'android' && isIOS);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gulfaro Brand Accent */}
        <div className="relative p-6 bg-gradient-to-br from-[#091e3a] via-slate-900 to-slate-950 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#091e3a] border border-teal-500/40 p-2 shadow-lg flex items-center justify-center shrink-0">
              <img 
                src="/pwa-192x192.png" 
                alt="Gulfaro App Icon" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/60 mb-1">
                Official Web App
              </span>
              <h2 id="pwa-install-title" className="text-xl font-extrabold text-white tracking-tight">
                Install Gulfaro App
              </h2>
              <p className="text-xs text-slate-400">
                GCC Job Classifieds Marketplace
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Instant 1-Tap Access</p>
                <p className="text-slate-400">Launch directly from your home screen without typing URLs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Direct WhatsApp Contact</p>
                <p className="text-slate-400">Connect with Saudi, UAE and Gulf employers instantly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Zero App Store Downloads</p>
                <p className="text-slate-400">Super lightweight, fast loading, no heavy store downloads or updates.</p>
              </div>
            </div>
          </div>

          {/* Platform-Specific Action Area */}
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-teal-950/50 border border-teal-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-teal-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span>Gulfaro is Already Installed</span>
              </div>
              <p className="text-xs text-teal-200/80">
                You can launch it directly from your device home screen or applications menu.
              </p>
            </div>
          ) : showIOSView ? (
            /* iOS Safari Step-by-Step Instructions */
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>How to Install on iPhone &amp; iPad</span>
              </p>
              <ol className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong className="text-white">Share</strong> button in Safari&apos;s bottom toolbar (<Share className="w-3.5 h-3.5 inline text-teal-400 mx-0.5" />).
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-teal-400 mx-0.5" />).
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-white">&quot;Add&quot;</strong> in the top-right corner to finish.
                  </span>
                </li>
              </ol>
            </div>
          ) : hasNativePrompt ? (
            /* Android / Chrome Native Prompt Available */
            <button
              onClick={() => {
                onInstall();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:from-teal-600 active:to-teal-700 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Install Gulfaro App</span>
              <ArrowRight className="w-4 h-4 text-slate-950 ml-1" />
            </button>
          ) : (
            /* Android / Browser Manual Install Instructions */
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>How to Install on Android</span>
              </p>
              <ol className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    1
                  </span>
                  <span>
                    Open your browser menu (<strong className="text-white">⋮</strong>) in Chrome, Edge, or Samsung Internet.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    2
                  </span>
                  <span>
                    Select <strong className="text-white">&quot;Install app&quot;</strong> or <strong className="text-white">&quot;Add to Home screen&quot;</strong>.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* Dismiss button */}
          <div className="pt-1 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
