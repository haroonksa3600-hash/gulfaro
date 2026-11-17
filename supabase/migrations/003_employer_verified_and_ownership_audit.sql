-- =========================================================================
-- Gulfaro Employer Verified Badge & Ownership Audit Migration (003)
-- 1. Marks all existing registered employer accounts as Verified Employers
--    without modifying job_seeker email_verified status.
-- 2. Marks jobs owned by registered employer/admin accounts as verified.
-- 3. Preserves existing job.user_id ownership untouched (uncertain or missing
--    legacy job ownership is intentionally surfaced in the Admin audit rather
--    than guessed or reassigned).
-- =========================================================================

UPDATE public.users
SET
  email_verified = TRUE,
  email_verified_at = COALESCE(email_verified_at, created_at, NOW()),
  updated_at = NOW()
WHERE role = 'employer'
  AND email_verified IS DISTINCT FROM TRUE;

UPDATE public.jobs AS j
SET
  is_employer_verified = TRUE,
  updated_at = NOW()
FROM public.users AS u
WHERE j.user_id = u.id
  AND u.role IN ('employer', 'admin')
  AND j.is_employer_verified IS DISTINCT FROM TRUE;
