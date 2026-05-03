"""
One-time migration: re-encrypt existing secret_enc rows from SHA-256 key to HKDF key.

The old crypto.py derived the AES key via hashlib.sha256(SECRET_KEY).
The new crypto.py derives it via HKDF-SHA256 with info=b"draftmeet-webhook-secret-encryption".
Any row already encrypted with the old key will fail to decrypt after deploying new crypto.py.

This script contains both derivation functions inline so it is entirely independent
of which version of crypto.py is currently deployed.

Run this AFTER migrate_webhook_secrets.py and BEFORE deploying the new crypto.py.

Deployment order:
  1. python scripts/migrate_webhook_secrets.py   (plaintext → SHA-256-AES)
  2. python scripts/rekey_webhook_secrets.py     (SHA-256-AES → HKDF-AES)   ← this script
  3. Deploy new crypto.py + middleware.py

Usage:
    cd meetsync-master
    python scripts/rekey_webhook_secrets.py
"""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

from app.core.config import supabase, SECRET_KEY


# ── Standalone key derivation (do not import from crypto.py) ──────────────────

def _old_derive_key(app_secret: str) -> bytes:
    """Original derivation: raw SHA-256 of SECRET_KEY."""
    return hashlib.sha256(app_secret.encode()).digest()


def _new_derive_key(app_secret: str) -> bytes:
    """New derivation: HKDF-SHA256 with domain label."""
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"draftmeet-webhook-secret-encryption",
    ).derive(app_secret.encode())


def _old_decrypt(ciphertext_hex: str, app_secret: str) -> str:
    raw = bytes.fromhex(ciphertext_hex)
    nonce, ct = raw[:12], raw[12:]
    return AESGCM(_old_derive_key(app_secret)).decrypt(nonce, ct, None).decode()


def _new_encrypt(plaintext: str, app_secret: str) -> str:
    key = _new_derive_key(app_secret)
    nonce = os.urandom(12)
    ct = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
    return (nonce + ct).hex()


# ── Migration ─────────────────────────────────────────────────────────────────

rows = (
    supabase.table("webhooks")
    .select("id,secret_enc")
    .not_.is_("secret_enc", "null")
    .execute()
).data or []

if not rows:
    print("No secret_enc rows found. Nothing to re-key.")
    sys.exit(0)

print(f"Re-keying {len(rows)} row(s) from SHA-256 → HKDF…")
errors = 0
for row in rows:
    try:
        plaintext = _old_decrypt(row["secret_enc"], SECRET_KEY)
        new_enc = _new_encrypt(plaintext, SECRET_KEY)
        supabase.table("webhooks").update({"secret_enc": new_enc}).eq("id", row["id"]).execute()
        print(f"  ✓ {row['id']}")
    except Exception as e:
        print(f"  ✗ {row['id']}: {e}", file=sys.stderr)
        errors += 1

if errors:
    print(f"\n{errors} error(s) — do NOT deploy new crypto.py yet.", file=sys.stderr)
    sys.exit(1)

print(f"\nDone. {len(rows)} secret(s) re-keyed. Safe to deploy new crypto.py.")
