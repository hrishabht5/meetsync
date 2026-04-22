-- ═══════════════════════════════════════════════════════════
--  Migration v21 — Distributed rate-limit windows
--
--  Replaces in-memory per-process defaultdict with a shared
--  Supabase table so limits survive across serverless cold
--  starts and multi-process deployments.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limit_windows (
    key        TEXT    NOT NULL,
    window_ts  BIGINT  NOT NULL,  -- floor(epoch_seconds / 60) = current UTC minute
    count      INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (key, window_ts)
);

-- Enables fast cleanup of stale rows
CREATE INDEX IF NOT EXISTS idx_rl_updated ON rate_limit_windows (updated_at);

-- ── Atomic increment + check ──────────────────────────────
-- Returns TRUE  → request is within limit (allow)
-- Returns FALSE → limit exceeded (block with 429)
--
-- Uses ON CONFLICT DO UPDATE so the INSERT + increment is a
-- single atomic operation with no TOCTOU gap.
-- Probabilistic cleanup (1 % of calls) keeps the table small.
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key   TEXT,
    p_limit INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_window BIGINT;
    v_count  INTEGER;
BEGIN
    -- 1-minute sliding window: every 60 seconds the key resets
    v_window := EXTRACT(EPOCH FROM NOW())::BIGINT / 60;

    INSERT INTO rate_limit_windows (key, window_ts, count)
    VALUES (p_key, v_window, 1)
    ON CONFLICT (key, window_ts) DO UPDATE
        SET count      = rate_limit_windows.count + 1,
            updated_at = NOW()
    RETURNING count INTO v_count;

    -- Opportunistic GC: ~1 % of calls prune windows older than 5 min
    IF random() < 0.01 THEN
        DELETE FROM rate_limit_windows
        WHERE updated_at < NOW() - INTERVAL '5 minutes';
    END IF;

    RETURN v_count <= p_limit;
END;
$$;
