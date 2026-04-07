import hmac
import hashlib
from fastapi import HTTPException, Request

from app.core.config import SECRET_KEY


COOKIE_NAME = "meetsync_user"


def _sign_user_id(user_id: str) -> str:
    digest = hmac.new(SECRET_KEY.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest


def _parse_cookie_value(value: str) -> str | None:
    """
    Cookie format: "<user_id>|<hex_hmac_sha256>"
    Returns user_id if the signature matches, else None.
    """
    try:
        user_id, sig = value.split("|", 1)
    except ValueError:
        return None
    if not user_id or not sig:
        return None
    expected = _sign_user_id(user_id)
    if not hmac.compare_digest(expected, sig):
        return None
    return user_id


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

        import hashlib
        from app.core.config import supabase

        key_hash = hashlib.sha256(token.encode()).hexdigest()
        result = supabase.table("api_keys").select("user_id, is_active").eq("key_hash", key_hash).execute()

        if result.data and result.data[0]["is_active"]:
            return result.data[0]["user_id"]

        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    # 2. Signed session cookie (only auth method for browser clients)
    raw = request.cookies.get(COOKIE_NAME)

    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = _parse_cookie_value(raw)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user_id


def make_user_session_cookie_value(user_id: str) -> str:
    """Create signed cookie value for a host user."""
    return f"{user_id}|{_sign_user_id(user_id)}"


def clear_user_session_cookie() -> dict:
    """Convenience for cookie deletion settings."""
    return {
        "key": COOKIE_NAME,
        "value": "",
    }
