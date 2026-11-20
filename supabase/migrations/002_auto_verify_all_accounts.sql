-- =========================================================================
-- Gulfaro Migration 002: Automatic Account Verification System
-- Marks all existing Job Seeker, Employer, and Admin accounts as verified
-- and ensures all future accounts default to email_verified = TRUE.
-- Preserves all user IDs, password hashes, access keys, profiles, and jobs.
-- =========================================================================

ALTER TABLE public.users
  ALTER COLUMN email_verified SET DEFAULT TRUE;

UPDATE public.users
SET email_verified = TRUE,
    email_verified_at = COALESCE(email_verified_at, created_at, NOW()),
    updated_at = NOW()
WHERE role IN ('job_seeker', 'employer', 'admin')
  AND email_verified IS DISTINCT FROM TRUE;

UPDATE public.jobs AS j
SET is_employer_verified = TRUE,
    updated_at = NOW()
FROM public.users AS u
WHERE j.user_id = u.id
  AND u.role IN ('employer', 'admin')
  AND j.is_employer_verified IS DISTINCT FROM TRUE;
