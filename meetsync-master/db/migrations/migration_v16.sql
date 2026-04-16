-- ═══════════════════════════════════════════════════════════
--  Migration v16 — Booking control fields
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

ALTER TABLE availability_settings
  ADD COLUMN IF NOT EXISTS min_notice_hours     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_days_ahead       INTEGER,
  ADD COLUMN IF NOT EXISTS max_bookings_per_day INTEGER;

-- 0 = no minimum notice (existing users unaffected)
-- NULL = unlimited for both window and daily cap

INSERT INTO public.schema_migrations (version, description)
VALUES ('v16', 'Add min_notice_hours, max_days_ahead, max_bookings_per_day to availability_settings')
ON CONFLICT (version) DO NOTHING;
