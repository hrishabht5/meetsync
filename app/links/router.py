"""
One-Time Links router (V2 — with Custom Fields)
-------------------------------------------------
POST /links              → generate a new OTL (with optional custom questions)
GET  /links              → list all OTLs
GET  /links/{token}      → validate a link (returns custom_fields for the booking form)
DELETE /links/{token}    → revoke a link
"""

from fastapi import APIRouter, HTTPException, Request
from app.core.schemas import OTLCreate
from app.links import service as otl_service

router = APIRouter()


@router.post("/", status_code=201)
def create_link(request: Request, payload: OTLCreate):
    """Generate a new one-time booking link with optional custom questions."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    custom_fields = None
    if payload.custom_fields:
        # Validate: dropdowns must have at least 1 option
        for field in payload.custom_fields:
            if field.type == "dropdown" and (not field.options or len(field.options) == 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Dropdown question '{field.label}' must have at least one option."
                )
        custom_fields = [f.dict() for f in payload.custom_fields]

    otl = otl_service.create_otl(
        event_type=payload.event_type,
        expires_in=payload.expires_in,
        user_id=user_id,
        custom_fields=custom_fields,
    )
    return otl


@router.get("/")
def list_links(request: Request, status: str = None):
    """List all OTLs. Optional ?status=active|used|expired|revoked"""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    return otl_service.list_otls(user_id, status_filter=status)


@router.get("/{token}")
def validate_link(token: str):
    """
    Called by the booking page before showing the calendar.
    Returns link details including custom_fields if any.
    """
    try:
        otl = otl_service.validate_otl(token)
        from app.core.config import FRONTEND_URL
        otl["booking_url"] = f"{FRONTEND_URL}/book/{token}"
        return otl
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{token}")
def revoke_link(request: Request, token: str):
    """Revoke a one-time link so it can no longer be used."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    try:
        # Prevent hosts from revoking tokens they don't own.
        otl = otl_service.validate_otl(token)
        if otl.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        otl_service.revoke_otl(token)
        return {"status": "revoked", "token": token}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
