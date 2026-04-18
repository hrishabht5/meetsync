import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from app.core.config import supabase
from app.domains import service

router = APIRouter()

_DOMAIN_RE = re.compile(
    r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
)
_BLOCKED_SUFFIXES = ("draftmeet.com", "vercel.app", "localhost")


class DomainPayload(BaseModel):
    domain: str

    @field_validator("domain")
    @classmethod
    def clean_domain(cls, v: str) -> str:
        v = v.strip().lower()
        for prefix in ("https://", "http://"):
            if v.startswith(prefix):
                v = v[len(prefix):]
        v = v.rstrip("/").split("/")[0]  # strip any path
        if not _DOMAIN_RE.match(v):
            raise ValueError("Invalid domain format")
        if any(v == s or v.endswith("." + s) for s in _BLOCKED_SUFFIXES):
            raise ValueError("Cannot use this domain")
        return v


# ── Public ─────────────────────────────────────────────────

@router.get("/resolve")
def resolve_domain(host: str):
    """
    Public endpoint used by the Next.js middleware/proxy.
    Maps a verified custom domain → {user_id, username}.
    """
    domain = host.lower().split(":")[0]
    user = service.resolve_domain_to_user(domain)
    if not user:
        raise HTTPException(status_code=404, detail="Domain not configured")
    return user


# ── Authenticated ──────────────────────────────────────────

@router.get("/me")
def get_my_domain(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    row = service.get_domain_for_user(user_id)
    return row  # None → null in JSON


@router.post("/me", status_code=201)
async def register_domain(request: Request, payload: DomainPayload):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)

    # Check domain not claimed by a different user
    existing = supabase.table("custom_domains") \
        .select("user_id") \
        .eq("domain", payload.domain) \
        .execute()
    if existing.data and existing.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=409, detail="Domain already in use by another account")

    # Remove previous domain for this user (if any and different)
    old = service.get_domain_for_user(user_id)
    if old and old["domain"] != payload.domain:
        await service.remove_domain_from_vercel(old["domain"])
        supabase.table("custom_domains").delete().eq("user_id", user_id).execute()

    # Register on Vercel (best-effort — don't fail if Vercel creds not set)
    await service.add_domain_to_vercel(payload.domain)

    supabase.table("custom_domains").upsert(
        {"user_id": user_id, "domain": payload.domain, "verified": False},
        on_conflict="user_id",
    ).execute()

    return service.get_domain_for_user(user_id)


@router.post("/me/verify")
async def verify_domain(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)

    row = service.get_domain_for_user(user_id)
    if not row:
        raise HTTPException(status_code=404, detail="No custom domain registered")

    verified = await service.check_domain_verified_on_vercel(row["domain"])
    if verified:
        supabase.table("custom_domains").update({
            "verified": True,
            "updated_at": "now()",
        }).eq("user_id", user_id).execute()

    return {"domain": row["domain"], "verified": verified}


@router.delete("/me")
async def remove_domain(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)

    row = service.get_domain_for_user(user_id)
    if not row:
        raise HTTPException(status_code=404, detail="No custom domain registered")

    await service.remove_domain_from_vercel(row["domain"])
    supabase.table("custom_domains").delete().eq("user_id", user_id).execute()
    return {"status": "removed"}
