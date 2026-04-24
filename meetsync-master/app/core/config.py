import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise ValueError("Missing required environment variable: SUPABASE_URL")

SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY")
if not SUPABASE_KEY:
    raise ValueError("Missing required environment variable: SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Google OAuth2 ─────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError("Missing required environment variable: GOOGLE_CLIENT_ID")

GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
if not GOOGLE_CLIENT_SECRET:
    raise ValueError("Missing required environment variable: GOOGLE_CLIENT_SECRET")

GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

# ── App ───────────────────────────────────────────────────
APP_BASE_URL  = os.getenv("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
SECRET_KEY    = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("Missing required environment variable: SECRET_KEY")

# ── Resend (email) ────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "DraftMeet <notification@draftmeet.com>")

# ── Vercel (custom domains) ───────────────────────────────
# Required for programmatic domain management. VERCEL_TEAM_ID only needed
# for team (non-personal) Vercel accounts.
VERCEL_TOKEN      = os.getenv("VERCEL_TOKEN", "")
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID", "")
VERCEL_TEAM_ID    = os.getenv("VERCEL_TEAM_ID", "")

# ── Admin ─────────────────────────────────────────────────
# Email of the single platform admin. Set ADMIN_EMAIL in env to enable the
# /admin/* routes and grant access to the admin dashboard.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

# ── Waitlist admin webhook ────────────────────────────────
# When set, a POST is fired to this URL on every new waitlist signup.
# Leave empty to disable. WAITLIST_WEBHOOK_SECRET is optional HMAC signing.
WAITLIST_WEBHOOK_URL    = os.getenv("WAITLIST_WEBHOOK_URL", "")
WAITLIST_WEBHOOK_SECRET = os.getenv("WAITLIST_WEBHOOK_SECRET", "")

# Cookie name used to save the admin's original session during impersonation.
ADMIN_RESTORE_COOKIE = "draftmeet_admin_restore"
