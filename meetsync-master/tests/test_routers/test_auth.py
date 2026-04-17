"""
Auth router tests — mocked Supabase, no network calls.
Run with: pytest tests/test_routers/test_auth.py -v
"""
from unittest.mock import MagicMock, patch

import bcrypt
import pytest
from fastapi.testclient import TestClient


def _hashed(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=4)).decode()


def _auth_cookies(user_id: str = "usr_test123") -> dict:
    from app.auth.middleware import make_user_session_cookie_value
    return {"draftmeet_user": make_user_session_cookie_value(user_id)}


class TestSignup:
    def test_signup_success(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        sb.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "usr_new"}]
        with patch("app.auth.router.supabase", sb), \
             patch("app.profiles.service.supabase", sb):
            r = client.post("/auth/signup", json={"email": "new@example.com", "password": "SecurePass1"})
        assert r.status_code == 200
        assert r.json()["status"] == "created"

    def test_signup_duplicate_email_returns_409(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "existing"}]
        with patch("app.auth.router.supabase", sb):
            r = client.post("/auth/signup", json={"email": "taken@example.com", "password": "SecurePass1"})
        assert r.status_code == 409

    def test_signup_weak_password_short(self, client: TestClient):
        r = client.post("/auth/signup", json={"email": "a@b.com", "password": "short"})
        assert r.status_code == 422

    def test_signup_password_no_uppercase(self, client: TestClient):
        r = client.post("/auth/signup", json={"email": "a@b.com", "password": "alllowercase1"})
        assert r.status_code == 422

    def test_signup_password_no_digit(self, client: TestClient):
        r = client.post("/auth/signup", json={"email": "a@b.com", "password": "NoDigitHere"})
        assert r.status_code == 422

    def test_signup_email_normalized_to_lowercase(self, client: TestClient):
        captured = {}
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        original_upsert = sb.table.return_value.upsert

        def capture_upsert(row, **kwargs):
            captured["email"] = row.get("email")
            return original_upsert(row, **kwargs)

        sb.table.return_value.upsert.side_effect = capture_upsert
        with patch("app.auth.router.supabase", sb), \
             patch("app.profiles.service.supabase", sb):
            client.post("/auth/signup", json={"email": "UPPER@EXAMPLE.COM", "password": "SecurePass1"})
        assert captured.get("email") == "upper@example.com"


class TestLogin:
    def test_login_success(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "usr_test", "password_hash": _hashed("SecurePass1")}
        ]
        with patch("app.auth.router.supabase", sb):
            r = client.post("/auth/login", json={"email": "user@example.com", "password": "SecurePass1"})
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_login_wrong_password_returns_401(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "usr_test", "password_hash": _hashed("CorrectPass1")}
        ]
        with patch("app.auth.router.supabase", sb):
            r = client.post("/auth/login", json={"email": "user@example.com", "password": "WrongPass1"})
        assert r.status_code == 401

    def test_login_unknown_email_returns_401(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.auth.router.supabase", sb):
            r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "AnyPass123"})
        assert r.status_code == 401

    def test_login_timing_constant_for_unknown_user(self, client: TestClient):
        """bcrypt should always run even for unknown emails (timing-safe)."""
        import time
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        with patch("app.auth.router.supabase", sb):
            t0 = time.monotonic()
            client.post("/auth/login", json={"email": "ghost@example.com", "password": "AnyPass123"})
            elapsed = time.monotonic() - t0
        assert elapsed > 0.001  # bcrypt ran (not instant)


class TestAuthStatus:
    def test_auth_status_unauthenticated_returns_401(self, client: TestClient):
        r = client.get("/auth/status")
        assert r.status_code == 401

    def test_auth_status_authenticated(self, client: TestClient):
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"email": "user@example.com"}
        ]
        with patch("app.auth.router.supabase", sb), \
             patch("app.auth.middleware.supabase", sb):
            r = client.get("/auth/status", cookies=_auth_cookies())
        assert r.status_code == 200
        assert r.json()["connected"] is True


class TestLogout:
    def test_logout_clears_cookie(self, client: TestClient):
        r = client.post("/auth/logout/", cookies=_auth_cookies())
        assert r.status_code == 200
        assert r.json()["status"] == "logged_out"
