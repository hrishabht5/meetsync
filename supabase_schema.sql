-- ═══════════════════════════════════════════════════════════
--  MeetSync — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. Google OAuth Tokens ────────────────────────────────
CREATE TABLE IF NOT EXISTS google_tokens (
    user_id         TEXT PRIMARY KEY,
    access_token    TEXT        NOT NULL,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Availability Settings ──────────────────────────────
CREATE TABLE IF NOT EXISTS availability_settings (
    user_id         TEXT PRIMARY KEY,
    working_days    TEXT[]      DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
    -- Shift times guests are allowed to book (e.g. ["09:00","09:30",...])
    daily_shifts    TEXT[]      DEFAULT ARRAY[
        '09:00','09:30','10:00','10:30','11:00','11:30',
        '12:00','14:00','14:30','15:00','15:30',
        '16:00','16:30','17:00','17:30'
    ],
    -- Kept for backward compatibility (older versions used these)
    start_time      TEXT        DEFAULT '09:00',
    end_time        TEXT        DEFAULT '18:00',
    slot_duration   INTEGER     DEFAULT 30,
    buffer_minutes  INTEGER     DEFAULT 15,
    timezone        TEXT        DEFAULT 'Asia/Kolkata',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- If this table already existed without `daily_shifts`, add it.
ALTER TABLE availability_settings
  ADD COLUMN IF NOT EXISTS daily_shifts TEXT[]
  DEFAULT ARRAY[
      '09:00','09:30','10:00','10:30','11:00','11:30',
      '12:00','14:00','14:30','15:00','15:30',
      '16:00','16:30','17:00','17:30'
  ];


-- ── 3. One-Time Links ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS one_time_links (
    id              TEXT PRIMARY KEY,               -- e.g. lnk_a3f8x9qr
    user_id         TEXT        NOT NULL,
    event_type      TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','used','expired','revoked')),
    expires_at      TIMESTAMPTZ,                    -- NULL = never expires
    used_at         TIMESTAMPTZ,
    booking_id      TEXT,                           -- set when status = used
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otl_user    ON one_time_links (user_id);
CREATE INDEX IF NOT EXISTS idx_otl_status  ON one_time_links (status);


-- ── 4. Bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT        NOT NULL,
    guest_name          TEXT        NOT NULL,
    guest_email         TEXT        NOT NULL,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    event_type          TEXT        NOT NULL,
    notes               TEXT,
    status              TEXT        NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('pending','confirmed','cancelled')),
    meet_link           TEXT,
    calendar_event_id   TEXT,
    one_time_link_id    TEXT REFERENCES one_time_links(id),
    cancellation_note   TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user        ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled   ON bookings (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_email       ON bookings (guest_email);


-- ── 5. Webhook Endpoints ──────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT        NOT NULL,
    url         TEXT        NOT NULL,
    secret      TEXT,                               -- for HMAC signing
    events      TEXT[]      NOT NULL,               -- ['booking.created', ...]
    is_active   BOOLEAN     DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks (user_id);


-- ── 6. Webhook Delivery Logs ──────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id  UUID        REFERENCES webhooks(id) ON DELETE CASCADE,
    event       TEXT        NOT NULL,
    payload     JSONB,
    status_code INTEGER,
    success     BOOLEAN     DEFAULT FALSE,
    error       TEXT,
    attempts    INTEGER     DEFAULT 1,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whlogs_webhook ON webhook_logs (webhook_id);
CREATE INDEX IF NOT EXISTS idx_whlogs_created ON webhook_logs (created_at DESC);


-- ═══════════════════════════════════════════════════════════
--  Row Level Security (RLS)
--  Using service_role key from backend bypasses RLS automatically.
--  Enable RLS anyway to protect direct anon access.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE google_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings  ENABLE ROW LEVEL SECURITY;
-- Availability date overrides (block out specific dates / custom shifts)
CREATE TABLE IF NOT EXISTS availability_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    override_date  DATE NOT NULL, -- "YYYY-MM-DD"
    is_available    BOOLEAN NOT NULL DEFAULT FALSE,
    custom_shifts   JSONB,         -- optional custom shift times for that date
    reason          TEXT,          -- optional explanation
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, override_date)
);
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs           ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — no explicit policies needed for backend.
-- Add policies here if you later add Supabase Auth for end-users.


-- ═══════════════════════════════════════════════════════════
--  Seed default availability for the host
-- ═══════════════════════════════════════════════════════════
INSERT INTO availability_settings (user_id, working_days, start_time, end_time, slot_duration, buffer_minutes, timezone)
VALUES ('default_host', ARRAY['Mon','Tue','Wed','Thu','Fri'], '09:00', '18:00', 30, 15, 'Asia/Kolkata')
ON CONFLICT (user_id) DO NOTHING;
