"""
Webhooks router
---------------
POST /webhooks           → register a new endpoint
GET  /webhooks           → list registered endpoints
DELETE /webhooks/{id}    → remove an endpoint
GET  /webhooks/logs      → recent delivery logs
POST /webhooks/test      → send a test event to all endpoints
"""

import secrets
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from app.core.config import supabase, SECRET_KEY
from app.core.schemas import WebhookCreate
from app.webhooks import service as webhook_service
from app.webhooks.crypto import encrypt_secret, decrypt_secret

router = APIRouter()

VALID_EVENTS = [
    "booking.created",
    "booking.confirmed",
    "booking.cancelled",
    "link.used",
    "link.expired",
    "meet.link.created",
]


@router.post("/", status_code=201)
def register_webhook(request: Request, payload: WebhookCreate):
    """Register a new webhook endpoint."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    invalid = [e for e in payload.events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown events: {invalid}. Valid: {VALID_EVENTS}")

    raw_secret = payload.secret or secrets.token_hex(32)

    row = {
        "id":        str(uuid.uuid4()),
        "url":       payload.url,
        "secret_enc": encrypt_secret(raw_secret, SECRET_KEY),
        "events":    payload.events,
        "is_active": True,
        "user_id":   user_id,
    }
    result = supabase.table("webhooks").insert(row).execute()
    data = result.data[0]
    # Return the raw secret exactly once — the encrypted value is never exposed.
    data["secret"] = raw_secret
    data.pop("secret_enc", None)
    return data


@router.get("/")
def list_webhooks(request: Request):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    result = supabase.table("webhooks").select("id,url,events,is_active,created_at") \
        .eq("user_id", user_id).execute()
    return result.data


@router.delete("/{webhook_id}")
def delete_webhook(request: Request, webhook_id: str):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    result = supabase.table("webhooks").select("id").eq("id", webhook_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook not found")
    supabase.table("webhooks").delete().eq("id", webhook_id).execute()
    return {"status": "deleted", "id": webhook_id}


@router.patch("/{webhook_id}/toggle")
def toggle_webhook(request: Request, webhook_id: str):
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    result = supabase.table("webhooks").select("is_active").eq("id", webhook_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook not found")
    new_state = not result.data[0]["is_active"]
    supabase.table("webhooks").update({"is_active": new_state}).eq("id", webhook_id).execute()
    return {"is_active": new_state}


@router.get("/logs")
def get_webhook_logs(request: Request, limit: int = 50):
    """Recent webhook delivery logs scoped to the authenticated user's webhooks."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    user_webhooks = supabase.table("webhooks").select("id").eq("user_id", user_id).execute()
    webhook_ids = [w["id"] for w in user_webhooks.data]
    if not webhook_ids:
        return []
    result = supabase.table("webhook_logs").select("*") \
        .in_("webhook_id", webhook_ids) \
        .order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.post("/test")
async def send_test_event(request: Request, background_tasks: BackgroundTasks):
    """Fire a test event to all registered endpoints."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    test_data = {
        "booking_id":   "test_booking_001",
        "guest_name":   "Test User",
        "guest_email":  "test@example.com",
        "event_type":   "30-min intro call",
        "scheduled_at": "2026-04-01T10:00:00Z",
        "meet_link":    "https://meet.google.com/test-link-xxx",
        "status":       "confirmed",
        "_test":        True,
    }
    background_tasks.add_task(
        webhook_service.fire_event,
        "booking.created",
        test_data,
        user_id,
    )
    return {"status": "test event queued", "event": "booking.created"}
