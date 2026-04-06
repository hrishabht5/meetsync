"""
Bookings router
---------------
POST /bookings           → create booking (validate OTL, create Meet event, fire webhook)
GET  /bookings           → list all bookings for the host
GET  /bookings/{id}      → single booking detail
PATCH /bookings/{id}/cancel → cancel + delete Google Calendar event

── Guest Self-Serve (no auth) ─────────────────────────────
GET   /bookings/manage/{token}             → guest booking lookup
PATCH /bookings/manage/{token}/cancel      → guest-initiated cancellation
PATCH /bookings/manage/{token}/reschedule  → guest-initiated reschedule
"""

import logging
import secrets
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request

from app.core.config import supabase
from app.core.schemas import (
    BookingCreate,
    BookingCancel,
    BookingReschedule,
    BookingStatus,
    GuestBookingResponse,
)
from app.integrations import google_calendar
from app.links import service as otl_service
from app.profiles import service as profiles_service
from app.webhooks import service as webhook_service
from app.auth.middleware import get_current_user_id

router = APIRouter()


# ═══════════════════════════════════════════════════════════
#  Helper — preferred calendar for a host
# ═══════════════════════════════════════════════════════════
def _preferred_calendar_id(host_user_id: str) -> str:
    cal_row = supabase.table("google_tokens") \
        .select("preferred_calendar_id") \
        .eq("user_id", host_user_id) \
        .execute()
    return (
        cal_row.data[0].get("preferred_calendar_id") or "primary"
        if cal_row.data else "primary"
    )


# ═══════════════════════════════════════════════════════════
#  HOST-AUTHENTICATED ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/", status_code=201)
async def create_booking(request: Request, payload: BookingCreate, background_tasks: BackgroundTasks):
    """
    Full booking flow:
      1. Validate one-time link (if provided)
      2. Guard against double-booking
      3. Create Google Calendar event with Meet link
      4. Store booking in Supabase (with management_token)
      5. Mark OTL as used
      6. Fire webhooks in background
    """
    # ── 1. Validate OTL or Permanent Link ────────────────
    otl = None
    host_user_id = None
    link_custom_title = None
    if payload.permanent_link_id:
        plink = profiles_service.get_permanent_link_by_id(payload.permanent_link_id)
        if not plink:
            raise HTTPException(status_code=400, detail="Booking link not found")
        if not plink["is_active"]:
            raise HTTPException(status_code=400, detail="This booking link is no longer active")
        host_user_id = plink["user_id"]
        link_custom_title = plink.get("custom_title")
    elif payload.one_time_link_id:
        try:
            otl = otl_service.validate_otl(payload.one_time_link_id)
            host_user_id = otl.get("user_id")
            link_custom_title = otl.get("custom_title")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        host_user_id = get_current_user_id(request)

    if not host_user_id:
        raise HTTPException(status_code=400, detail="Missing host identity for booking")

    # ── 2. Guard against double-booking ──────────────────
    host_settings = supabase.table("availability_settings") \
        .select("allow_double_booking") \
        .eq("user_id", host_user_id) \
        .execute()
    allow_double = (
        host_settings.data[0].get("allow_double_booking", False)
        if host_settings.data else False
    )

    if not allow_double:
        scheduled_iso = payload.scheduled_at.isoformat()
        conflict = supabase.table("bookings") \
            .select("id") \
            .eq("user_id", host_user_id) \
            .eq("scheduled_at", scheduled_iso) \
            .neq("status", "cancelled") \
            .execute()
        if conflict.data:
            raise HTTPException(
                status_code=409,
                detail="This time slot has just been taken. Please go back and choose another time."
            )

    # ── 3. Create Google Meet event ───────────────────────
    duration_map = {
        "15-min quick chat": 15,
        "30-min intro call": 30,
        "60-min deep dive":  60,
    }
    duration = duration_map.get(payload.event_type, 30)
    preferred_cal = _preferred_calendar_id(host_user_id)
    display_title = link_custom_title or payload.event_type

    # Build calendar description with management link (will be filled after token is generated)
    management_token = secrets.token_hex(16)  # 32-char hex, 128-bit entropy
    manage_url = f"{request.headers.get('origin', 'https://meetsync.vercel.app')}/manage/{management_token}"
    cal_description = (
        f"{payload.notes or ''}\n\n"
        f"──────────────────\n"
        f"Manage this booking (cancel or reschedule):\n"
        f"{manage_url}"
    ).strip()

    try:
        meet_data = await google_calendar.create_meet_event(
            user_id      = host_user_id,
            guest_name   = payload.guest_name,
            guest_email  = payload.guest_email,
            summary      = f"{display_title} — {payload.guest_name}",
            start_dt     = payload.scheduled_at,
            duration_min = duration,
            description  = cal_description,
            calendar_id  = preferred_cal,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not create Google Calendar event: {e}")

    # ── 4. Store booking ──────────────────────────────────
    booking_id = str(uuid.uuid4())
    # management_token was already generated above for the calendar description
    booking_row = {
        "id":                booking_id,
        "guest_name":        payload.guest_name,
        "guest_email":       payload.guest_email,
        "scheduled_at":      payload.scheduled_at.isoformat(),
        "event_type":        payload.event_type,
        "custom_title":      link_custom_title or None,
        "notes":             payload.notes,
        "status":            BookingStatus.confirmed,
        "meet_link":         meet_data["meet_link"],
        "calendar_event_id": meet_data["calendar_event_id"],
        "one_time_link_id":   payload.one_time_link_id,
        "permanent_link_id":  payload.permanent_link_id,
        "custom_answers":     payload.custom_answers or {},
        "user_id":            host_user_id,
        "management_token":   management_token,
    }
    supabase.table("bookings").insert(booking_row).execute()

    # ── 5. Mark OTL used ──────────────────────────────────
    if otl:
        otl_service.mark_otl_used(payload.one_time_link_id, booking_id)

    # ── 6. Fire webhooks (background) ─────────────────────
    background_tasks.add_task(
        webhook_service.fire_event,
        "booking.created",
        {**booking_row, "meet_link": meet_data["meet_link"]},
        host_user_id,
    )
    if meet_data["meet_link"]:
        background_tasks.add_task(
            webhook_service.fire_event,
            "meet.link.created",
            {"booking_id": booking_id, "meet_link": meet_data["meet_link"]},
            host_user_id,
        )

    return booking_row


@router.get("/")
def list_bookings(request: Request, status: str = None, limit: int = 50):
    """List all bookings. Optional ?status=confirmed|pending|cancelled"""
    user_id = get_current_user_id(request)
    query = supabase.table("bookings").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    result = query.order("scheduled_at", desc=True).limit(limit).execute()
    return result.data


# ═══════════════════════════════════════════════════════════
#  GUEST SELF-SERVE ENDPOINTS (no authentication required)
#
#  ⚠️  These MUST be defined BEFORE /{booking_id} to avoid
#     FastAPI matching "manage" as a booking_id parameter.
# ═══════════════════════════════════════════════════════════

def _get_booking_by_token(management_token: str) -> dict:
    """Look up a booking by its management token. Raises 404 on miss."""
    result = supabase.table("bookings") \
        .select("*") \
        .eq("management_token", management_token) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found or link is invalid")
    return result.data[0]


@router.get("/manage/{management_token}")
def guest_get_booking(management_token: str):
    """
    Public endpoint — returns booking details for the management token.
    Only exposes guest-safe fields (no calendar_event_id, etc.).
    """
    booking = _get_booking_by_token(management_token)

    return GuestBookingResponse(
        id=booking["id"],
        guest_name=booking["guest_name"],
        guest_email=booking["guest_email"],
        scheduled_at=booking["scheduled_at"],
        event_type=booking["event_type"],
        custom_title=booking.get("custom_title"),
        status=booking["status"],
        meet_link=booking.get("meet_link"),
        notes=booking.get("notes"),
        custom_answers=booking.get("custom_answers"),
        created_at=booking.get("created_at"),
        host_user_id=booking.get("user_id"),
    )


@router.patch("/manage/{management_token}/cancel")
async def guest_cancel_booking(
    management_token: str,
    payload: BookingCancel,
    background_tasks: BackgroundTasks,
):
    """
    Guest-initiated cancellation.
    Validates token, checks booking isn't past/already cancelled,
    deletes GCal event, updates status, fires webhook.
    """
    booking = _get_booking_by_token(management_token)
    host_user_id = booking["user_id"]

    # Guard: already cancelled
    if booking["status"] == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="This booking has already been cancelled")

    # Guard: past booking
    scheduled_dt = datetime.fromisoformat(booking["scheduled_at"].replace("Z", "+00:00"))
    if scheduled_dt.tzinfo is None:
        scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
    if scheduled_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot cancel a booking that has already passed")

    # Delete Google Calendar event
    if booking.get("calendar_event_id"):
        try:
            cal_id = _preferred_calendar_id(host_user_id)
            await google_calendar.delete_calendar_event(
                host_user_id, booking["calendar_event_id"], cal_id
            )
        except Exception as e:
            logging.error(f"Failed to delete GCal event {booking['calendar_event_id']} for booking {booking['id']}: {e}")

    # Update booking status
    supabase.table("bookings").update({
        "status":            BookingStatus.cancelled,
        "cancellation_note": payload.reason or "Cancelled by guest",
    }).eq("id", booking["id"]).execute()

    # Fire webhook
    background_tasks.add_task(
        webhook_service.fire_event,
        "booking.cancelled",
        {**booking, "cancellation_reason": payload.reason or "Cancelled by guest", "cancelled_by": "guest"},
        host_user_id,
    )

    return {"status": "cancelled", "booking_id": booking["id"]}


@router.patch("/manage/{management_token}/reschedule")
async def guest_reschedule_booking(
    management_token: str,
    payload: BookingReschedule,
    background_tasks: BackgroundTasks,
):
    """
    Guest-initiated reschedule.
    1. Validate token + guards (not past, not cancelled)
    2. Check new time slot availability (double-booking guard)
    3. Delete old Google Calendar event
    4. Create new Google Calendar event at new time
    5. Update booking row in-place
    6. Fire booking.rescheduled webhook
    """
    booking = _get_booking_by_token(management_token)
    host_user_id = booking["user_id"]

    # Guard: already cancelled
    if booking["status"] == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled booking")

    # Guard: past booking
    scheduled_dt = datetime.fromisoformat(booking["scheduled_at"].replace("Z", "+00:00"))
    if scheduled_dt.tzinfo is None:
        scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
    if scheduled_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot reschedule a booking that has already passed")

    # Guard: new time also in the past
    new_dt = payload.new_scheduled_at
    if new_dt.tzinfo is None:
        new_dt = new_dt.replace(tzinfo=timezone.utc)
    if new_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="The new time must be in the future")

    # ── Double-booking guard for the new slot ─────────────
    new_iso = payload.new_scheduled_at.isoformat()
    conflict = supabase.table("bookings") \
        .select("id") \
        .eq("user_id", host_user_id) \
        .eq("scheduled_at", new_iso) \
        .neq("status", "cancelled") \
        .neq("id", booking["id"]) \
        .execute()
    if conflict.data:
        raise HTTPException(
            status_code=409,
            detail="This time slot has just been taken. Please choose another time."
        )

    # ── Delete old Google Calendar event ──────────────────
    old_event_id = booking.get("calendar_event_id")
    cal_id = _preferred_calendar_id(host_user_id)

    if old_event_id:
        try:
            await google_calendar.delete_calendar_event(
                host_user_id, old_event_id, cal_id
            )
        except Exception:
            pass  # Best-effort deletion

    # ── Create new Google Calendar event ──────────────────
    duration_map = {
        "15-min quick chat": 15,
        "30-min intro call": 30,
        "60-min deep dive":  60,
    }
    duration = duration_map.get(booking["event_type"], 30)
    display_title = booking.get("custom_title") or booking["event_type"]

    try:
        meet_data = await google_calendar.create_meet_event(
            user_id      = host_user_id,
            guest_name   = booking["guest_name"],
            guest_email  = booking["guest_email"],
            summary      = f"{display_title} — {booking['guest_name']}",
            start_dt     = payload.new_scheduled_at,
            duration_min = duration,
            description  = booking.get("notes"),
            calendar_id  = cal_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not create the new calendar event. Please try again. ({e})"
        )

    # ── Update booking row in-place ───────────────────────
    old_scheduled_at = booking["scheduled_at"]
    supabase.table("bookings").update({
        "scheduled_at":      payload.new_scheduled_at.isoformat(),
        "status":            BookingStatus.confirmed,
        "meet_link":         meet_data["meet_link"],
        "calendar_event_id": meet_data["calendar_event_id"],
    }).eq("id", booking["id"]).execute()

    # ── Fire webhook ──────────────────────────────────────
    background_tasks.add_task(
        webhook_service.fire_event,
        "booking.rescheduled",
        {
            "booking_id":         booking["id"],
            "guest_name":         booking["guest_name"],
            "guest_email":        booking["guest_email"],
            "previous_time":      old_scheduled_at,
            "new_time":           payload.new_scheduled_at.isoformat(),
            "meet_link":          meet_data["meet_link"],
            "rescheduled_by":     "guest",
        },
        host_user_id,
    )

    return {
        "status":       "rescheduled",
        "booking_id":   booking["id"],
        "scheduled_at": payload.new_scheduled_at.isoformat(),
        "meet_link":    meet_data["meet_link"],
    }


# ═══════════════════════════════════════════════════════════
#  HOST-AUTHENTICATED DETAIL ENDPOINTS
#  (Must come AFTER /manage/ routes to avoid path conflicts)
# ═══════════════════════════════════════════════════════════

@router.get("/{booking_id}")
def get_booking(request: Request, booking_id: str):
    user_id = get_current_user_id(request)
    result = supabase.table("bookings").select("*").eq("id", booking_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result.data[0]


@router.patch("/{booking_id}/cancel")
async def cancel_booking(request: Request, booking_id: str, payload: BookingCancel, background_tasks: BackgroundTasks):
    """Cancel a booking and delete the Google Calendar event."""
    user_id = get_current_user_id(request)
    result = supabase.table("bookings").select("*").eq("id", booking_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = result.data[0]
    if booking["status"] == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # Delete Google Calendar event
    if booking.get("calendar_event_id"):
        try:
            cancel_calendar_id = _preferred_calendar_id(user_id)
            await google_calendar.delete_calendar_event(
                user_id, booking["calendar_event_id"], cancel_calendar_id
            )
        except Exception as e:
            logging.error(f"Failed to delete GCal event {booking['calendar_event_id']} for booking {booking_id}: {e}")

    supabase.table("bookings").update({
        "status":            BookingStatus.cancelled,
        "cancellation_note": payload.reason,
    }).eq("id", booking_id).execute()

    background_tasks.add_task(
        webhook_service.fire_event,
        "booking.cancelled",
        {**booking, "cancellation_reason": payload.reason},
        user_id,
    )
    return {"status": "cancelled", "booking_id": booking_id}
