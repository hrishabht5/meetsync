"""
Booking router tests — uses mocks so they never hit real Supabase or Google.
Run with: pytest tests/test_routers/test_bookings.py -v
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

FUTURE = (datetime.now(timezone.utc) + timedelta(days=2)).replace(microsecond=0).isoformat()
PAST   = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(microsecond=0).isoformat()


def _auth_cookies(user_id: str = "usr_test123") -> dict:
    from app.auth.middleware import make_user_session_cookie_value
    return {"draftmeet_user": make_user_session_cookie_value(user_id)}


def _mock_supabase(booking_conflict=False, insert_error=None):
    """Return a MagicMock Supabase client wired for common booking flow paths."""
    sb = MagicMock()
    # OTL validation
    otl_row = {"id": "lnk_test", "user_id": "usr_host", "status": "active",
               "event_type": "30-min intro call", "expires_at": None,
               "custom_title": None, "custom_fields": []}
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [otl_row]
    sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
        [{"id": "existing"}] if booking_conflict else []
    )
    # availability settings
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "usr_host", "working_days": ["Mon","Tue","Wed","Thu","Fri"],
         "daily_shifts": ["10:00","10:30"], "slot_duration": 30, "buffer_minutes": 0,
         "timezone": "UTC", "min_notice_hours": 0, "max_days_ahead": None,
         "max_bookings_per_day": None}
    ]
    if insert_error:
        sb.table.return_value.insert.return_value.execute.side_effect = insert_error
    else:
        booking_id = str(uuid.uuid4())
        sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": booking_id}]
    # update / delete
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    sb.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    sb.table.return_value.select.return_value.eq.return_value.neq.return_value.execute.return_value.data = []
    sb.table.return_value.select.return_value.eq.return_value.neq.return_value.neq.return_value.execute.return_value.data = []
    return sb


def _mock_gcal(meet_link="https://meet.google.com/abc-def-ghi"):
    gcal = MagicMock()
    gcal.create_meet_event = AsyncMock(return_value={
        "meet_link": meet_link,
        "calendar_event_id": "gcal_evt_123",
    })
    gcal.delete_calendar_event = AsyncMock(return_value=None)
    return gcal


# ── Schema validation (no mocks needed) ──────────────────────────────────────

class TestBookingCreateSchema:
    def test_invalid_event_type_returns_422(self, client: TestClient):
        payload = {
            "guest_name": "Alice",
            "guest_email": "alice@example.com",
            "scheduled_at": FUTURE,
            "event_type": "banana call",
            "one_time_link_id": "lnk_abc",
        }
        r = client.post("/bookings/", json=payload)
        assert r.status_code == 422
        assert "event_type" in r.text.lower() or "banana" in r.text.lower()

    def test_blank_guest_name_returns_422(self, client: TestClient):
        payload = {
            "guest_name": "   ",
            "guest_email": "alice@example.com",
            "scheduled_at": FUTURE,
            "event_type": "30-min intro call",
            "one_time_link_id": "lnk_abc",
        }
        r = client.post("/bookings/", json=payload)
        assert r.status_code == 422

    def test_invalid_email_returns_422(self, client: TestClient):
        payload = {
            "guest_name": "Alice",
            "guest_email": "not-an-email",
            "scheduled_at": FUTURE,
            "event_type": "30-min intro call",
        }
        r = client.post("/bookings/", json=payload)
        assert r.status_code == 422

    def test_notes_too_long_returns_422(self, client: TestClient):
        payload = {
            "guest_name": "Alice",
            "guest_email": "alice@example.com",
            "scheduled_at": FUTURE,
            "event_type": "30-min intro call",
            "notes": "x" * 2001,
        }
        r = client.post("/bookings/", json=payload)
        assert r.status_code == 422


# ── Business logic guards ─────────────────────────────────────────────────────

class TestCreateBookingGuards:
    def test_past_time_returns_400(self, client: TestClient):
        sb = _mock_supabase()
        gcal = _mock_gcal()
        with patch("app.bookings.router.supabase", sb), \
             patch("app.integrations.google_calendar", gcal), \
             patch("app.links.service.supabase", sb), \
             patch("app.availability.router.supabase", sb):
            r = client.post("/bookings/", json={
                "guest_name": "Alice",
                "guest_email": "alice@example.com",
                "scheduled_at": PAST,
                "event_type": "30-min intro call",
                "one_time_link_id": "lnk_test",
            })
        assert r.status_code == 400
        assert "past" in r.json()["message"].lower()

    def test_double_booking_returns_409(self, client: TestClient):
        sb = _mock_supabase(booking_conflict=True)
        gcal = _mock_gcal()
        with patch("app.bookings.router.supabase", sb), \
             patch("app.integrations.google_calendar", gcal), \
             patch("app.links.service.supabase", sb), \
             patch("app.availability.router.supabase", sb):
            r = client.post("/bookings/", json={
                "guest_name": "Alice",
                "guest_email": "alice@example.com",
                "scheduled_at": FUTURE,
                "event_type": "30-min intro call",
                "one_time_link_id": "lnk_test",
            })
        assert r.status_code == 409

    def test_missing_link_and_no_auth_returns_400(self, client: TestClient):
        r = client.post("/bookings/", json={
            "guest_name": "Alice",
            "guest_email": "alice@example.com",
            "scheduled_at": FUTURE,
            "event_type": "30-min intro call",
        })
        assert r.status_code in (400, 401)


# ── Authenticated host endpoints ──────────────────────────────────────────────

class TestHostBookingEndpoints:
    def test_list_bookings_requires_auth(self, client: TestClient):
        r = client.get("/bookings/")
        assert r.status_code == 401

    def test_list_bookings_returns_data(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        with patch("app.bookings.router.supabase", sb), \
             patch("app.auth.middleware.supabase", sb):
            r = client.get("/bookings/", cookies=_auth_cookies())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_booking_not_found(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.bookings.router.supabase", sb), \
             patch("app.auth.middleware.supabase", sb):
            r = client.get("/bookings/nonexistent-id", cookies=_auth_cookies())
        assert r.status_code == 404


# ── Guest manage endpoints ────────────────────────────────────────────────────

class TestGuestManageEndpoints:
    def _booking(self, status="confirmed", scheduled_at=None):
        return {
            "id": "bk_001",
            "user_id": "usr_host",
            "guest_name": "Alice",
            "guest_email": "alice@example.com",
            "scheduled_at": scheduled_at or FUTURE,
            "event_type": "30-min intro call",
            "custom_title": None,
            "status": status,
            "meet_link": "https://meet.google.com/abc",
            "calendar_event_id": "gcal_001",
            "management_token": "tok_abc",
            "notes": None,
            "custom_answers": {},
            "created_at": FUTURE,
        }

    def test_get_booking_by_token(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._booking()]
        with patch("app.bookings.router.supabase", sb):
            r = client.get("/bookings/manage/tok_abc")
        assert r.status_code == 200
        assert r.json()["guest_name"] == "Alice"

    def test_get_booking_invalid_token_returns_404(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.bookings.router.supabase", sb):
            r = client.get("/bookings/manage/bad_token")
        assert r.status_code == 404

    def test_cancel_already_cancelled_returns_400(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            self._booking(status="cancelled")
        ]
        with patch("app.bookings.router.supabase", sb):
            r = client.patch("/bookings/manage/tok_abc/cancel", json={"reason": "changed mind"})
        assert r.status_code == 400

    def test_cancel_past_booking_returns_400(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            self._booking(scheduled_at=PAST)
        ]
        with patch("app.bookings.router.supabase", sb):
            r = client.patch("/bookings/manage/tok_abc/cancel", json={})
        assert r.status_code == 400

    def test_reschedule_to_past_returns_400(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._booking()]
        with patch("app.bookings.router.supabase", sb):
            r = client.patch("/bookings/manage/tok_abc/reschedule", json={"new_scheduled_at": PAST})
        assert r.status_code == 400
