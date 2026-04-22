import ipaddress
import re as _re
import socket
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


# Central duration map — single source of truth for all event-type durations.
# Import this wherever duration_map was previously copy-pasted.
DURATION_MAP: dict[str, int] = {
    "15-min quick chat": 15,
    "30-min intro call": 30,
    "60-min deep dive":  60,
}


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
    working_days:    List[str]
    daily_shifts:    List[str]
    slot_duration:   int = 30           # minutes
    buffer_minutes:  int = 15           # gap between meetings
    timezone:        str = "Asia/Kolkata"
    allow_double_booking: bool = False  # Bypasses checking for conflicts
    default_questions: Optional[List[CustomField]] = None
    min_notice_hours:     int           = 0     # 0 = no minimum
    max_days_ahead:       Optional[int] = None  # None = unlimited
    max_bookings_per_day: Optional[int] = None  # None = unlimited

    @field_validator("working_days")
    @classmethod
    def working_days_must_be_valid(cls, v: List[str]) -> List[str]:
        valid = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
        bad = [d for d in v if d not in valid]
        if bad:
            raise ValueError(f"Invalid working_days values: {bad}. Use Mon/Tue/Wed/Thu/Fri/Sat/Sun.")
        return v

    @field_validator("daily_shifts")
    @classmethod
    def daily_shifts_must_be_valid(cls, v: List[str]) -> List[str]:
        import re as _re2
        for s in v:
            if not _re2.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", s):
                raise ValueError(f"Invalid shift time '{s}'. Use HH:MM (00:00–23:59).")
        return v

    @field_validator("min_notice_hours")
    @classmethod
    def _validate_notice(cls, v: int) -> int:
        if v not in {0, 1, 2, 4, 8, 24, 48, 72}:
            raise ValueError("min_notice_hours must be one of 0,1,2,4,8,24,48,72")
        return v

    @field_validator("max_days_ahead")
    @classmethod
    def _validate_window(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in {7, 14, 30, 60, 90, 180}:
            raise ValueError("max_days_ahead must be one of 7,14,30,60,90,180 or null")
        return v

    @field_validator("max_bookings_per_day")
    @classmethod
    def _validate_daily_cap(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 10):
            raise ValueError("max_bookings_per_day must be between 1 and 10 or null")
        return v


class AvailabilityOverrideCreate(BaseModel):
    override_date: str
    is_available:  bool = False
    custom_shifts: Optional[List[str]] = None
    reason:        Optional[str] = Field(default=None, max_length=500)

    @field_validator("override_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("override_date must be in YYYY-MM-DD format")
        return v


# ── Booking ───────────────────────────────────────────────
class BookingCreate(BaseModel):
    guest_name:      str = Field(max_length=100)
    guest_email:     EmailStr
    scheduled_at:    datetime    # ISO 8601 with timezone
    event_type:      str
    notes:           Optional[str] = Field(default=None, max_length=2000)
    one_time_link_id:   Optional[str] = None
    permanent_link_id:  Optional[str] = None
    custom_answers:     Optional[dict] = None

    @field_validator("custom_answers")
    @classmethod
    def custom_answers_size_limit(cls, v: Optional[dict]) -> Optional[dict]:
        if v is None:
            return v
        if len(v) > 50:
            raise ValueError("custom_answers may not contain more than 50 keys")
        import json
        if len(json.dumps(v)) > 8000:
            raise ValueError("custom_answers payload exceeds the 8 KB limit")
        return v

    @field_validator("event_type")
    @classmethod
    def event_type_must_be_valid(cls, v: str) -> str:
        valid = set(DURATION_MAP.keys())
        if v not in valid:
            raise ValueError(f"event_type must be one of: {', '.join(sorted(valid))}")
        return v

    @field_validator("guest_name")
    @classmethod
    def guest_name_no_control_chars(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("guest_name cannot be blank")
        return v


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


# ── Booking Page Customization Mixin ─────────────────────
class LinkCustomization(BaseModel):
    description:     Optional[str] = Field(default=None, max_length=1000)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    bg_image_url:    Optional[str] = Field(default=None, max_length=500)
    accent_color:    Optional[str] = Field(default=None)

    @field_validator("cover_image_url", "bg_image_url")
    @classmethod
    def cover_image_must_be_https(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL")
        if parsed.scheme != "https":
            raise ValueError("Image URL must use HTTPS")
        return v

    @field_validator("accent_color")
    @classmethod
    def accent_color_must_be_hex(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not _re.fullmatch(r"#[0-9A-Fa-f]{6}", v):
            raise ValueError("accent_color must be a 6-digit hex color, e.g. #3B6AE8")
        return v


# ── One-Time Links ────────────────────────────────────────
class OTLCreate(LinkCustomization):
    event_type:    str
    expires_in:    Optional[str] = "7d"  # "24h", "7d", "never"
    custom_fields: Optional[List[CustomField]] = None
    custom_title:  Optional[str] = None


class OTLUpdate(LinkCustomization):
    pass


class OTLResponse(BaseModel):
    id:              str
    booking_url:     str
    event_type:      str
    status:          OTLStatus
    expires_at:      Optional[datetime]
    created_at:      datetime
    used_at:         Optional[datetime]
    custom_fields:   Optional[List[dict]] = None
    description:     Optional[str] = None
    cover_image_url: Optional[str] = None
    bg_image_url:    Optional[str] = None
    accent_color:    Optional[str] = None


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
        if not hostname:
            raise ValueError("Invalid webhook URL: missing hostname")

        # Static blocklist for known metadata endpoints
        _blocked_hosts = {
            "localhost", "metadata.google.internal",
            "instance-data",   # AWS legacy
        }
        if hostname in _blocked_hosts:
            raise ValueError("Webhook URL must point to a public host")

        # Resolve hostname → IP at validation time to block DNS rebinding
        # and private/link-local ranges (IPv4 + IPv6).
        try:
            resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        except socket.gaierror:
            raise ValueError("Webhook URL hostname could not be resolved")

        if not resolved_ip.is_global:
            raise ValueError("Webhook URL must point to a publicly routable host")

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
    user_id:         str
    username:        str
    display_name:    Optional[str]
    bio:             Optional[str]
    avatar_url:      Optional[str] = None
    headline:        Optional[str] = None
    website:         Optional[str] = None
    location:        Optional[str] = None
    cover_image_url: Optional[str] = None
    bg_image_url:    Optional[str] = None
    accent_color:    Optional[str] = None


class ProfileUpdate(BaseModel):
    username:        Optional[str] = Field(default=None, max_length=50)
    display_name:    Optional[str] = Field(default=None, max_length=100)
    bio:             Optional[str] = Field(default=None, max_length=500)
    headline:        Optional[str] = Field(default=None, max_length=120)
    website:         Optional[str] = Field(default=None, max_length=200)
    location:        Optional[str] = Field(default=None, max_length=100)
    avatar_url:      Optional[str] = Field(default=None, max_length=500)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    bg_image_url:    Optional[str] = Field(default=None, max_length=500)
    accent_color:    Optional[str] = Field(default=None, max_length=20)

    @field_validator("avatar_url", "cover_image_url", "bg_image_url")
    @classmethod
    def image_url_must_be_https(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL")
        if parsed.scheme != "https":
            raise ValueError("Image URL must use HTTPS")
        return v

    @field_validator("website")
    @classmethod
    def website_must_be_http_or_https(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Website must use http:// or https://")
        return v


class PermanentLinkCreate(LinkCustomization):
    slug:          str
    event_type:    str = "Google Meet"
    custom_fields: List[CustomField] = []
    custom_title:  Optional[str] = None


class PermanentLinkUpdate(LinkCustomization):
    pass


class PermanentLinkRow(BaseModel):
    id:              str
    user_id:         str
    slug:            str
    event_type:      str
    is_active:       bool
    custom_fields:   List[CustomField]
    created_at:      str
    custom_title:    Optional[str] = None
    description:     Optional[str] = None
    cover_image_url: Optional[str] = None
    bg_image_url:    Optional[str] = None
    accent_color:    Optional[str] = None


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

    @field_validator("calendar_id")
    @classmethod
    def validate_calendar_id(cls, v: str) -> str:
        if v == "primary":
            return v
        # Google Calendar IDs are email-like strings
        if not _re.fullmatch(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", v):
            raise ValueError("Invalid calendar ID — must be 'primary' or a valid calendar email ID")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not _re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not _re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        return v
