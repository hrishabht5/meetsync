from fastapi import APIRouter
from fastapi.responses import JSONResponse
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
    """
    Readiness probe — returns 200 only when the DB is reachable.
    Returns 503 on DB failure so load balancers and uptime monitors
    detect the outage and stop routing traffic to a degraded instance.
    """
    status: dict = {"api": "ok", "database": "unknown"}
    try:
        supabase.table("users").select("id").limit(1).execute()
        status["database"] = "ok"
    except Exception as e:
        logger.error("API v1 health check — DB unreachable: %s", e, exc_info=True)
        status["database"] = "error"
        return JSONResponse(status_code=503, content=status)

    return status
