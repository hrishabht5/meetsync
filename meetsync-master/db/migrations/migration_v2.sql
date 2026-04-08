-- ============================================================
-- MeetSync V2 Migration: Custom Fields & Shift-Based Availability
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================

-- 1. Add custom_fields (JSONB) to one_time_links
--    Stores an array like: [{"label":"Company","type":"text","required":true}, ...]
ALTER TABLE one_time_links
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- 2. Add custom_answers (JSONB) to bookings
--    Stores the guest's answers like: {"Company":"Acme Inc","Role":"CTO"}
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

-- 3. Add daily_shifts (JSONB) to availability_settings
--    Stores an array of time strings like: ["11:30","12:00","16:00"]
ALTER TABLE availability_settings
  ADD COLUMN IF NOT EXISTS daily_shifts JSONB DEFAULT '["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"]'::jsonb;

-- 4. Create availability_overrides table
--    Allows the host to block out specific dates entirely.
CREATE TABLE IF NOT EXISTS availability_overrides (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'default_host',
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,         -- false = blocked out
  custom_shifts JSONB DEFAULT NULL,                    -- optional: override shifts for this day
  reason      TEXT DEFAULT NULL,                       -- optional note like "Holiday"
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, override_date)
);
