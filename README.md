# MeetSync Backend

FastAPI + Supabase backend for the MeetSync scheduling platform.
Creates real Google Meet links, manages one-time booking links, and fires webhooks on every event.

---

## Architecture

```
Frontend (React/HTML)
       │
       ▼
FastAPI Backend  ──►  Supabase (PostgreSQL)
       │
       ├──►  Google Calendar API  (creates Meet links)
       ├──►  One-Time Link Engine (generate / validate / expire)
       └──►  Webhook Dispatcher  (POST events to your endpoints)
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd meetsync-backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Open **SQL Editor** → paste the contents of `supabase_schema.sql` → **Run**
3. Go to **Project Settings → API** and copy:
   - `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

### 3. Set up Google Cloud

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Enable APIs** → enable **Google Calendar API**
3. **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URI: `http://localhost:8000/auth/callback`
4. Copy **Client ID** and **Client Secret**

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in all values
```

### 5. Run the server

```bash
uvicorn main:app --reload
```

API is now live at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### 6. Connect your Google account

Open your browser and visit:
```
http://localhost:8000/auth/google
```
Complete the Google consent screen. Your tokens are stored in Supabase automatically.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Redirect to Google OAuth2 |
| GET | `/auth/callback` | Handle OAuth2 callback |
| GET | `/auth/status` | Check if Google is connected |
| DELETE | `/auth/disconnect` | Remove Google tokens |

### Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/availability/slots?date=2026-04-01` | Get open time slots |
| GET | `/availability/settings` | Get working hours config |
| PUT | `/availability/settings` | Update working hours |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings/` | Create booking + Meet link |
| GET | `/bookings/` | List all bookings |
| GET | `/bookings/{id}` | Get single booking |
| PATCH | `/bookings/{id}/cancel` | Cancel booking |

**Create booking request body:**
```json
{
  "guest_name":       "Priya Sharma",
  "guest_email":      "priya@example.com",
  "scheduled_at":     "2026-04-01T10:00:00+05:30",
  "event_type":       "30-min intro call",
  "notes":            "Want to discuss the proposal",
  "one_time_link_id": "lnk_a3f8x9qr"
}
```

**Response includes real Meet link:**
```json
{
  "id":                "550e8400-e29b-41d4-a716",
  "status":            "confirmed",
  "meet_link":         "https://meet.google.com/abc-defg-hij",
  "calendar_event_id": "google_cal_event_id_xyz",
  "one_time_link_id":  "lnk_a3f8x9qr"
}
```

### One-Time Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/links/` | Generate a new OTL |
| GET | `/links/` | List all OTLs |
| GET | `/links/{token}` | Validate a link |
| DELETE | `/links/{token}` | Revoke a link |

**Generate link request:**
```json
{
  "event_type": "30-min intro call",
  "expires_in": "7d"
}
```
`expires_in` options: `"24h"`, `"7d"`, `"never"`

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/` | Register endpoint |
| GET | `/webhooks/` | List endpoints |
| DELETE | `/webhooks/{id}` | Remove endpoint |
| PATCH | `/webhooks/{id}/toggle` | Enable / disable |
| GET | `/webhooks/logs` | Delivery logs |
| POST | `/webhooks/test` | Send test event |

**Register webhook:**
```json
{
  "url":    "https://your-server.com/webhook",
  "secret": "whsec_your_secret_key",
  "events": [
    "booking.created",
    "booking.confirmed",
    "booking.cancelled",
    "link.used",
    "link.expired",
    "meet.link.created"
  ]
}
```

---

## Webhook Payload

Every event POSTs this JSON to your endpoint:

```json
{
  "event":      "booking.created",
  "id":         "evt_a1b2c3d4e5f6",
  "created_at": "2026-04-01T10:00:00Z",
  "data": {
    "id":                "550e8400-e29b-41d4-a716",
    "guest_name":        "Priya Sharma",
    "guest_email":       "priya@example.com",
    "event_type":        "30-min intro call",
    "scheduled_at":      "2026-04-01T10:00:00+05:30",
    "meet_link":         "https://meet.google.com/abc-defg-hij",
    "calendar_event_id": "google_cal_event_id_xyz",
    "one_time_link_id":  "lnk_a3f8x9qr",
    "status":            "confirmed"
  }
}
```

### Verifying webhook signatures

Each request includes `X-MeetSync-Signature: sha256=<hmac>`.

Verify in Python:
```python
import hmac, hashlib

def verify_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Project Structure

```
meetsync-backend/
├── main.py                     # FastAPI app, CORS, router registration
├── config.py                   # Supabase client, env vars
├── requirements.txt
├── .env.example                # Copy to .env and fill in
├── supabase_schema.sql         # Run this in Supabase SQL Editor
│
├── models/
│   └── schemas.py              # All Pydantic request/response models
│
├── routers/
│   ├── auth.py                 # Google OAuth2 connect / callback
│   ├── availability.py         # Time slot generation
│   ├── bookings.py             # Create / list / cancel bookings
│   ├── links.py                # One-time link CRUD
│   └── webhooks.py             # Webhook endpoint management
│
├── services/
│   ├── google_calendar.py      # OAuth2 tokens + Calendar API + Meet links
│   ├── otl_service.py          # OTL generate / validate / mark used / revoke
│   └── webhook_service.py      # Signed payload dispatch with retry logic
│
└── middleware/
    └── auth.py                 # Auth middleware (extend for multi-tenant)
```

---

## Deployment

### Deploy to Railway (recommended, free tier)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

Set your `.env` variables in Railway Dashboard → Variables.

Update `GOOGLE_REDIRECT_URI` in Google Console to your Railway URL:
```
https://your-app.railway.app/auth/callback
```

### Deploy to Render

1. Push code to GitHub
2. New Web Service → connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars in the Render dashboard

---

## Connecting Frontend to Backend

In your frontend, replace all simulated actions with real API calls:

```javascript
// Generate a one-time link
const res = await fetch("http://localhost:8000/links/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event_type: "30-min intro call", expires_in: "7d" })
});
const { id, booking_url } = await res.json();

// Get available slots for a date
const slots = await fetch(
  "http://localhost:8000/availability/slots?date=2026-04-01"
).then(r => r.json());

// Create a booking
const booking = await fetch("http://localhost:8000/bookings/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    guest_name:       "Priya Sharma",
    guest_email:      "priya@example.com",
    scheduled_at:     "2026-04-01T10:00:00+05:30",
    event_type:       "30-min intro call",
    one_time_link_id: "lnk_a3f8x9qr"
  })
}).then(r => r.json());

console.log(booking.meet_link); // https://meet.google.com/abc-defg-hij
```
