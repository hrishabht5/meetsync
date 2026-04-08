-- migration_v5.sql — Permanent Links + Public Profile
-- Run this after migration_v4.sql

-- User profiles (one per authenticated user)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      TEXT PRIMARY KEY REFERENCES google_tokens(user_id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio          TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Owners can do everything; anyone can read (public profiles)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'profiles_owner_all'
  ) THEN
    CREATE POLICY "profiles_owner_all" ON user_profiles
      FOR ALL USING (user_id = current_user);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'profiles_public_read'
  ) THEN
    CREATE POLICY "profiles_public_read" ON user_profiles
      FOR SELECT USING (true);
  END IF;
END $$;

-- Permanent (reusable) booking links
CREATE TABLE IF NOT EXISTS permanent_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES google_tokens(user_id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  event_type    TEXT NOT NULL DEFAULT 'Google Meet',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  custom_fields JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

ALTER TABLE permanent_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'permanent_links' AND policyname = 'plinks_owner_all'
  ) THEN
    CREATE POLICY "plinks_owner_all" ON permanent_links
      FOR ALL USING (user_id = current_user);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'permanent_links' AND policyname = 'plinks_public_read'
  ) THEN
    CREATE POLICY "plinks_public_read" ON permanent_links
      FOR SELECT USING (true);
  END IF;
END $$;

-- Track which permanent link a booking came from (nullable — OTL bookings leave this NULL)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS permanent_link_id UUID REFERENCES permanent_links(id);
