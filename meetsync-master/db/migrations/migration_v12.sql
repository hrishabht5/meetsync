-- ═══════════════════════════════════════════════════════════
--  Migration v12 — P3 Cleanup Fixes
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── Fix 1: Transactional account deletion ────────────────
-- Replaces 10 sequential DELETE calls in the application layer.
-- All tables are wiped in a single transaction — a crash mid-way
-- cannot leave orphaned rows.
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM bookings             WHERE user_id = target_user_id;
  DELETE FROM one_time_links       WHERE user_id = target_user_id;
  DELETE FROM permanent_links      WHERE user_id = target_user_id;
  DELETE FROM availability_overrides WHERE user_id = target_user_id;
  DELETE FROM availability_settings  WHERE user_id = target_user_id;
  DELETE FROM api_keys             WHERE user_id = target_user_id;
  DELETE FROM webhooks             WHERE user_id = target_user_id;
  DELETE FROM google_tokens        WHERE user_id = target_user_id;
  DELETE FROM user_profiles        WHERE user_id = target_user_id;
  DELETE FROM users                WHERE id      = target_user_id;
END;
$$;

-- ── Fix 2: webhook_logs TTL index ────────────────────────
-- Enables efficient deletion of old logs by created_at.
-- Run a nightly cleanup in Supabase's pg_cron (or any cron job):
--
--   DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '90 days';
--
-- The index below makes that DELETE fast even on large tables.
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
  ON webhook_logs (created_at);

-- Optional: if pg_cron is enabled in your Supabase project, uncomment:
-- SELECT cron.schedule(
--   'prune-webhook-logs',
--   '0 3 * * *',   -- 3 AM UTC daily
--   $$DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );
