-- ═══════════════════════════════════════════════════════════
--  Migration v23 — Encrypt webhook secrets at rest
--
--  Previously the HMAC signing secret was stored as plaintext TEXT.
--  A DB breach would expose all customer signing secrets, letting an
--  attacker forge webhook payloads that pass HMAC verification on
--  customers' servers.
--
--  This migration:
--    1. Renames the plaintext column to secret_enc (BYTEA).
--    2. Re-encrypts all existing plaintext secrets using
--       pgcrypto symmetric AES (bf/pad:pkcs) keyed from the
--       app's SECRET_KEY — which must be set as the Postgres
--       session variable app.secret_key before running this.
--    3. Removes the old plaintext column.
--
--  Application layer reads/writes the secret via:
--    encrypt(secret::bytea, current_setting('app.secret_key')::bytea, 'bf')
--    decrypt(secret_enc, current_setting('app.secret_key')::bytea, 'bf')
--
--  The SECRET_KEY is never stored in the database.
-- ═══════════════════════════════════════════════════════════

-- Requires pgcrypto (already enabled in schema.sql)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: add encrypted column
ALTER TABLE webhooks
    ADD COLUMN IF NOT EXISTS secret_enc BYTEA;

-- Step 2: encrypt existing plaintext secrets (run AFTER setting app.secret_key)
-- Usage from psql:
--   SET app.secret_key = '<your SECRET_KEY>';
--   \i migration_v23.sql
--
-- In a fresh deployment with no existing webhooks this UPDATE is a no-op.
UPDATE webhooks
SET secret_enc = encrypt(
    secret::bytea,
    current_setting('app.secret_key', true)::bytea,
    'bf'
)
WHERE secret IS NOT NULL
  AND current_setting('app.secret_key', true) IS NOT NULL
  AND current_setting('app.secret_key', true) != '';

-- Step 3: drop the plaintext column
ALTER TABLE webhooks DROP COLUMN IF EXISTS secret;
