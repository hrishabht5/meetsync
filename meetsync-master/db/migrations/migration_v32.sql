-- migration_v32: Drop allow_double_booking column (dead code removal).
--
-- The allow_double_booking flag was never implemented in the booking router —
-- the conflict guard runs unconditionally regardless of its value. Keeping the
-- column creates a false expectation for users who set it to true.
-- The corresponding field has been removed from AvailabilitySettings schema.
--
-- Run this in: Supabase Dashboard → SQL Editor

ALTER TABLE availability_settings
  DROP COLUMN IF EXISTS allow_double_booking;
