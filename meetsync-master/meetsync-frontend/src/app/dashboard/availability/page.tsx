"use client";
import { useEffect, useState } from "react";
import { api, AvailabilitySettingsResponse, AvailabilityOverride, AvailabilityOverrideCreate } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Card, Input, SectionHeader, Spinner } from "@/components/ui";
import { DateOverridePicker } from "@/components/DateOverridePicker";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityPage() {
  const [settings, setSettings] = useState<AvailabilitySettingsResponse>({
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    daily_shifts: ["09:00", "09:30", "10:00"],
    slot_duration: 30,
    buffer_minutes: 15,
    timezone: "Asia/Kolkata",
    allow_double_booking: false,
    default_questions: [],
    min_notice_hours: 0,
    max_days_ahead: null,
    max_bookings_per_day: null,
  });
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newShift, setNewShift] = useState("09:00");


  useEffect(() => {
    Promise.all([api.availability.getSettings(), api.availability.getOverrides()])
      .then(([s, o]) => {
        setSettings(s);
        setOverrides(o);
      })
      .catch((e: unknown) => {
        alert(errMsg(e, "Failed to load availability"));
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: string) =>
    setSettings((s) => ({
      ...s,
      working_days: s.working_days.includes(day)
        ? s.working_days.filter((d) => d !== day)
        : [...s.working_days, day],
    }));

  const addShift = () => {
    if (newShift && !settings.daily_shifts.includes(newShift)) {
      setSettings((s) => ({
        ...s,
        daily_shifts: [...s.daily_shifts, newShift].sort(),
      }));
    }
  };

  const removeShift = (shift: string) => {
    setSettings((s) => ({
      ...s,
      daily_shifts: s.daily_shifts.filter((x) => x !== shift),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.availability.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSaving(false); }
  };

  const handleAddOverride = async (data: AvailabilityOverrideCreate) => {
    const ov = await api.availability.createOverride(data);
    setOverrides((o) => [...o, ov]);
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await api.availability.deleteOverride(id);
      setOverrides((o) => o.filter((x) => x.id !== id));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Availability" subtitle="Configure your working days, time shifts, and date overrides" />

      <div className="flex flex-col gap-5">
        {/* Working Days */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Working Days</p>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day) => {
              const active = settings.working_days.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all
                    ${active
                      ? "bg-brand-gradient text-white shadow-lg glow-brand-sm"
                      : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--text-primary)]"
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Time Shifts */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Daily Time Shifts</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Define the exact times guests can book. Each shift is one bookable slot.</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {settings.daily_shifts.map((shift) => (
              <div key={shift} className="flex items-center gap-1 bg-[var(--accent)]/15 text-[var(--accent-cyan)] ring-1 ring-[var(--accent)]/30 px-3 py-1.5 rounded-xl text-sm font-semibold">
                {shift}
                <button onClick={() => removeShift(shift)} className="ml-1 text-[var(--accent)] hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
            {settings.daily_shifts.length === 0 && (
              <p className="text-[var(--text-secondary)] text-sm italic">No shifts configured yet.</p>
            )}
          </div>

          <div className="flex gap-2 items-end">
            <Input
              label="Add Shift"
              type="time"
              value={newShift}
              onChange={(e) => setNewShift(e.target.value)}
            />
            <Button variant="secondary" size="sm" onClick={addShift}>+ Add</Button>
          </div>
        </Card>

        {/* Slot & Buffer */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Scheduling Preferences</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Slot Duration (min)</label>
              <select
                value={settings.slot_duration}
                onChange={(e) => setSettings((s) => ({ ...s, slot_duration: Number(e.target.value) }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                {[15, 30, 45, 60].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Buffer Between Meetings (min)</label>
              <select
                value={settings.buffer_minutes}
                onChange={(e) => setSettings((s) => ({ ...s, buffer_minutes: Number(e.target.value) }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                {[0, 5, 10, 15, 30].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Minimum Notice</label>
              <select
                value={settings.min_notice_hours ?? 0}
                onChange={(e) => setSettings((s) => ({ ...s, min_notice_hours: Number(e.target.value) }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                <option value={0}>None</option>
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Booking Window</label>
              <select
                value={settings.max_days_ahead ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, max_days_ahead: e.target.value === "" ? null : Number(e.target.value) }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                <option value="">Unlimited</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Max Bookings Per Day</label>
              <select
                value={settings.max_bookings_per_day ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, max_bookings_per_day: e.target.value === "" ? null : Number(e.target.value) }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                <option value="">Unlimited</option>
                {[1,2,3,4,5,6,7,8,9,10].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Timezone */}
        <Card className="p-6">
          <Input
            label="Timezone"
            value={settings.timezone}
            onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
            placeholder="e.g. Asia/Kolkata"
          />
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </Button>
        </div>

        {/* Date Overrides */}
        <div className="border-t border-[var(--border)] pt-8 mt-4">
          <SectionHeader
            title="Date Overrides"
            subtitle="Block specific dates or customize available slots. Click a date on the calendar to configure it."
          />
        </div>

        <DateOverridePicker
          overrides={overrides}
          shifts={settings.daily_shifts}
          onAdd={handleAddOverride}
          onDelete={handleDeleteOverride}
        />
      </div>
    </>
  );
}
