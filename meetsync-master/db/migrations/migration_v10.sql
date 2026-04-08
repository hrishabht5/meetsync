-- ═══════════════════════════════════════════════════════════
--  Migration v10 — Booking Page Background Image
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

ALTER TABLE one_time_links
  ADD COLUMN IF NOT EXISTS bg_image_url TEXT;

ALTER TABLE permanent_links
  ADD COLUMN IF NOT EXISTS bg_image_url TEXT;
