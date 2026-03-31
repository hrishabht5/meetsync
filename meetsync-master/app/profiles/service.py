"""
Profiles service
----------------
All direct Supabase access for user_profiles and permanent_links.
No HTTP — called from router.py and auth/router.py.
"""

import re
from app.core.config import supabase


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Convert arbitrary text to a safe lowercase slug (letters, digits, hyphens)."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "user"


def _unique_username(base: str) -> str:
    """Return a username derived from *base* that is not already taken."""
    candidate = _slugify(base)[:30]
    existing = supabase.table("user_profiles").select("username").eq("username", candidate).execute()
    if not existing.data:
        return candidate
    # Append numeric suffix until we find a free slot
    for i in range(2, 10000):
        suffixed = f"{candidate[:27]}-{i}"
        check = supabase.table("user_profiles").select("username").eq("username", suffixed).execute()
        if not check.data:
            return suffixed
    raise RuntimeError("Could not allocate a unique username")


# ── Profile CRUD ──────────────────────────────────────────────────────────────

def ensure_profile_exists(user_id: str, email: str) -> dict:
    """
    Called once per OAuth login.  Creates the profile row if it does not exist.
    Uses the email prefix (before @) as the initial username, de-duplicated.
    """
    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]

    base = email.split("@")[0] if "@" in email else email or "user"
    username = _unique_username(base)

    row = {
        "user_id":      user_id,
        "username":     username,
        "display_name": None,
        "bio":          None,
    }
    insert = supabase.table("user_profiles").insert(row).execute()
    return insert.data[0]


def get_profile_by_user_id(user_id: str) -> dict | None:
    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def get_profile_by_username(username: str) -> dict | None:
    result = supabase.table("user_profiles").select("*").eq("username", username).execute()
    return result.data[0] if result.data else None


def upsert_profile(user_id: str, display_name: str | None, bio: str | None, username: str | None) -> dict:
    """Update mutable profile fields.  Raises ValueError on duplicate username."""
    updates: dict = {"updated_at": "now()"}
    if display_name is not None:
        updates["display_name"] = display_name
    if bio is not None:
        updates["bio"] = bio
    if username is not None:
        # Check uniqueness (excluding the current user)
        conflict = (
            supabase.table("user_profiles")
            .select("user_id")
            .eq("username", username)
            .neq("user_id", user_id)
            .execute()
        )
        if conflict.data:
            raise ValueError(f"Username '{username}' is already taken")
        updates["username"] = username

    result = supabase.table("user_profiles").update(updates).eq("user_id", user_id).execute()
    if not result.data:
        raise ValueError("Profile not found")
    return result.data[0]


# ── Permanent Links ───────────────────────────────────────────────────────────

def list_permanent_links(user_id: str) -> list[dict]:
    result = (
        supabase.table("permanent_links")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def create_permanent_link(user_id: str, slug: str, event_type: str, custom_fields: list) -> dict:
    """
    Raises ValueError on duplicate (user_id, slug).
    slug is validated to contain only safe characters.
    """
    clean_slug = _slugify(slug)
    if not clean_slug:
        raise ValueError("Slug must contain at least one letter or digit")

    conflict = (
        supabase.table("permanent_links")
        .select("id")
        .eq("user_id", user_id)
        .eq("slug", clean_slug)
        .execute()
    )
    if conflict.data:
        raise ValueError(f"You already have a link with slug '{clean_slug}'")

    row = {
        "user_id":       user_id,
        "slug":          clean_slug,
        "event_type":    event_type,
        "is_active":     True,
        "custom_fields": custom_fields,
    }
    result = supabase.table("permanent_links").insert(row).execute()
    return result.data[0]


def toggle_permanent_link(user_id: str, link_id: str) -> dict:
    result = (
        supabase.table("permanent_links")
        .select("*")
        .eq("id", link_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("Link not found")
    current = result.data[0]
    updated = (
        supabase.table("permanent_links")
        .update({"is_active": not current["is_active"]})
        .eq("id", link_id)
        .execute()
    )
    return updated.data[0]


def delete_permanent_link(user_id: str, link_id: str) -> None:
    result = (
        supabase.table("permanent_links")
        .select("id")
        .eq("id", link_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("Link not found")
    supabase.table("permanent_links").delete().eq("id", link_id).execute()


def get_permanent_link_by_username_slug(username: str, slug: str) -> tuple[dict, str] | None:
    """
    Returns (link_row, host_user_id) or None.
    Used by the public /validate endpoint and the booking router.
    """
    profile = get_profile_by_username(username)
    if not profile:
        return None
    result = (
        supabase.table("permanent_links")
        .select("*")
        .eq("user_id", profile["user_id"])
        .eq("slug", slug)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0], profile["user_id"]


def get_permanent_link_by_id(link_id: str) -> dict | None:
    result = supabase.table("permanent_links").select("*").eq("id", link_id).execute()
    return result.data[0] if result.data else None
