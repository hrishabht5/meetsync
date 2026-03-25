import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")  # Use service key (not anon) for backend
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Google OAuth2 ─────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

# ── App ───────────────────────────────────────────────────
APP_BASE_URL  = os.getenv("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:3000")
SECRET_KEY    = os.getenv("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
