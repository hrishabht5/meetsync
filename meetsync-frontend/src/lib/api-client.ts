// API Client — single module for all calls to the MeetSync FastAPI backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Only set `Content-Type: application/json` when we actually send a request body.
  // Otherwise (especially for GET), it triggers CORS preflight in browsers and can surface as "Failed to fetch".
  const hasBody = options && options.body !== undefined && options.body !== null;

  // Normalize headers to a mutable object.
  const headers: Record<string, string> = {};
  
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.headers) {
    if (Array.isArray(options.headers)) {
      for (const [k, v] of options.headers) headers[k] = v;
    } else if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => {
        headers[k] = v;
      });
    } else {
      Object.assign(headers, options.headers as Record<string, string>);
    }
  }

  // Cross-domain token fallback (if cookies are blocked)
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("meetsync_token");
    // Backup: If not in storage yet, check URL directly
    if (!token) {
      const search = new URLSearchParams(window.location.search);
      token = search.get("token");
    }
    if (token) {
      headers["X-MeetSync-User"] = token;
    }
  }

  // Ensure trailing slash for all paths to avoid 307 redirects on Render
  const normalizedPath = path.endsWith("/") || path.includes("?") 
    ? path 
    : `${path}/`;

  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: options?.credentials ?? "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  // 204 No Content — return null
  if (res.status === 204) return null as T;
  return res.json();
}

// ── Auth ───────────────────────────────────────────────
export const api = {
  auth: {
    status: () => request<{ connected: boolean; user_id: string | null }>("/auth/status/"),
    disconnect: () => request<{ status: string }>("/auth/disconnect/", { method: "DELETE" }),
    logout: async () => {
      await request<{ status: string }>("/auth/logout/", { method: "POST" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("meetsync_token");
      }
    },
    googleLoginUrl: () => `${BASE_URL}/auth/google/`,
  },

  // ── Availability ───────────────────────────────────────
  availability: {
    getSlots: (date: string, event_type: string, host_user_id?: string) =>
      request<{ date: string; slots: string[]; timezone: string; reason?: string }>(
        `/availability/slots/?date=${date}&event_type=${encodeURIComponent(event_type)}${
          host_user_id ? `&user_id=${encodeURIComponent(host_user_id)}` : ""
        }`
      ),
    getSettings: () =>
      request<AvailabilitySettingsResponse>("/availability/settings/"),
    updateSettings: (data: AvailabilitySettingsUpdate) =>
      request<{ status: string }>("/availability/settings/", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    // Overrides
    getOverrides: () => request<AvailabilityOverride[]>("/availability/overrides/"),
    createOverride: (data: AvailabilityOverrideCreate) =>
      request<AvailabilityOverride>("/availability/overrides/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteOverride: (id: string) =>
      request<{ status: string }>(`/availability/overrides/${id}/`, { method: "DELETE" }),
  },

  // ── Bookings ───────────────────────────────────────────
  bookings: {
    list: (status?: string) =>
      request<BookingRow[]>(`/bookings/${status ? `?status=${status}` : ""}`),
    get: (id: string) => request<BookingRow>(`/bookings/${id}/`),
    create: (data: BookingCreate) =>
      request<BookingRow>("/bookings/", { method: "POST", body: JSON.stringify(data) }),
    cancel: (id: string, reason?: string) =>
      request<{ status: string; booking_id: string }>(`/bookings/${id}/cancel/`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
  },

  // ── One-Time Links ────────────────────────────────────
  links: {
    validate: (token: string) => request<OTLRow>(`/links/${token}/`),
    list: (status?: string) =>
      request<OTLRow[]>(`/links/${status ? `?status=${status}` : ""}`),
    create: (data: OTLCreatePayload) =>
      request<OTLRow>("/links/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    revoke: (token: string) =>
      request<{ status: string; token: string }>(`/links/${token}/`, { method: "DELETE" }),
  },

  // ── Webhooks ──────────────────────────────────────────
  webhooks: {
    list: () => request<WebhookRow[]>("/webhooks/"),
    register: (data: { url: string; secret?: string; events: string[] }) =>
      request<WebhookRow>("/webhooks/", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ status: string; id: string }>(`/webhooks/${id}`, { method: "DELETE" }),
    toggle: (id: string) =>
      request<{ is_active: boolean }>(`/webhooks/${id}/toggle`, { method: "PATCH" }),
    getLogs: () => request<WebhookLog[]>("/webhooks/logs"),
    test: () =>
      request<{ status: string; event: string }>("/webhooks/test", { method: "POST" }),
  },

  // ── API Keys ──────────────────────────────────────────
  apiKeys: {
    list: () => request<APIKeyRow[]>("/api_keys/"),
    create: (data: { name: string }) =>
      request<APIKeyRow>("/api_keys/", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ status: string }>(`/api_keys/${id}`, { method: "DELETE" }),
  },
  account: {
    delete: () => request<{ status: string }>("/auth/account/", { method: "DELETE" }),
  },
};

// ── Types ─────────────────────────────────────────────

// Custom field for link questions
export interface CustomField {
  label: string;
  type: "text" | "textarea" | "dropdown";
  required: boolean;
  options?: string[];  // only for dropdown
}

// Availability
export interface AvailabilitySettingsResponse {
  working_days: string[];
  daily_shifts: string[];
  slot_duration: number;
  buffer_minutes: number;
  timezone: string;
  default_questions?: CustomField[];
}

export interface AvailabilitySettingsUpdate {
  working_days: string[];
  daily_shifts: string[];
  slot_duration: number;
  buffer_minutes: number;
  timezone: string;
  default_questions?: CustomField[];
}

export interface AvailabilityOverride {
  id: string;
  override_date: string;
  is_available: boolean;
  custom_shifts?: string[] | null;
  reason?: string | null;
}

export interface AvailabilityOverrideCreate {
  override_date: string;
  is_available: boolean;
  custom_shifts?: string[] | null;
  reason?: string | null;
}

// Bookings
export interface BookingCreate {
  guest_name: string;
  guest_email: string;
  scheduled_at: string; // ISO 8601
  event_type: string;
  notes?: string;
  one_time_link_id?: string;
  custom_answers?: Record<string, string>;
}

export interface BookingRow {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  event_type: string;
  status: "pending" | "confirmed" | "cancelled";
  meet_link?: string;
  calendar_event_id?: string;
  one_time_link_id?: string;
  notes?: string;
  custom_answers?: Record<string, string>;
}

// One-Time Links
export interface OTLRow {
  id: string;
  booking_url: string;
  event_type: string;
  status: "active" | "used" | "expired" | "revoked";
  user_id: string;
  expires_at?: string;
  created_at: string;
  used_at?: string;
  custom_fields?: CustomField[];
}

export interface OTLCreatePayload {
  event_type: string;
  expires_in?: string;
  custom_fields?: CustomField[];
}

// Webhooks
export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event: string;
  status_code?: number;
  success: boolean;
  error?: string;
  attempts: number;
  created_at: string;
}

export const EVENT_TYPES = [
  "15-min quick chat",
  "30-min intro call",
  "60-min deep dive",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// API Keys
export interface APIKeyRow {
  id: string;
  name: string;
  prefix: string;
  key?: string; // only returned upon creation
  created_at: string;
  last_used_at?: string | null;
  is_active: boolean;
}
