from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class BookingStatus(str, Enum):
    pending   = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


class OTLStatus(str, Enum):
    active  = "active"
    used    = "used"
    expired = "expired"
    revoked = "revoked"


# ── Custom Question Schema ────────────────────────────────
class CustomField(BaseModel):
    label:    str
    type:     str = "text"       # "text", "textarea", "dropdown"
    required: bool = True
    options:  Optional[List[str]] = None  # only for dropdown type


# ── Availability ──────────────────────────────────────────
class AvailabilitySettings(BaseModel):
    working_days:    List[str]          # ["Mon", "Tue", "Wed", "Thu", "Fri"]
    daily_shifts:    List[str]          # ["11:30", "12:00", "16:00"]
    slot_duration:   int = 30           # minutes
    buffer_minutes:  int = 15           # gap between meetings
    timezone:        str = "Asia/Kolkata"
    allow_double_booking: bool = False  # Bypasses checking for conflicts
    default_questions: Optional[List[CustomField]] = None


class AvailabilityOverrideCreate(BaseModel):
    override_date: str               # "YYYY-MM-DD"
    is_available:  bool = False      # false = blocked out
    custom_shifts: Optional[List[str]] = None
    reason:        Optional[str] = None


# ── Booking ───────────────────────────────────────────────
class BookingCreate(BaseModel):
    guest_name:      str
    guest_email:     EmailStr
    scheduled_at:    datetime    # ISO 8601 with timezone
    event_type:      str         # "30-min intro", "60-min deep dive", etc.
    notes:           Optional[str] = None
    one_time_link_id:   Optional[str] = None  # lnk_xxxxx if booked via OTL
    permanent_link_id:  Optional[str] = None  # UUID if booked via permanent link
    custom_answers:     Optional[dict] = None  # answers to custom questions


class BookingResponse(BaseModel):
    id:              str
    guest_name:      str
    guest_email:     str
    scheduled_at:    datetime
    event_type:      str
    status:          BookingStatus
    meet_link:       Optional[str]
    calendar_event_id: Optional[str]
    one_time_link_id:  Optional[str]
    custom_answers:  Optional[dict] = None
    created_at:      datetime


class BookingCancel(BaseModel):
    reason: Optional[str] = None


# ── One-Time Links ────────────────────────────────────────
class OTLCreate(BaseModel):
    event_type:    str
    expires_in:    Optional[str] = "7d"  # "24h", "7d", "never"
    custom_fields: Optional[List[CustomField]] = None


class OTLResponse(BaseModel):
    id:            str
    booking_url:   str
    event_type:    str
    status:        OTLStatus
    expires_at:    Optional[datetime]
    created_at:    datetime
    used_at:       Optional[datetime]
    custom_fields: Optional[List[dict]] = None


# ── Webhooks ──────────────────────────────────────────────
class WebhookCreate(BaseModel):
    url:           str
    secret:        Optional[str] = None
    events:        List[str]     # ["booking.created", "link.used", ...]


class WebhookResponse(BaseModel):
    id:            str
    url:           str
    events:        List[str]
    is_active:     bool
    created_at:    datetime


class WebhookEvent(BaseModel):
    event:         str
    id:            str
    created_at:    datetime
    data:          dict


# ── Profiles ─────────────────────────────────────────────
class ProfileResponse(BaseModel):
    user_id:      str
    username:     str
    display_name: Optional[str]
    bio:          Optional[str]


class ProfileUpdate(BaseModel):
    username:     Optional[str] = None
    display_name: Optional[str] = None
    bio:          Optional[str] = None


class PermanentLinkCreate(BaseModel):
    slug:          str
    event_type:    str = "Google Meet"
    custom_fields: List[CustomField] = []


class PermanentLinkRow(BaseModel):
    id:            str
    user_id:       str
    slug:          str
    event_type:    str
    is_active:     bool
    custom_fields: List[CustomField]
    created_at:    str


# ── Auth ──────────────────────────────────────────────────
class GoogleAuthURL(BaseModel):
    auth_url:      str


class TokenResponse(BaseModel):
    access_token:  str
    token_type:    str = "bearer"
