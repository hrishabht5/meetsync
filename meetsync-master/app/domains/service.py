import logging
import os

import httpx

from app.core.config import supabase

_log = logging.getLogger("draftmeet.domains")

VERCEL_TOKEN      = os.getenv("VERCEL_TOKEN", "")
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID", "")
VERCEL_TEAM_ID    = os.getenv("VERCEL_TEAM_ID", "")  # empty for personal accounts

_VERCEL_API = "https://api.vercel.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {VERCEL_TOKEN}"}


def _params() -> dict:
    return {"teamId": VERCEL_TEAM_ID} if VERCEL_TEAM_ID else {}


async def add_domain_to_vercel(domain: str) -> bool:
    """Register domain on the Vercel project. Returns True on success."""
    if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
        _log.warning("VERCEL_TOKEN or VERCEL_PROJECT_ID not set — skipping Vercel domain add")
        return False
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_VERCEL_API}/v9/projects/{VERCEL_PROJECT_ID}/domains",
            headers=_headers(),
            params=_params(),
            json={"name": domain},
        )
    if resp.status_code in (200, 201, 409):  # 409 = already added
        return True
    _log.warning("Vercel add domain failed: %s %s", resp.status_code, resp.text)
    return False


async def check_domain_verified_on_vercel(domain: str) -> bool:
    """Return True if Vercel reports the domain as verified (DNS configured correctly)."""
    if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
        return False
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{_VERCEL_API}/v9/projects/{VERCEL_PROJECT_ID}/domains/{domain}",
            headers=_headers(),
            params=_params(),
        )
    if resp.status_code != 200:
        return False
    return resp.json().get("verified", False)


async def remove_domain_from_vercel(domain: str) -> None:
    if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
        return
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.delete(
            f"{_VERCEL_API}/v9/projects/{VERCEL_PROJECT_ID}/domains/{domain}",
            headers=_headers(),
            params=_params(),
        )


def get_domain_for_user(user_id: str) -> dict | None:
    result = supabase.table("custom_domains").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def get_verified_custom_domain(user_id: str) -> str | None:
    """Get the verified custom domain for a user, if any."""
    row = supabase.table("custom_domains") \
        .select("domain") \
        .eq("user_id", user_id) \
        .eq("verified", True) \
        .execute()
    return row.data[0]["domain"] if row.data else None


def resolve_domain_to_user(domain: str) -> dict | None:
    """
    Map a verified custom domain to its owner's user_id and username.
    Returns {user_id, username} or None.
    """
    row = supabase.table("custom_domains") \
        .select("user_id") \
        .eq("domain", domain) \
        .eq("verified", True) \
        .execute()
    if not row.data:
        return None
    user_id = row.data[0]["user_id"]
    profile = supabase.table("user_profiles").select("username").eq("user_id", user_id).execute()
    if not profile.data:
        return None
    return {"user_id": user_id, "username": profile.data[0]["username"]}
