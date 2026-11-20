import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText
} from 'lucide-react';
import gccProfessionalImg from '../assets/images/gcc_working_professional_1793920056504.jpg';

interface HomepageEditorialSectionsProps {
  onNavigatePath: (path: string) => void;
}

export const HomepageEditorialSections: React.FC<HomepageEditorialSectionsProps> = ({
  onNavigatePath
}) => {
  return (
    <section className="py-10 sm:py-12 bg-white border-t border-slate-200">
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
  );
};
