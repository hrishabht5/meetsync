from datetime import datetime, timedelta, timezone
from app.core.config import supabase


def get_platform_stats() -> dict:
    total_users    = supabase.table("users").select("id", count="exact").execute().count or 0
    total_bookings = supabase.table("bookings").select("id", count="exact").execute().count or 0

    # 30-day daily signup trend (zero-filled)
    since = (datetime.now(timezone.utc) - timedelta(days=29)).date()
    rows = supabase.table("users") \
        .select("created_at") \
        .gte("created_at", since.isoformat()) \
        .execute().data or []

    counts: dict[str, int] = {}
    for row in rows:
        day = row["created_at"][:10]
        counts[day] = counts.get(day, 0) + 1

    trend = []
    for i in range(30):
        d = (since + timedelta(days=i)).isoformat()
        trend.append({"date": d, "count": counts.get(d, 0)})

    return {
        "total_users": total_users,
        "total_bookings": total_bookings,
        "signup_trend": trend,
    }


def list_users(search: str = "", page: int = 1, limit: int = 50) -> dict:
    offset = (page - 1) * limit

    query = supabase.table("users").select(
        "id, email, created_at, user_profiles(username, display_name, remove_branding)",
        count="exact",
    )
    if search:
        # Supabase PostgREST ilike filter on email
        query = query.ilike("email", f"%{search}%")

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    total = result.count or 0

    # Fetch booking counts for the returned users
    user_ids = [r["id"] for r in (result.data or [])]
    booking_counts: dict[str, int] = {}
    if user_ids:
        bc_rows = supabase.table("bookings") \
            .select("user_id", count="exact") \
            .in_("user_id", user_ids) \
            .execute()
        # Supabase doesn't support GROUP BY natively; count per user manually
        for r in (bc_rows.data or []):
            uid = r["user_id"]
            booking_counts[uid] = booking_counts.get(uid, 0) + 1

    items = []
    for r in (result.data or []):
        profile = r.get("user_profiles") or {}
        if isinstance(profile, list):
            profile = profile[0] if profile else {}
        items.append({
            "id": r["id"],
            "email": r["email"],
            "created_at": r["created_at"],
            "username": profile.get("username"),
            "display_name": profile.get("display_name"),
            "booking_count": booking_counts.get(r["id"], 0),
            "remove_branding": bool(profile.get("remove_branding", False)),
        })

    return {"items": items, "total": total, "page": page, "has_more": offset + limit < total}


def set_remove_branding(user_id: str, remove_branding: bool) -> dict:
    result = supabase.table("user_profiles") \
        .update({"remove_branding": remove_branding}) \
        .eq("user_id", user_id) \
        .execute()
    if not result.data:
        raise ValueError("User profile not found")
    return {"user_id": user_id, "remove_branding": remove_branding}


def list_waitlist() -> list:
    result = supabase.table("waitlist") \
        .select("email, created_at") \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


def list_domains() -> list:
    rows = supabase.table("custom_domains") \
        .select("id, domain, verified, created_at, user_id") \
        .order("created_at", desc=True) \
        .execute().data or []

    if not rows:
        return []

    user_ids = [r["user_id"] for r in rows]
    profiles = supabase.table("user_profiles") \
        .select("user_id, username") \
        .in_("user_id", user_ids) \
        .execute().data or []
    profile_map = {p["user_id"]: p["username"] for p in profiles}

    return [
        {
            "id": r["id"],
            "domain": r["domain"],
            "verified": r["verified"],
            "created_at": r["created_at"],
            "user_id": r["user_id"],
            "username": profile_map.get(r["user_id"]),
        }
        for r in rows
    ]
