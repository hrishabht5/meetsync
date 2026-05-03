"""
One-time migration: encrypt plaintext Google OAuth tokens at rest.

Requires migration_v30.sql to have been run first (adds access_token_enc
and refresh_token_enc columns).

Run this BEFORE deploying the google_calendar.py change that reads from the
_enc columns, and BEFORE dropping the plaintext columns.

Usage:
    cd meetsync-master
    python scripts/migrate_oauth_tokens.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import supabase, SECRET_KEY
from app.webhooks.crypto import encrypt_secret

rows = (
    supabase.table("google_tokens")
    .select("user_id,access_token,refresh_token")
    .is_("access_token_enc", "null")
    .execute()
).data or []

if not rows:
    print("No plaintext OAuth tokens to migrate.")
    sys.exit(0)

print(f"Migrating {len(rows)} token row(s)…")
errors = 0
for row in rows:
    try:
        enc_access  = encrypt_secret(row["access_token"] or "", SECRET_KEY)
        enc_refresh = encrypt_secret(row.get("refresh_token") or "", SECRET_KEY)
        supabase.table("google_tokens").update({
            "access_token_enc":  enc_access,
            "refresh_token_enc": enc_refresh,
        }).eq("user_id", row["user_id"]).execute()
        print(f"  ✓ user {row['user_id']}")
    except Exception as e:
        print(f"  ✗ user {row['user_id']}: {e}", file=sys.stderr)
        errors += 1

if errors:
    print(f"\n{errors} error(s). Do NOT drop plaintext columns yet.", file=sys.stderr)
    sys.exit(1)

print(f"\nDone. {len(rows)} row(s) encrypted.")
print("Next: deploy updated google_calendar.py, then drop plaintext columns.")
