"""
Webhook Dispatcher
-------------------
After each booking event, this service:
  1. Looks up all active webhook endpoints subscribed to that event
  2. Builds a signed JSON payload
  3. POSTs to each endpoint with retry logic (3 attempts, exponential backoff)
  4. Logs delivery status to Supabase for the admin dashboard

Signature:
  Each request includes  X-MeetSync-Signature: sha256=<hmac>
  Customers verify this using their stored secret key.
"""

import hashlib
import hmac
import json
import uuid
import asyncio
from datetime import datetime
from typing import Any

import httpx
from config import supabase


# ── Signing ───────────────────────────────────────────────

def _sign_payload(secret: str, payload: bytes) -> str:
    """Return 'sha256=<hex>' HMAC signature."""
    mac = hmac.new(secret.encode(), payload, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


# ── Core Dispatcher ───────────────────────────────────────

async def _deliver(endpoint: dict, event_name: str, payload: dict):
    """
    Attempt delivery to a single endpoint with up to 3 retries.
    Logs each attempt to webhook_logs in Supabase.
    """
    payload_bytes = json.dumps(payload, default=str).encode()
    headers = {
        "Content-Type":          "application/json",
        "X-MeetSync-Event":      event_name,
        "X-MeetSync-Delivery":   str(uuid.uuid4()),
        "User-Agent":            "MeetSync-Webhooks/1.0",
    }
    if endpoint.get("secret"):
        headers["X-MeetSync-Signature"] = _sign_payload(endpoint["secret"], payload_bytes)

    status_code = None
    error_msg   = None
    success     = False

    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(endpoint["url"], content=payload_bytes, headers=headers)
            status_code = resp.status_code
            if resp.status_code < 300:
                success = True
                break
            # Retry on 5xx
            if resp.status_code < 500:
                break
        except Exception as e:
            error_msg = str(e)

        if attempt < 3:
            await asyncio.sleep(2 ** attempt)  # 2s, 4s backoff

    # Log to Supabase
    supabase.table("webhook_logs").insert({
        "webhook_id":  endpoint["id"],
        "event":       event_name,
        "payload":     payload,
        "status_code": status_code,
        "success":     success,
        "error":       error_msg,
        "attempts":    attempt,
    }).execute()


async def fire_event(event_name: str, data: Any, user_id: str = None):
    """
    Fire a webhook event to all matching registered endpoints.

    Usage:
        await fire_event("booking.created", booking_dict, user_id=host_id)

    Supported events:
        booking.created     booking.confirmed    booking.cancelled
        link.used           link.expired         meet.link.created
    """
    # Fetch active endpoints subscribed to this event
    result = supabase.table("webhooks") \
        .select("*") \
        .eq("is_active", True) \
        .execute()

    endpoints = [
        ep for ep in result.data
        if event_name in ep.get("events", [])
        and (user_id is None or ep.get("user_id") == user_id)
    ]

    if not endpoints:
        return

    payload = {
        "event":      event_name,
        "id":         f"evt_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "data":       data,
    }

    # Fire all deliveries concurrently
    await asyncio.gather(*[_deliver(ep, event_name, payload) for ep in endpoints])
