-- ═══════════════════════════════════════════════════════════
--  Migration v8 — Meeting Outcome Tracking
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Add outcome columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS outcome TEXT
    CHECK (outcome IN ('completed', 'no_show', 'cancelled_by_guest'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS outcome_recorded_at TIMESTAMPTZ;

-- 2. Index for outcome-filtered queries in analytics
CREATE INDEX IF NOT EXISTS idx_bookings_outcome
  ON bookings (outcome)
  WHERE outcome IS NOT NULL;
