-- H-1 security: add encrypted columns for Google OAuth tokens
-- The legacy access_token / refresh_token columns are kept as a read-fallback
-- for existing rows until a data-migration populates the _enc columns.

ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS access_token_enc  TEXT;
ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS refresh_token_enc TEXT;
