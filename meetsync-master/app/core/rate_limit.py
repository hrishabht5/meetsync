"""
Per-endpoint rate limiting dependencies.

strict_rate_limit  — 10 req/min  — login, signup, waitlist
guest_rate_limit   — 20 req/min  — public guest-facing endpoints (booking, manage)
"""

import time
from collections import defaultdict
from fastapi import HTTPException, Request

_auth_ip_requests:  dict[str, list] = defaultdict(list)
_guest_ip_requests: dict[str, list] = defaultdict(list)

_AUTH_LIMIT  = 10   # requests per minute
_GUEST_LIMIT = 20   # requests per minute


def _get_client_ip(request: Request) -> str:
    """Read real client IP — trust X-Forwarded-For set by Vercel/reverse proxy."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def strict_rate_limit(request: Request) -> None:
    """10 requests/minute per IP — login, signup, waitlist."""
    client_ip = _get_client_ip(request)
    now = time.time()
    cutoff = now - 60
    _auth_ip_requests[client_ip] = [t for t in _auth_ip_requests[client_ip] if t > cutoff]
    if len(_auth_ip_requests[client_ip]) >= _AUTH_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a minute and try again.",
        )
    _auth_ip_requests[client_ip].append(now)


def guest_rate_limit(request: Request) -> None:
    """20 requests/minute per IP — public guest-facing booking endpoints."""
    client_ip = _get_client_ip(request)
    now = time.time()
    cutoff = now - 60
    _guest_ip_requests[client_ip] = [t for t in _guest_ip_requests[client_ip] if t > cutoff]
    if len(_guest_ip_requests[client_ip]) >= _GUEST_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )
    _guest_ip_requests[client_ip].append(now)
