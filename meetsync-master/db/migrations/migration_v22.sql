-- ═══════════════════════════════════════════════════════════
--  Migration v22 — DB-level uniqueness on (user_id, scheduled_at)
--
--  The application-layer double-booking guard (SELECT … neq cancelled
--  followed by INSERT) has a TOCTOU race: two concurrent requests can
--  both pass the SELECT and both successfully INSERT a booking for the
--  same host + time slot.
--
--  This partial unique index makes the database the final authority.
--  The INSERT will raise a 23505 unique-violation which the booking
--  router already converts to an HTTP 409 response.
-- ═══════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double
ON bookings (user_id, scheduled_at)
WHERE status != 'cancelled';
