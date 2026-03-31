"""
Unit-level tests for app/profiles/service.py
Tests that don't require HTTP — call service functions directly.
Requires migration_v5 applied to the test Supabase instance.
"""
import pytest
from app.profiles.service import (
    _slugify,
    ensure_profile_exists,
    get_profile_by_user_id,
    get_profile_by_username,
    upsert_profile,
    create_permanent_link,
    get_permanent_link_by_username_slug,
)

USER_A = "svc_test_user_a"
USER_B = "svc_test_user_b"
EMAIL_A = "usera@example.com"
EMAIL_B = "userb@example.com"


class TestSlugify:
    def test_basic(self):
        assert _slugify("Hello World") == "hello-world"

    def test_special_chars(self):
        assert _slugify("John.Doe@example.com") == "john-doe-example-com"

    def test_empty(self):
        assert _slugify("") == "user"

    def test_leading_trailing_hyphens(self):
        result = _slugify("---test---")
        assert not result.startswith("-")
        assert not result.endswith("-")


class TestEnsureProfileExists:
    def test_creates_on_first_call(self):
        profile = ensure_profile_exists(USER_A, EMAIL_A)
        assert profile["user_id"] == USER_A
        assert profile["username"]  # non-empty

    def test_idempotent(self):
        p1 = ensure_profile_exists(USER_A, EMAIL_A)
        p2 = ensure_profile_exists(USER_A, EMAIL_A)
        assert p1["username"] == p2["username"]

    def test_username_deduplication(self):
        # Both users have same email prefix → second gets a suffix
        ensure_profile_exists(USER_A, "shared@example.com")
        ensure_profile_exists(USER_B, "shared@example.com")
        p_a = get_profile_by_user_id(USER_A)
        p_b = get_profile_by_user_id(USER_B)
        assert p_a["username"] != p_b["username"]


class TestUpsertProfile:
    def test_update_display_name(self):
        ensure_profile_exists(USER_A, EMAIL_A)
        updated = upsert_profile(USER_A, "Alice Smith", None, None)
        assert updated["display_name"] == "Alice Smith"

    def test_update_username_taken_raises(self):
        ensure_profile_exists(USER_A, EMAIL_A)
        p_b = ensure_profile_exists(USER_B, EMAIL_B)
        with pytest.raises(ValueError, match="taken"):
            upsert_profile(USER_A, None, None, p_b["username"])


class TestPermanentLinkLookup:
    def test_lookup_by_username_slug(self):
        ensure_profile_exists(USER_A, EMAIL_A)
        p = get_profile_by_user_id(USER_A)
        link = create_permanent_link(USER_A, "lookup-test", "30-min intro call", [])
        result = get_permanent_link_by_username_slug(p["username"], "lookup-test")
        assert result is not None
        fetched_link, host_id = result
        assert fetched_link["id"] == link["id"]
        assert host_id == USER_A

    def test_lookup_nonexistent_returns_none(self):
        result = get_permanent_link_by_username_slug("nobody-xyz", "missing")
        assert result is None
