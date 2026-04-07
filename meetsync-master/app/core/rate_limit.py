"""
Per-endpoint rate limiting dependency.
Usage: add `_=Depends(strict_rate_limit)` to sensitive route handlers.
"""

import time
from collections import defaultdict
from fastapi import Depends, HTTPException, Request

_auth_ip_requests: dict[str, list] = defaultdict(list)
_AUTH_LIMIT = 10  # requests per minute


def strict_rate_limit(request: Request) -> None:
    """10 requests/minute per IP — for sensitive auth endpoints (login, signup)."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    cutoff = now - 60
    _auth_ip_requests[client_ip] = [t for t in _auth_ip_requests[client_ip] if t > cutoff]
    if len(_auth_ip_requests[client_ip]) >= _AUTH_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a minute and try again.",
        )
    _auth_ip_requests[client_ip].append(now)
