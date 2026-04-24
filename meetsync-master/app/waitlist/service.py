import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone

import httpx
from app.core.config import WAITLIST_WEBHOOK_URL, WAITLIST_WEBHOOK_SECRET
from app.core.logger import logger


async def dispatch_waitlist_notification(email: str, entry_id: str, created_at: str) -> None:
    """Fire a signed POST to WAITLIST_WEBHOOK_URL on every new waitlist signup.

    Silently skips if WAITLIST_WEBHOOK_URL is not configured.
    Never raises — failures are logged and swallowed so the signup response
    is never affected.
    """
    if not WAITLIST_WEBHOOK_URL:
        return

    payload = {
        "event":      "waitlist.signup",
        "id":         f"evt_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "id":         entry_id,
            "email":      email,
            "created_at": created_at,
        },
    }
    payload_bytes = json.dumps(payload, default=str).encode()

    headers = {
        "Content-Type":      "application/json",
        "X-DraftMeet-Event": "waitlist.signup",
        "User-Agent":        "DraftMeet-Webhooks/1.0",
    }
    if WAITLIST_WEBHOOK_SECRET:
        mac = hmac.new(WAITLIST_WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256)
        headers["X-DraftMeet-Signature"] = f"sha256={mac.hexdigest()}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(WAITLIST_WEBHOOK_URL, content=payload_bytes, headers=headers)
        if resp.status_code >= 300:
            logger.warning("Waitlist webhook returned HTTP %s for signup: %s", resp.status_code, email)
        else:
            logger.info("Waitlist webhook delivered for signup: %s", email)
    except Exception as exc:
        logger.error("Waitlist webhook delivery failed for %s: %s", email, exc)
