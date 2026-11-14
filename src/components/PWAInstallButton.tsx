import React from 'react';
import { Smartphone, Download, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  onClick: () => void;
  isInstalled?: boolean;
  variant?: 'navbar' | 'drawer' | 'footer' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onClick,
  isInstalled = false,
  variant = 'navbar',
  className = ''
}) => {
  if (isInstalled) {
    return null;
  }

  if (variant === 'navbar') {
    return (
      <button
        onClick={onClick}
        className={`hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-teal-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-500/60 rounded-lg transition-all shadow-xs whitespace-nowrap active:scale-95 ${className}`}
        title="Install Gulfaro Mobile App"
        aria-label="Install Gulfaro App"
      >
        <Smartphone className="w-3.5 h-3.5 text-teal-400" />
        <span>Install App</span>
      </button>
    );
  }

  if (variant === 'drawer') {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-teal-500/30 rounded-xl text-xs font-bold text-white transition-all shadow-xs active:scale-[0.98] ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white leading-tight">Install Gulfaro App</p>
            <p className="text-[10px] text-teal-300">Fast 1-tap home screen access</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700/50">
          Free
        </span>
      </button>
    );
  }

  if (variant === 'footer') {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors font-semibold ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Install Gulfaro Mobile App</span>
      </button>
    );
  }

  // Banner variant
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
};
