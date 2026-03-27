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
    """
    user_id = get_current_user_id(request)
    
    try:
        otl = otl_service.validate_otl(token)
        
        if otl.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this link")
            
        return {
            "token": token,
            "status": "active",
            "event_type": otl.get("event_type"),
            "expires_at": otl.get("expires_at"),
            "custom_fields": otl.get("custom_fields")
        }
    except ValueError as e:
        status_reason = "inactive"
        error_msg = str(e).lower()
        
        if "revoked" in error_msg:
            status_reason = "revoked"
        elif "expired" in error_msg:
            status_reason = "expired"
        elif "used" in error_msg:
            status_reason = "used"
            
        return {
            "token": token,
            "status": status_reason,
            "message": str(e)
        }
