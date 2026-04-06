"use client";
import { useEffect, useState } from "react";
import { api, CalendarOption } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Card, SectionHeader, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const [allowDoubleBooking, setAllowDoubleBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calendar connection state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [preferredCalendarId, setPreferredCalendarId] = useState("primary");
  const [calPrefSaving, setCalPrefSaving] = useState(false);
  const [calPrefSaved, setCalPrefSaved] = useState(false);
  const [calListLoading, setCalListLoading] = useState(false);
  const [calListError, setCalListError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    // Check for calendar=connected redirect from Google OAuth
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("calendar") === "connected") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    Promise.all([
      api.availability.getSettings(),
      api.auth.status(),
    ])
      .then(([settings, authStatus]) => {
        setAllowDoubleBooking(!!settings.allow_double_booking);
        setCalendarConnected(authStatus.calendar_connected);
        setPreferredCalendarId(authStatus.preferred_calendar_id || "primary");
        if (authStatus.calendar_connected) {
          loadCalendars();
        }
      })
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadCalendars = async () => {
    setCalListLoading(true);
    setCalListError(null);
    try {
      const res = await api.auth.listCalendars();
      setCalendars(res.calendars);
    } catch (e: unknown) {
      setCalListError(errMsg(e));
    } finally {
      setCalListLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const current = await api.availability.getSettings();
      await api.availability.updateSettings({ ...current, allow_double_booking: allowDoubleBooking });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSaving(false); }
  };

  const handleConnectCalendar = () => {
    window.location.href = api.auth.googleLoginUrl("connect");
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm("Disconnect Google Calendar? Future bookings will fail until you reconnect.")) return;
    setDisconnecting(true);
    try {
      await api.auth.disconnect();
      setCalendarConnected(false);
      setCalendars([]);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setDisconnecting(false); }
  };

  const handleSaveCalendarPref = async () => {
    setCalPrefSaving(true);
    try {
      await api.auth.setCalendarPreference(preferredCalendarId);
      setCalPrefSaved(true);
      setTimeout(() => setCalPrefSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCalPrefSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Settings" subtitle="Application-wide preferences" />

      <div className="flex flex-col gap-5">
        {/* Google Calendar */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Google Calendar</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Connect your Google Calendar so MeetSync can create Google Meet links when guests book a slot.
          </p>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${calendarConnected ? "bg-green-400" : "bg-[var(--text-secondary)]"}`} />
              <span className="text-sm text-[var(--text-primary)]">
                {calendarConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            {calendarConnected ? (
              <button
                onClick={handleDisconnectCalendar}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-red-500/40 text-red-400 hover:ring-red-500 hover:text-red-300 transition-all disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            ) : (
              <Button onClick={handleConnectCalendar}>
                Connect Google Calendar
              </Button>
            )}
          </div>

          {calendarConnected && (
            <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--text-primary)]">Calendar for new events</p>
              {calListError && (
                <div className="flex flex-col gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                  <p className="text-xs text-yellow-400">Could not load your calendars — your Google token may be missing calendar permissions.</p>
                  <button
                    onClick={handleConnectCalendar}
                    className="self-start text-xs px-3 py-1.5 rounded-lg bg-brand-gradient text-white font-medium hover:opacity-90 transition-all"
                  >
                    Reconnect Google Calendar
                  </button>
                </div>
              )}
              {calListLoading ? (
                <Spinner size={16} />
              ) : !calListError && (
                <div className="flex items-center gap-3">
                  <select
                    value={preferredCalendarId}
                    onChange={(e) => setPreferredCalendarId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                  >
                    {calendars.length === 0 ? (
                      <option value="primary">Primary Calendar</option>
                    ) : (
                      calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary}{cal.primary ? " (Primary)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <Button onClick={handleSaveCalendarPref} loading={calPrefSaving}>
                    {calPrefSaved ? "✓ Saved!" : "Save"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Double Booking */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Double Booking Prevention</p>
          <div className="flex items-center justify-between gap-6">
            <p className="text-xs text-[var(--text-secondary)] max-w-lg">
              When <span className="text-[var(--text-primary)] font-medium">ON</span> (default), MeetSync blocks duplicate bookings at the same time using Google Calendar and database checks.
              Turn <span className="text-[var(--text-primary)] font-medium">OFF</span> to allow multiple bookings at the exact same time slot.
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={!allowDoubleBooking}
              onClick={() => setAllowDoubleBooking(!allowDoubleBooking)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                !allowDoubleBooking
                  ? "bg-gradient-to-r from-[#3b6ae8] to-[#38bfff]"
                  : "bg-[var(--bg-card-hover)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white border border-gray-300 shadow transition-transform duration-200 ease-in-out ${
                  !allowDoubleBooking ? "translate-x-5" : "translate-x-0.5"
                } mt-[2px]`}
              />
            </button>
          </div>
          <div className="flex justify-end mt-5">
            <Button onClick={handleSave} loading={saving}>
              {saved ? "✓ Saved!" : "Save Settings"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
