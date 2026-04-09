-- ═══════════════════════════════════════════════════════════
--  Migration v11 — P0 Security & Integrity Fixes
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── Fix 1: user_profiles FK ──────────────────────────────
-- The original FK pointed to google_tokens(user_id), which
-- broke email/password users who have no google_tokens row.
-- Re-point to users(id) so all auth methods work.
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ── Fix 2: permanent_links FK ────────────────────────────
-- Same issue — re-point to users(id).
ALTER TABLE permanent_links
  DROP CONSTRAINT IF EXISTS permanent_links_user_id_fkey;

ALTER TABLE permanent_links
  ADD CONSTRAINT permanent_links_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ── Fix 3: double-booking unique constraint ───────────────
-- Adds a DB-level guarantee that no two non-cancelled bookings
-- can exist for the same host at the same time.
-- This is the hard safety net that backs the application-layer check.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot
  ON bookings (user_id, scheduled_at)
  WHERE status != 'cancelled';
