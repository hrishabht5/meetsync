"use client";
import React, { useEffect, useState } from "react";
import { api, BookingRow } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Badge, Button, Card, EmptyState, SectionHeader, Spinner } from "@/components/ui";

const isPast = (scheduledAt: string) => new Date(scheduledAt) < new Date();

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savingOutcome, setSavingOutcome] = useState<string | null>(null);
  const [outcomeSelections, setOutcomeSelections] = useState<Record<string, { outcome: string; notes: string }>>({});
  const [exporting, setExporting] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.bookings.list(filter || undefined);
      setBookings(data);
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleSaveOutcome = async (id: string) => {
    const sel = outcomeSelections[id];
    if (!sel?.outcome) return;
    setSavingOutcome(id);
    try {
      const updated = await api.bookings.setOutcome(
        id,
        sel.outcome as "completed" | "no_show" | "cancelled_by_guest",
        sel.notes || undefined
      );
      setBookings((prev) => prev.map((bk) =>
        bk.id === id
          ? { ...bk, outcome: updated.outcome as BookingRow["outcome"], outcome_recorded_at: updated.outcome_recorded_at, outcome_notes: sel.notes || null }
          : bk
      ));
      setOutcomeSelections((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSavingOutcome(null); }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await api.bookings.exportCsv(filter || undefined);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setExporting(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      await api.bookings.cancel(id, "Cancelled by host");
      setBookings((b) => b.map((bk) => bk.id === id ? { ...bk, status: "cancelled" } : bk));
    } catch (e: unknown) {
      alert(errMsg(e));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <>
      <SectionHeader
        title="Bookings"
        subtitle="All scheduled meetings with guests"
        action={
          <div className="flex gap-2 items-center">
            {["", "confirmed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${filter === s
                    ? "bg-brand-gradient text-white"
                    : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-[var(--border)]"
                  }`}
              >
                {s || "All"}
              </button>
            ))}
            <Button variant="secondary" size="sm" loading={exporting} onClick={handleExportCsv}>
              ↓ Export CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : error ? (
        <Card className="p-6 text-center text-red-400">⚠️ {error}</Card>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" title="No bookings yet" subtitle="Share a one-time link to get your first booking" />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((bk) => (
            <Card key={bk.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-primary)]">{bk.guest_name}</span>
                    <Badge status={bk.status}>{bk.status}</Badge>
                    <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-0.5 rounded-lg">{bk.custom_title || bk.event_type}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{bk.guest_email}</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    📆 {new Date(bk.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {bk.meet_link && (
                    <a href={bk.meet_link} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] inline-flex items-center gap-1 transition-colors">
                      🎥 Join Google Meet
                    </a>
                  )}
                  {bk.notes && <p className="text-xs text-[var(--text-secondary)] italic">&quot;{bk.notes}&quot;</p>}
                  {/* ── Outcome tracking ── */}
                  {isPast(bk.scheduled_at) && bk.status !== "cancelled" && (
                    <div className="mt-1 pt-2 border-t border-[var(--border)]">
                      {bk.outcome ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wide">Outcome:</span>
                          <Badge status={bk.outcome === "completed" ? "confirmed" : "cancelled"}>
                            {bk.outcome.replace(/_/g, " ")}
                          </Badge>
                          {bk.outcome_notes && <span className="text-xs text-[var(--text-secondary)] italic">&quot;{bk.outcome_notes}&quot;</span>}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wide">Record Outcome</span>
                          <div className="flex gap-2 flex-wrap">
                            {(["completed", "no_show", "cancelled_by_guest"] as const).map((val) => (
                              <button
                                key={val}
                                onClick={() => setOutcomeSelections((p) => ({ ...p, [bk.id]: { outcome: val, notes: p[bk.id]?.notes ?? "" } }))}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ring-1
                                  ${outcomeSelections[bk.id]?.outcome === val
                                    ? "bg-brand-gradient text-white ring-transparent"
                                    : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] ring-[var(--border)] hover:text-[var(--text-primary)]"}`}
                              >
                                {val === "completed" ? "Completed" : val === "no_show" ? "No-show" : "Cancelled by Guest"}
                              </button>
                            ))}
                          </div>
                          {outcomeSelections[bk.id]?.outcome && (
                            <>
                              <textarea
                                rows={2}
                                placeholder="Optional notes…"
                                value={outcomeSelections[bk.id]?.notes ?? ""}
                                onChange={(e) => setOutcomeSelections((p) => ({ ...p, [bk.id]: { ...p[bk.id], notes: e.target.value } }))}
                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
                              />
                              <Button size="sm" loading={savingOutcome === bk.id} onClick={() => handleSaveOutcome(bk.id)}>
                                Save Outcome
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {bk.status !== "cancelled" && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancelling === bk.id}
                    onClick={() => handleCancel(bk.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
