"""
Profiles router
---------------
Public:
  GET /profiles/{username}                     → public profile + active links
  GET /profiles/{username}/{slug}/validate     → resolve link → host_user_id

Authenticated (host):
  GET    /profiles/me                          → own profile
  PUT    /profiles/me                          → update display_name / bio / username
  GET    /profiles/me/links                    → list all own permanent links
  POST   /profiles/me/links                    → create permanent link
  PATCH  /profiles/me/links/{link_id}/toggle   → toggle is_active
  DELETE /profiles/me/links/{link_id}          → delete link
"""

from fastapi import APIRouter, HTTPException, Request

from app.auth.middleware import get_current_user_id
from app.core.schemas import ProfileUpdate, PermanentLinkCreate
from app.profiles import service

router = APIRouter()


# ── /profiles/me  (must come before /{username} so FastAPI doesn't consume "me") ──

@router.get("/me")
def get_my_profile(request: Request):
    user_id = get_current_user_id(request)
    profile = service.get_profile_by_user_id(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please reconnect your Google account.")
    return profile


@router.put("/me")
def update_my_profile(request: Request, payload: ProfileUpdate):
    user_id = get_current_user_id(request)
    try:
        return service.upsert_profile(
            user_id=user_id,
            display_name=payload.display_name,
            bio=payload.bio,
            username=payload.username,
        )
    except ValueError as e:
        status = 409 if "taken" in str(e) else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.get("/me/links")
def list_my_links(request: Request):
    user_id = get_current_user_id(request)
    return service.list_permanent_links(user_id)


@router.post("/me/links", status_code=201)
def create_link(request: Request, payload: PermanentLinkCreate):
    user_id = get_current_user_id(request)
    try:
        return service.create_permanent_link(
            user_id=user_id,
            slug=payload.slug,
            event_type=payload.event_type,
            custom_fields=[f.model_dump() for f in payload.custom_fields],
            custom_title=payload.custom_title or None,
        )
    except ValueError as e:
        status = 409 if "already have" in str(e) else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.patch("/me/links/{link_id}/toggle")
def toggle_link(request: Request, link_id: str):
    user_id = get_current_user_id(request)
    try:
        return service.toggle_permanent_link(user_id, link_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/me/links/{link_id}", status_code=204)
def delete_link(request: Request, link_id: str):
    user_id = get_current_user_id(request)
    try:
        service.delete_permanent_link(user_id, link_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/{username}")
def get_public_profile(username: str):
    profile = service.get_profile_by_username(username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    links = service.list_permanent_links(profile["user_id"])
    active_links = [lk for lk in links if lk["is_active"]]
    return {**profile, "links": active_links}


@router.get("/{username}/{slug}/validate")
def validate_permanent_link(username: str, slug: str):
    """
    Public endpoint called before the booking form loads.
    Returns the link details + host_user_id so the frontend can fetch slots.
    """
    result = service.get_permanent_link_by_username_slug(username, slug)
    if not result:
        raise HTTPException(status_code=404, detail="Booking link not found")
    link, host_user_id = result
    if not link["is_active"]:
        raise HTTPException(status_code=410, detail="This booking link is no longer active")
    return {**link, "host_user_id": host_user_id}
