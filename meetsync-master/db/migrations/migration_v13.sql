-- ═══════════════════════════════════════════════════════════
--  Migration v13 — Migration Tracking + Composite Indexes
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── 1. Migration tracking table ──────────────────────────
-- Lets you verify which migrations have been applied and when.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT        PRIMARY KEY,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

-- Seed with all previously applied migrations so the table
-- reflects the true state of the database from day one.
INSERT INTO schema_migrations (version, description) VALUES
    ('v2',        'Core schema additions'),
    ('v3',        'Schema updates'),
    ('v4',        'Schema updates'),
    ('v5',        'Schema updates'),
    ('v6',        'Schema updates'),
    ('v6_patch',  'v6 patch fixes'),
    ('v7',        'Schema updates'),
    ('v8',        'Schema updates'),
    ('v9',        'Schema updates'),
    ('v10',       'Schema updates'),
    ('v11',       'Schema updates'),
    ('v12',       'P3 cleanup fixes'),
    ('v13',       'Migration tracking + composite indexes')
ON CONFLICT (version) DO NOTHING;

-- ── 2. Composite indexes for common query patterns ────────
-- Booking list queries filter by (user_id, status) together.
-- Without this, Postgres does a sequential scan for hosts
-- with 1000+ bookings.
CREATE INDEX IF NOT EXISTS idx_bookings_user_status
    ON bookings (user_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_scheduled
    ON bookings (user_id, scheduled_at DESC);

-- One-time links: listing by user + status is the hot path.
CREATE INDEX IF NOT EXISTS idx_otl_user_status
    ON one_time_links (user_id, status);

-- ── 3. Enable pg_cron webhook log cleanup (if available) ──
-- Uncomment after enabling pg_cron in Supabase Extensions.
-- Keeps webhook_logs from growing unbounded.
--
-- SELECT cron.schedule(
--     'prune-webhook-logs',
--     '0 3 * * *',  -- daily at 3 AM UTC
--     $$DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );
