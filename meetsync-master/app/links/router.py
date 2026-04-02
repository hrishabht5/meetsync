"""
One-Time Links router
---------------------
POST /links                  → generate a new OTL (with optional custom questions)
GET  /links                  → list OTLs (paginated, searchable, filterable)
GET  /links/{token}          → validate a link (returns custom_fields for the booking form)
DELETE /links/{token}        → revoke an active link
DELETE /links/{token}/permanent → hard-delete a non-active link
POST /links/bulk             → bulk revoke or hard-delete
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Literal
from app.core.schemas import OTLCreate
from app.links import service as otl_service

router = APIRouter()


class BulkAction(BaseModel):
    tokens: List[str]
    action: Literal["revoke", "delete"]


@router.post("/", status_code=201)
def create_link(request: Request, payload: OTLCreate):
    """Generate a new one-time booking link with optional custom questions."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    custom_fields = None
    if payload.custom_fields:
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
        custom_title=payload.custom_title or None,
    )
    return otl


@router.get("/")
def list_links(
    request: Request,
    status: str = None,
    page: int = 1,
    limit: int = 10,
    search: str = "",
):
    """List OTLs with pagination, search, and status filter."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    return otl_service.list_otls(
        user_id,
        status_filter=status,
        page=page,
        limit=limit,
        search=search,
    )


@router.post("/bulk")
def bulk_action(request: Request, payload: BulkAction):
    """Bulk revoke or hard-delete OTLs."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    succeeded = 0
    skipped = 0
    for token in payload.tokens:
        try:
            if payload.action == "revoke":
                otl = otl_service.validate_otl(token)
                if otl.get("user_id") != user_id:
                    skipped += 1
                    continue
                otl_service.revoke_otl(token)
                succeeded += 1
            else:
                otl_service.delete_otl(token, user_id)
                succeeded += 1
        except (ValueError, Exception):
            skipped += 1
    return {"succeeded": succeeded, "skipped": skipped}


@router.get("/{token}")
def validate_link(token: str):
    """Called by the booking page before showing the calendar."""
    try:
        otl = otl_service.validate_otl(token)
        from app.core.config import FRONTEND_URL
        otl["booking_url"] = f"{FRONTEND_URL}/book/{token}"
        return otl
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{token}")
def revoke_link(request: Request, token: str):
    """Revoke an active one-time link."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    try:
        otl = otl_service.validate_otl(token)
        if otl.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        otl_service.revoke_otl(token)
        return {"status": "revoked", "token": token}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{token}/permanent")
def delete_link_permanent(request: Request, token: str):
    """Hard-delete a non-active OTL (used/expired/revoked)."""
    from app.auth.middleware import get_current_user_id
    user_id = get_current_user_id(request)
    try:
        otl_service.delete_otl(token, user_id)
        return {"status": "deleted", "token": token}
    except ValueError as e:
        status_code = 403 if "Forbidden" in str(e) else 400
        raise HTTPException(status_code=status_code, detail=str(e))
