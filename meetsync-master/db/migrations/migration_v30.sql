-- migration_v30: Encrypt Google OAuth tokens at rest.
--
-- Adds encrypted columns (access_token_enc, refresh_token_enc) alongside the
-- existing plaintext columns. After running this migration, deploy the updated
-- google_calendar.py that reads/writes the _enc columns. Then run the
-- scripts/migrate_oauth_tokens.py script to backfill existing rows.
-- Finally, drop the plaintext columns in migration_v30b once all rows are migrated.
--
-- Run this in: Supabase Dashboard → SQL Editor

ALTER TABLE google_tokens
  ADD COLUMN IF NOT EXISTS access_token_enc  TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_enc TEXT;

COMMENT ON COLUMN google_tokens.access_token_enc  IS 'AES-256-GCM encrypted access token (hex). Replaces access_token.';
COMMENT ON COLUMN google_tokens.refresh_token_enc IS 'AES-256-GCM encrypted refresh token (hex). Replaces refresh_token.';
