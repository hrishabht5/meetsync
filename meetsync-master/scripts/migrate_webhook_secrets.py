"""
One-time migration: encrypt all plaintext webhook secrets.

Run this BEFORE deploying the service.py change that removes the plaintext
fallback branch. If run after, webhooks with unmigrated secrets will silently
lose HMAC signing on delivery.

Usage:
    cd meetsync-master
    python scripts/migrate_webhook_secrets.py
"""
import os
import sys

# Allow running from the meetsync-master directory without installing the package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import supabase, SECRET_KEY
from app.webhooks.crypto import encrypt_secret

rows = (
    supabase.table("webhooks")
    .select("id,secret")
    .not_.is_("secret", "null")
    .is_("secret_enc", "null")
    .execute()
).data or []

if not rows:
    print("No plaintext webhook secrets to migrate. All rows are already encrypted.")
    sys.exit(0)

print(f"Migrating {len(rows)} webhook(s) with plaintext secrets…")
errors = 0
for row in rows:
    try:
        enc = encrypt_secret(row["secret"], SECRET_KEY)
        supabase.table("webhooks").update({
            "secret_enc": enc,
            "secret": None,
        }).eq("id", row["id"]).execute()
        print(f"  ✓ {row['id']}")
    except Exception as e:
        print(f"  ✗ {row['id']}: {e}", file=sys.stderr)
        errors += 1

if errors:
    print(f"\n{errors} error(s) — do NOT remove the plaintext fallback yet.", file=sys.stderr)
    sys.exit(1)

print(f"\nDone. {len(rows)} secret(s) encrypted. Safe to deploy the fallback removal.")
