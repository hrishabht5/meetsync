"""
Auth router
-----------
GET /auth/google          → redirect to Google consent screen
GET /auth/callback        → handle OAuth2 code, store tokens, redirect to frontend
GET /auth/status          → check if Google account is connected
DELETE /auth/disconnect   → remove stored Google tokens
"""

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
import httpx
from config import supabase, FRONTEND_URL
from services import google_calendar
from middleware.auth import (
    get_current_user_id,
    make_user_session_cookie_value,
)

router = APIRouter()
HOST_USER_ID = "default_host"


@router.get("/google")
def google_auth():
    """Redirect user to Google OAuth2 consent screen."""
    auth_url = google_calendar.get_auth_url()
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def google_callback(request: Request, code: str = None, error: str = None):
    """
    Google redirects here after user grants permission.
    Exchange code for tokens and redirect back to frontend.
    """
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error={error or 'no_code'}")

    try:
        token_data = await google_calendar.exchange_code(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/dashboard?auth_error=missing_access_token")

        # Fetch the Google user identity so we can create per-user calendars/tokens.
        # (We use the stable `sub` as user_id.)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            user_info = resp.json()

        user_id = user_info.get("sub") or user_info.get("id") or user_info.get("email")
        if not user_id:
            return RedirectResponse(url=f"{FRONTEND_URL}/dashboard?auth_error=missing_user_identity")

        google_calendar.store_tokens(user_id, token_data)

        redirect = RedirectResponse(url=f"{FRONTEND_URL}/dashboard?auth=success")

        # Secure cookie setup:
        # - On HTTPS: SameSite=None + Secure (works for cross-origin frontend/backend)
        # - On HTTP (local dev): SameSite=Lax + non-secure
        # When deployed behind a reverse proxy, `request.url.scheme` can be "http"
        # even if the external scheme is HTTPS. Prefer X-Forwarded-Proto when present.
        forwarded_proto = request.headers.get("x-forwarded-proto", "").lower().strip()
        secure = forwarded_proto == "https" or request.url.scheme == "https"
        samesite = "none" if secure else "lax"

        redirect.set_cookie(
            key="meetsync_user",
            value=make_user_session_cookie_value(user_id),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path="/",
            max_age=60 * 60 * 24 * 30,  # 30 days
        )
        return redirect
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/dashboard?auth_error=token_exchange_failed")


@router.get("/status")
def auth_status(request: Request):
    """Check whether a Google account is connected."""
    user_id = get_current_user_id(request)
    result = supabase.table("google_tokens").select("user_id,expires_at").eq("user_id", user_id).execute()
    connected = bool(result.data)
    return {"connected": connected, "user_id": user_id if connected else None}


@router.delete("/disconnect")
def disconnect_google(request: Request):
    """Remove stored Google tokens (user must re-authenticate to book again)."""
    user_id = get_current_user_id(request)
    supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
    return {"status": "disconnected"}
