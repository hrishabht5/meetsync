-- Migration V6
-- Feature 1: Auth Split + Calendar Connection Control
-- Feature 2: Custom Meeting Title (columns only — logic in app)

-- ── 1. Separate identity table ────────────────────────────────────────────────
-- Decouples account identity from Google Calendar tokens.
-- Google-login users: id = google_sub (matches existing google_tokens.user_id)
-- Email/password users: id = 'usr_' + 16-char hex

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT,                    -- NULL for Google-only accounts
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Back-fill users rows for all existing Google accounts.
-- Email is unknown at migration time; will be overwritten on next login.
INSERT INTO users (id, email)
SELECT user_id, user_id || '@placeholder.meetsync'
FROM google_tokens
ON CONFLICT (id) DO NOTHING;

-- ── 2. Preferred calendar ─────────────────────────────────────────────────────
-- Lets users choose which Google Calendar MeetSync creates events in.
-- Defaults to 'primary' (their main calendar) — no behaviour change for existing users.

ALTER TABLE google_tokens
    ADD COLUMN IF NOT EXISTS preferred_calendar_id TEXT DEFAULT 'primary';

-- ── 3. Custom meeting title ───────────────────────────────────────────────────
-- Optional per-link title that overrides event_type in the Google Calendar
-- event summary, booking page heading, and webhook payload.

ALTER TABLE one_time_links
    ADD COLUMN IF NOT EXISTS custom_title TEXT;

ALTER TABLE permanent_links
    ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- Store the resolved title on the booking so webhook/history is self-contained.
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS custom_title TEXT;
