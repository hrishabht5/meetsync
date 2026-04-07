"""
Auth router
-----------
GET  /auth/google?mode=signin   → redirect to Google (identity only, no calendar tokens)
GET  /auth/google?mode=connect  → redirect to Google (calendar connect for logged-in user)
GET  /auth/callback             → handle OAuth2 code; behaviour depends on mode in state
POST /auth/signup               → email + password account creation
POST /auth/login                → email + password login
GET  /auth/status               → account info + whether calendar is connected
GET  /auth/calendars            → list user's Google Calendars (requires calendar connected)
PUT  /auth/calendar-preference  → set preferred calendar for new events
DELETE /auth/disconnect         → remove stored Google tokens (unlinks calendar)
POST /auth/logout               → clear session cookie
DELETE /auth/account            → GDPR account deletion
"""

import uuid
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from app.core.rate_limit import strict_rate_limit
import bcrypt
import httpx

from app.core.config import supabase, FRONTEND_URL
from app.core.schemas import SignupRequest, LoginRequest, CalendarPreferenceRequest
from app.integrations import google_calendar
from app.auth.middleware import (
    get_current_user_id,
    make_user_session_cookie_value,
)

router = APIRouter()



# ── Helpers ───────────────────────────────────────────────

def _set_session_cookie(response, user_id: str, secure: bool):
    samesite = "none" if secure else "lax"
    response.set_cookie(
        key="meetsync_user",
        value=make_user_session_cookie_value(user_id),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )


def _clear_session_cookie(response, secure: bool):
    samesite = "none" if secure else "lax"
    response.delete_cookie(key="meetsync_user", path="/", secure=secure, samesite=samesite)


def _is_secure(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").lower().strip()
    return forwarded_proto == "https" or request.url.scheme == "https"


def _upsert_user(user_id: str, email: str, password_hash: str = None):
    """Create or update a row in the users table."""
    row = {"id": user_id, "email": email}
    if password_hash:
        row["password_hash"] = password_hash
    supabase.table("users").upsert(row, on_conflict="id").execute()


import logging as _logging

def _ensure_profile(user_id: str, email: str):
    try:
        from app.profiles.service import ensure_profile_exists
        ensure_profile_exists(user_id, email)
    except Exception as e:
        _logging.warning("Could not create profile for %s: %s", user_id, e)


# ── Google OAuth ──────────────────────────────────────────

@router.get("/google")
def google_auth(request: Request, mode: str = "signin"):
    """
    Redirect to Google consent screen.
    mode=signin  → identity only (login / sign-up), no calendar tokens stored
    mode=connect → calendar connect for an already-logged-in user
    """
    if mode == "connect":
        # Must be logged in to connect a calendar
        try:
            get_current_user_id(request)
        except Exception:
            raise HTTPException(status_code=401, detail="Must be logged in to connect Google Calendar")

    auth_url = google_calendar.get_auth_url(state=mode)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def google_callback(request: Request, code: str = None, error: str = None, state: str = "signin"):
    """
    Google redirects here after the user grants permission.
    state == 'signin'  → upsert users row, set session, do NOT store calendar tokens
    state == 'connect' → store calendar tokens for the logged-in user, redirect to settings
    """
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error={error or 'no_code'}")

    try:
        token_data = await google_calendar.exchange_code(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=missing_access_token")

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            user_info = resp.json()

        google_sub = user_info.get("sub") or user_info.get("id") or user_info.get("email")
        email = user_info.get("email", "")
        if not google_sub:
            return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=missing_user_identity")

        secure = _is_secure(request)

        if state == "connect":
            # ── Calendar connect ──────────────────────────────────
            # User is already logged in; store tokens against their session user_id
            try:
                session_user_id = get_current_user_id(request)
            except Exception:
                return RedirectResponse(url=f"{FRONTEND_URL}/dashboard/settings?auth_error=not_logged_in")

            google_calendar.store_tokens(session_user_id, token_data)
            # Update the users row with the real email if we had a placeholder
            _upsert_user(session_user_id, email)
            redirect = RedirectResponse(url=f"{FRONTEND_URL}/dashboard/settings?calendar=connected")
            return redirect

        else:
            # ── Sign-in / Sign-up ─────────────────────────────────
            # If this Google email already belongs to an email/password account,
            # log in as that existing account instead of creating a duplicate.
            existing = supabase.table("users").select("id").eq("email", email).execute()
            if existing.data:
                actual_user_id = existing.data[0]["id"]
            else:
                actual_user_id = google_sub
                _upsert_user(actual_user_id, email)

            _ensure_profile(actual_user_id, email)

            redirect = RedirectResponse(url=f"{FRONTEND_URL}/dashboard?auth=success")
            _set_session_cookie(redirect, actual_user_id, secure)
            return redirect

    except Exception as e:
        _logging.warning("Auth callback error: %s", e)
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=token_exchange_failed")


# ── Email / Password ──────────────────────────────────────

@router.post("/signup")
async def signup(request: Request, payload: SignupRequest, _=Depends(strict_rate_limit)):
    """Create a new account with email + password. Session is set immediately."""
    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_id = "usr_" + uuid.uuid4().hex[:16]
    password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    _upsert_user(user_id, payload.email, password_hash)
    _ensure_profile(user_id, payload.email)

    secure = _is_secure(request)
    response = JSONResponse(content={"status": "created", "user_id": user_id})
    _set_session_cookie(response, user_id, secure)
    return response


@router.post("/login")
async def login(request: Request, payload: LoginRequest, _=Depends(strict_rate_limit)):
    """Log in with email + password."""
    result = supabase.table("users").select("id,password_hash").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = result.data[0]
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    secure = _is_secure(request)
    response = JSONResponse(content={"status": "ok", "user_id": user["id"]})
    _set_session_cookie(response, user["id"], secure)
    return response


# ── Calendar management ───────────────────────────────────

@router.get("/status")
def auth_status(request: Request):
    """Account info + whether Google Calendar is connected."""
    user_id = get_current_user_id(request)

    user_row = supabase.table("users").select("email").eq("id", user_id).execute()
    email = user_row.data[0]["email"] if user_row.data else None

    cal_row = supabase.table("google_tokens").select("user_id,preferred_calendar_id").eq("user_id", user_id).execute()
    calendar_connected = bool(cal_row.data)
    preferred_calendar_id = cal_row.data[0].get("preferred_calendar_id", "primary") if cal_row.data else None

    return {
        "connected": True,
        "user_id": user_id,
        "email": email,
        "calendar_connected": calendar_connected,
        "preferred_calendar_id": preferred_calendar_id,
    }


@router.get("/calendars")
async def list_calendars(request: Request):
    """List all Google Calendars the user has write access to."""
    user_id = get_current_user_id(request)
    try:
        calendars = await google_calendar.list_calendars(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"calendars": calendars}


@router.put("/calendar-preference")
def set_calendar_preference(request: Request, payload: CalendarPreferenceRequest):
    """Save the user's preferred calendar for new meeting events."""
    user_id = get_current_user_id(request)
    result = supabase.table("google_tokens").select("user_id").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Google Calendar is not connected.")
    supabase.table("google_tokens").update(
        {"preferred_calendar_id": payload.calendar_id}
    ).eq("user_id", user_id).execute()
    return {"status": "ok", "preferred_calendar_id": payload.calendar_id}


@router.delete("/disconnect")
def disconnect_google(request: Request):
    """Remove stored Google tokens — unlinks Google Calendar from this account."""
    user_id = get_current_user_id(request)
    supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
    return {"status": "disconnected"}


# ── Session management ────────────────────────────────────

@router.post("/logout/")
async def logout(request: Request):
    """Clear session cookie."""
    secure = _is_secure(request)
    response = JSONResponse(content={"status": "logged_out"})
    _clear_session_cookie(response, secure)
    return response


@router.delete("/account")
async def delete_account(request: Request):
    """GDPR Right to Erasure — wipes all user data and clears session."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Order matters: bookings → links → everything else → identity tables
    supabase.table("bookings").delete().eq("user_id", user_id).execute()
    supabase.table("one_time_links").delete().eq("user_id", user_id).execute()
    supabase.table("permanent_links").delete().eq("user_id", user_id).execute()
    supabase.table("availability_overrides").delete().eq("user_id", user_id).execute()
    supabase.table("availability_settings").delete().eq("user_id", user_id).execute()
    supabase.table("api_keys").delete().eq("user_id", user_id).execute()
    supabase.table("webhooks").delete().eq("user_id", user_id).execute()
    supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
    supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
    supabase.table("users").delete().eq("id", user_id).execute()

    secure = _is_secure(request)
    response = JSONResponse(content={"status": "account_deleted"})
    _clear_session_cookie(response, secure)
    return response
