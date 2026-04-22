"""
Per-endpoint rate limiting dependencies.

strict_rate_limit  — 10 req/min  — login, signup, waitlist, password reset
guest_rate_limit   — 20 req/min  — public guest-facing endpoints (booking, manage)

Implementation
--------------
Primary:  Supabase `check_rate_limit` RPC — atomic, shared across all serverless
          instances / processes (survives cold starts on Vercel).
Fallback: In-memory sliding window — used when the DB call fails so a Supabase
          outage does not take down auth endpoints entirely. Effective only within
          a single process (acceptable degraded mode).
"""

import logging
import time
from collections import defaultdict
from fastapi import HTTPException, Request

_log = logging.getLogger("draftmeet")

_AUTH_LIMIT  = 10   # requests per minute
_GUEST_LIMIT = 20   # requests per minute

# In-memory fallback stores — process-local only, used when Supabase is unavailable
_auth_fallback:  dict[str, list] = defaultdict(list)
_guest_fallback: dict[str, list] = defaultdict(list)


def _get_client_ip(request: Request) -> str:
    """
    Return the real client IP, safe against X-Forwarded-For spoofing.

    Vercel (and most CDN/reverse-proxy setups) appends the verified
    client IP to X-Forwarded-For. The entries to the left of it are
    forwarded as-is from the client and can be forged. We therefore
    use the LAST token, which the outermost trusted proxy wrote.

    Fallback chain:
      1. x-real-ip  (Vercel sets this to the verified client IP)
      2. last token of x-forwarded-for (outermost proxy)
      3. request.client.host (direct connection, e.g. local dev)
    """
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip

    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        # Last token is written by the outermost (trusted) proxy
        return forwarded_for.split(",")[-1].strip()

    return request.client.host if request.client else "127.0.0.1"


def _check_rpc(key: str, limit: int) -> bool:
    """
    Call the Supabase `check_rate_limit` RPC.
    Returns True (allow) or False (block).
    Raises on DB error so callers can fall back to local check.
    """
    from app.core.config import supabase
    result = supabase.rpc("check_rate_limit", {"p_key": key, "p_limit": limit}).execute()
    # The RPC returns a single boolean scalar — supabase-py wraps it in result.data
    return bool(result.data)


def _check_local(store: dict, client_ip: str, limit: int) -> bool:
    """Sliding-window in-memory check. Returns True if within limit."""
    now = time.time()
    cutoff = now - 60
    store[client_ip] = [t for t in store[client_ip] if t > cutoff]
    if len(store[client_ip]) >= limit:
        return False
    store[client_ip].append(now)
    return True


def strict_rate_limit(request: Request) -> None:
    """10 requests/minute per IP — login, signup, forgot-password, password-reset."""
    client_ip = _get_client_ip(request)
    key = f"auth:{client_ip}"
    try:
        allowed = _check_rpc(key, _AUTH_LIMIT)
    except Exception as exc:
        _log.warning("Rate-limit RPC unavailable, using local fallback: %s", exc)
        allowed = _check_local(_auth_fallback, client_ip, _AUTH_LIMIT)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a minute and try again.",
        )


def guest_rate_limit(request: Request) -> None:
    """20 requests/minute per IP — public guest-facing booking endpoints."""
    client_ip = _get_client_ip(request)
    key = f"guest:{client_ip}"
    try:
        allowed = _check_rpc(key, _GUEST_LIMIT)
    except Exception as exc:
        _log.warning("Rate-limit RPC unavailable, using local fallback: %s", exc)
        allowed = _check_local(_guest_fallback, client_ip, _GUEST_LIMIT)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )
