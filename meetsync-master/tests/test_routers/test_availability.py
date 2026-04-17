"""
Availability router tests.
Run with: pytest tests/test_routers/test_availability.py -v
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


SETTINGS_ROW = {
    "user_id": "usr_host",
    "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "daily_shifts": ["09:00", "09:30", "10:00"],
    "slot_duration": 30,
    "buffer_minutes": 0,
    "timezone": "UTC",
    "min_notice_hours": 0,
    "max_days_ahead": None,
    "max_bookings_per_day": None,
    "allow_double_booking": False,
}


def _auth_cookies(user_id: str = "usr_host") -> dict:
    from app.auth.middleware import make_user_session_cookie_value
    return {"draftmeet_user": make_user_session_cookie_value(user_id)}


class TestGetSlots:
    def test_invalid_date_format_returns_400(self, client: TestClient):
        r = client.get("/availability/slots?date=not-a-date")
        assert r.status_code == 400

    def test_no_auth_no_link_returns_403(self, client: TestClient):
        r = client.get("/availability/slots?date=2026-06-01")
        assert r.status_code in (401, 403)

    def test_slots_with_permanent_link_id(self, client: TestClient):
        sb = MagicMock()
        # permanent link lookup
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "plink_01", "user_id": "usr_host", "is_active": True}
        ]
        sb.table.return_value.select.return_value.eq.return_value.neq.return_value.gte.return_value.lte.return_value.execute.return_value.data = []

        async def mock_busy(*a, **kw):
            return []

        with patch("app.availability.router.supabase", sb), \
             patch("app.profiles.service.supabase", sb), \
             patch("app.integrations.google_calendar.get_google_busy_times", mock_busy):
            r = client.get("/availability/slots?date=2027-06-02&permanent_link_id=plink_01")
        assert r.status_code == 200
        assert "slots" in r.json()

    def test_slots_blocked_day_returns_empty(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {**SETTINGS_ROW, "working_days": ["Mon"]}
        ]
        sb.table.return_value.select.return_value.eq.return_value.neq.return_value.gte.return_value.lte.return_value.execute.return_value.data = []

        async def mock_busy(*a, **kw):
            return []

        with patch("app.availability.router.supabase", sb), \
             patch("app.auth.middleware.supabase", sb), \
             patch("app.integrations.google_calendar.get_google_busy_times", mock_busy):
            # 2027-06-06 is a Sunday — should be empty if only Mon is a working day
            r = client.get(
                "/availability/slots?date=2027-06-06",
                cookies=_auth_cookies(),
            )
        assert r.status_code == 200
        assert r.json()["slots"] == []

    def test_settings_unauthenticated_returns_401(self, client: TestClient):
        r = client.get("/availability/settings")
        assert r.status_code == 401

    def test_settings_update_invalid_shift_returns_422(self, client: TestClient):
        payload = {
            "working_days": ["Mon", "Tue"],
            "daily_shifts": ["25:00"],  # invalid hour
            "slot_duration": 30,
            "buffer_minutes": 0,
            "timezone": "UTC",
        }
        r = client.put("/availability/settings", json=payload, cookies=_auth_cookies())
        assert r.status_code == 422

    def test_settings_update_invalid_working_day_returns_422(self, client: TestClient):
        payload = {
            "working_days": ["Monday"],  # must be "Mon"
            "daily_shifts": ["09:00"],
            "slot_duration": 30,
            "buffer_minutes": 0,
            "timezone": "UTC",
        }
        r = client.put("/availability/settings", json=payload, cookies=_auth_cookies())
        assert r.status_code == 422

    def test_override_invalid_date_returns_422(self, client: TestClient):
        r = client.post(
            "/availability/overrides",
            json={"override_date": "06/01/2026", "is_available": False},
            cookies=_auth_cookies(),
        )
        assert r.status_code == 422
