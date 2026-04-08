"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, GuestBookingResponse } from "@/lib/api-client";
import { useTheme } from "@/components/themeProvider";
import { errMsg } from "@/lib/errors";
import { Button, Spinner } from "@/components/ui";
import { CancelConfirmation, RescheduleFlow } from "@/components/GuestManageActions";

type View =
  | "loading"
  | "error"
  | "details"
  | "cancel"
  | "reschedule"
  | "cancelled"
  | "rescheduled";

export default function ManageBookingPage() {
  const params = useParams();
  const token = params?.token as string;

  const { theme } = useTheme();
  const [view, setView] = useState<View>("loading");
  const [booking, setBooking] = useState<GuestBookingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rescheduledResult, setRescheduledResult] = useState<{
    scheduled_at: string;
    meet_link: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.manage
      .getBooking(token)
      .then((data) => {
        setBooking(data);
        setView("details");
      })
      .catch((e: Error) => {
        setErrorMsg(e.message);
        setView("error");
      });
  }, [token]);

  // Determine if booking is in the past
  const isPast = booking
    ? new Date(booking.scheduled_at) <= new Date()
    : false;

  // Determine if booking is already cancelled
  const isCancelled = booking?.status === "cancelled";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-page-gradient">
      {/* Background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,106,232,0.6) 0%, rgba(56,191,255,0.2) 60%, transparent 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img
            src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            alt="DraftMeet"
            className="w-8 h-8 rounded-lg glow-brand-sm"
          />
          <span className="text-lg font-bold text-[var(--text-primary)]">
            DraftMeet
          </span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden glow-brand">
          {/* ── Loading ────────────────────────────────── */}
          {view === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8">
              <Spinner size={36} />
              <p className="text-[var(--text-secondary)] text-sm">
                Loading your booking…
              </p>
            </div>
          )}

          {/* ── Error ─────────────────────────────────── */}
          {view === "error" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
              <div className="text-5xl">🔒</div>
              <p className="font-semibold text-[var(--text-primary)] text-lg">
                Booking Not Found
              </p>
              <p className="text-[var(--text-secondary)] text-sm">
                {errorMsg || "This management link is invalid or has expired."}
              </p>
            </div>
          )}

          {/* ── Booking Details ────────────────────────── */}
          {view === "details" && booking && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <p className="text-xs text-[var(--accent-cyan)] font-semibold uppercase tracking-wider mb-1">
                  Manage Booking
                </p>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {booking.custom_title || booking.event_type}
                </h2>
              </div>

              {/* Booking info card */}
              <div className="bg-[var(--bg-card-hover)] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {booking.guest_name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {booking.guest_email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <p className="text-sm text-[var(--text-primary)]">
                    {new Date(booking.scheduled_at).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg">🏷️</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                    ${
                      booking.status === "confirmed"
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : booking.status === "cancelled"
                        ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
                        : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {booking.meet_link && booking.status !== "cancelled" && (
                  <a
                    href={booking.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    <span className="text-lg">🎥</span>
                    Join Google Meet
                  </a>
                )}

                {booking.notes && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📝</span>
                    <p className="text-xs text-[var(--text-secondary)] italic">
                      &quot;{booking.notes}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isCancelled && !isPast && (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setView("reschedule")}
                    className="flex-1"
                  >
                    🔄 Reschedule
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setView("cancel")}
                    className="flex-1"
                  >
                    ✕ Cancel
                  </Button>
                </div>
              )}

              {/* Past booking notice */}
              {isPast && !isCancelled && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-400 text-center">
                  This booking has already passed and can no longer be modified.
                </div>
              )}

              {/* Already cancelled notice */}
              {isCancelled && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                  This booking has been cancelled.
                </div>
              )}
            </div>
          )}

          {/* ── Cancel Flow ────────────────────────────── */}
          {view === "cancel" && booking && (
            <div className="p-6">
              <CancelConfirmation
                booking={booking}
                token={token}
                onCancelled={() => setView("cancelled")}
                onBack={() => setView("details")}
              />
            </div>
          )}

          {/* ── Reschedule Flow ────────────────────────── */}
          {view === "reschedule" && booking && (
            <div className="p-6">
              <RescheduleFlow
                booking={booking}
                token={token}
                onRescheduled={(result) => {
                  setRescheduledResult(result);
                  setView("rescheduled");
                }}
                onBack={() => setView("details")}
              />
            </div>
          )}

          {/* ── Cancelled Success ──────────────────────── */}
          {view === "cancelled" && (
            <div className="flex flex-col items-center gap-5 py-14 px-8 text-center">
              <div className="text-6xl">❌</div>
              <div>
                <p className="font-bold text-[var(--text-primary)] text-xl">
                  Booking Cancelled
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">
                  Your meeting has been cancelled and the Google Calendar event
                  has been removed.
                </p>
              </div>
            </div>
          )}

          {/* ── Rescheduled Success ─────────────────────── */}
          {view === "rescheduled" && rescheduledResult && (
            <div className="flex flex-col items-center gap-5 py-14 px-8 text-center">
              <div className="text-6xl">🔄</div>
              <div>
                <p className="font-bold text-[var(--text-primary)] text-xl">
                  Booking Rescheduled!
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">
                  Your meeting has been moved to:
                </p>
                <p className="text-[var(--accent-cyan)] font-semibold mt-1">
                  📅{" "}
                  {new Date(rescheduledResult.scheduled_at).toLocaleString(
                    undefined,
                    { dateStyle: "full", timeStyle: "short" }
                  )}
                </p>
              </div>
              {rescheduledResult.meet_link && (
                <a
                  href={rescheduledResult.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm text-center transition-all shadow-lg shadow-[rgba(59,106,232,0.35)] hover:opacity-90 hover:-translate-y-0.5"
                >
                  🎥 Join Google Meet
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)] mt-6 opacity-60">
          Powered by DraftMeet
        </p>
      </div>
    </main>
  );
}
