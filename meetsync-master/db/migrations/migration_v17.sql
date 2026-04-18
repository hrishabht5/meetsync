-- Custom Domains
-- One domain per user; domain must be globally unique.
CREATE TABLE IF NOT EXISTS custom_domains (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain       TEXT        NOT NULL,
    verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT custom_domains_domain_key  UNIQUE (domain),
    CONSTRAINT custom_domains_user_key    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_domain  ON custom_domains (domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains (user_id);
