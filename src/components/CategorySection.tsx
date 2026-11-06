import React from 'react';
import { JOB_CATEGORIES } from '../data/categories';
import { JobAd } from '../types/job';
import { 
  HardHat, 
  Cpu, 
  Calculator, 
  Stethoscope, 
  TrendingUp, 
  Building2, 
  Truck, 
  Utensils, 
  Flame, 
  GraduationCap, 
  Headphones, 
  Wrench,
  LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  HardHat,
  Cpu,
  Calculator,
  Stethoscope,
  TrendingUp,
  Building2,
  Truck,
  Utensils,
  Flame,
  GraduationCap,
  Headphones,
  Wrench
};

interface CategorySectionProps {
  jobs: JobAd[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  jobs,
  selectedCategory,
  onSelectCategory
}) => {
  const getCategoryCount = (categoryId: string) => {
    return jobs.filter(j => j.category === categoryId && j.status === 'active').length;
  };

  return (
    <section className="py-8 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 pb-2 border-b border-slate-200 gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-1">
              Employment Sectors
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Top GCC Industry Categories
            </h2>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory('')}
              className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {JOB_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || HardHat;
            const count = getCategoryCount(cat.id);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? '' : cat.id)}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all duration-150 group ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {count}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors line-clamp-1 mb-0.5">
                  {cat.name}
                </h3>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
