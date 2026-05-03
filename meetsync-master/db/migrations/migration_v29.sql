-- migration_v29: Add deny-all RLS policies for anon and authenticated roles.
--
-- RLS was enabled on all tables but no policies were defined, leaving the
-- anon/authenticated roles unrestricted at the DB layer. The backend always
-- uses the service_role key which bypasses RLS, so these policies add a
-- defense-in-depth layer without affecting any existing behaviour.
--
-- Run this in: Supabase Dashboard → SQL Editor

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'user_profiles',
    'google_tokens',
    'bookings',
    'one_time_links',
    'permanent_links',
    'availability_settings',
    'availability_overrides',
    'webhooks',
    'webhook_logs',
    'api_keys',
    'waitlist',
    'custom_domains',
    'password_reset_tokens'
  ] LOOP
    -- Skip if the table doesn't exist yet (graceful for fresh installs)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND schemaname = 'public') THEN
      EXECUTE format(
        'CREATE POLICY deny_anon ON %I FOR ALL TO anon USING (false)', tbl
      );
      EXECUTE format(
        'CREATE POLICY deny_authenticated ON %I FOR ALL TO authenticated USING (false)', tbl
      );
    END IF;
  END LOOP;
END $$;
