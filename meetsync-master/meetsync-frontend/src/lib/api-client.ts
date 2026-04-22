// API Client — single module for all calls to the DraftMeet FastAPI backend
function getBaseUrl(): string {
  // Client-side: detect if on custom domain (avoids hardcoding env vars for each domain)
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isCustomDomain = !host.includes("draftmeet.com") && !host.includes("localhost");
    if (isCustomDomain) {
      return "/api/public"; // Use the public API proxy for custom domains
    }
  }

  // Default: use env var or localhost fallback (warn loudly in production if env var is missing)
  if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn("[api-client] NEXT_PUBLIC_API_URL is not set in production — falling back to localhost. Set this env var before deploying.");
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const BASE_URL = getBaseUrl();

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

  // Strip trailing slash — FastAPI routes are defined without them on this deployment.
  // Sending a trailing slash triggers a 307 redirect which can drop the session cookie on POST.
  const normalizedPath = path.includes("?")
    ? path.replace(/\/\?/, "?")   // /links/?search=x → /links?search=x
    : path.replace(/\/$/, "");    // /auth/logout/ → /auth/logout

  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: options?.credentials ?? "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText || "Request failed" }));
    const raw = err.detail ?? err.message ?? err.error;
    const message = Array.isArray(raw)
      ? raw.map((d: { msg?: string }) => d.msg ?? "Validation error").join("; ")
      : typeof raw === "string" && raw
      ? raw
      : `Request failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  // 204 No Content — return null
  if (res.status === 204) return null as T;
  return res.json();
}

// ── Auth ───────────────────────────────────────────────
export const api = {
  auth: {
    status: () =>
      request<AuthStatus>("/auth/status"),
    signup: (email: string, password: string) =>
      request<{ status: string; user_id: string }>("/auth/signup/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ status: string; user_id: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    disconnect: () => request<{ status: string }>("/auth/disconnect/", { method: "DELETE" }),
    logout: async () => {
      await request<{ status: string }>("/auth/logout/", { method: "POST" });
      // Clear any legacy token that may have been stored before this fix
      if (typeof window !== "undefined") {
        localStorage.removeItem("draftmeet_token");
      }
    },
    forgotPassword: (email: string) =>
      request<{ status: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, new_password: string) =>
      request<{ status: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
      }),
    googleLoginUrl: (mode: "signin" | "connect" = "signin") =>
      `${getBaseUrl()}/auth/google/?mode=${mode}`,
    listCalendars: () =>
      request<{ calendars: CalendarOption[] }>("/auth/calendars/"),
    setCalendarPreference: (calendar_id: string) =>
      request<{ status: string; preferred_calendar_id: string }>("/auth/calendar-preference/", {
        method: "PUT",
        body: JSON.stringify({ calendar_id }),
      }),
  },

  // ── Availability ───────────────────────────────────────
  availability: {
    getSlots: (
      date: string,
      event_type: string,
      opts?: { one_time_link_id?: string; permanent_link_id?: string; management_token?: string; timezone?: string }
    ) => {
      const p = new URLSearchParams({ date, event_type });
      if (opts?.one_time_link_id)   p.set("one_time_link_id",  opts.one_time_link_id);
      if (opts?.permanent_link_id)  p.set("permanent_link_id", opts.permanent_link_id);
      if (opts?.management_token)   p.set("management_token",  opts.management_token);
      if (opts?.timezone)           p.set("guest_timezone",    opts.timezone);
      return request<{ date: string; slots: string[]; timezone: string; guest_timezone?: string; reason?: string }>(
        `/availability/slots/?${p.toString()}`
      );
    },
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
    reschedule: (id: string, newScheduledAt: string) =>
      request<{ status: string; booking_id: string; scheduled_at: string; meet_link: string }>(
        `/bookings/${id}/reschedule/`,
        { method: "PATCH", body: JSON.stringify({ new_scheduled_at: newScheduledAt }) }
      ),
    setOutcome: (
      id: string,
      outcome: "completed" | "no_show" | "cancelled_by_guest",
      outcome_notes?: string
    ) =>
      request<{ status: string; booking_id: string; outcome: string; outcome_recorded_at: string }>(
        `/bookings/${id}/outcome/`,
        { method: "PATCH", body: JSON.stringify({ outcome, outcome_notes: outcome_notes ?? null }) }
      ),
    exportCsv: async (status?: string): Promise<void> => {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`${getBaseUrl()}/bookings/export/${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  },

  // ── Guest Self-Serve Management ────────────────────────
  manage: {
    getBooking: (token: string) =>
      request<GuestBookingResponse>(`/bookings/manage/${token}/`),
    cancel: (token: string, reason?: string) =>
      request<{ status: string; booking_id: string }>(`/bookings/manage/${token}/cancel/`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    reschedule: (token: string, newScheduledAt: string) =>
      request<{ status: string; booking_id: string; scheduled_at: string; meet_link: string }>(
        `/bookings/manage/${token}/reschedule/`,
        { method: "PATCH", body: JSON.stringify({ new_scheduled_at: newScheduledAt }) }
      ),
  },

  // ── One-Time Links ────────────────────────────────────
  links: {
    validate: (token: string) => request<OTLRow>(`/links/${token}/`),
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.search) q.set("search", params.search);
      if (params?.status) q.set("status", params.status);
      const qs = q.toString();
      return request<PaginatedResult<OTLRow>>(`/links/${qs ? `?${qs}` : ""}`);
    },
    create: (data: OTLCreatePayload) =>
      request<OTLRow>("/links/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    revoke: (token: string) =>
      request<{ status: string; token: string }>(`/links/${token}/`, { method: "DELETE" }),
    deletePermanently: (token: string) =>
      request<{ status: string; token: string }>(`/links/${token}/permanent/`, { method: "DELETE" }),
    bulkAction: (tokens: string[], action: "revoke" | "delete") =>
      request<{ succeeded: number; skipped: number }>("/links/bulk/", {
        method: "POST",
        body: JSON.stringify({ tokens, action }),
      }),
    customize: (token: string, data: LinkCustomizationPayload) =>
      request<OTLRow>(`/links/${token}/customize/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
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

  // ── Profiles & Permanent Links ────────────────────────
  profiles: {
    getPublic: (username: string) =>
      request<ProfileResponse & { links: PermanentLinkRow[] }>(`/profiles/${username}/`),
    validateSlug: (username: string, slug: string) =>
      request<PermanentLinkRow & { host_user_id: string }>(`/profiles/${username}/${slug}/validate/`),
    getMe: () => request<ProfileResponse>("/profiles/me/"),
    updateMe: (data: ProfileUpdate) =>
      request<ProfileResponse>("/profiles/me/", { method: "PUT", body: JSON.stringify(data) }),
    listLinks: (params?: { page?: number; limit?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.search) q.set("search", params.search);
      const qs = q.toString();
      return request<PaginatedResult<PermanentLinkRow>>(`/profiles/me/links/${qs ? `?${qs}` : ""}`);
    },
    createLink: (data: PermanentLinkCreate) =>
      request<PermanentLinkRow>("/profiles/me/links/", { method: "POST", body: JSON.stringify(data) }),
    toggleLink: (id: string) =>
      request<PermanentLinkRow>(`/profiles/me/links/${id}/toggle/`, { method: "PATCH" }),
    toggleShowOnProfile: (id: string) =>
      request<PermanentLinkRow>(`/profiles/me/links/${id}/show-on-profile/`, { method: "PATCH" }),
    deleteLink: (id: string) =>
      request<null>(`/profiles/me/links/${id}/`, { method: "DELETE" }),
    bulkDeleteLinks: (ids: string[]) =>
      request<{ succeeded: number; skipped: number }>("/profiles/me/links/bulk/", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    customizeLink: (id: string, data: LinkCustomizationPayload) =>
      request<PermanentLinkRow>(`/profiles/me/links/${id}/customize/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // ── Custom Domains ────────────────────────────────────
  domains: {
    get: () => request<CustomDomainRow | null>("/domains/me/"),
    register: (domain: string) =>
      request<CustomDomainRow>("/domains/me/", { method: "POST", body: JSON.stringify({ domain }) }),
    verify: () => request<{ domain: string; verified: boolean }>("/domains/me/verify/", { method: "POST" }),
    remove: () => request<{ status: string }>("/domains/me/", { method: "DELETE" }),
  },

  // ── Waitlist ──────────────────────────────────────────
  waitlist: {
    join: (email: string) =>
      request<{ status: string; message: string }>("/waitlist/", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  },

  // ── Analytics ─────────────────────────────────────────
  analytics: {
    summary: () => request<AnalyticsSummary>("/analytics/summary/"),
    trend: (days = 30) => request<TrendPoint[]>(`/analytics/trend/?days=${days}`),
    breakdown: () => request<AnalyticsBreakdown>("/analytics/breakdown/"),
    outcomeSummary: () => request<OutcomeSummary>("/bookings/outcomes/summary/"),
  },

  // ── Admin ─────────────────────────────────────────────
  admin: {
    stats: () => request<AdminStats>("/admin/stats/"),
    listUsers: (params?: { search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<PaginatedResult<AdminUser>>(`/admin/users/${qs ? `?${qs}` : ""}`);
    },
    listWaitlist: () => request<WaitlistEntry[]>("/admin/waitlist/"),
    listDomains: () => request<AdminDomain[]>("/admin/domains/"),
    impersonate: (userId: string) =>
      request<{ status: string }>(`/admin/impersonate/${userId}/`, { method: "POST" }),
    exitImpersonation: () =>
      request<{ status: string }>("/admin/impersonate/exit/", { method: "POST" }),
    setRemoveBranding: (userId: string, removeBranding: boolean) =>
      request<{ user_id: string; remove_branding: boolean }>(`/admin/users/${userId}/branding/`, {
        method: "PATCH",
        body: JSON.stringify({ remove_branding: removeBranding }),
      }),
  },
};

// ── Types ─────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  has_more: boolean;
}

export interface AuthStatus {
  connected: boolean;
  user_id: string | null;
  email?: string | null;
  calendar_connected: boolean;
  preferred_calendar_id?: string | null;
  is_admin?: boolean;
  is_impersonating?: boolean;
}



// Admin types
export interface AdminStats {
  total_users: number;
  total_bookings: number;
  signup_trend: Array<{ date: string; count: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  booking_count: number;
  remove_branding: boolean;
}

export interface WaitlistEntry {
  email: string;
  created_at: string;
}

export interface AdminDomain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
  user_id: string;
  username?: string | null;
}

export interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}

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
  allow_double_booking?: boolean;
  default_questions?: CustomField[];
  min_notice_hours?: number;
  max_days_ahead?: number | null;
  max_bookings_per_day?: number | null;
}

export interface AvailabilitySettingsUpdate {
  working_days: string[];
  daily_shifts: string[];
  slot_duration: number;
  buffer_minutes: number;
  timezone: string;
  allow_double_booking?: boolean;
  default_questions?: CustomField[];
  min_notice_hours?: number;
  max_days_ahead?: number | null;
  max_bookings_per_day?: number | null;
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
  permanent_link_id?: string;
  custom_answers?: Record<string, string>;
}

export interface BookingRow {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  event_type: string;
  custom_title?: string | null;
  status: "pending" | "confirmed" | "cancelled" | "rescheduled";
  meet_link?: string;
  calendar_event_id?: string;
  one_time_link_id?: string;
  notes?: string;
  custom_answers?: Record<string, string>;
  management_token?: string;
  outcome?: "completed" | "no_show" | "cancelled_by_guest" | null;
  outcome_notes?: string | null;
  outcome_recorded_at?: string | null;
}

export interface OutcomeSummary {
  total_past_meetings: number;
  completed: number;
  no_show: number;
  cancelled_by_guest: number;
  unrecorded: number;
  completion_rate: number;
  no_show_rate: number;
}

// Guest-safe booking view (no internal IDs)
export interface GuestBookingResponse {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_at: string;
  event_type: string;
  custom_title?: string | null;
  status: string;
  meet_link?: string;
  notes?: string;
  custom_answers?: Record<string, string>;
  created_at?: string;
  host_user_id?: string;
}

// One-Time Links
export interface OTLRow {
  id: string;
  booking_url: string;
  event_type: string;
  custom_title?: string | null;
  status: "active" | "used" | "expired" | "revoked";
  user_id: string;
  expires_at?: string;
  created_at: string;
  used_at?: string;
  custom_fields?: CustomField[];
  description?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
  remove_branding?: boolean;
}

export interface OTLCreatePayload {
  event_type: string;
  expires_in?: string;
  custom_fields?: CustomField[];
  custom_title?: string;
  description?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
}

export interface LinkCustomizationPayload {
  description?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
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

// Profiles & Permanent Links
export interface ProfileResponse {
  user_id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  website?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
  remove_branding?: boolean;
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string;
  bio?: string;
  headline?: string;
  website?: string;
  location?: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
}

export interface PermanentLinkRow {
  id: string;
  user_id: string;
  slug: string;
  event_type: string;
  custom_title?: string | null;
  is_active: boolean;
  show_on_profile: boolean;
  custom_fields: CustomField[];
  created_at: string;
  description?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
  host_user_id?: string;
  remove_branding?: boolean;
}

export interface PermanentLinkCreate {
  slug: string;
  event_type?: string;
  custom_fields?: CustomField[];
  custom_title?: string;
  description?: string | null;
  cover_image_url?: string | null;
  bg_image_url?: string | null;
  accent_color?: string | null;
}

// Custom Domains
export interface CustomDomainRow {
  id: string;
  user_id: string;
  domain: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

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

// Analytics
export interface AnalyticsSummary {
  total: number;
  confirmed: number;
  cancelled: number;
  upcoming: number;
  cancellation_rate: number;
  top_event_type: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  pct: number;
}

export interface AnalyticsBreakdown {
  by_event_type: BreakdownItem[];
  by_status: BreakdownItem[];
}
