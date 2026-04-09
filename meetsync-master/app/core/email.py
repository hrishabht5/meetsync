"""
Email service — DraftMeet
------------------------
Uses Resend (https://resend.com) via its REST API.
No extra package required; httpx is already in requirements.txt.

Required env vars:
  RESEND_API_KEY   — from resend.com dashboard
  FROM_EMAIL       — e.g. "DraftMeet <noreply@yourdomain.com>"
                     During testing: "DraftMeet <onboarding@resend.dev>"
"""

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import RESEND_API_KEY, FROM_EMAIL, FRONTEND_URL

log = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


# ── Internal helper ────────────────────────────────────────────────────────────

async def _send(to: str, subject: str, html: str) -> None:
    """Fire-and-forget: logs on failure, never raises."""
    if not RESEND_API_KEY:
        log.warning("RESEND_API_KEY not set — email to %s skipped", to)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                RESEND_SEND_URL,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            )
            if resp.status_code not in (200, 201):
                log.error("Resend error %s: %s", resp.status_code, resp.text)
            else:
                log.info("Email sent to %s — %s", to, subject)
    except Exception as exc:
        log.error("Failed to send email to %s: %s", to, exc)


# ── Shared style ───────────────────────────────────────────────────────────────

def _base(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#6366f1;padding:24px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;
                         letter-spacing:-0.5px;">DraftMeet</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            {body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;
                     border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              DraftMeet — Smart scheduling, simplified.<br/>
              This is an automated message. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _fmt_dt(iso: str) -> str:
    """Format an ISO timestamp nicely, e.g. 'Monday, 14 Apr 2026 at 10:00 AM UTC'."""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%A, %d %b %Y at %I:%M %p UTC")
    except Exception:
        return iso


def _btn(text: str, url: str, color: str = "#6366f1") -> str:
    return (
        f'<a href="{url}" style="display:inline-block;padding:12px 24px;'
        f'background:{color};color:#ffffff;text-decoration:none;'
        f'border-radius:6px;font-weight:600;font-size:14px;">{text}</a>'
    )


def _detail_row(label: str, value: str) -> str:
    return (
        f'<tr>'
        f'<td style="padding:8px 12px;font-size:13px;color:#6b7280;'
        f'white-space:nowrap;font-weight:600;">{label}</td>'
        f'<td style="padding:8px 12px;font-size:14px;color:#111827;">{value}</td>'
        f'</tr>'
    )


def _detail_table(*rows: str) -> str:
    inner = "".join(rows)
    return (
        f'<table cellpadding="0" cellspacing="0" width="100%"'
        f' style="background:#f9fafb;border-radius:6px;'
        f'border:1px solid #e5e7eb;margin:20px 0;">'
        f'{inner}</table>'
    )


# ── Public API ─────────────────────────────────────────────────────────────────

async def send_waitlist_welcome(email: str) -> None:
    body = f"""
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">You're on the waitlist!</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  Thanks for joining the DraftMeet waitlist. We'll notify you the moment early access opens up.
</p>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  DraftMeet is a smart scheduling tool that lets you share a booking link, let guests pick a time,
  and have meetings land on your calendar automatically — no back-and-forth needed.
</p>
{_btn("Learn more", FRONTEND_URL, "#6366f1")}
<p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
  We'll be in touch soon. Stay tuned!
</p>
"""
    await _send(email, "You're on the DraftMeet waitlist!", _base("Waitlist confirmed", body))


async def send_booking_confirmation_to_guest(
    guest_email: str,
    guest_name: str,
    scheduled_at: str,
    event_type: str,
    meet_link: str | None,
    manage_token: str,
    host_display_name: str | None = None,
    notes: str | None = None,
) -> None:
    manage_url = f"{FRONTEND_URL.rstrip('/')}/manage/{manage_token}"
    host_label = host_display_name or "your host"

    details = _detail_table(
        _detail_row("Meeting", event_type),
        _detail_row("When", _fmt_dt(scheduled_at)),
        _detail_row("Host", host_label),
        *([ _detail_row("Meet link", f'<a href="{meet_link}" style="color:#6366f1;">{meet_link}</a>') ] if meet_link else []),
        *([ _detail_row("Your notes", notes) ] if notes else []),
    )

    body = f"""
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Your meeting is confirmed!</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  Hi {guest_name}, your booking with {host_label} has been scheduled.
</p>
{details}
{"<p style='margin:12px 0;'>" + _btn("Join Google Meet", meet_link, "#059669") + "</p>" if meet_link else ""}
<p style="margin:24px 0 8px;color:#6b7280;font-size:14px;">
  Need to reschedule or cancel? Use the link below — no account needed.
</p>
{_btn("Manage my booking", manage_url, "#6366f1")}
"""
    await _send(
        guest_email,
        f"Meeting confirmed — {_fmt_dt(scheduled_at)}",
        _base("Booking confirmed", body),
    )


async def send_booking_notification_to_host(
    host_email: str,
    host_display_name: str | None,
    guest_name: str,
    guest_email: str,
    scheduled_at: str,
    event_type: str,
    meet_link: str | None,
    notes: str | None = None,
) -> None:
    host_label = host_display_name or "there"
    details = _detail_table(
        _detail_row("Guest", f"{guest_name} &lt;{guest_email}&gt;"),
        _detail_row("Meeting type", event_type),
        _detail_row("When", _fmt_dt(scheduled_at)),
        *([ _detail_row("Meet link", f'<a href="{meet_link}" style="color:#6366f1;">{meet_link}</a>') ] if meet_link else []),
        *([ _detail_row("Guest notes", notes) ] if notes else []),
    )

    body = f"""
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">New booking received</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  Hi {host_label}, {guest_name} has just booked a meeting with you.
</p>
{details}
{"<p style='margin:12px 0;'>" + _btn("Join Google Meet", meet_link, "#059669") + "</p>" if meet_link else ""}
<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
  The event has been added to your Google Calendar automatically.
</p>
"""
    await _send(
        host_email,
        f"New booking from {guest_name} — {_fmt_dt(scheduled_at)}",
        _base("New booking", body),
    )


async def send_cancellation_email_to_guest(
    guest_email: str,
    guest_name: str,
    scheduled_at: str,
    event_type: str,
    reason: str | None = None,
) -> None:
    details = _detail_table(
        _detail_row("Meeting", event_type),
        _detail_row("Was scheduled for", _fmt_dt(scheduled_at)),
        *([ _detail_row("Reason", reason) ] if reason else []),
    )

    body = f"""
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Booking cancelled</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  Hi {guest_name}, your booking has been successfully cancelled.
</p>
{details}
<p style="margin:20px 0 0;color:#6b7280;font-size:14px;">
  Want to book a new time?
  <a href="{FRONTEND_URL}" style="color:#6366f1;">Visit DraftMeet</a>
</p>
"""
    await _send(
        guest_email,
        "Your booking has been cancelled",
        _base("Booking cancelled", body),
    )


async def send_reschedule_email_to_guest(
    guest_email: str,
    guest_name: str,
    old_scheduled_at: str,
    new_scheduled_at: str,
    event_type: str,
    meet_link: str | None,
    manage_token: str,
) -> None:
    manage_url = f"{FRONTEND_URL.rstrip('/')}/manage/{manage_token}"
    details = _detail_table(
        _detail_row("Meeting", event_type),
        _detail_row("Previous time", _fmt_dt(old_scheduled_at)),
        _detail_row("New time", _fmt_dt(new_scheduled_at)),
        *([ _detail_row("Meet link", f'<a href="{meet_link}" style="color:#6366f1;">{meet_link}</a>') ] if meet_link else []),
    )

    body = f"""
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Your booking has been rescheduled</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
  Hi {guest_name}, your meeting has been moved to a new time.
</p>
{details}
{"<p style='margin:12px 0;'>" + _btn("Join Google Meet", meet_link, "#059669") + "</p>" if meet_link else ""}
<p style="margin:24px 0 8px;color:#6b7280;font-size:14px;">
  Need to make further changes?
</p>
{_btn("Manage my booking", manage_url, "#6366f1")}
"""
    await _send(
        guest_email,
        f"Booking rescheduled — {_fmt_dt(new_scheduled_at)}",
        _base("Booking rescheduled", body),
    )
