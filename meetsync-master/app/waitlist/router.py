from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.core.config import supabase
from app.core.rate_limit import strict_rate_limit

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: EmailStr


@router.post("/")
async def join_waitlist(payload: WaitlistRequest, _=Depends(strict_rate_limit)):
    try:
        supabase.table("waitlist").insert({"email": payload.email}).execute()
        return {"status": "ok", "message": "You've been added to the waitlist"}
    except Exception as e:
        err_str = str(e)
        # Postgres unique violation code
        if "23505" in err_str or "duplicate" in err_str.lower() or "unique" in err_str.lower():
            return JSONResponse(
                status_code=409,
                content={"status": "already_registered", "message": "This email is already on the waitlist"},
            )
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to join waitlist. Please try again."},
        )
