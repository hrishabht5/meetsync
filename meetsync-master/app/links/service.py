"""
One-Time Link (OTL) Service
----------------------------
Each link is a unique token stored in Supabase.
State machine:  active → used  (on first booking)
                active → expired (if past expires_at)
                active → revoked (manual admin action)
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import supabase, FRONTEND_URL
from app.core.schemas import OTLStatus


def _generate_token(prefix: str = "lnk", length: int = 8) -> str:
    """Generate a URL-safe token like lnk_a3f8x9qr"""
    alphabet = string.ascii_lowercase + string.digits
    random_part = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}_{random_part}"


def _parse_expiry(expires_in: Optional[str]) -> Optional[datetime]:
    """Convert '24h', '7d', 'never' → datetime or None."""
    if not expires_in or expires_in == "never":
        return None
    if expires_in.endswith("h"):
        return datetime.utcnow() + timedelta(hours=int(expires_in[:-1]))
    if expires_in.endswith("d"):
        return datetime.utcnow() + timedelta(days=int(expires_in[:-1]))
    return None


# ── Public API ────────────────────────────────────────────

def create_otl(event_type: str, expires_in: Optional[str] = "7d", user_id: str = None, custom_fields: list = None, custom_title: Optional[str] = None) -> dict:
    """
    Generate a new one-time booking link and persist it.

    Returns the full row as stored in Supabase.
    """
    token      = _generate_token()
    expires_at = _parse_expiry(expires_in)

    row = {
        "id":            token,
        "event_type":    event_type,
        "status":        OTLStatus.active,
        "expires_at":    expires_at.isoformat() if expires_at else None,
        "user_id":       user_id,
        "custom_fields": custom_fields or [],
        "custom_title":  custom_title or None,
    }
    result = supabase.table("one_time_links").insert(row).execute()
    data   = result.data[0]
    data["booking_url"] = f"{FRONTEND_URL}/book/{token}"
    return data


def validate_otl(token: str) -> dict:
    """
    Validate a one-time link before letting a customer proceed.

    Returns the OTL row if valid.
    Raises ValueError with a descriptive message if not.
    """
    result = supabase.table("one_time_links").select("*").eq("id", token).execute()
    rows   = result.data

    if not rows:
        raise ValueError("This booking link does not exist.")

    otl = rows[0]

    if otl["status"] == OTLStatus.used:
        raise ValueError("This link has already been used to book a meeting.")
    if otl["status"] == OTLStatus.revoked:
        raise ValueError("This booking link has been revoked.")
    if otl["status"] == OTLStatus.expired:
        raise ValueError("This booking link has expired.")

    # Check expiry even if status hasn't been updated yet
    if otl["expires_at"]:
        exp = datetime.fromisoformat(otl["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow() > exp.replace(tzinfo=None):
            # Auto-update status
            supabase.table("one_time_links").update({"status": OTLStatus.expired}).eq("id", token).execute()
            raise ValueError("This booking link has expired.")

    return otl


def mark_otl_used(token: str, booking_id: str):
    """Atomically mark a link as used and record which booking consumed it."""
    supabase.table("one_time_links").update({
        "status":     OTLStatus.used,
        "used_at":    datetime.utcnow().isoformat(),
        "booking_id": booking_id,
    }).eq("id", token).execute()


def revoke_otl(token: str):
    """Admin revocation — prevents any future use of this link."""
    result = supabase.table("one_time_links").select("status").eq("id", token).execute()
    if not result.data:
        raise ValueError("Link not found.")
    if result.data[0]["status"] == OTLStatus.used:
        raise ValueError("Cannot revoke a link that has already been used.")
    supabase.table("one_time_links").update({"status": OTLStatus.revoked}).eq("id", token).execute()


def list_otls(user_id: str, status_filter: Optional[str] = None) -> list:
    """List all OTLs for a user, optionally filtered by status."""
    query = supabase.table("one_time_links").select("*").eq("user_id", user_id)
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.order("created_at", desc=True).execute()
    for row in result.data:
        row["booking_url"] = f"{FRONTEND_URL}/book/{row['id']}"
    return result.data
