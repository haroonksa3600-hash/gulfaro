import React from 'react';
import { CAREER_ARTICLES, findArticleBySlug } from '../data/careerArticles';
import { AdBanner } from './AdBanner';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, FileText } from 'lucide-react';
import gccMeetingImg from '../assets/images/gcc_recruitment_meeting_1793920057434.jpg';

interface CareerResourcesPageProps {
  articleSlug?: string;
  onNavigate: (path: string) => void;
}

export const CareerResourcesPage: React.FC<CareerResourcesPageProps> = ({
  articleSlug,
  onNavigate
}) => {
  const article = articleSlug ? findArticleBySlug(articleSlug) : undefined;

  if (article) {
    const otherArticles = CAREER_ARTICLES.filter(a => a.slug !== article.slug).slice(0, 4);

    return (
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              <button onClick={() => onNavigate('/')} className="hover:text-teal-700">
                Home
              </button>
              <span>/</span>
              <button onClick={() => onNavigate('/career-advice')} className="hover:text-teal-700">
                Career Advice
              </button>
              <span>/</span>
              <span className="text-slate-800 font-semibold truncate max-w-xs">{article.title}</span>
            </nav>

            <button
              onClick={() => onNavigate('/career-advice')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Career Articles
            </button>
          </div>

          <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-7">
            <header className="space-y-3 pb-6 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span className="font-bold text-teal-700 uppercase tracking-wider">{article.topic}</span>
                <span>·</span>
                <span>{article.editorialAttribution}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {article.readingTime}
                </span>
                <span>·</span>
                <span>Updated {article.updatedDate}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {article.title}
              </h1>

              <p className="text-base text-slate-600 leading-relaxed">
                {article.summary}
              </p>
            </header>

            {/* Key Takeaways */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Key Takeaways
              </h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {article.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Editorial Sections */}
            <div className="space-y-7">
              {article.sections.map((section, idx) => (
                <section key={idx} className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-sm sm:text-base text-slate-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2 pl-1 pt-1 text-sm text-slate-700">
                      {section.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {article.relatedCountrySlug && (
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ready to explore current opportunities?</h3>
                  <p className="text-xs text-slate-600">
                    View active direct-employer vacancies in this market on Gulfaro.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(`/country/${article.relatedCountrySlug}`)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-teal-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors self-start"
                >
                  Browse Country Vacancies <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </article>

          <AdBanner type="leaderboard" />

          {/* More Guides */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">More Career Advice & Interview Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherArticles.map(other => (
                <article
                  key={other.slug}
                  onClick={() => onNavigate(`/career-advice/${other.slug}`)}
                  className="bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-5 cursor-pointer transition-colors space-y-2"
                >
                  <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    {other.topic} · {other.readingTime}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{other.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{other.summary}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Main Career Advice Hub (/career-advice)
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <section className="bg-slate-950 text-white border-b border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
              <BookOpen className="w-4 h-4" />
              <span>Gulfaro Career Resources</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              GCC Career Advice, CV Guides & Interview Preparation
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Original, practical career articles prepared for professionals pursuing opportunities in Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-800 aspect-[16/9] bg-slate-900">
              <img
                src={gccMeetingImg}
                alt="Professionals discussing career opportunities in the Gulf"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* All 7 Original Articles */}
        <section className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Featured Career Guides ({CAREER_ARTICLES.length})
            </h2>
            <span className="text-xs text-slate-500">Published by Gulfaro Career Editorial Guide</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAREER_ARTICLES.map(art => (
              <article
                key={art.slug}
                onClick={() => onNavigate(`/career-advice/${art.slug}`)}
                className="bg-white border border-slate-200 hover:border-teal-600 rounded-2xl p-6 cursor-pointer transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-teal-700">{art.topic}</span>
                    <span>·</span>
                    <span>{art.readingTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{art.editorialAttribution}</span>
                  <span className="font-bold text-teal-700 inline-flex items-center gap-1">
                    Read Guide <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <AdBanner type="leaderboard" />

        {/* Dedicated CV & Interview Prep Checklist */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <FileText className="w-4 h-4" />
              <span>CV Writing Essentials</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Preparing Your GCC CV</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Employers prefer direct, structured CVs under two pages. Include your current GCC country or relocation availability, measurable operational results, and any professional certifications (SCE, SCFHS, NEBOSH, ACCA) near the top.
            </p>
            <button
              onClick={() => onNavigate('/career-advice/how-to-prepare-a-professional-cv')}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
            >
              Read Full CV Writing Guide <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Interview Readiness</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Before Your Hiring Conversation</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Confirm whether the organization operates on a Sunday–Thursday or Monday–Friday schedule, prepare clear salary expectations in local currency (SAR, AED, QAR, KWD, BHD, OMR), and review official contract rules before accepting an offer.
            </p>
            <button
              onClick={() => onNavigate('/career-advice/common-interview-questions-and-answers')}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
            >
              Review Common Interview Questions <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
