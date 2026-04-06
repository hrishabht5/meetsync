"use client";
import React, { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { api, GuestBookingResponse } from "@/lib/api-client";
import { BookingCalendar } from "@/components/BookingCalendar";
import { errMsg } from "@/lib/errors";

// ── Cancel Confirmation Dialog ──────────────────────────
interface CancelDialogProps {
  booking: GuestBookingResponse;
  token: string;
  onCancelled: () => void;
  onBack: () => void;
}

export function CancelConfirmation({ booking, token, onCancelled, onBack }: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.manage.cancel(token, reason || undefined);
      onCancelled();
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button
          onClick={onBack}
          className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] mb-3 flex items-center gap-1 transition-colors"
        >
          ← Back to booking
        </button>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Cancel Booking</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Are you sure you want to cancel your meeting on{" "}
          <span className="text-[var(--accent-cyan)] font-medium">
            {new Date(booking.scheduled_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          ?
        </p>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <p className="text-sm text-red-400 font-medium mb-1">⚠️ This action cannot be undone</p>
        <p className="text-xs text-[var(--text-secondary)]">
          The Google Calendar event and Meet link will be deleted. You'll need to book a new session if you change your mind.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Reason for cancelling (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Let the host know why you're cancelling…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]
            focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none transition-all"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          Keep Booking
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={submitting} className="flex-1">
          Yes, Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Reschedule Flow ─────────────────────────────────────
interface RescheduleFlowProps {
  booking: GuestBookingResponse;
  token: string;
  onRescheduled: (result: { scheduled_at: string; meet_link: string }) => void;
  onBack: () => void;
}

export function RescheduleFlow({ booking, token, onRescheduled, onBack }: RescheduleFlowProps) {
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
      // We need the host's user_id to fetch availability — use the booking's id to resolve it
      // The availability API accepts user_id, and we get it from the booking's context
      const res = await api.availability.getSlots(
        date,
        booking.event_type,
        booking.host_user_id
      );
      setSlots(res.slots);
      setStep("pick-slot");
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.manage.reschedule(token, selectedSlot);
      onRescheduled({
        scheduled_at: result.scheduled_at,
        meet_link: result.meet_link,
      });
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button
          onClick={onBack}
          className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] mb-3 flex items-center gap-1 transition-colors"
        >
          ← Back to booking
        </button>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Reschedule Booking</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Current time:{" "}
          <span className="text-[var(--accent-cyan)] font-medium">
            {new Date(booking.scheduled_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Pick a new date and time below
        </p>
      </div>

      <BookingCalendar
        selectedDate={selectedDate}
        onSelectDate={fetchSlots}
        loading={loadingSlots}
      />

      {loadingSlots && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}

      {step === "pick-slot" && !loadingSlots && (
        <>
          {slots.length === 0 ? (
            <div className="text-center py-4 bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border)]">
              <p className="text-[var(--text-secondary)] text-sm">No available slots on this day.</p>
              <p className="text-[var(--text-secondary)]/60 text-xs mt-1">Try picking another date.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Available Times</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => {
                  const time = new Date(s).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const chosen = selectedSlot === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSlot(s);
                        setStep("confirming");
                      }}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all
                        ${
                          chosen
                            ? "bg-brand-gradient text-white shadow-lg glow-brand-sm"
                            : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-accent)]"
                        }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {step === "confirming" && selectedSlot && (
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">New Meeting Time</p>
          <p className="text-sm text-[var(--accent-cyan)]">
            📅{" "}
            {new Date(selectedSlot).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
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
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "confirming" && (
        <Button onClick={handleConfirmReschedule} loading={submitting}>
          Confirm Reschedule
        </Button>
      )}
    </div>
  );
}
