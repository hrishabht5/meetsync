"""
Analytics router
----------------
GET /analytics/summary/   → high-level booking counts + rates
GET /analytics/trend/     → daily booking counts over last N days
GET /analytics/breakdown/ → counts grouped by event type and status
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request

from app.auth.middleware import get_current_user_id
from app.core.config import supabase

router = APIRouter()


# ═══════════════════════════════════════════════════════════
#  GET /analytics/summary/
# ═══════════════════════════════════════════════════════════

@router.get("/summary/")
def get_summary(request: Request):
    """
    Returns aggregate counts for the authenticated user's bookings:
      - total, confirmed, cancelled, upcoming
      - cancellation_rate (%)
      - top_event_type (most booked confirmed type)
    """
    user_id = get_current_user_id(request)

    result = supabase.table("bookings") \
        .select("id, status, scheduled_at, event_type") \
        .eq("user_id", user_id) \
        .execute()

    bookings = result.data or []
    now = datetime.now(timezone.utc)

    total = len(bookings)
    confirmed = sum(1 for b in bookings if b["status"] == "confirmed")
    cancelled = sum(1 for b in bookings if b["status"] == "cancelled")
    upcoming = sum(
        1 for b in bookings
        if b["status"] != "cancelled"
        and _parse_dt(b["scheduled_at"]) > now
    )

    cancellation_rate = round((cancelled / total * 100), 1) if total > 0 else 0.0

    confirmed_types = [b["event_type"] for b in bookings if b["status"] == "confirmed" and b.get("event_type")]
    top_event_type = Counter(confirmed_types).most_common(1)[0][0] if confirmed_types else ""

    return {
        "total": total,
        "confirmed": confirmed,
        "cancelled": cancelled,
        "upcoming": upcoming,
        "cancellation_rate": cancellation_rate,
        "top_event_type": top_event_type,
    }


# ═══════════════════════════════════════════════════════════
#  GET /analytics/trend/?days=30
# ═══════════════════════════════════════════════════════════

@router.get("/trend/")
def get_trend(request: Request, days: int = 30):
    """
    Returns daily booking counts for the last `days` days (default 30).
    Days with no bookings are zero-filled so the chart has a continuous axis.
    """
    if days < 1:
        days = 1
    if days > 365:
        days = 365

    user_id = get_current_user_id(request)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    cutoff_iso = cutoff.isoformat()

    result = supabase.table("bookings") \
        .select("created_at") \
        .eq("user_id", user_id) \
        .gte("created_at", cutoff_iso) \
        .execute()

    # Count bookings per date string (YYYY-MM-DD in UTC)
    counts: dict[str, int] = defaultdict(int)
    for b in (result.data or []):
        dt = _parse_dt(b["created_at"])
        if dt:
            date_str = dt.date().isoformat()
            counts[date_str] += 1

    # Build zero-filled series for every day in range
    trend = []
    for i in range(days):
        day = (cutoff + timedelta(days=i + 1)).date().isoformat()
        trend.append({"date": day, "count": counts.get(day, 0)})

    return trend


# ═══════════════════════════════════════════════════════════
#  GET /analytics/breakdown/
# ═══════════════════════════════════════════════════════════

@router.get("/breakdown/")
def get_breakdown(request: Request):
    """
    Returns booking counts grouped by:
      - event_type  (by_event_type)
      - status      (by_status)
    Each item includes count and percentage.
    """
    user_id = get_current_user_id(request)

    result = supabase.table("bookings") \
        .select("event_type, status") \
        .eq("user_id", user_id) \
        .execute()

    bookings = result.data or []
    total = len(bookings)

    def _build_breakdown(key: str) -> list[dict]:
        counts: dict[str, int] = Counter(
            b[key] for b in bookings if b.get(key)
        )
        items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [
            {
                "label": label,
                "count": count,
                "pct": round(count / total * 100, 1) if total > 0 else 0.0,
            }
            for label, count in items
        ]

    return {
        "by_event_type": _build_breakdown("event_type"),
        "by_status": _build_breakdown("status"),
    }


# ═══════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════

def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None
