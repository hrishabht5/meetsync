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

from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo
from typing import List
from app.core.config import supabase
from app.core.rate_limit import guest_rate_limit
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
        "working_days":        ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "daily_shifts":        DEFAULT_SHIFTS,
        "slot_duration":       30,
        "buffer_minutes":      15,
        "timezone":            "Asia/Kolkata",
        "min_notice_hours":    0,
        "max_days_ahead":      None,
        "max_bookings_per_day": None,
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
    one_time_link_id: str | None = None,
    permanent_link_id: str | None = None,
    management_token: str | None = None,
    guest_timezone: str | None = None,
    _=Depends(guest_rate_limit),
):
    """
    Returns a list of available ISO-8601 time slots for a given date.
    Guests must supply one_time_link_id or permanent_link_id to identify the host.
    Authenticated hosts can omit link IDs to query their own availability.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Resolve host user_id from link token (guests) or auth session (hosts)
    if management_token:
        from app.core.config import supabase as _sb
        bk = _sb.table("bookings").select("user_id").eq("management_token", management_token).execute()
        if not bk.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        user_id = bk.data[0]["user_id"]
    elif one_time_link_id:
        from app.links.service import validate_otl
        try:
            otl = validate_otl(one_time_link_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        user_id = otl["user_id"]
    elif permanent_link_id:
        from app.profiles.service import get_permanent_link_by_id
        plink = get_permanent_link_by_id(permanent_link_id)
        if not plink or not plink.get("is_active"):
            raise HTTPException(status_code=400, detail="Invalid booking link")
        user_id = plink["user_id"]
    elif not user_id:
        from app.auth.middleware import get_current_user_id
        user_id = get_current_user_id(request)
    else:
        # user_id passed directly — must be authenticated as that user
        from app.auth.middleware import get_current_user_id
        try:
            auth_uid = get_current_user_id(request)
        except HTTPException:
            raise HTTPException(
                status_code=403,
                detail="A booking link (one_time_link_id or permanent_link_id) is required to view availability.",
            )
        if auth_uid != user_id:
            raise HTTPException(status_code=403, detail="Cannot view another user's availability directly")

    try:
        settings = _get_settings(user_id)
    except Exception:
        return {"date": date, "slots": [], "timezone": "UTC"}
    allow_double        = settings.get("allow_double_booking", False)
    min_notice_hours    = settings.get("min_notice_hours", 0) or 0
    max_days_ahead      = settings.get("max_days_ahead")
    max_bookings_per_day = settings.get("max_bookings_per_day")

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

    # ── Guest timezone: adjust target_date + build day boundaries ──────────
    # When a guest in UTC-8 picks "April 7", they mean April 7 in their clock,
    # not the host's clock. Use noon as anchor to find the correct host-tz date,
    # then filter to only return slots that fall within the guest's April 7.
    guest_day_start = guest_day_end = None
    original_target_date = target_date
    if guest_timezone:
        try:
            guest_tz_info = ZoneInfo(guest_timezone)
            guest_noon = datetime.combine(original_target_date, time(12, 0), tzinfo=guest_tz_info)
            host_noon = guest_noon.astimezone(tz)
            target_date = host_noon.date()
            guest_day_start = datetime.combine(original_target_date, time(0, 0), tzinfo=guest_tz_info)
            guest_day_end   = datetime.combine(original_target_date, time(23, 59, 59), tzinfo=guest_tz_info)
        except Exception:
            pass  # Invalid tz string — fall back silently

    slots: List[str] = []
    for shift_time_str in shifts:
        try:
            h, m = map(int, shift_time_str.split(":"))
            slot_dt = datetime.combine(target_date, time(h, m), tzinfo=tz)
            slots.append(slot_dt.isoformat())
        except (ValueError, TypeError):
            continue  # skip malformed shift entries

    now            = datetime.now(tz=tz)
    notice_cutoff  = now + timedelta(hours=min_notice_hours)
    window_cutoff  = (now + timedelta(days=max_days_ahead)) if max_days_ahead is not None else None

    # Always check DraftMeet DB bookings (these are always managed)
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
        # Check both "primary" and the user's preferred calendar so that events
        # created by external apps on any connected calendar block the slot.
        token_row = supabase.table("google_tokens") \
            .select("preferred_calendar_id") \
            .eq("user_id", user_id) \
            .execute()
        cal_ids = ["primary"]
        if token_row.data and token_row.data[0].get("preferred_calendar_id"):
            pref = token_row.data[0]["preferred_calendar_id"]
            if pref and pref != "primary":
                cal_ids.append(pref)
        google_busy = await get_google_busy_times(user_id, start_dt_utc, end_dt_utc, cal_ids)

    # Remove conflicting slots
    from app.core.schemas import DURATION_MAP
    event_duration = DURATION_MAP.get(event_type, slot_duration)

    def conflicts(slot_start: datetime) -> bool:
        slot_end = slot_start + timedelta(minutes=event_duration)
        
        # Check local DraftMeet bookings (always)
        for bk in booked:
            # Parse DB ISO string safely
            bk_iso = bk["scheduled_at"].replace("Z", "+00:00")
            bk_start = datetime.fromisoformat(bk_iso)
            if bk_start.tzinfo is None:
                bk_start = bk_start.replace(tzinfo=timezone.utc)
            bk_dur = int(DURATION_MAP.get(bk["event_type"], slot_duration) or slot_duration)
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

    def in_guest_day(slot_dt: datetime) -> bool:
        if guest_day_start is None:
            return True
        slot_in_guest_tz = slot_dt.astimezone(guest_day_start.tzinfo)
        return guest_day_start <= slot_in_guest_tz <= guest_day_end

    # Enforce daily cap early — return empty if the day is already full
    if max_bookings_per_day is not None and len(booked) >= max_bookings_per_day:
        return {"date": date, "slots": [], "reason": "No availability remaining for this day", "timezone": settings["timezone"]}

    available = [
        s for s in slots
        if (dt := datetime.fromisoformat(s)) > notice_cutoff
        and (window_cutoff is None or dt <= window_cutoff)
        and not conflicts(dt)
        and in_guest_day(dt)
    ]

    return {
        "date": date,
        "slots": available,
        "timezone": settings["timezone"],
        **({"guest_timezone": guest_timezone} if guest_timezone else {}),
    }


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
    settings_dict = payload.model_dump()
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
    row = payload.model_dump()
    row["user_id"] = user_id
    result = supabase.table("availability_overrides").upsert(row, on_conflict="user_id,override_date").execute()
    return result.data[0] if result.data else row


@router.delete("/overrides/{override_id}")
def delete_override(request: Request, override_id: str):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    supabase.table("availability_overrides").delete().eq("id", override_id).eq("user_id", user_id).execute()
    return {"status": "deleted", "id": override_id}
