import React from 'react';
import {
  FileQuestion,
  Home,
  Globe,
  Briefcase,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface NotFoundPageProps {
  requestedPath?: string;
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  requestedPath,
  onNavigateHome,
  onNavigate
}) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (path === '/') {
      onNavigateHome();
    } else {
      onNavigate(path);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-teal-600 to-teal-500" />

        <div className="p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center mx-auto">
            <FileQuestion className="w-8 h-8 text-teal-700" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              HTTP 404 Error
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              404 — Page Not Found
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              The page you requested does not exist or may have been moved. Return to the Gulfaro homepage to browse active direct-employer jobs across the GCC.
            </p>
            {requestedPath && requestedPath !== '/' && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-md border border-slate-200 break-all">
                  <span>Requested URL:</span>
                  <strong className="text-slate-900">{requestedPath}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              onClick={e => handleLinkClick(e, '/')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-teal-600 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              <Home className="w-4 h-4 text-teal-400" />
              <span>Go to Gulfaro Homepage</span>
            </a>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Explore Verified Gulfaro Sections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <a
                href="/countries"
                onClick={e => handleLinkClick(e, '/countries')}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">GCC Countries</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700" />
              </a>

              <a
                href="/categories"
                onClick={e => handleLinkClick(e, '/categories')}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">30 Job Categories</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700" />
              </a>

              <a
                href="/career-advice"
                onClick={e => handleLinkClick(e, '/career-advice')}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Career Advice</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
