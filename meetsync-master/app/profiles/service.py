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

def ensure_profile_exists(user_id: str, email: str, avatar_url: str | None = None, google_name: str | None = None) -> dict:
    """
    Called once per OAuth login or sign-up.  Creates the profile row if it does not exist.
    Also upserts into the users identity table.
    Uses the email prefix (before @) as the initial username, de-duplicated.
    """
    # Upsert into users identity table (no-op if already exists)
    supabase.table("users").upsert(
        {"id": user_id, "email": email}, on_conflict="id"
    ).execute()

    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if result.data:
        # Refresh avatar from Google if we have one and none is stored yet
        if avatar_url and not result.data[0].get("avatar_url"):
            supabase.table("user_profiles").update({"avatar_url": avatar_url}).eq("user_id", user_id).execute()
        return result.data[0]

    base = email.split("@")[0] if "@" in email else email or "user"
    username = _unique_username(base)

    row = {
        "user_id":      user_id,
        "username":     username,
        "display_name": google_name or None,
        "bio":          None,
        "avatar_url":   avatar_url or None,
    }
    insert = supabase.table("user_profiles").insert(row).execute()
    return insert.data[0]


def get_profile_by_user_id(user_id: str) -> dict | None:
    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def get_profile_by_username(username: str) -> dict | None:
    result = supabase.table("user_profiles").select("*").eq("username", username).execute()
    return result.data[0] if result.data else None


_MUTABLE_PROFILE_FIELDS = frozenset({
    "display_name", "bio", "headline", "website", "location",
    "avatar_url", "cover_image_url", "bg_image_url", "accent_color",
})


def upsert_profile(user_id: str, **kwargs) -> dict:
    """
    Update mutable profile fields.
    Pass any of: display_name, bio, username, headline, website, location,
    avatar_url, cover_image_url, bg_image_url, accent_color.
    Raises ValueError on duplicate username.
    """
    updates: dict = {"updated_at": "now()"}

    username = kwargs.pop("username", None)
    if username is not None:
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

    for field in _MUTABLE_PROFILE_FIELDS:
        if field in kwargs and kwargs[field] is not None:
            updates[field] = kwargs[field]

    result = supabase.table("user_profiles").update(updates).eq("user_id", user_id).execute()
    if not result.data:
        raise ValueError("Profile not found")
    return result.data[0]


# ── Permanent Links ───────────────────────────────────────────────────────────

def list_permanent_links(
    user_id: str,
    page: int = 1,
    limit: int = 10,
    search: str = "",
) -> dict:
    """List permanent links with pagination and optional search."""
    offset = (page - 1) * limit
    query = (
        supabase.table("permanent_links")
        .select("*", count="exact")
        .eq("user_id", user_id)
    )
    if search:
        query = query.or_(f"slug.ilike.%{search}%,custom_title.ilike.%{search}%")
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    total = result.count or 0
    return {"items": result.data or [], "total": total, "page": page, "has_more": offset + limit < total}


def create_permanent_link(
    user_id: str,
    slug: str,
    event_type: str,
    custom_fields: list,
    custom_title: str = None,
    description: str = None,
    cover_image_url: str = None,
    bg_image_url: str = None,
    accent_color: str = None,
) -> dict:
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
        "user_id":         user_id,
        "slug":            clean_slug,
        "event_type":      event_type,
        "is_active":       True,
        "custom_fields":   custom_fields,
        "custom_title":    custom_title or None,
        "description":     description or None,
        "cover_image_url": cover_image_url or None,
        "bg_image_url":    bg_image_url or None,
        "accent_color":    accent_color or None,
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


_ALLOWED_PLINK_CUSTOMIZE = frozenset({
    "description", "cover_image_url", "bg_image_url", "accent_color", "custom_title"
})


def customize_permanent_link(user_id: str, link_id: str, updates: dict) -> dict:
    """Update customization fields on a permanent link."""
    row = (
        supabase.table("permanent_links")
        .select("user_id")
        .eq("id", link_id)
        .execute()
    )
    if not row.data:
        raise ValueError("Link not found.")
    if row.data[0].get("user_id") != user_id:
        raise ValueError("Forbidden.")
    safe_updates = {k: v for k, v in updates.items() if k in _ALLOWED_PLINK_CUSTOMIZE}
    updated = supabase.table("permanent_links").update(safe_updates).eq("id", link_id).execute()
    return updated.data[0]


def get_permanent_link_by_id(link_id: str) -> dict | None:
    result = supabase.table("permanent_links").select("*").eq("id", link_id).execute()
    return result.data[0] if result.data else None


def toggle_show_on_profile(user_id: str, link_id: str) -> dict:
    """Toggle whether a permanent link appears on the user's public profile page."""
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
        .update({"show_on_profile": not current.get("show_on_profile", True)})
        .eq("id", link_id)
        .execute()
    )
    return updated.data[0]
