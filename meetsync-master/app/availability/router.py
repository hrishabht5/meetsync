"""
Availability router (V2 — Shift-Based with Date Overrides)
------------------------------------------------------------
GET  /availability/slots?date=2026-04-01&event_type=30-min+intro+call
PUT  /availability/settings
GET  /availability/settings
POST /availability/overrides          → block/override a specific date
GET  /availability/overrides          → list all overrides
DELETE /availability/overrides/{id}   → remove an override
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo
from typing import List
from app.core.config import supabase
from app.core.schemas import AvailabilitySettings, AvailabilityOverrideCreate
import json

router = APIRouter()

DAY_MAP = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}

DEFAULT_SHIFTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30"
]


def _get_settings(user_id: str) -> dict:
    result = supabase.table("availability_settings").select("*").eq("user_id", user_id).execute()
    if result.data:
        row = result.data[0]
        # Ensure daily_shifts is always a list
        if isinstance(row.get("daily_shifts"), str):
            row["daily_shifts"] = json.loads(row["daily_shifts"])
        if not row.get("daily_shifts"):
            row["daily_shifts"] = DEFAULT_SHIFTS
        return row
    # Defaults
    return {
        "working_days":   ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "daily_shifts":   DEFAULT_SHIFTS,
        "slot_duration":  30,
        "buffer_minutes": 15,
        "timezone":       "Asia/Kolkata",
    }


def _get_override(user_id: str, target_date: str) -> dict | None:
    """Check if a specific date has an override."""
    result = supabase.table("availability_overrides") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("override_date", target_date) \
        .execute()
    return result.data[0] if result.data else None


@router.get("/slots")
async def get_available_slots(
    request: Request,
    date: str,
    event_type: str = "30-min intro call",
    user_id: str | None = None,
):
    """
    Returns a list of available ISO-8601 time slots for a given date.
    Uses shift-based availability and respects date overrides.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # For guests: `user_id` comes from the booking link's host.
    # For hosts/admin dashboard: it comes from the authenticated cookie.
    if not user_id:
        from app.auth.middleware import get_current_user_id
        user_id = get_current_user_id(request)

    settings = _get_settings(user_id)
    allow_double = settings.get("allow_double_booking", False)

    # Check for date override first
    override = _get_override(user_id, date)
    if override:
        if not override["is_available"]:
            return {"date": date, "slots": [], "reason": override.get("reason") or "Blocked out by host"}
        # If override has custom shifts, use those instead
        if override.get("custom_shifts"):
            shifts = override["custom_shifts"]
            if isinstance(shifts, str):
                shifts = json.loads(shifts)
        else:
            shifts = settings["daily_shifts"]
    else:
        # Check if target day is a working day
        day_name = target_date.strftime("%a")
        if day_name not in settings["working_days"]:
            return {"date": date, "slots": [], "reason": "Not a working day"}
        shifts = settings["daily_shifts"]

    # Build slots from discrete shifts
    slot_duration = settings["slot_duration"]
    buffer = settings["buffer_minutes"]
    try:
        tz = ZoneInfo(settings.get("timezone", "UTC"))
    except:
        tz = timezone.utc

    slots: List[str] = []
    for shift_time_str in shifts:
        h, m = map(int, shift_time_str.split(":"))
        slot_dt = datetime.combine(target_date, time(h, m), tzinfo=tz)
        slots.append(slot_dt.isoformat())

    now = datetime.now(tz=tz)

    # Always check MeetSync DB bookings (these are always managed)
    day_start_local = datetime.combine(target_date, time(0, 0), tzinfo=tz)
    day_end_local = datetime.combine(target_date, time(23, 59, 59), tzinfo=tz)
    start_dt_utc = day_start_local.astimezone(timezone.utc)
    end_dt_utc = day_end_local.astimezone(timezone.utc)
    booked = supabase.table("bookings") \
        .select("scheduled_at,event_type,status") \
        .eq("user_id", user_id) \
        .neq("status", "cancelled") \
        .gte("scheduled_at", start_dt_utc.isoformat()) \
        .lte("scheduled_at", end_dt_utc.isoformat()) \
        .execute().data

    # Only check Google Calendar when Double Booking Prevention is ON
    # (allow_double=False means prevention is active → check external calendar)
    google_busy = []
    if not allow_double:
        from app.integrations.google_calendar import get_google_busy_times
        google_busy = await get_google_busy_times(user_id, start_dt_utc, end_dt_utc)

    # Remove conflicting slots
    duration_map = {"15-min quick chat": 15, "30-min intro call": 30, "60-min deep dive": 60}
    event_duration = duration_map.get(event_type, slot_duration)

    def conflicts(slot_start: datetime) -> bool:
        slot_end = slot_start + timedelta(minutes=event_duration)
        
        # Check local MeetSync bookings (always)
        for bk in booked:
            # Parse DB ISO string safely
            bk_iso = bk["scheduled_at"].replace("Z", "+00:00")
            bk_start = datetime.fromisoformat(bk_iso)
            if bk_start.tzinfo is None:
                bk_start = bk_start.replace(tzinfo=timezone.utc)
            bk_dur = int(duration_map.get(bk["event_type"], slot_duration) or slot_duration)
            bk_end = bk_start + timedelta(minutes=bk_dur + buffer)
            if not (slot_end <= bk_start - timedelta(minutes=buffer) or slot_start >= bk_end):
                return True
                
        # Check Google Calendar busy blocks (only when prevention is ON)
        for busy in google_busy:
            busy_start = busy["start"]
            busy_end = busy["end"]
            busy_padded_start = busy_start - timedelta(minutes=buffer)
            busy_padded_end = busy_end + timedelta(minutes=buffer)
            if not (slot_end <= busy_padded_start or slot_start >= busy_padded_end):
                return True

        return False

    available = [
        s for s in slots
        if (dt := datetime.fromisoformat(s)) > now and not conflicts(dt)
    ]

    return {"date": date, "slots": available, "timezone": settings["timezone"]}


# ── Settings CRUD ─────────────────────────────────────────

@router.get("/settings")
def get_settings(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    return _get_settings(user_id)


@router.put("/settings")
def update_settings(request: Request, payload: AvailabilitySettings):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    settings_dict = payload.dict()
    settings_dict["user_id"] = user_id
    supabase.table("availability_settings").upsert(settings_dict).execute()
    return {"status": "updated", **settings_dict}


# ── Date Overrides CRUD ──────────────────────────────────

@router.get("/overrides")
def list_overrides(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    result = supabase.table("availability_overrides") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("override_date") \
        .execute()
    return result.data


@router.post("/overrides", status_code=201)
def create_override(request: Request, payload: AvailabilityOverrideCreate):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    row = payload.dict()
    row["user_id"] = user_id
    result = supabase.table("availability_overrides").upsert(row, on_conflict="user_id,override_date").execute()
    return result.data[0] if result.data else row


@router.delete("/overrides/{override_id}")
def delete_override(request: Request, override_id: str):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    supabase.table("availability_overrides").delete().eq("id", override_id).eq("user_id", user_id).execute()
    return {"status": "deleted", "id": override_id}
