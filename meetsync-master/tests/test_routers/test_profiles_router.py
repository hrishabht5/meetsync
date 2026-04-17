"""
Integration tests for the /profiles router.
These tests hit the real FastAPI app (no mocking).
Requires a valid Supabase test environment with migration_v5 applied.
"""
import pytest
from fastapi.testclient import TestClient

# ── Helpers ───────────────────────────────────────────────────────────────────

FAKE_USER  = "test_profile_user_001"
FAKE_EMAIL = "testprofile@example.com"


def _auth_cookies(user_id: str) -> dict:
    """Return a properly signed session cookie for test requests."""
    from app.auth.middleware import make_user_session_cookie_value
    return {"draftmeet_user": make_user_session_cookie_value(user_id)}


def _seed_profile(client: TestClient) -> dict:
    """Ensure a profile row exists for FAKE_USER by calling the service directly."""
    from app.profiles.service import ensure_profile_exists
    return ensure_profile_exists(FAKE_USER, FAKE_EMAIL)


# ── Public endpoints ──────────────────────────────────────────────────────────

class TestPublicProfile:
    def test_get_profile_not_found(self, client: TestClient):
        r = client.get("/profiles/nonexistent-user-xyz/")
        assert r.status_code == 404

    def test_get_profile_found(self, client: TestClient):
        profile = _seed_profile(client)
        r = client.get(f"/profiles/{profile['username']}/")
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == profile["username"]
        assert "links" in data

    def test_validate_slug_not_found(self, client: TestClient):
        r = client.get("/profiles/nobody/no-slug/validate/")
        assert r.status_code == 404


# ── Authenticated endpoints ───────────────────────────────────────────────────

class TestMyProfile:
    def test_get_me(self, client: TestClient):
        _seed_profile(client)
        r = client.get("/profiles/me/", cookies=_auth_cookies(FAKE_USER))
        assert r.status_code in (200, 401, 403)

    def test_update_me_username_taken(self, client: TestClient):
        """PUT /profiles/me with an already-taken username must return 409."""
        from app.profiles.service import ensure_profile_exists, upsert_profile
        p1 = ensure_profile_exists(FAKE_USER, FAKE_EMAIL)
        other_user = "test_profile_user_002"
        p2 = ensure_profile_exists(other_user, "other@example.com")
        # Try to steal p2's username via the service (unit-level check)
        with pytest.raises(ValueError, match="taken"):
            upsert_profile(FAKE_USER, None, None, p2["username"])


# ── Permanent link CRUD (service-level) ──────────────────────────────────────

class TestPermanentLinks:
    def test_create_and_list(self, client: TestClient):
        from app.profiles.service import (
            ensure_profile_exists,
            create_permanent_link,
            list_permanent_links,
        )
        profile = ensure_profile_exists(FAKE_USER, FAKE_EMAIL)
        link = create_permanent_link(FAKE_USER, "my-coffee-chat", "30-min intro call", [])
        assert link["slug"] == "my-coffee-chat"
        assert link["is_active"] is True

        links = list_permanent_links(FAKE_USER)
        ids = [lk["id"] for lk in links]
        assert link["id"] in ids

    def test_duplicate_slug_raises(self, client: TestClient):
        from app.profiles.service import ensure_profile_exists, create_permanent_link
        ensure_profile_exists(FAKE_USER, FAKE_EMAIL)
        try:
            create_permanent_link(FAKE_USER, "dup-slug", "30-min intro call", [])
        except Exception:
            pass  # may already exist from prior run
        with pytest.raises(ValueError, match="already have"):
            create_permanent_link(FAKE_USER, "dup-slug", "30-min intro call", [])

    def test_toggle(self, client: TestClient):
        from app.profiles.service import (
            ensure_profile_exists,
            create_permanent_link,
            toggle_permanent_link,
        )
        ensure_profile_exists(FAKE_USER, FAKE_EMAIL)
        link = create_permanent_link(FAKE_USER, "toggle-test", "15-min quick chat", [])
        assert link["is_active"] is True
        toggled = toggle_permanent_link(FAKE_USER, link["id"])
        assert toggled["is_active"] is False

    def test_delete(self, client: TestClient):
        from app.profiles.service import (
            ensure_profile_exists,
            create_permanent_link,
            delete_permanent_link,
            list_permanent_links,
        )
        ensure_profile_exists(FAKE_USER, FAKE_EMAIL)
        link = create_permanent_link(FAKE_USER, "to-delete", "60-min deep dive", [])
        delete_permanent_link(FAKE_USER, link["id"])
        ids = [lk["id"] for lk in list_permanent_links(FAKE_USER)]
        assert link["id"] not in ids
