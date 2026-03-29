from fastapi import APIRouter
from app.api.v1.links import router as links_router
from app.bookings.router import router as bookings_router
from app.availability.router import router as availability_router
from app.webhooks.router import router as webhooks_router

api_v1_router = APIRouter()

api_v1_router.include_router(availability_router, prefix="/availability", tags=["API V1 - Availability"])
api_v1_router.include_router(bookings_router,     prefix="/bookings",     tags=["API V1 - Bookings"])
api_v1_router.include_router(links_router,        prefix="/links",        tags=["API V1 - One-Time Links"])
api_v1_router.include_router(webhooks_router,     prefix="/webhooks",     tags=["API V1 - Webhooks"])

from app.core.config import supabase
from app.core.logger import logger

@api_v1_router.get("/health", tags=["API V1 - System"])
def health_check():
    """Returns the operational status of the API and its dependencies."""
    status = {"api": "ok", "database": "unknown"}
    try:
        # Simple query to ensure DB is reachable
        supabase.table("users").select("id").limit(1).execute()
        status["database"] = "ok"
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}", exc_info=True)
        status["database"] = "error"
        
    return status
