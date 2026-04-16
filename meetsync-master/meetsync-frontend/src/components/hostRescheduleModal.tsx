"use client";
import { useState } from "react";
import { api, BookingRow } from "@/lib/api-client";
import { Button, Spinner } from "@/components/ui";
import { BookingCalendar } from "@/components/BookingCalendar";
import { errMsg } from "@/lib/errors";

interface Props {
  booking: BookingRow;
  onRescheduled: (updated: BookingRow) => void;
  onClose: () => void;
}

export function HostRescheduleModal({ booking, onRescheduled, onClose }: Props) {
  const [step, setStep] = useState<"pick-date" | "pick-slot" | "confirming">("pick-date");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchSlots = async (date: string) => {
    setSelectedDate(date);
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot("");
    setError("");
    try {
      // Host is authenticated via cookie — no user_id param needed
      const res = await api.availability.getSlots(date, booking.event_type);
      setSlots(res.slots);
      setStep("pick-slot");
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.bookings.reschedule(booking.id, selectedSlot);
      onRescheduled({
        ...booking,
        scheduled_at: result.scheduled_at,
        meet_link: result.meet_link,
        status: "confirmed",
      });
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Reschedule Booking</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {booking.guest_name} &middot; {booking.custom_title || booking.event_type}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Current:{" "}
              <span className="text-[var(--accent-cyan)] font-medium">
                {new Date(booking.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Calendar */}
        <BookingCalendar
          selectedDate={selectedDate}
          onSelectDate={fetchSlots}
          loading={loadingSlots}
        />

        {loadingSlots && (
          <div className="flex justify-center py-4"><Spinner /></div>
        )}

        {/* Slot picker */}
        {step === "pick-slot" && !loadingSlots && (
          <div className="mt-4">
            {slots.length === 0 ? (
              <div className="text-center py-4 bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border)]">
                <p className="text-[var(--text-secondary)] text-sm">No available slots on this day.</p>
                <p className="text-[var(--text-secondary)]/60 text-xs mt-1">Try picking another date.</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Available Times</p>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => {
                    const label = new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                    const chosen = selectedSlot === s;
                    return (
                      <button
                        key={s}
                        onClick={() => { setSelectedSlot(s); setStep("confirming"); }}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all
                          ${chosen
                            ? "bg-brand-gradient text-white shadow-lg glow-brand-sm"
                            : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-accent)]"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Confirm panel */}
        {step === "confirming" && selectedSlot && (
          <div className="mt-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">New Meeting Time</p>
            <p className="text-sm text-[var(--accent-cyan)]">
              📅 {new Date(selectedSlot).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <button
              onClick={() => setStep("pick-slot")}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] mt-2 transition-colors"
            >
              ← Pick a different time
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === "confirming" && (
          <Button className="mt-4 w-full" onClick={handleConfirm} loading={submitting}>
            Confirm Reschedule
          </Button>
        )}
      </div>
    </div>
  );
}
