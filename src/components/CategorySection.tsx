import React from 'react';
import { JobAd } from '../types/job';
import {
  PUBLIC_JOB_CATEGORIES,
  isJobActiveAndUnexpired,
  jobMatchesPublicCategory
} from '../data/gccDirectory';
import {
  Calculator,
  ClipboardList,
  Compass,
  HardHat,
  Stethoscope,
  Cpu,
  TrendingUp,
  Megaphone,
  Users,
  GraduationCap,
  Hotel,
  Utensils,
  Headphones,
  Car,
  Truck,
  ShieldCheck,
  Flame,
  Factory,
  ShoppingBag,
  Sparkles,
  Wrench,
  Ruler,
  Scale,
  Building2,
  ClipboardCheck,
  BadgeCheck,
  Palette,
  Radio,
  Sprout,
  Briefcase,
  ArrowRight,
  LucideIcon
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Calculator,
  ClipboardList,
  Compass,
  HardHat,
  Stethoscope,
  Cpu,
  TrendingUp,
  Megaphone,
  Users,
  GraduationCap,
  Hotel,
  Utensils,
  Headphones,
  Car,
  Truck,
  ShieldCheck,
  Flame,
  Factory,
  ShoppingBag,
  Sparkles,
  Wrench,
  Ruler,
  Scale,
  Building2,
  ClipboardCheck,
  BadgeCheck,
  Palette,
  Radio,
  Sprout,
  Briefcase
};

interface CategorySectionProps {
  jobs: JobAd[];
  selectedCategory?: string;
  onSelectCategory: (categorySlug: string) => void;
  onOpenCategoryPage?: (slug: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  jobs,
  selectedCategory,
  onSelectCategory,
  onOpenCategoryPage
}) => {
  const activeJobs = jobs.filter(j => isJobActiveAndUnexpired(j));

  return (
    <section className="py-10 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-200 gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Employment Sectors
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Browse Jobs by Employment Category
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button
                onClick={() => onSelectCategory('')}
                className="text-xs text-teal-700 hover:underline font-semibold"
              >
                Clear Category Filter
              </button>
            )}
            {onOpenCategoryPage && (
              <button
                onClick={() => onOpenCategoryPage('')}
                className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                All Categories <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {PUBLIC_JOB_CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICON_MAP[cat.iconName] || Compass;
            const count = activeJobs.filter(j => jobMatchesPublicCategory(j, cat)).length;
            const isSelected = selectedCategory === cat.slug;

            return (
              <button
                key={cat.slug}
                onClick={() => {
                  if (onOpenCategoryPage) {
                    onOpenCategoryPage(cat.slug);
                  } else {
                    onSelectCategory(isSelected ? '' : cat.slug);
                  }
                }}
                className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-colors group ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-teal-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                    {count}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                    {cat.summary}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
