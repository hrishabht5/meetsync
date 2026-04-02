"""
Bookings router
---------------
POST /bookings           → create booking (validate OTL, create Meet event, fire webhook)
GET  /bookings           → list all bookings for the host
GET  /bookings/{id}      → single booking detail
PATCH /bookings/{id}/cancel → cancel + delete Google Calendar event
"""

import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request

from app.core.config import supabase
from app.core.schemas import BookingCreate, BookingCancel, BookingStatus
from app.integrations import google_calendar
from app.links import service as otl_service
from app.profiles import service as profiles_service
from app.webhooks import service as webhook_service
from app.auth.middleware import get_current_user_id

router = APIRouter()

@router.post("/", status_code=201)
async def create_booking(request: Request, payload: BookingCreate, background_tasks: BackgroundTasks):
    """
    Full booking flow:
      1. Validate one-time link (if provided)
      2. Guard against double-booking
      3. Create Google Calendar event with Meet link
      4. Store booking in Supabase
      5. Mark OTL as used
      6. Fire webhooks in background
    """
    # ── 1. Validate OTL or Permanent Link ────────────────
    otl = None
    host_user_id = None
    if payload.permanent_link_id:
        # Permanent link path — link is never consumed
        plink = profiles_service.get_permanent_link_by_id(payload.permanent_link_id)
        if not plink:
            raise HTTPException(status_code=400, detail="Booking link not found")
        if not plink["is_active"]:
            raise HTTPException(status_code=400, detail="This booking link is no longer active")
        host_user_id = plink["user_id"]
    elif payload.one_time_link_id:
        try:
            otl = otl_service.validate_otl(payload.one_time_link_id)
            host_user_id = otl.get("user_id")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # In the public booking flow, a link id is always provided.
        # This fallback supports any future host-side booking creation.
        host_user_id = get_current_user_id(request)

    if not host_user_id:
        raise HTTPException(status_code=400, detail="Missing host identity for booking")

    # ── 2. Guard against double-booking ──────────────────
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

    # Fetch preferred calendar for this host (falls back to "primary")
    cal_row = supabase.table("google_tokens") \
        .select("preferred_calendar_id") \
        .eq("user_id", host_user_id) \
        .execute()
    preferred_calendar_id = (
        cal_row.data[0].get("preferred_calendar_id") or "primary"
        if cal_row.data else "primary"
    )

    try:
        meet_data = await google_calendar.create_meet_event(
            user_id      = host_user_id,
            guest_name   = payload.guest_name,
            guest_email  = payload.guest_email,
            summary      = f"{payload.event_type} — {payload.guest_name}",
            start_dt     = payload.scheduled_at,
            duration_min = duration,
            description  = payload.notes,
            calendar_id  = preferred_calendar_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not create Google Calendar event: {e}")

    # ── 4. Store booking ──────────────────────────────────
    booking_id = str(uuid.uuid4())
    booking_row = {
        "id":                booking_id,
        "guest_name":        payload.guest_name,
        "guest_email":       payload.guest_email,
        "scheduled_at":      payload.scheduled_at.isoformat(),
        "event_type":        payload.event_type,
        "notes":             payload.notes,
        "status":            BookingStatus.confirmed,
        "meet_link":         meet_data["meet_link"],
        "calendar_event_id": meet_data["calendar_event_id"],
        "one_time_link_id":   payload.one_time_link_id,
        "permanent_link_id":  payload.permanent_link_id,
        "custom_answers":     payload.custom_answers or {},
        "user_id":            host_user_id,
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
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    query = supabase.table("bookings").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    result = query.order("scheduled_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/{booking_id}")
def get_booking(request: Request, booking_id: str):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    result = supabase.table("bookings").select("*").eq("id", booking_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result.data[0]


@router.patch("/{booking_id}/cancel")
async def cancel_booking(request: Request, booking_id: str, payload: BookingCancel, background_tasks: BackgroundTasks):
    """Cancel a booking and delete the Google Calendar event."""
    from app.auth.middleware import get_current_user_id
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
            cal_row = supabase.table("google_tokens") \
                .select("preferred_calendar_id") \
                .eq("user_id", user_id) \
                .execute()
            cancel_calendar_id = (
                cal_row.data[0].get("preferred_calendar_id") or "primary"
                if cal_row.data else "primary"
            )
            await google_calendar.delete_calendar_event(
                user_id, booking["calendar_event_id"], cancel_calendar_id
            )
        except Exception:
            pass  # Don't block cancellation if Google API fails

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
