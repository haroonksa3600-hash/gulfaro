-- =========================================================================
-- Gulfaro Production PostgreSQL Schema (Supabase)
-- Preserves Custom Auth, 5-Digit Access Key PIN, Email Verification, Jobs,
-- and Isolated Super Admin RBAC / 2FA / CMS / Audit Architecture.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Core Marketplace Users (Job Seekers, Employers, Legacy Admin Link)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED UNIQUE,
  phone TEXT,
  phone_digits TEXT,
  whatsapp TEXT,
  role TEXT NOT NULL CHECK (role IN ('job_seeker', 'employer', 'admin')),
  country TEXT NOT NULL DEFAULT 'saudi-arabia',
  city TEXT NOT NULL DEFAULT 'Riyadh',
  password_hash TEXT NOT NULL,
  access_key_hash TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_until TIMESTAMPTZ NULL,
  login_failed_attempts INTEGER NOT NULL DEFAULT 0,
  login_lockout_until TIMESTAMPTZ NULL,
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'deactivated', 'pending_deletion')),
  suspension_reason TEXT,
  posting_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured_employer BOOLEAN NOT NULL DEFAULT FALSE,
  force_logout_before BIGINT NULL,
  last_login_at TIMESTAMPTZ NULL,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);
CREATE INDEX IF NOT EXISTS idx_users_phone_digits ON public.users (phone_digits) WHERE phone_digits IS NOT NULL AND phone_digits <> '';
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users (country);

-- -------------------------------------------------------------------------
-- 2. Employer & Job Seeker Normalized Profile Extensions (1 : 0..1)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  hiring_org_name TEXT,
  company_type TEXT NOT NULL DEFAULT 'direct-employer',
  headline TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_seeker_profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  professional_title TEXT,
  headline TEXT,
  bio TEXT,
  iqama_status TEXT,
  experience_years TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 3. Job Classifieds (Direct Email & Phone Application Policy)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  user_id TEXT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_type TEXT NOT NULL DEFAULT 'direct-employer',
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full-time',
  vacancies_count INTEGER NOT NULL DEFAULT 1,
  work_mode TEXT NOT NULL DEFAULT 'on-site' CHECK (work_mode IN ('on-site', 'hybrid', 'remote')),
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_display TEXT,
  salary_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  salary_period TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_period IN ('monthly', 'yearly', 'daily')),
  description TEXT NOT NULL,
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  walk_in_interview JSONB NULL,
  how_to_apply TEXT NOT NULL DEFAULT 'email' CHECK (how_to_apply = 'email'),
  iqama_requirement TEXT NOT NULL DEFAULT 'any',
  driving_license_required BOOLEAN NOT NULL DEFAULT FALSE,
  gender_preference TEXT NOT NULL DEFAULT 'any' CHECK (gender_preference IN ('any', 'male', 'female')),
  education_level TEXT NOT NULL DEFAULT 'Not specified',
  experience_level TEXT NOT NULL DEFAULT '1-3-years',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_whatsapp TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  is_employer_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'rejected', 'hidden', 'closed')),
  package_type TEXT NOT NULL DEFAULT 'standard' CHECK (package_type IN ('standard', 'featured', 'sponsored')),
  rejection_reason TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  inquiries_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_country_posted ON public.jobs (status, country, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_slug_lower ON public.jobs (LOWER(slug));

-- -------------------------------------------------------------------------
-- 4. Custom Authentication Verification & Password Reset Tokens
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email_lower ON public.verification_codes (LOWER(email));

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  token_plain TEXT,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email_lower ON public.password_reset_tokens (LOWER(email));

-- -------------------------------------------------------------------------
-- 5. Isolated Super Admin Accounts, Sessions & Reset Tokens
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'super_admin', 'moderator', 'support', 'content_manager')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_method TEXT NOT NULL DEFAULT 'totp' CHECK (two_factor_method IN ('totp', 'email')),
  two_factor_secret TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_until TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username_lower ON public.admins (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_admins_email_lower ON public.admins (LOWER(email));

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  admin_id TEXT NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip TEXT,
  user_agent TEXT,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON public.admin_sessions (revoked, expires_at);

CREATE TABLE IF NOT EXISTS public.admin_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 6. Trust & Safety Reports, Audit Logs, Security Logs, Trash & Settings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('job', 'employer', 'user')),
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_owner_id TEXT,
  reason TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  details TEXT NOT NULL DEFAULT '',
  reporter_name TEXT NOT NULL DEFAULT 'Anonymous Visitor',
  reporter_email TEXT NOT NULL DEFAULT '',
  reporter_ip TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  action_taken TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.auth_history (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'employer', 'admin')),
  actor_id TEXT,
  email_or_username TEXT NOT NULL,
  event TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  reason TEXT,
  suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_history_created ON public.auth_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_history_email_lower ON public.auth_history (LOWER(email_or_username));

CREATE TABLE IF NOT EXISTS public.email_logs (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  message_id TEXT,
  error TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_errors (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'security')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_errors_created ON public.system_errors (created_at DESC);

CREATE TABLE IF NOT EXISTS public.trash_items (
  trash_id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('user', 'job', 'report')),
  original_id TEXT NOT NULL,
  label TEXT NOT NULL,
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON public.trash_items (deleted_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historical read-only archive for Super Admin overview KPIs (online applications disabled)
CREATE TABLE IF NOT EXISTS public.legacy_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  applicant_user_id TEXT,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL DEFAULT '',
  applicant_whatsapp TEXT NOT NULL DEFAULT '',
  current_country TEXT NOT NULL DEFAULT 'saudi-arabia',
  current_city TEXT NOT NULL DEFAULT 'Riyadh',
  iqama_status TEXT NOT NULL DEFAULT 'any',
  years_experience TEXT NOT NULL DEFAULT '',
  cover_note TEXT NOT NULL DEFAULT '',
  resume_file_name TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'shortlisted', 'rejected'))
);

-- -------------------------------------------------------------------------
-- 7. Strict Row Level Security (Default Deny to Browser/Anon/Authenticated)
-- All application reads & writes flow exclusively through the Express server.
-- -------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_applications ENABLE ROW LEVEL SECURITY;
