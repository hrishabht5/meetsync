from fastapi import APIRouter, HTTPException, Request
from app.links.router import router as internal_links_router
from app.links import service as otl_service
from app.auth.middleware import get_current_user_id

router = APIRouter()

# Include all standard link endpoints (create, list, revoke, etc.)
router.include_router(internal_links_router)

@router.get("/{token}/status")
def get_link_status(request: Request, token: str):
    """
    Check the status of a one-time meet link programmatically.
    Returns whether the link is active, used, expired, or revoked.

    Ownership is enforced for every code path — inactive tokens are
    looked up directly so an unauthenticated (or wrong-user) caller
    cannot probe the state of a token they do not own.
    """
    user_id = get_current_user_id(request)

    try:
        otl = otl_service.validate_otl(token)
        # Token is active — confirm ownership
        if otl.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this link")
        return {
            "token":         token,
            "status":        "active",
            "event_type":    otl.get("event_type"),
            "expires_at":    otl.get("expires_at"),
            "custom_fields": otl.get("custom_fields"),
        }

    except HTTPException:
        raise

    except ValueError:
        # Token exists but is inactive (expired/used/revoked).
        # Look up the row directly to enforce ownership before revealing status.
        from app.core.config import supabase
        row_result = supabase.table("one_time_links") \
            .select("status, user_id") \
            .eq("id", token) \
            .execute()

        if not row_result.data:
            # Token doesn't exist at all — return 404 so callers can't enumerate
            raise HTTPException(status_code=404, detail="Link not found")

        row = row_result.data[0]
        if row.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this link")

        status_value = row.get("status", "inactive")
        return {"token": token, "status": status_value}
