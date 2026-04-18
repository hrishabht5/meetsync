-- Profile enhancement: avatar, headline, social links, page customization
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS headline         TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website          TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location         TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cover_image_url  TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bg_image_url     TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS accent_color     TEXT;

-- Per-link control over whether it appears on the public profile page
ALTER TABLE permanent_links ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN NOT NULL DEFAULT TRUE;
