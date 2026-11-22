-- =========================================================================
-- Gulfaro Migration 004:
--   1. Enforce email_verified DEFAULT FALSE for future registrations only
--      (NEVER overwrites existing verified users or existing user data)
--   2. Remove legacy 5-digit Access Key columns from public.users
--      (Preserves login_failed_attempts & login_lockout_until for login defense)
--   3. Create hashed email_verification_tokens table with strict RLS
--   4. Harden password_reset_tokens (drop plaintext column, add user_id + index)
--   5. Create database-backed auth_rate_limits table with strict RLS
-- =========================================================================

BEGIN;

-- 1. Set default verification state for NEW registrations only (existing rows untouched)
ALTER TABLE public.users
  ALTER COLUMN email_verified SET DEFAULT FALSE;

-- 2. Drop deprecated Access Key columns while retaining password login lockout columns
ALTER TABLE public.users
  DROP COLUMN IF EXISTS access_key_hash,
  DROP COLUMN IF EXISTS failed_attempts,
  DROP COLUMN IF EXISTS lockout_until;

-- 3. Dedicated Email Verification Tokens table (SHA-256 token_hash only; 24h expiry)
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email_lower
  ON public.email_verification_tokens (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON public.email_verification_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_active
  ON public.email_verification_tokens (used, expires_at);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Harden password_reset_tokens (remove plaintext column, associate user_id, index active tokens)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'password_reset_tokens'
      AND column_name = 'token_plain'
  ) THEN
    UPDATE public.password_reset_tokens
      SET token_plain = NULL
      WHERE token_plain IS NOT NULL;

    ALTER TABLE public.password_reset_tokens
      DROP COLUMN token_plain;
  END IF;
END $$;

ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email_used
  ON public.password_reset_tokens (LOWER(email), used);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON public.password_reset_tokens (user_id);

-- 5. Persistent database-backed rate limits for registration, verification resend & password reset
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window
  ON public.auth_rate_limits (window_started_at);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

COMMIT;
