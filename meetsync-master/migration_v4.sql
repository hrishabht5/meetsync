-- Migration V4
-- Add allow_double_booking setting to availability_settings

ALTER TABLE availability_settings ADD COLUMN allow_double_booking BOOLEAN DEFAULT FALSE;
