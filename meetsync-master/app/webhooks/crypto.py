"""
Webhook secret encryption helpers.

Secrets are encrypted with AES-256-GCM before being stored in the
`webhooks.secret_enc` column.  The encryption key is derived from the
app's SECRET_KEY (never stored in the database).

Why AES-256-GCM:
  - Authenticated encryption: tampering with the ciphertext is detected.
  - Standard library only: uses Python's `cryptography` package which is
    transitively installed by most FastAPI/Supabase stacks.
  - Determinism-free: a fresh 12-byte nonce is generated for every
    encrypt() call, so two encryptions of the same plaintext produce
    different ciphertext.

Storage format (hex-encoded):
  <12-byte nonce hex><ciphertext hex><16-byte tag hex>
"""

import os
import hashlib

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _derive_key(app_secret: str) -> bytes:
    """Derive a 32-byte AES key from the app SECRET_KEY via SHA-256."""
    return hashlib.sha256(app_secret.encode()).digest()


def encrypt_secret(plaintext: str, app_secret: str) -> str:
    """Encrypt a webhook signing secret. Returns a hex-encoded ciphertext string."""
    key   = _derive_key(app_secret)
    aesgcm = AESGCM(key)
    nonce  = os.urandom(12)
    ct     = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return (nonce + ct).hex()


def decrypt_secret(ciphertext_hex: str, app_secret: str) -> str:
    """Decrypt a stored webhook signing secret. Returns the original plaintext."""
    raw    = bytes.fromhex(ciphertext_hex)
    nonce  = raw[:12]
    ct     = raw[12:]
    key    = _derive_key(app_secret)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode()
