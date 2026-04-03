"use client";
import { useState } from "react";
import { AvailabilityOverride, AvailabilityOverrideCreate } from "@/lib/api-client";
import { Button } from "@/components/ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  overrides: AvailabilityOverride[];
  shifts: string[];
  onAdd: (data: AvailabilityOverrideCreate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DateOverridePicker({ overrides, shifts, onAdd, onDelete }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // "YYYY-MM-DD"

  // Phase-2 state
  const [blockAll, setBlockAll] = useState(true);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Calendar grid helpers ──────────────────────────────
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const overrideDateSet = new Set(overrides.map((o) => o.override_date));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const formatCell = (day: number): string => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const isPast = (day: number): boolean => {
    const cellDate = new Date(viewYear, viewMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate < todayMidnight;
  };

  const handleDayClick = (day: number) => {
    if (isPast(day)) return;
    const dateStr = formatCell(day);
    if (overrideDateSet.has(dateStr)) return; // already overridden
    setSelectedDate(dateStr);
    setBlockAll(true);
    setAvailableShifts([...shifts]); // all available by default when in custom mode
    setReason("");
  };

  const toggleShift = (shift: string) => {
    setAvailableShifts((prev) =>
      prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]
    );
  };

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await onAdd({
        override_date: selectedDate,
        is_available: blockAll ? false : true,
        custom_shifts: blockAll ? null : availableShifts,
        reason: reason.trim() || undefined,
      });
      setSelectedDate(null);
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Calendar card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ›
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-[var(--text-secondary)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Leading blank cells */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = formatCell(day);
            const past = isPast(day);
            const hasOverride = overrideDateSet.has(dateStr);
            const isSelected = selectedDate === dateStr;

            let cellCls =
              "relative flex flex-col items-center justify-center h-9 w-full rounded-xl text-sm transition-all ";

            if (isSelected) {
              cellCls += "bg-brand-gradient text-white shadow-lg font-semibold";
            } else if (hasOverride) {
              cellCls += "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 font-medium";
            } else if (past) {
              cellCls += "opacity-30 cursor-not-allowed text-[var(--text-secondary)]";
            } else {
              cellCls +=
                "text-[var(--text-primary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent-cyan)] cursor-pointer font-medium";
            }

            return (
              <button
                key={day}
                disabled={past || hasOverride}
                onClick={() => handleDayClick(day)}
                className={cellCls}
                title={hasOverride ? "Already has an override" : undefined}
              >
                {day}
                {hasOverride && (
                  <span className="absolute bottom-0.5 w-1 h-1 bg-red-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-500/20 ring-1 ring-red-500/30" />
            <span className="text-xs text-[var(--text-secondary)]">Already blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded opacity-30 bg-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Past dates</span>
          </div>
        </div>
      </div>

      {/* Phase 2 — slot picker */}
      {selectedDate && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatDisplayDate(selectedDate)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Choose how to override this date</p>
          </div>

          {/* Block mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setBlockAll(true)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ring-1 ${
                blockAll
                  ? "bg-red-500/15 text-red-400 ring-red-500/40"
                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] ring-[var(--border)] hover:ring-[var(--border-accent)]"
              }`}
            >
              Block entire day
            </button>
            <button
              onClick={() => setBlockAll(false)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ring-1 ${
                !blockAll
                  ? "bg-[var(--accent)]/15 text-[var(--accent-cyan)] ring-[var(--accent)]/40"
                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] ring-[var(--border)] hover:ring-[var(--border-accent)]"
              }`}
            >
              Customize slots
            </button>
          </div>

          {/* Custom slot picker */}
          {!blockAll && (
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Select which time slots remain <span className="text-emerald-400 font-semibold">available</span> on this day. Unselected slots will be blocked.
              </p>
              {shifts.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] italic">No time shifts configured in your availability settings.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {shifts.map((s) => {
                    const isAvailable = availableShifts.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleShift(s)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold ring-1 transition-all ${
                          isAvailable
                            ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                            : "bg-red-500/10 text-red-400 ring-red-500/20 line-through opacity-60"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reason input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g. Holiday, Out of Office, Travel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleConfirm} loading={saving}>
              Confirm Override
            </Button>
            <Button variant="secondary" onClick={() => setSelectedDate(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Existing overrides list */}
      {overrides.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide px-1">
            Blocked / Overridden Dates
          </p>
          {overrides
            .slice()
            .sort((a, b) => a.override_date.localeCompare(b.override_date))
            .map((ov) => (
              <div
                key={ov.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold flex-shrink-0">
                    ✕
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDisplayDate(ov.override_date)}
                    </p>
                    {ov.reason && (
                      <p className="text-xs text-[var(--text-secondary)]">{ov.reason}</p>
                    )}
                    {!ov.is_available && !ov.custom_shifts && (
                      <p className="text-xs text-red-400/70">Full day blocked</p>
                    )}
                    {ov.custom_shifts && ov.custom_shifts.length > 0 && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Available: {ov.custom_shifts.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingId === ov.id}
                  onClick={() => handleDelete(ov.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
