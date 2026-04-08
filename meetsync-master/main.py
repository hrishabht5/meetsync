from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.availability.router import router as availability_router
from app.bookings.router import router as bookings_router
from app.links.router import router as links_router
from app.webhooks.router import router as webhooks_router
import uvicorn
from app.core.config import FRONTEND_URL

app = FastAPI(
    title="DraftMeet API",
    description="Scheduling platform with Google Meet, one-time links, and webhooks",
    version="1.0.0"
)

# Clean FRONTEND_URL to avoid CORS issues with trailing slashes
CLEAN_FRONTEND_URL = FRONTEND_URL.rstrip("/")

import os as _os
_dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000"] if _os.getenv("ALLOW_DEV_ORIGINS") == "true" else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        CLEAN_FRONTEND_URL,
        f"{CLEAN_FRONTEND_URL}/",
        *_dev_origins,
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import time
from collections import defaultdict

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 200):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.ip_requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        cutoff = now - 60

        # Evict stale IPs periodically to prevent unbounded memory growth
        if len(self.ip_requests) > 500:
            stale = [ip for ip, times in self.ip_requests.items() if not times or max(times) < cutoff]
            for ip in stale:
                del self.ip_requests[ip]

        # Slide window (60 seconds)
        self.ip_requests[client_ip] = [t for t in self.ip_requests[client_ip] if t > cutoff]

        if len(self.ip_requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": True, "message": "Too many requests. Please try again later."}
            )

        self.ip_requests[client_ip].append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": str(exc.detail)},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "Internal server error"},
    )

from app.auth.api_keys_router import router as api_keys_router
from app.api.v1.router import api_v1_router
from app.profiles.router import router as profiles_router
from app.analytics.router import router as analytics_router

app.include_router(auth_router,         prefix="/auth",         tags=["Auth"])
app.include_router(availability_router, prefix="/availability", tags=["Availability"])
app.include_router(bookings_router,     prefix="/bookings",     tags=["Bookings"])
app.include_router(analytics_router,   prefix="/analytics",    tags=["Analytics"])
app.include_router(links_router,        prefix="/links",        tags=["One-Time Links"])
app.include_router(webhooks_router,     prefix="/webhooks",     tags=["Webhooks"])
app.include_router(profiles_router,     prefix="/profiles",     tags=["Profiles"])

# Public API Endpoints
app.include_router(api_keys_router,     prefix="/api_keys",     tags=["API Keys Management"])
app.include_router(api_v1_router,       prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "MeetSync API running", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
