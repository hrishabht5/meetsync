"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Card, SectionHeader, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const [allowDoubleBooking, setAllowDoubleBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.availability.getSettings()
      .then((s) => setAllowDoubleBooking(!!s.allow_double_booking))
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch current settings first so we don't overwrite other fields
      const current = await api.availability.getSettings();
      await api.availability.updateSettings({ ...current, allow_double_booking: allowDoubleBooking });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Settings" subtitle="Application-wide preferences" />

      <div className="flex flex-col gap-5">
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Double Booking Prevention</p>
          <div className="flex items-center justify-between gap-6">
            <p className="text-xs text-[var(--text-secondary)] max-w-lg">
              When <span className="text-[var(--text-primary)] font-medium">OFF</span> (default), MeetSync blocks duplicate bookings at the same time using Google Calendar and database checks.
              Turn <span className="text-[var(--text-primary)] font-medium">ON</span> to allow multiple bookings at the exact same time slot.
            </p>
            <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={allowDoubleBooking}
                onChange={(e) => setAllowDoubleBooking(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--bg-card-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gradient" />
            </label>
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
