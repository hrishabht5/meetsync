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
    title="MeetSync API",
    description="Scheduling platform with Google Meet, one-time links, and webhooks",
    version="1.0.0"
)

# Clean FRONTEND_URL to avoid CORS issues with trailing slashes
CLEAN_FRONTEND_URL = FRONTEND_URL.rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        CLEAN_FRONTEND_URL,
        f"{CLEAN_FRONTEND_URL}/",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "X-MeetSync-User"],
)

from fastapi.responses import JSONResponse
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

app.include_router(auth_router,         prefix="/api/v1/auth",         tags=["Auth"])
app.include_router(availability_router, prefix="/api/v1/availability", tags=["Availability"])
app.include_router(bookings_router,     prefix="/api/v1/bookings",     tags=["Bookings"])
app.include_router(links_router,        prefix="/api/v1/links",        tags=["One-Time Links"])
app.include_router(webhooks_router,     prefix="/api/v1/webhooks",     tags=["Webhooks"])

@app.get("/")
def root():
    return {"status": "MeetSync API running", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
