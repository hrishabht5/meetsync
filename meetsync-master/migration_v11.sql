-- Migration v11: Waitlist for DraftMeet pre-launch
CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- RLS: no public read — only service role can query
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
