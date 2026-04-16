-- ═══════════════════════════════════════════════════════════
--  Migration v15 — Fix mutable search_path on SECURITY DEFINER functions
--  Run in: Supabase Dashboard → SQL Editor → New Query
--
--  WHY: Functions with SECURITY DEFINER run with the privileges
--  of the function owner (postgres). Without a fixed search_path,
--  an attacker who can create objects in any schema could shadow
--  system functions and escalate privileges.
--
--  FIX: Recreate both functions with SET search_path = public
--  so the execution context is pinned and unambiguous.
-- ═══════════════════════════════════════════════════════════

-- ── 1. delete_user_account ───────────────────────────────
-- Wipes all data for a user in a single transaction (GDPR erasure).
-- Identical logic to v12 — only adds SET search_path = public.
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bookings              WHERE user_id = target_user_id;
  DELETE FROM public.one_time_links        WHERE user_id = target_user_id;
  DELETE FROM public.permanent_links       WHERE user_id = target_user_id;
  DELETE FROM public.availability_overrides WHERE user_id = target_user_id;
  DELETE FROM public.availability_settings  WHERE user_id = target_user_id;
  DELETE FROM public.api_keys              WHERE user_id = target_user_id;
  DELETE FROM public.webhooks              WHERE user_id = target_user_id;
  DELETE FROM public.google_tokens         WHERE user_id = target_user_id;
  DELETE FROM public.user_profiles         WHERE user_id = target_user_id;
  DELETE FROM public.users                 WHERE id      = target_user_id;
END;
$$;

-- ── 2. update_updated_at_column ──────────────────────────
-- Trigger function that stamps updated_at = NOW() on any UPDATE.
-- Used by tables that need an auto-maintained updated_at column.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 3. Record this migration ─────────────────────────────
INSERT INTO public.schema_migrations (version, description)
VALUES ('v15', 'Fix mutable search_path on SECURITY DEFINER functions')
ON CONFLICT (version) DO NOTHING;
