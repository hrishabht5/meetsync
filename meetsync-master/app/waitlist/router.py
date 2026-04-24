import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.core.config import supabase
from app.core.rate_limit import strict_rate_limit
from app.core.email import send_waitlist_welcome
from app.waitlist.service import dispatch_waitlist_notification

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: EmailStr


def _send_welcome_sync(email: str) -> None:
    asyncio.run(send_waitlist_welcome(email))


def _dispatch_notification_sync(email: str, entry_id: str, created_at: str) -> None:
    asyncio.run(dispatch_waitlist_notification(email, entry_id, created_at))


@router.post("/")
async def join_waitlist(
    payload: WaitlistRequest,
    background_tasks: BackgroundTasks,
    _=Depends(strict_rate_limit),
):
    try:
        result = supabase.table("waitlist").insert({"email": payload.email}).execute()
    except Exception as e:
        err_str = str(e)
        if "23505" in err_str or "duplicate" in err_str.lower() or "unique" in err_str.lower():
            return JSONResponse(
                status_code=409,
                content={"status": "already_registered", "message": "This email is already on the waitlist"},
            )
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to join waitlist. Please try again."},
        )

    entry      = result.data[0] if result.data else {}
    entry_id   = entry.get("id", "")
    created_at = entry.get("created_at", "")

    background_tasks.add_task(_send_welcome_sync, payload.email)
    background_tasks.add_task(_dispatch_notification_sync, payload.email, entry_id, created_at)
    return {"status": "ok", "message": "You've been added to the waitlist"}
