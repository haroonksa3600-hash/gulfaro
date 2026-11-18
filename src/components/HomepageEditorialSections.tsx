import React, { useMemo } from 'react';
import { JobAd, User, GCC_COUNTRIES } from '../types/job';
import { isJobActiveAndUnexpired } from '../data/gccDirectory';
import { CAREER_ARTICLES } from '../data/careerArticles';
import { storageService } from '../services/storage';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import gccProfessionalImg from '../assets/images/gcc_working_professional_1793920056504.jpg';

interface HomepageEditorialSectionsProps {
  jobs: JobAd[];
  currentUser: User | null;
  onNavigatePath: (path: string) => void;
  onFilterByCompany: (companyName: string) => void;
  onOpenPostJob: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

interface RealEmployerSummary {
  company: string;
  countryName: string;
  city: string;
  activeCount: number;
  verified: boolean;
}

export const HomepageEditorialSections: React.FC<HomepageEditorialSectionsProps> = ({
  jobs,
  currentUser,
  onNavigatePath,
  onFilterByCompany,
  onOpenPostJob,
  onOpenAuth
}) => {
  // Derive Featured Employers strictly from real active jobs & verified employer records (never fabricate)
  const featuredEmployers = useMemo<RealEmployerSummary[]>(() => {
    const activeJobs = jobs.filter(j => isJobActiveAndUnexpired(j));
    const map = new Map<string, RealEmployerSummary>();

    for (const job of activeJobs) {
      if (!job.company || !job.company.trim()) continue;
      const verified = storageService.isEmployerVerified(job);
      const qualifies = verified || job.isFeatured || job.packageType === 'sponsored';
      if (!qualifies) continue;

      const key = job.company.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.activeCount += 1;
        existing.verified = existing.verified || verified;
      } else {
        map.set(key, {
          company: job.company.trim(),
          countryName: GCC_COUNTRIES[job.country]?.name || job.country,
          city: job.city || '',
          activeCount: 1,
          verified
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.activeCount - a.activeCount)
      .slice(0, 6);
  }, [jobs]);

  const previewArticles = CAREER_ARTICLES.slice(0, 3);

  return (
    <>
      {/* 1. Featured Employers (Only displayed where real active employer data exists) */}
      {featuredEmployers.length > 0 && (
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-200 gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
                  Active Direct Employers
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Featured Employers Hiring Across the GCC
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Verified organizations with open positions listed on Gulfaro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredEmployers.map(emp => (
                <button
                  key={emp.company}
                  type="button"
                  onClick={() => onFilterByCompany(emp.company)}
                  className="p-5 rounded-xl border border-slate-200 hover:border-teal-600 bg-white text-left transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">{emp.company}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {emp.city?.trim() ? `${emp.city.trim()}, ` : ''}
                          {emp.countryName}
                        </p>
                      </div>
                    </div>

                    {emp.verified && (
                      <span title="Verified Employer" className="shrink-0 text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {emp.activeCount} Active {emp.activeCount === 1 ? 'Position' : 'Positions'}
                    </span>
                    <span className="font-bold text-teal-700 inline-flex items-center gap-1">
                      View Roles <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Career Advice & Educational Articles Preview */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-200 gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
                Career Advice & Guides
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Practical Guidance for GCC Job Seekers
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigatePath('/career-advice')}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
            >
              Read All {CAREER_ARTICLES.length} Career Articles <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {previewArticles.map(art => (
              <article
                key={art.slug}
                onClick={() => onNavigatePath(`/career-advice/${art.slug}`)}
                className="bg-white border border-slate-200 hover:border-teal-600 rounded-2xl p-6 cursor-pointer transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-bold text-teal-700">{art.topic}</span>
                    <span>·</span>
                    <span>{art.readingTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{art.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{art.summary}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{art.editorialAttribution}</span>
                  <span className="font-bold text-teal-700 inline-flex items-center gap-1">
                    Read Article <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CV Writing & Interview Preparation Resources */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
              <img
                src={gccProfessionalImg}
                alt="Professional reviewing career materials and interview preparation notes"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
                Candidate Preparation Hub
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                CV Writing & Interview Preparation Resources
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                Strong applications start with structured documentation and clear preparation. Use our original regional resources before contacting employers directly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => onNavigatePath('/career-advice/how-to-prepare-a-professional-cv')}
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-600 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span>Professional CV Blueprint</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clean two-page layout standards, ATS keyword clarity, and presenting Saudi/UAE credentials accurately.
                </p>
                <span className="text-xs font-bold text-teal-700 inline-flex items-center gap-1">
                  Open CV Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => onNavigatePath('/career-advice/common-interview-questions-and-answers')}
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-600 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>Interview Q&A & Contract Review</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  STAR response structure, salary package benchmarking, and checking Qiwa/MOHRE labor contracts.
                </p>
                <span className="text-xs font-bold text-teal-700 inline-flex items-center gap-1">
                  Prepare for Interviews <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-700 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Zero application fees
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Direct employer email & phone access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                No external redirect links
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Employer Recruitment Call-to-Action */}
      <section className="py-12 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
              For GCC Employers & Hiring Teams
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Recruiting Skilled Professionals Across the Gulf?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Publish structured job openings in minutes and receive candidate applications directly at your business email and contact phone number—without middlemen or third-party redirects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUser?.role === 'employer' ? (
              <button
                type="button"
                onClick={onOpenPostJob}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a New Job</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Employer Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  Employer Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
