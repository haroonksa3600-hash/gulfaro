-- =========================================================================
-- Gulfaro Migration 004 Rollback Notes (Safe Schema Reversal Only)
-- Does NOT delete existing user accounts, jobs, or verified email states.
-- =========================================================================

BEGIN;

-- Restore optional Access Key columns only if rolling back to pre-004 code
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS access_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ NULL;

-- Restore legacy plaintext reset column shell if pre-004 code queries it
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS token_plain TEXT;

-- Retain public.email_verification_tokens and public.auth_rate_limits for audit safety
-- (Or drop only after confirming rollback deployment has completed)
-- DROP TABLE IF EXISTS public.auth_rate_limits;
-- DROP TABLE IF EXISTS public.email_verification_tokens;

COMMIT;
