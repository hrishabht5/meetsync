-- ═══════════════════════════════════════════════════════════
--  Migration v9 — Booking Page Customization
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. One-time links: add customization columns
ALTER TABLE one_time_links
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS accent_color     TEXT;

-- 2. Permanent links: add the same customization columns
ALTER TABLE permanent_links
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS accent_color     TEXT;
