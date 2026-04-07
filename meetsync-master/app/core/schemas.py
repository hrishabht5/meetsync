import ipaddress
import re as _re
from urllib.parse import urlparse
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BookingStatus(str, Enum):
    pending      = "pending"
    confirmed    = "confirmed"
    cancelled    = "cancelled"
    rescheduled  = "rescheduled"


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
    reason:        Optional[str] = Field(default=None, max_length=500)


# ── Booking ───────────────────────────────────────────────
class BookingCreate(BaseModel):
    guest_name:      str = Field(max_length=100)
    guest_email:     EmailStr
    scheduled_at:    datetime    # ISO 8601 with timezone
    event_type:      str         # "30-min intro", "60-min deep dive", etc.
    notes:           Optional[str] = Field(default=None, max_length=2000)
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
    reason: Optional[str] = Field(default=None, max_length=500)


class BookingReschedule(BaseModel):
    new_scheduled_at: datetime   # ISO 8601 with timezone


class BookingOutcome(str, Enum):
    completed          = "completed"
    no_show            = "no_show"
    cancelled_by_guest = "cancelled_by_guest"


class BookingSetOutcome(BaseModel):
    outcome:       BookingOutcome
    outcome_notes: Optional[str] = None


class GuestBookingResponse(BaseModel):
    """Subset of booking fields safe for unauthenticated guest view."""
    id:             str
    guest_name:     str
    guest_email:    str
    scheduled_at:   datetime
    event_type:     str
    custom_title:   Optional[str] = None
    status:         str
    meet_link:      Optional[str] = None
    notes:          Optional[str] = None
    custom_answers: Optional[dict] = None
    created_at:     Optional[datetime] = None
    host_user_id:   Optional[str] = None    # needed for availability lookups


# ── One-Time Links ────────────────────────────────────────
class OTLCreate(BaseModel):
    event_type:    str
    expires_in:    Optional[str] = "7d"  # "24h", "7d", "never"
    custom_fields: Optional[List[CustomField]] = None
    custom_title:  Optional[str] = None


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
    url:           str = Field(max_length=500)
    secret:        Optional[str] = None
    events:        List[str]     # ["booking.created", "link.used", ...]

    @field_validator("url")
    @classmethod
    def url_must_be_safe_https(cls, v: str) -> str:
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL")
        if parsed.scheme != "https":
            raise ValueError("Webhook URL must use HTTPS")
        hostname = (parsed.hostname or "").lower()
        blocked = {"localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"}
        if hostname in blocked:
            raise ValueError("Webhook URL must point to a public host")
        try:
            addr = ipaddress.ip_address(hostname)
            if addr.is_private or addr.is_loopback or addr.is_link_local:
                raise ValueError("Webhook URL must point to a public host")
        except ValueError as exc:
            if "Webhook" in str(exc):
                raise
        return v


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
    username:     Optional[str] = Field(default=None, max_length=50)
    display_name: Optional[str] = Field(default=None, max_length=100)
    bio:          Optional[str] = Field(default=None, max_length=500)


class PermanentLinkCreate(BaseModel):
    slug:          str
    event_type:    str = "Google Meet"
    custom_fields: List[CustomField] = []
    custom_title:  Optional[str] = None


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


class SignupRequest(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not _re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not _re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class CalendarPreferenceRequest(BaseModel):
    calendar_id: str
