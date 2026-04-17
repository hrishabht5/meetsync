"""
One-time link router & service tests.
Run with: pytest tests/test_routers/test_links.py -v
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _auth_cookies(user_id: str = "usr_host") -> dict:
    from app.auth.middleware import make_user_session_cookie_value
    return {"draftmeet_user": make_user_session_cookie_value(user_id)}


class TestOTLSchemaValidation:
    def test_create_otl_invalid_event_type_accepted(self, client: TestClient):
        """event_type on OTL creation is free-text (host sets it); only BookingCreate validates."""
        sb = MagicMock()
        sb.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "lnk_new", "event_type": "Custom Chat", "status": "active",
             "expires_at": None, "created_at": "2026-01-01T00:00:00+00:00",
             "used_at": None, "custom_fields": []}
        ]
        with patch("app.links.router.supabase", sb), \
             patch("app.auth.middleware.supabase", sb), \
             patch("app.links.service.supabase", sb):
            r = client.post("/links/", json={"event_type": "Custom Chat"}, cookies=_auth_cookies())
        assert r.status_code == 201


class TestValidateOTL:
    def _otl(self, status="active", expires_at=None):
        return {
            "id": "lnk_test",
            "user_id": "usr_host",
            "event_type": "30-min intro call",
            "status": status,
            "expires_at": expires_at,
            "custom_title": None,
            "custom_fields": [],
        }

    def test_validate_active_otl(self):
        from app.links.service import validate_otl
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._otl()]
        with patch("app.links.service.supabase", sb):
            result = validate_otl("lnk_test")
        assert result["status"] == "active"

    def test_validate_used_otl_raises(self):
        from app.links.service import validate_otl
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._otl(status="used")]
        with patch("app.links.service.supabase", sb):
            with pytest.raises(ValueError, match="already been used"):
                validate_otl("lnk_test")

    def test_validate_revoked_otl_raises(self):
        from app.links.service import validate_otl
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._otl(status="revoked")]
        with patch("app.links.service.supabase", sb):
            with pytest.raises(ValueError, match="revoked"):
                validate_otl("lnk_test")

    def test_validate_expired_by_status_raises(self):
        from app.links.service import validate_otl
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [self._otl(status="expired")]
        with patch("app.links.service.supabase", sb):
            with pytest.raises(ValueError, match="expired"):
                validate_otl("lnk_test")

    def test_validate_expired_by_date_raises(self):
        from app.links.service import validate_otl
        past_exp = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            self._otl(expires_at=past_exp)
        ]
        sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.links.service.supabase", sb):
            with pytest.raises(ValueError, match="expired"):
                validate_otl("lnk_test")

    def test_validate_missing_otl_raises(self):
        from app.links.service import validate_otl
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.links.service.supabase", sb):
            with pytest.raises(ValueError, match="does not exist"):
                validate_otl("lnk_nonexistent")


class TestMarkOTLUsed:
    def test_mark_used_success(self):
        from app.links.service import mark_otl_used
        sb = MagicMock()
        sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"status": "used", "booking_id": "bk_001"}
        ]
        with patch("app.links.service.supabase", sb):
            result = mark_otl_used("lnk_test", "bk_001")
        assert result is True

    def test_mark_used_race_returns_false(self):
        from app.links.service import mark_otl_used
        sb = MagicMock()
        sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"status": "active", "booking_id": None}  # still active = someone else won the race
        ]
        with patch("app.links.service.supabase", sb):
            result = mark_otl_used("lnk_test", "bk_001")
        assert result is False


class TestGetOTLEndpoint:
    def test_get_valid_otl(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "lnk_abc", "user_id": "usr_host", "event_type": "30-min intro call",
             "status": "active", "expires_at": None, "custom_title": None,
             "custom_fields": [], "description": None,
             "cover_image_url": None, "bg_image_url": None, "accent_color": None}
        ]
        with patch("app.links.router.supabase", sb), \
             patch("app.links.service.supabase", sb):
            r = client.get("/links/lnk_abc")
        assert r.status_code == 200

    def test_get_used_otl_returns_400(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "lnk_abc", "status": "used", "user_id": "usr_host",
             "event_type": "30-min intro call", "expires_at": None,
             "custom_title": None, "custom_fields": []}
        ]
        with patch("app.links.router.supabase", sb), \
             patch("app.links.service.supabase", sb):
            r = client.get("/links/lnk_abc")
        assert r.status_code == 400
