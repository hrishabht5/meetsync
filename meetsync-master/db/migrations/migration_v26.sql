-- H-3 security: session_version for post-password-reset session invalidation
-- Default 1 so every existing row starts at version 1 and old cookies are
-- evaluated against version 1 (they will be rejected due to format mismatch).

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 1;
