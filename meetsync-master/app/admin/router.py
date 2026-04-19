from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class BrandingPayload(BaseModel):
    remove_branding: bool

from app.auth.middleware import (
    get_current_user_id,
    make_user_session_cookie_value,
    is_secure,
    set_session_cookie,
    cookie_domain,
)
from app.core.config import supabase, ADMIN_EMAIL, ADMIN_RESTORE_COOKIE
from app.admin import service

router = APIRouter()


def verified_admin(request: Request) -> str:
    """FastAPI dependency: verify admin once per request, raises 403 if not admin."""
    user_id = get_current_user_id(request)
    row = supabase.table("users").select("email").eq("id", user_id).execute()
    email = row.data[0]["email"] if row.data else ""
    if not ADMIN_EMAIL or not email or email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


# ── Stats ─────────────────────────────────────────────────

@router.get("/stats")
def admin_stats(_: str = Depends(verified_admin)):
    return service.get_platform_stats()


# ── Users ─────────────────────────────────────────────────

@router.get("/users")
def admin_users(search: str = "", page: int = 1, limit: int = 50, _: str = Depends(verified_admin)):
    limit = min(limit, 100)
    return service.list_users(search=search, page=page, limit=limit)


# ── Waitlist ──────────────────────────────────────────────

@router.get("/waitlist")
def admin_waitlist(_: str = Depends(verified_admin)):
    return service.list_waitlist()


# ── Custom Domains ────────────────────────────────────────

@router.get("/domains")
def admin_domains(_: str = Depends(verified_admin)):
    return service.list_domains()


# ── Branding ──────────────────────────────────────────────

@router.patch("/users/{user_id}/branding")
def set_user_branding(user_id: str, payload: BrandingPayload, _: str = Depends(verified_admin)):
    """Toggle remove_branding for a premium user."""
    remove = payload.remove_branding
    try:
        return service.set_remove_branding(user_id, remove)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Impersonation ─────────────────────────────────────────

@router.post("/impersonate/{user_id}")
def impersonate_user(request: Request, user_id: str, admin_id: str = Depends(verified_admin)):
    """
    Set session to target user while saving the admin's original session in a
    restore cookie so they can return to the admin panel.
    """
    secure = is_secure(request)
    samesite = "none" if secure else "lax"
    domain = cookie_domain(secure)

    # Confirm target user exists
    target = supabase.table("users").select("id").eq("id", user_id).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")

    response = JSONResponse({"status": "ok", "impersonating": user_id})

    # Save current admin session so it can be restored later
    admin_cookie_value = make_user_session_cookie_value(admin_id)
    response.set_cookie(
        key=ADMIN_RESTORE_COOKIE,
        value=admin_cookie_value,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        domain=domain,
        max_age=60 * 60 * 8,  # 8 hours max impersonation window
    )

    # Overwrite main session with target user
    set_session_cookie(response, user_id, secure)

    return response


@router.post("/impersonate/exit")
def exit_impersonation(request: Request):
    """Restore the admin's original session and clear the restore cookie."""
    restore_value = request.cookies.get(ADMIN_RESTORE_COOKIE)
    if not restore_value:
        raise HTTPException(status_code=400, detail="No active impersonation session")

    secure = is_secure(request)
    samesite = "none" if secure else "lax"
    domain = cookie_domain(secure)

    response = JSONResponse({"status": "ok"})

    # Restore admin session cookie
    response.set_cookie(
        key="draftmeet_user",
        value=restore_value,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        domain=domain,
        max_age=60 * 60 * 24 * 30,
    )

    # Clear the restore cookie
    response.delete_cookie(
        key=ADMIN_RESTORE_COOKIE,
        path="/",
        secure=secure,
        samesite=samesite,
        domain=domain,
    )

    return response
