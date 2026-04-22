-- Password reset tokens: one-hour TTL, single-use, auto-deleted when user is deleted
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash  TEXT        PRIMARY KEY,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);
