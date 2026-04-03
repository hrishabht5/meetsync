"use client";
import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  selectedDate: string;          // "YYYY-MM-DD" or ""
  onSelectDate: (date: string) => void;
  loading?: boolean;             // true while fetching slots for the selected date
}

export function BookingCalendar({ selectedDate, onSelectDate, loading = false }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const formatDate = (day: number): string => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const isPast = (day: number): boolean => {
    const cellDate = new Date(viewYear, viewMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate < todayMidnight;
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--text-primary)] transition-colors"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--text-primary)] transition-colors"
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
        {Array.from({ length: firstDow }).map((_, i) => <div key={`b-${i}`} />)}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = formatDate(day);
          const past = isPast(day);
          const isSelected = selectedDate === dateStr;
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();

          let cls =
            "relative h-9 w-full rounded-xl text-sm transition-all flex items-center justify-center font-medium ";

          if (isSelected) {
            cls += "bg-brand-gradient text-white shadow-lg glow-brand-sm";
          } else if (past) {
            cls += "opacity-25 cursor-not-allowed text-[var(--text-secondary)]";
          } else if (isToday) {
            cls += "ring-1 ring-[var(--accent)]/50 text-[var(--accent-cyan)] hover:bg-[var(--accent)]/10 cursor-pointer";
          } else {
            cls += "text-[var(--text-primary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent-cyan)] cursor-pointer";
          }

          return (
            <button
              key={day}
              disabled={past || loading}
              onClick={() => onSelectDate(dateStr)}
              className={cls}
            >
              {day}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 bg-[var(--accent)] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date label */}
      {selectedDate && (
        <p className="text-xs text-center text-[var(--accent-cyan)] mt-3 font-medium">
          {loading ? "Loading slots…" : (() => {
            const [y, m, d] = selectedDate.split("-").map(Number);
            return new Date(y, m - 1, d).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            });
          })()}
        </p>
      )}
    </div>
  );
}
