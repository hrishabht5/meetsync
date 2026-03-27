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
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from app.core.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    supabase,
)

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "email",
    "profile",
]

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API     = "https://www.googleapis.com/calendar/v3"


# ── OAuth2 ────────────────────────────────────────────────

def get_auth_url() -> str:
    """Return the Google OAuth2 consent screen URL."""
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",   # request refresh_token
        "prompt":        "consent",   # force consent so we always get refresh_token
    }
    query = urlencode(params)
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
    resp.raise_for_status()
    return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    """Use stored refresh_token to get a new short-lived access_token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type":    "refresh_token",
        })
    resp.raise_for_status()
    return resp.json()["access_token"]


async def get_valid_access_token(user_id: str) -> str:
    """
    Retrieve stored tokens for a user.
    If the access token is expired, refresh it automatically.
    """
    result = supabase.table("google_tokens").select("*").eq("user_id", user_id).single().execute()
    token_row = result.data

    # Check expiry (store expires_at as ISO string in DB)
    expires_at = datetime.fromisoformat(token_row["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
    if datetime.utcnow() >= expires_at - timedelta(minutes=5):
        # Refresh token
        new_access_token = await refresh_access_token(token_row["refresh_token"])
        new_expires_at   = datetime.utcnow() + timedelta(seconds=3600)
        supabase.table("google_tokens").update({
            "access_token": new_access_token,
            "expires_at":   new_expires_at.isoformat(),
        }).eq("user_id", user_id).execute()
        return new_access_token

    return token_row["access_token"]


def store_tokens(user_id: str, token_data: dict):
    """Upsert Google tokens for a user into Supabase."""
    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
    supabase.table("google_tokens").upsert({
        "user_id":       user_id,
        "access_token":  token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "expires_at":    expires_at.isoformat(),
    }).execute()


# ── Calendar Events ───────────────────────────────────────

async def create_meet_event(
    user_id:      str,
    guest_name:   str,
    guest_email:  str,
    summary:      str,
    start_dt:     datetime,
    duration_min: int = 30,
    description:  Optional[str] = None,
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

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CALENDAR_API}/calendars/primary/events",
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


async def delete_calendar_event(user_id: str, event_id: str):
    """Cancel/delete a Google Calendar event."""
    access_token = await get_valid_access_token(user_id)
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{CALENDAR_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "all"},
        )
    if resp.status_code not in (200, 204, 410):
        resp.raise_for_status()
