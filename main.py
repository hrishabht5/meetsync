from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bookings, links, webhooks, auth, availability
import uvicorn
from config import FRONTEND_URL

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
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
app.include_router(availability.router, prefix="/availability", tags=["Availability"])
app.include_router(bookings.router,     prefix="/bookings",     tags=["Bookings"])
app.include_router(links.router,        prefix="/links",        tags=["One-Time Links"])
app.include_router(webhooks.router,     prefix="/webhooks",     tags=["Webhooks"])

@app.get("/")
def root():
    return {"status": "MeetSync API running", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
