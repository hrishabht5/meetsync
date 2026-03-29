"use client";
import React, { useEffect, useState } from "react";
import { api, BookingRow } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, SectionHeader, Spinner } from "@/components/ui";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.bookings.list(filter || undefined);
      setBookings(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      await api.bookings.cancel(id, "Cancelled by host");
      setBookings((b) => b.map((bk) => bk.id === id ? { ...bk, status: "cancelled" } : bk));
    } catch (e: unknown) {
      alert((e as Error).message);
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
          <div className="flex gap-2">
            {["", "confirmed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${filter === s ? "bg-indigo-600 text-white" : "bg-white/6 text-zinc-400 hover:text-white hover:bg-white/10"}`}
              >
                {s || "All"}
              </button>
            ))}
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
                    <span className="font-semibold text-white">{bk.guest_name}</span>
                    <Badge status={bk.status}>{bk.status}</Badge>
                    <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-lg">{bk.event_type}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{bk.guest_email}</p>
                  <p className="text-sm text-zinc-300">
                    📆 {new Date(bk.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {bk.meet_link && (
                    <a href={bk.meet_link} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors">
                      🎥 Join Google Meet
                    </a>
                  )}
                  {bk.notes && <p className="text-xs text-zinc-500 italic">&quot;{bk.notes}&quot;</p>}
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
