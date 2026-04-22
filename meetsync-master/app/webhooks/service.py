"""
Webhook Dispatcher
-------------------
After each booking event, this service:
  1. Looks up all active webhook endpoints subscribed to that event
  2. Builds a signed JSON payload
  3. POSTs to each endpoint with retry logic (3 attempts, exponential backoff)
  4. Logs delivery status to Supabase for the admin dashboard

Signature:
  Each request includes  X-DraftMeet-Signature: sha256=<hmac>
  Customers verify this using their stored secret key.
"""

import hashlib
import hmac
import ipaddress
import json
import socket
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx
from app.core.config import supabase
from app.core.logger import logger


# ── Signing ───────────────────────────────────────────────

def _sign_payload(secret: str, payload: bytes) -> str:
    """Return 'sha256=<hex>' HMAC signature."""
    mac = hmac.new(secret.encode(), payload, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


# ── SSRF guard ─────────────────────────────────────────────

def _assert_url_still_public(url: str) -> None:
    """
    Re-resolve the webhook URL hostname at delivery time and reject any
    address that has become private since registration (DNS rebinding).

    The validator in WebhookCreate already checked this at registration
    time, but DNS TTLs can change. An attacker can register a URL that
    resolves to a public IP then switch DNS to an internal address after
    the one-time validation passes.

    Raises ValueError if the current DNS resolution points to a
    non-global (private/loopback/link-local) address.
    """
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError(f"Webhook URL has no hostname: {url}")
    try:
        resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))
    except socket.gaierror as exc:
        raise ValueError(f"Webhook hostname {hostname!r} could not be resolved: {exc}")
    if not resolved_ip.is_global:
        raise ValueError(
            f"Webhook URL {hostname!r} now resolves to a non-public address "
            f"({resolved_ip}) — delivery blocked to prevent SSRF."
        )


# ── Core Dispatcher ───────────────────────────────────────

async def _deliver(endpoint: dict, event_name: str, payload: dict):
    """
    Attempt delivery to a single endpoint with up to 3 retries.
    Logs each attempt to webhook_logs in Supabase.
    """
    # Re-validate that the URL still points to a public host — guards against
    # DNS rebinding attacks where the hostname resolves public at registration
    # time but switches to an internal IP at delivery time.
    try:
        _assert_url_still_public(endpoint["url"])
    except ValueError as ssrf_err:
        logger.error(
            "Webhook %s blocked: SSRF guard rejected URL at delivery time: %s",
            endpoint["id"], ssrf_err,
        )
        try:
            supabase.table("webhook_logs").insert({
                "webhook_id":  endpoint["id"],
                "event":       event_name,
                "payload":     payload,
                "status_code": None,
                "success":     False,
                "error":       f"SSRF guard: {ssrf_err}",
                "attempts":    0,
            }).execute()
        except Exception:
            pass
        return

    payload_bytes = json.dumps(payload, default=str).encode()
    headers = {
        "Content-Type":          "application/json",
        "X-DraftMeet-Event":      event_name,
        "X-DraftMeet-Delivery":   str(uuid.uuid4()),
        "User-Agent":            "DraftMeet-Webhooks/1.0",
    }
    if endpoint.get("secret"):
        headers["X-DraftMeet-Signature"] = _sign_payload(endpoint["secret"], payload_bytes)

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

    if not success:
        logger.warning(f"Webhook {endpoint['id']} failed out after {attempt} attempts", extra={
            "webhook_id": endpoint['id'],
            "event": event_name,
            "error": error_msg,
            "status_code": status_code
        })
    else:
        logger.info(f"Webhook {endpoint['id']} delivered on attempt {attempt}", extra={
            "webhook_id": endpoint['id'],
            "event": event_name,
            "status_code": status_code
        })

    # Log to Supabase for the user dashboard
    try:
        supabase.table("webhook_logs").insert({
            "webhook_id":  endpoint["id"],
            "event":       event_name,
            "payload":     payload,
            "status_code": status_code,
            "success":     success,
            "error":       error_msg,
            "attempts":    attempt,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to write webhook log to DB: {str(e)}", exc_info=True)


async def fire_event(event_name: str, data: Any, user_id: str = None):
    """
    Fire a webhook event to all matching registered endpoints.

    Usage:
        await fire_event("booking.created", booking_dict, user_id=host_id)

    Supported events:
        booking.created     booking.confirmed    booking.cancelled
        link.used           link.expired         meet.link.created
    """
    # Fetch only this user's active endpoints — avoids full-table scan
    query = supabase.table("webhooks") \
        .select("id,url,secret,events") \
        .eq("is_active", True)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.execute()

    endpoints = [ep for ep in result.data if event_name in ep.get("events", [])]

    if not endpoints:
        return

    payload = {
        "event":      event_name,
        "id":         f"evt_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data":       data,
    }

    # Fire all deliveries concurrently
    await asyncio.gather(*[_deliver(ep, event_name, payload) for ep in endpoints])
