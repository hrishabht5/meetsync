-- ═══════════════════════════════════════════════════════════
--  Migration v7 — Guest Self-Serve Booking Management
--  Adds management_token to bookings for secure guest access
-- ═══════════════════════════════════════════════════════════

-- 1. Add management_token column
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS management_token TEXT UNIQUE;

-- 2. Index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_management_token
  ON bookings (management_token)
  WHERE management_token IS NOT NULL;

-- 3. Backfill existing bookings with random tokens
UPDATE bookings
SET management_token = encode(gen_random_bytes(16), 'hex')
WHERE management_token IS NULL;
