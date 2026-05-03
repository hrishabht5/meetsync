import hmac
import hashlib
from fastapi import HTTPException, Request

from app.core.config import SECRET_KEY, supabase
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


COOKIE_NAME = "draftmeet_user"

# Derive a dedicated session-signing key from SECRET_KEY using HKDF so that
# the session key and the webhook AES key never share the same material.
_SESSION_SIGNING_KEY: bytes = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=None,
    info=b"draftmeet-session-signing",
).derive(SECRET_KEY.encode("utf-8"))


def _sign_payload(payload: str) -> str:
    return hmac.new(_SESSION_SIGNING_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _get_session_version(user_id: str) -> int:
    try:
        result = supabase.table("users").select("session_version").eq("id", user_id).execute()
        if isinstance(result.data, list) and result.data:
            v = result.data[0].get("session_version")
            if isinstance(v, int):
                return v
    except Exception:
        pass
    return 1


def _parse_cookie_value(value: str) -> tuple[str, int] | tuple[None, None]:
    """
    Cookie format: "{user_id}:{session_version}|{hex_hmac_sha256}"
    Returns (user_id, session_version) if valid, else (None, None).
    """
    try:
        payload, sig = value.split("|", 1)
    except ValueError:
        return None, None
    if not payload or not sig:
        return None, None
    expected = _sign_payload(payload)
    if not hmac.compare_digest(expected, sig):
        return None, None
    parts = payload.split(":", 1)
    if len(parts) != 2:
        return None, None
    user_id, ver_str = parts
    if not user_id:
        return None, None
    try:
        session_version = int(ver_str)
    except (ValueError, TypeError):
        return None, None
    return user_id, session_version


def get_current_user_id(request: Request) -> str:
    """
    Host identity derived from either:
    1. A Bearer API key (Developer Access)
    2. A signed session cookie (Frontend UI)
    """
    # 1. API Key Auth (Developer Access)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        key_hash = hashlib.sha256(token.encode()).hexdigest()
        result = supabase.table("api_keys").select("user_id, is_active").eq("key_hash", key_hash).execute()

        if result.data and result.data[0]["is_active"]:
            return result.data[0]["user_id"]

        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    # 2. Signed session cookie (only auth method for browser clients)
    raw = request.cookies.get(COOKIE_NAME)

    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id, cookie_version = _parse_cookie_value(raw)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    if cookie_version != _get_session_version(user_id):
        raise HTTPException(status_code=401, detail="Session expired")
    return user_id


def make_user_session_cookie_value(user_id: str) -> str:
    """Create signed cookie value for a host user."""
    version = _get_session_version(user_id)
    payload = f"{user_id}:{version}"
    return f"{payload}|{_sign_payload(payload)}"


def clear_user_session_cookie() -> dict:
    """Convenience for cookie deletion settings."""
    return {
        "key": COOKIE_NAME,
        "value": "",
    }


# ── Cookie helpers (shared with admin router) ─────────────

def is_secure(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").lower().strip()
    return forwarded_proto == "https" or request.url.scheme == "https"


def cookie_domain(secure: bool) -> str | None:
    return "draftmeet.com" if secure else None


def set_session_cookie(response, user_id: str, secure: bool) -> None:
    samesite = "none" if secure else "lax"
    response.set_cookie(
        key=COOKIE_NAME,
        value=make_user_session_cookie_value(user_id),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        domain=cookie_domain(secure),
        max_age=60 * 60 * 24 * 30,
    )


def clear_session_cookie(response, secure: bool) -> None:
    samesite = "none" if secure else "lax"
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=secure,
        samesite=samesite,
        domain=cookie_domain(secure),
    )
