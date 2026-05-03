-- migration_v31: Schedule automated purge of webhook delivery logs > 90 days.
--
-- Requires the pg_cron extension (enabled by default on Supabase Pro).
-- To check: SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- To enable: Dashboard → Database → Extensions → pg_cron → Enable
--
-- Run this in: Supabase Dashboard → SQL Editor

SELECT cron.schedule(
  'purge-webhook-logs',
  '0 3 * * *',
  $$DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
);
