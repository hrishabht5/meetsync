-- ═══════════════════════════════════════════════════════════
--  Migration v14 — Enable RLS on all public tables
--  Run in: Supabase Dashboard → SQL Editor → New Query
--
--  WHY: Supabase exposes every public table via the PostgREST
--  API. Without RLS, any request using the anon key can read
--  or write any row. The backend uses service_role which
--  bypasses RLS automatically — enabling RLS here does NOT
--  break any backend functionality.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Enable RLS on tables that were missing it ─────────

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- ── 2. Create waitlist table if not already present ──────
-- (The waitlist table is used by the backend but has no prior
-- migration — this makes it reproducible and adds RLS.)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ── 3. Lock down every table with deny-all policies ──────
--
-- No policies = no anon/authenticated access via PostgREST.
-- The backend service_role key bypasses these policies entirely
-- so all existing API behaviour is unchanged.
--
-- Policy naming convention: {table}_{role}_{action}
-- These are intentionally restrictive — add explicit policies
-- only if you later expose Supabase Auth to end users.

-- users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_deny_all'
  ) THEN
    CREATE POLICY users_deny_all ON public.users AS RESTRICTIVE
      USING (false);
  END IF;
END $$;

-- schema_migrations (internal — never expose via API)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schema_migrations' AND policyname = 'schema_migrations_deny_all'
  ) THEN
    CREATE POLICY schema_migrations_deny_all ON public.schema_migrations AS RESTRICTIVE
      USING (false);
  END IF;
END $$;

-- waitlist (write-only via backend; no direct PostgREST reads)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'waitlist_deny_all'
  ) THEN
    CREATE POLICY waitlist_deny_all ON public.waitlist AS RESTRICTIVE
      USING (false);
  END IF;
END $$;

-- ── 4. Record this migration ─────────────────────────────
INSERT INTO public.schema_migrations (version, description)
VALUES ('v14', 'Enable RLS on users, schema_migrations, waitlist')
ON CONFLICT (version) DO NOTHING;
