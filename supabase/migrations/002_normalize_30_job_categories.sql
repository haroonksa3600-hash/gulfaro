-- =========================================================================
-- Gulfaro Migration 002: Unified 30 Job Categories Preservation & Defaults
-- Ensures new and existing job records safely support all 30 canonical
-- categories while preserving all existing job records and data.
-- =========================================================================

ALTER TABLE public.jobs
  ALTER COLUMN category SET DEFAULT 'other-jobs';

-- Safely assign 'other-jobs' ONLY to existing records missing a category.
UPDATE public.jobs
SET category = 'other-jobs',
    updated_at = NOW()
WHERE category IS NULL OR BTRIM(category) = '';

CREATE INDEX IF NOT EXISTS idx_jobs_category_status ON public.jobs (category, status);
