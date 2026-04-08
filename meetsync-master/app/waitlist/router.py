from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from app.core.config import supabase

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: EmailStr


@router.post("/")
def join_waitlist(body: WaitlistRequest):
    existing = (
        supabase.table("waitlist")
        .select("id")
        .eq("email", body.email)
        .execute()
    )
    if existing.data:
        return {"already_registered": True, "message": "You're already on the list — we'll be in touch!"}

    supabase.table("waitlist").insert({"email": body.email}).execute()
    return {"already_registered": False, "message": "You're on the list! We'll reach out with early access."}
