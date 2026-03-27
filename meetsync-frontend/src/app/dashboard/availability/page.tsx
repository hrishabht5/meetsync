"use client";
import { useEffect, useState } from "react";
import { api, AvailabilitySettingsResponse, AvailabilityOverride, CustomField } from "@/lib/api-client";
import { Button, Card, Input, SectionHeader, Spinner } from "@/components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityPage() {
  const [settings, setSettings] = useState<AvailabilitySettingsResponse>({
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    daily_shifts: ["09:00", "09:30", "10:00"],
    slot_duration: 30,
    buffer_minutes: 15,
    timezone: "Asia/Kolkata",
    default_questions: [],
  });
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newShift, setNewShift] = useState("09:00");

  // Override form
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [addingOverride, setAddingOverride] = useState(false);

  useEffect(() => {
    Promise.all([api.availability.getSettings(), api.availability.getOverrides()])
      .then(([s, o]) => {
        setSettings(s);
        setOverrides(o);
      })
      .catch((e: unknown) => {
        // Avoid unhandled promise rejection crashing the page.
        console.error("Failed to load availability:", e);
        alert((e as Error).message || "Failed to load availability");
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

  const addField = () => {
    setSettings(s => ({ ...s, default_questions: [...(s.default_questions || []), { label: "", type: "text", required: true }] }));
  };

  const updateField = (idx: number, updates: Partial<CustomField>) => {
    setSettings(s => ({
      ...s,
      default_questions: (s.default_questions || []).map((f, i) => i === idx ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (idx: number) => {
    setSettings(s => ({
      ...s,
      default_questions: (s.default_questions || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.availability.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) return;
    setAddingOverride(true);
    try {
      const ov = await api.availability.createOverride({
        override_date: overrideDate,
        is_available: false,
        reason: overrideReason || undefined,
      });
      setOverrides((o) => [...o, ov]);
      setOverrideDate("");
      setOverrideReason("");
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setAddingOverride(false); }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await api.availability.deleteOverride(id);
      setOverrides((o) => o.filter((x) => x.id !== id));
    } catch (e: unknown) { alert((e as Error).message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Availability" subtitle="Configure your working days, time shifts, and date overrides" />

      <div className="flex flex-col gap-5">
        {/* Working Days */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-zinc-300 mb-4">Working Days</p>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day) => {
              const active = settings.working_days.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all
                    ${active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-white/6 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
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
          <p className="text-sm font-semibold text-zinc-300 mb-4">Daily Time Shifts</p>
          <p className="text-xs text-zinc-500 mb-3">Define the exact times guests can book. Each shift is one bookable slot.</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {settings.daily_shifts.map((shift) => (
              <div key={shift} className="flex items-center gap-1 bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30 px-3 py-1.5 rounded-xl text-sm font-semibold">
                {shift}
                <button onClick={() => removeShift(shift)} className="ml-1 text-indigo-400 hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
            {settings.daily_shifts.length === 0 && (
              <p className="text-zinc-500 text-sm italic">No shifts configured yet.</p>
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
          <p className="text-sm font-semibold text-zinc-300 mb-4">Scheduling Preferences</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">Slot Duration (min)</label>
              <select
                value={settings.slot_duration}
                onChange={(e) => setSettings((s) => ({ ...s, slot_duration: Number(e.target.value) }))}
                className="bg-[#12151f] border border-[#2e3248] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              >
                {[15, 30, 45, 60].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">Buffer Between Meetings (min)</label>
              <select
                value={settings.buffer_minutes}
                onChange={(e) => setSettings((s) => ({ ...s, buffer_minutes: Number(e.target.value) }))}
                className="bg-[#12151f] border border-[#2e3248] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              >
                {[0, 5, 10, 15, 30].map((v) => <option key={v}>{v}</option>)}
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

        {/* Default Booking Questions */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-zinc-300 mb-4">Default Booking Questions</p>
          <p className="text-xs text-zinc-500 mb-4">Questions pre-filled when you generate a new booking link.</p>
          
          <div className="flex flex-col gap-3 mb-4">
            {(settings.default_questions || []).map((field, idx) => (
              <div key={idx} className="bg-[#12151f] border border-[#2e3248] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500 font-semibold">Question {idx + 1}</span>
                  <button onClick={() => removeField(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <input
                  placeholder="Question label, e.g. Company Name"
                  value={field.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                  className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                />
                <div className="flex gap-3 items-center flex-wrap">
                  <select
                    value={field.type}
                    onChange={(e) => updateField(idx, { type: e.target.value as CustomField["type"], options: e.target.value === "dropdown" ? [""] : undefined })}
                    className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                      className="rounded accent-indigo-500"
                    />
                    Required
                  </label>
                </div>

                {field.type === "dropdown" && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-indigo-500/30">
                    <p className="text-xs text-zinc-500">Dropdown Options</p>
                    {(field.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex gap-2 items-center">
                        <input
                          placeholder={`Option ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(field.options || [])];
                            newOpts[optIdx] = e.target.value;
                            updateField(idx, { options: newOpts });
                          }}
                          className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none flex-1"
                        />
                        <button
                          onClick={() => {
                            const newOpts = (field.options || []).filter((_, i) => i !== optIdx);
                            updateField(idx, { options: newOpts });
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateField(idx, { options: [...(field.options || []), ""] })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 self-start"
                    >+ Add Option</button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addField}
              className="self-start text-sm font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-2 bg-indigo-600/10 rounded-xl ring-1 ring-indigo-500/20 hover:ring-indigo-500/40 transition-all"
            >
              + Add Question
            </button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </Button>
        </div>

        {/* ── Date Overrides ─────────────────────────────────── */}
        <div className="border-t border-[#2e3248] pt-8 mt-4">
          <SectionHeader
            title="Date Overrides"
            subtitle="Block out specific dates so no one can book on them"
          />
        </div>

        <Card className="p-6">
          <p className="text-sm font-semibold text-zinc-300 mb-4">Block a Date</p>
          <div className="flex flex-wrap gap-3 items-end">
            <Input
              label="Date"
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
            />
            <Input
              label="Reason (optional)"
              placeholder="e.g. Holiday, Out of Office"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <Button onClick={handleAddOverride} loading={addingOverride} disabled={!overrideDate}>
              Block Date
            </Button>
          </div>
        </Card>

        {overrides.length > 0 && (
          <div className="flex flex-col gap-2">
            {overrides.map((ov) => (
              <Card key={ov.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 text-lg">🚫</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{ov.override_date}</p>
                      {ov.reason && <p className="text-xs text-zinc-500">{ov.reason}</p>}
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteOverride(ov.id)}>Remove</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
