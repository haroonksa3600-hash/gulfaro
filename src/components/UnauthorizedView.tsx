import React from 'react';
import { ShieldAlert, ArrowLeft, Building, UserPlus, LogIn, Briefcase } from 'lucide-react';
import { User } from '../types/job';

interface UnauthorizedViewProps {
  currentUser: User | null;
  onNavigateHome: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onSwitchToEmployer?: () => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  currentUser,
  onNavigateHome,
  onOpenAuth,
  onSwitchToEmployer
}) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-7 sm:p-8 text-center shadow-lg space-y-5">
        
        {/* Warning Icon with Amber/Red glow */}
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
            403 · Access Restricted
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Employer Account Required
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {currentUser ? (
              <>
                You are currently signed in as a <strong className="text-slate-800 capitalize">{currentUser.role.replace('_', ' ')}</strong> (<em>{currentUser.email}</em>). Job posting and vacancy management are strictly reserved for <strong>verified GCC Employers</strong>.
              </>
            ) : (
              <>
                Job posting and vacancy management are reserved for <strong>registered GCC Employers</strong>. Please sign in or create an Employer account to publish classified advertisements.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {currentUser?.role === 'job_seeker' && onSwitchToEmployer && (
            <button
              onClick={onSwitchToEmployer}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Building className="w-4 h-4" />
              <span>Switch to Employer Account</span>
            </button>
          )}

          {!currentUser && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Employer Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Join as Employer</span>
              </button>
            </div>
          )}

          <button
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Browse Vacancies</span>
          </button>
        </div>

        {/* Security & Expatriate Safety Notice */}
        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
          Gulfaro Role-Based Security: Ensuring authentic recruitment across all 6 GCC countries.
        </div>
      </div>
    </div>
  );
};
