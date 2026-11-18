import React, { useState } from 'react';
import { User, JobAd, GCC_COUNTRIES } from '../types/job';
import { storageService } from '../services/storage';
import { UserPlus, Bookmark } from 'lucide-react';

interface UserDashboardProps {
  currentUser: User | null;
  onSelectJob: (job: JobAd) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onSelectJob,
  onOpenAuth
}) => {
  const [jobs, setJobs] = useState<JobAd[]>(storageService.getJobs());
  const [savedJobIds, setSavedJobIds] = useState<string[]>(storageService.getSavedJobIds());

  if (!currentUser) {
    return (
      <div className="bg-slate-50 min-h-[70vh] py-16 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Saved Jobs &amp; Profile</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sign in to view your bookmarked job vacancies across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenAuth?.('signup')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account / Sign In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const reloadData = () => {
    setJobs(storageService.getJobs());
    setSavedJobIds(storageService.getSavedJobIds());
  };

  const savedJobsList = jobs.filter(j => savedJobIds.includes(j.id));

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-teal-400 font-extrabold text-2xl flex items-center justify-center border border-slate-700 shadow-sm shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wide">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.city}, {GCC_COUNTRIES[currentUser.country]?.name} · {currentUser.email}
              </p>
              {currentUser.headline && (
                <p className="text-xs text-slate-700 font-medium mt-1">
                  {currentUser.headline}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Classifieds you have bookmarked for later review or contact</span>
            <span className="font-semibold text-slate-700">{savedJobsList.length} Saved</span>
          </div>

          {savedJobsList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              You have not saved any jobs yet. Click the bookmark icon on any job card to save it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedJobsList.map(job => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                      <span>{GCC_COUNTRIES[job.country]?.flag}</span>
                      <span>
                        {job.city?.trim() ? `${job.city.trim()}, ` : ''}
                        {GCC_COUNTRIES[job.country]?.name}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">{job.company}</span>
                    </div>
                    <h3
                      onClick={() => onSelectJob(job)}
                      className="font-bold text-slate-900 text-base hover:text-teal-700 cursor-pointer"
                    >
                      {job.title}
                    </h3>
                    <p className="text-xs text-teal-700 font-semibold mt-1">
                      {job.salaryNegotiable
                        ? 'Salary Negotiable'
                        : `${job.currency} ${job.salaryMin?.toLocaleString() || ''} - ${job.salaryMax?.toLocaleString() || ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectJob(job)}
                      className="text-xs font-bold text-white bg-slate-900 hover:bg-teal-600 px-4 py-2 rounded-lg transition-colors"
                    >
                      View &amp; Contact
                    </button>
                    <button
                      onClick={() => {
                        storageService.toggleSaveJob(job.id);
                        reloadData();
                      }}
                      className="text-xs text-slate-500 hover:text-rose-600 px-2 py-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
