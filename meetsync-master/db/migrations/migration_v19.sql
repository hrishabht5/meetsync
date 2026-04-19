-- Premium: allow admins to remove DraftMeet branding from a user's public pages
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS remove_branding BOOLEAN NOT NULL DEFAULT FALSE;
