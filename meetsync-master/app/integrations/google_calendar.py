"""
Google Calendar service
-----------------------
Handles OAuth2 token exchange, token refresh, and calendar event creation
with Google Meet conference links.

Flow:
  1. /auth/google          → redirect user to Google consent screen
  2. /auth/callback?code=  → exchange code for tokens, store in Supabase
  3. create_meet_event()   → use stored tokens to create calendar event + Meet link
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from app.core.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    supabase,
)

# Identity-only scopes — used for Google Sign-In (no calendar access)
SCOPES_SIGNIN = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# Calendar scopes — used only when user explicitly connects Google Calendar
SCOPES_CALENDAR = [
    "https://www.googleapis.com/auth/calendar",  # covers events, freebusy, and calendarList
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
]

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API     = "https://www.googleapis.com/calendar/v3"


# ── OAuth2 ────────────────────────────────────────────────

def get_auth_url(state: str = "signin") -> str:
    """
    Return the Google OAuth2 consent screen URL.
    state='signin'  → identity-only scopes (email + profile, no calendar)
    state='connect' → calendar scope (+ email so callback can upsert the user row)
    """
    scopes = SCOPES_CALENDAR if state.startswith("connect") else SCOPES_SIGNIN
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(scopes),
        "access_type":   "offline",   # request refresh_token
        "prompt":        "consent",   # force consent so we always get refresh_token
        "state":         state,
    }
    query = urlencode(params)
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
    resp.raise_for_status()
    return resp.json()


async def refresh_access_token(user_id: str, refresh_token: str) -> str:
    """
    Use the stored refresh_token to obtain a new short-lived access_token.

    Raises ValueError (not httpx.HTTPStatusError) so callers can present
    a human-readable "reconnect your calendar" message instead of a 500.
    On 400/401 from Google (token revoked or expired) the stored tokens are
    deleted so auth_status correctly reports calendar_connected=false.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type":    "refresh_token",
        })

    if resp.status_code in (400, 401):
        # Token has been revoked or expired — clear it so the UI shows
        # "reconnect" rather than silently failing on every subsequent request.
        try:
            supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
        except Exception:
            pass
        raise ValueError(
            "Google Calendar access was revoked. Please reconnect your Google Calendar in Settings."
        )

    resp.raise_for_status()
    return resp.json()["access_token"]


async def get_valid_access_token(user_id: str) -> str:
    """
    Retrieve stored tokens for a user.
    If the access token is expired, refresh it automatically.
    Raises ValueError if Google Calendar is not connected or tokens are revoked.
    """
    try:
        result = supabase.table("google_tokens").select("*").eq("user_id", user_id).single().execute()
        token_row = result.data
    except Exception:
        raise ValueError("Google Calendar is not connected. Please reconnect your Google account in Settings.")

    if not token_row:
        raise ValueError("Google Calendar is not connected. Please reconnect your Google account in Settings.")

    if not token_row.get("refresh_token"):
        # Stored without a refresh token — calendar cannot be used
        supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
        raise ValueError(
            "Google Calendar connection is incomplete. Please reconnect your Google Calendar in Settings."
        )

    # Check expiry (store expires_at as ISO string in DB)
    expires_at = datetime.fromisoformat(token_row["expires_at"].replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= expires_at - timedelta(minutes=5):
        new_access_token = await refresh_access_token(user_id, token_row["refresh_token"])
        new_expires_at   = datetime.now(timezone.utc) + timedelta(seconds=3600)
        supabase.table("google_tokens").update({
            "access_token": new_access_token,
            "expires_at":   new_expires_at.isoformat(),
        }).eq("user_id", user_id).execute()
        return new_access_token

    return token_row["access_token"]


def store_tokens(user_id: str, token_data: dict):
    """
    Upsert Google tokens for a user into Supabase.
    Raises ValueError if Google did not return a refresh_token — this
    happens when the user has already granted consent but access was not
    re-approved, meaning the existing token may still be valid.
    """
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise ValueError(
            "Google did not return a refresh token. Please revoke DraftMeet's access in your "
            "Google account settings and reconnect to grant offline access."
        )
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))
    supabase.table("google_tokens").upsert({
        "user_id":       user_id,
        "access_token":  token_data["access_token"],
        "refresh_token": refresh_token,
        "expires_at":    expires_at.isoformat(),
    }).execute()


# ── Calendar Events ───────────────────────────────────────

async def list_calendars(user_id: str) -> list[dict]:
    """
    Return all calendars the user has access to.
    Used to populate the calendar picker in Settings.
    """
    access_token = await get_valid_access_token(user_id)
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{CALENDAR_API}/users/me/calendarList",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code in (401, 403):
        # Token is invalid or lacks calendar scope — clear it so calendar_connected returns false
        supabase.table("google_tokens").delete().eq("user_id", user_id).execute()
        raise ValueError("Google Calendar access was denied. Please reconnect your Google Calendar in Settings.")
    resp.raise_for_status()
    items = resp.json().get("items", [])
    return [
        {
            "id":      c["id"],
            "summary": c.get("summary", c["id"]),
            "primary": c.get("primary", False),
        }
        for c in items
    ]


async def get_google_busy_times(
    user_id: str,
    start_dt: datetime,
    end_dt: datetime,
    calendar_ids: "list[str] | str" = "primary",
) -> list[dict]:
    """
    Fetch the user's Free/Busy schedule from Google Calendar.
    Accepts a single calendar ID string or a list of IDs — deduplicates and
    queries all of them in one freeBusy request so external-app events on
    non-primary calendars are included in double-booking checks.
    Returns a list of dicts with 'start' and 'end' datetimes.
    If the user has no Google token, gracefully returns empty list.
    """
    import logging
    try:
        access_token = await get_valid_access_token(user_id)
    except ValueError:
        return []
    except Exception as e:
        logging.warning(f"[GCal] get_valid_access_token failed for user {user_id}: {e}")
        return []

    if isinstance(calendar_ids, str):
        calendar_ids = [calendar_ids]
    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_ids: list[str] = []
    for cid in calendar_ids:
        if cid and cid not in seen:
            seen.add(cid)
            unique_ids.append(cid)

    body = {
        "timeMin": start_dt.isoformat(),
        "timeMax": end_dt.isoformat(),
        "timeZone": "UTC",
        "items": [{"id": cid} for cid in unique_ids],
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{CALENDAR_API}/freeBusy",
            headers={"Authorization": f"Bearer {access_token}"},
            json=body,
        )
    if resp.status_code != 200:
        return []

    data = resp.json()
    calendars_data = data.get("calendars", {})
    result = []
    for cid in unique_ids:
        busy_list = calendars_data.get(cid, {}).get("busy", [])
        for b in busy_list:
            start = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            result.append({"start": start, "end": end})
    return result



async def create_meet_event(
    user_id:      str,
    guest_name:   str,
    guest_email:  str,
    summary:      str,
    start_dt:     datetime,
    duration_min: int = 30,
    description:  Optional[str] = None,
    calendar_id:  str = "primary",
) -> dict:
    """
    Create a Google Calendar event with a Google Meet link.

    Returns:
        {
            "meet_link": "https://meet.google.com/xxx-yyyy-zzz",
            "calendar_event_id": "abc123xyz",
            "html_link": "https://calendar.google.com/..."
        }
    """
    access_token = await get_valid_access_token(user_id)
    end_dt       = start_dt + timedelta(minutes=duration_min)

    event_body = {
        "summary":     summary,
        "description": description or f"Meeting with {guest_name}",
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": "UTC",
        },
        "attendees": [
            {"email": guest_email, "displayName": guest_name},
        ],
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email",  "minutes": 60},
                {"method": "popup",  "minutes": 10},
            ],
        },
        "guestsCanModifyEvent": False,
        "sendUpdates": "all",  # Google sends invite email to attendees
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{CALENDAR_API}/calendars/{calendar_id}/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"conferenceDataVersion": 1},
            json=event_body,
        )
    resp.raise_for_status()
    event = resp.json()

    meet_link = None
    if "conferenceData" in event:
        for ep in event["conferenceData"].get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_link = ep["uri"]
                break

    return {
        "meet_link":         meet_link,
        "calendar_event_id": event["id"],
        "html_link":         event.get("htmlLink"),
    }


async def delete_calendar_event(user_id: str, event_id: str, calendar_id: str = "primary"):
    """Cancel/delete a Google Calendar event."""
    access_token = await get_valid_access_token(user_id)
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.delete(
            f"{CALENDAR_API}/calendars/{calendar_id}/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "all"},
        )
    if resp.status_code not in (200, 204, 410):
        resp.raise_for_status()
