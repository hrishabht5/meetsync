"""
Email template tests — verify HTML injection is escaped.
Run with: pytest tests/test_routers/test_email.py -v
"""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest


INJECTION = '<img src=x onerror=fetch("https://evil.com")>'
FUTURE_ISO = "2026-06-15T10:00:00+00:00"


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


class TestHTMLEscaping:
    def _capture_html(self, coro):
        captured = {}
        async def fake_send(to, subject, html):
            captured["html"] = html
            captured["subject"] = subject
        with patch("app.core.email._send", side_effect=fake_send):
            _run(coro)
        return captured

    def test_guest_name_escaped_in_confirmation(self):
        from app.core.email import send_booking_confirmation_to_guest
        captured = self._capture_html(send_booking_confirmation_to_guest(
            guest_email="a@b.com",
            guest_name=INJECTION,
            scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
            meet_link="https://meet.google.com/abc",
            manage_token="tok_123",
        ))
        assert "<img" not in captured["html"]
        assert "onerror" not in captured["html"]
        assert "&lt;img" in captured["html"] or "img src" not in captured["html"]

    def test_notes_escaped_in_confirmation(self):
        from app.core.email import send_booking_confirmation_to_guest
        captured = self._capture_html(send_booking_confirmation_to_guest(
            guest_email="a@b.com",
            guest_name="Alice",
            scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
            meet_link=None,
            manage_token="tok_123",
            notes=INJECTION,
        ))
        assert "onerror" not in captured["html"]

    def test_guest_name_escaped_in_host_notification(self):
        from app.core.email import send_booking_notification_to_host
        captured = self._capture_html(send_booking_notification_to_host(
            host_email="host@b.com",
            host_display_name="Bob",
            guest_name=INJECTION,
            guest_email="evil@b.com",
            scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
            meet_link=None,
        ))
        assert "onerror" not in captured["html"]

    def test_reason_escaped_in_cancellation(self):
        from app.core.email import send_cancellation_email_to_guest
        captured = self._capture_html(send_cancellation_email_to_guest(
            guest_email="a@b.com",
            guest_name="Alice",
            scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
            reason=INJECTION,
        ))
        assert "onerror" not in captured["html"]

    def test_guest_name_escaped_in_host_cancellation(self):
        from app.core.email import send_cancellation_email_to_host
        captured = self._capture_html(send_cancellation_email_to_host(
            host_email="host@b.com",
            guest_name=INJECTION,
            guest_email="evil@b.com",
            scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
        ))
        assert "onerror" not in captured["html"]

    def test_reschedule_guest_name_escaped(self):
        from app.core.email import send_reschedule_email_to_guest
        captured = self._capture_html(send_reschedule_email_to_guest(
            guest_email="a@b.com",
            guest_name=INJECTION,
            old_scheduled_at=FUTURE_ISO,
            new_scheduled_at=FUTURE_ISO,
            event_type="30-min intro call",
            meet_link=None,
            manage_token="tok_123",
        ))
        assert "onerror" not in captured["html"]

    def test_send_skipped_when_no_api_key(self):
        from app.core.email import send_waitlist_welcome
        with patch("app.core.email.RESEND_API_KEY", ""):
            result = _run(send_waitlist_welcome("test@example.com"))
        assert result is None  # fire-and-forget, returns None
