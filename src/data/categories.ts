import { JobCategory } from '../types/job';
import {
  JOB_CATEGORIES as CANONICAL_JOB_CATEGORIES,
  UnifiedJobCategory,
  isValidJobCategoryId,
  resolveJobCategoryId,
  getJobCategoryById,
  getJobCategoryName,
  getSubcategoriesForCategory,
  jobMatchesCategoryFilter
} from '../../shared/jobCategories';

export type { UnifiedJobCategory };

export const JOB_CATEGORIES: (JobCategory & UnifiedJobCategory)[] = CANONICAL_JOB_CATEGORIES;

export {
  isValidJobCategoryId,
  resolveJobCategoryId,
  getJobCategoryById,
  getJobCategoryName,
  getSubcategoriesForCategory,
  jobMatchesCategoryFilter
};
