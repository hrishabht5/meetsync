"""
One-Time Link (OTL) Service
----------------------------
Each link is a unique token stored in Supabase.
State machine:  active → used  (on first booking)
                active → expired (if past expires_at)
                active → revoked (manual admin action)
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import supabase, FRONTEND_URL
from app.core.schemas import OTLStatus


def _generate_token(prefix: str = "lnk") -> str:
    """Generate a URL-safe token with 128-bit entropy."""
    return f"{prefix}_{secrets.token_hex(16)}"


def _parse_expiry(expires_in: Optional[str]) -> Optional[datetime]:
    """Convert '24h', '7d', 'never' → datetime or None."""
    if not expires_in or expires_in == "never":
        return None
    if expires_in.endswith("h"):
        return datetime.now(timezone.utc) + timedelta(hours=int(expires_in[:-1]))
    if expires_in.endswith("d"):
        return datetime.now(timezone.utc) + timedelta(days=int(expires_in[:-1]))
    return None


# ── Public API ────────────────────────────────────────────

def create_otl(
    event_type: str,
    expires_in: Optional[str] = "7d",
    user_id: str = None,
    custom_fields: list = None,
    custom_title: Optional[str] = None,
    description: Optional[str] = None,
    cover_image_url: Optional[str] = None,
    bg_image_url: Optional[str] = None,
    accent_color: Optional[str] = None,
) -> dict:
    """
    Generate a new one-time booking link and persist it.

    Returns the full row as stored in Supabase.
    """
    token      = _generate_token()
    expires_at = _parse_expiry(expires_in)

    row = {
        "id":              token,
        "event_type":      event_type,
        "status":          OTLStatus.active,
        "expires_at":      expires_at.isoformat() if expires_at else None,
        "user_id":         user_id,
        "custom_fields":   custom_fields or [],
        "custom_title":    custom_title or None,
        "description":     description or None,
        "cover_image_url": cover_image_url or None,
        "bg_image_url":    bg_image_url or None,
        "accent_color":    accent_color or None,
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
        if datetime.now(timezone.utc) > exp:
            # Auto-update status
            supabase.table("one_time_links").update({"status": OTLStatus.expired}).eq("id", token).execute()
            raise ValueError("This booking link has expired.")

    return otl


def mark_otl_used(token: str, booking_id: str) -> bool:
    """
    Atomically claim a one-time link.

    Uses a conditional UPDATE (WHERE status = 'active') so that only one
    concurrent request can succeed. Returns True if claimed, False if another
    request already claimed it (race condition detected).
    """
    result = supabase.table("one_time_links").update({
        "status":     OTLStatus.used,
        "used_at":    datetime.now(timezone.utc).isoformat(),
        "booking_id": booking_id,
    }).eq("id", token).eq("status", OTLStatus.active).execute()
    return bool(result.data)


def revoke_otl(token: str):
    """Admin revocation — prevents any future use of this link."""
    result = supabase.table("one_time_links").select("status").eq("id", token).execute()
    if not result.data:
        raise ValueError("Link not found.")
    if result.data[0]["status"] == OTLStatus.used:
        raise ValueError("Cannot revoke a link that has already been used.")
    supabase.table("one_time_links").update({"status": OTLStatus.revoked}).eq("id", token).execute()


def list_otls(
    user_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    search: str = "",
) -> dict:
    """List OTLs for a user with pagination and optional search/status filter."""
    offset = (page - 1) * limit
    query = supabase.table("one_time_links").select("*", count="exact").eq("user_id", user_id)
    if status_filter:
        query = query.eq("status", status_filter)
    if search:
        query = query.or_(f"id.ilike.%{search}%,event_type.ilike.%{search}%,custom_title.ilike.%{search}%")
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    total = result.count or 0
    for row in result.data:
        row["booking_url"] = f"{FRONTEND_URL}/book/{row['id']}"
    return {"items": result.data, "total": total, "page": page, "has_more": offset + limit < total}


_ALLOWED_OTL_CUSTOMIZE = frozenset({
    "description", "cover_image_url", "bg_image_url", "accent_color", "custom_title"
})


def customize_otl(token: str, user_id: str, updates: dict) -> dict:
    """Update customization fields (description, cover_image_url, accent_color) on an OTL."""
    row = supabase.table("one_time_links").select("user_id").eq("id", token).execute()
    if not row.data:
        raise ValueError("Link not found.")
    if row.data[0].get("user_id") != user_id:
        raise ValueError("Forbidden.")
    safe_updates = {k: v for k, v in updates.items() if k in _ALLOWED_OTL_CUSTOMIZE}
    updated = supabase.table("one_time_links").update(safe_updates).eq("id", token).execute()
    data = updated.data[0]
    data["booking_url"] = f"{FRONTEND_URL}/book/{token}"
    return data


def delete_otl(token: str, user_id: str):
    """Hard-delete a non-active OTL. Raises ValueError if active or not found/owned."""
    result = supabase.table("one_time_links").select("status,user_id").eq("id", token).execute()
    if not result.data:
        raise ValueError("Link not found.")
    row = result.data[0]
    if row.get("user_id") != user_id:
        raise ValueError("Forbidden.")
    if row["status"] == OTLStatus.active:
        raise ValueError("Cannot delete an active link. Revoke it first.")
    supabase.table("one_time_links").delete().eq("id", token).execute()
