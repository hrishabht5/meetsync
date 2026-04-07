"use client";
import React, { useEffect, useState, useCallback } from "react";
import { api, AnalyticsSummary, TrendPoint, AnalyticsBreakdown } from "@/lib/api-client";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { errMsg } from "@/lib/errors";

// ── Stat Card ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? "text-[var(--text-primary)]"}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)]">{sub}</p>}
    </Card>
  );
}

// ── SVG Trend Bar Chart ───────────────────────────────────
function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;

  const W = 640;
  const H = 120;
  const PAD = { top: 10, right: 8, bottom: 28, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(2, (chartW / data.length) - 2);

  // Label every Nth date to avoid crowding
  const labelEvery = data.length <= 7 ? 1 : data.length <= 30 ? 5 : 15;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 140 }}
      aria-label="Bookings over time"
    >
      {/* Y-axis ticks */}
      {[0, Math.ceil(maxCount / 2), maxCount].map((tick) => {
        const y = PAD.top + chartH - (tick / maxCount) * chartH;
        return (
          <g key={tick}>
            <line
              x1={PAD.left - 4}
              y1={y}
              x2={PAD.left + chartW}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--text-secondary)"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = maxCount === 0 ? 0 : (d.count / maxCount) * chartH;
        const x = PAD.left + i * (chartW / data.length) + 1;
        const y = PAD.top + chartH - barH;

        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill="url(#barGrad)"
              opacity={d.count === 0 ? 0.25 : 0.85}
            />
            {i % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={8}
                fill="var(--text-secondary)"
              >
                {formatAxisDate(d.date, data.length)}
              </text>
            )}
          </g>
        );
      })}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-cyan)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function formatAxisDate(iso: string, totalDays: number): string {
  const d = new Date(iso + "T00:00:00");
  if (totalDays <= 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Horizontal bar (percentage) ───────────────────────────
function BreakdownBar({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-primary)] font-medium capitalize">{label}</span>
        <span className="text-[var(--text-secondary)]">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown | null>(null);
  const [trendDays, setTrendDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, t, b] = await Promise.all([
        api.analytics.summary(),
        api.analytics.trend(trendDays),
        api.analytics.breakdown(),
      ]);
      setSummary(s);
      setTrend(t);
      setBreakdown(b);
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <>
        <SectionHeader title="Analytics" subtitle="Booking insights at a glance" />
        <div className="flex justify-center py-20"><Spinner /></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SectionHeader title="Analytics" subtitle="Booking insights at a glance" />
        <Card className="p-6 text-center text-red-400">⚠️ {error}</Card>
      </>
    );
  }

  const totalTrendBookings = trend.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <SectionHeader title="Analytics" subtitle="Booking insights at a glance" />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Bookings" value={summary?.total ?? 0} />
        <StatCard
          label="Confirmed"
          value={summary?.confirmed ?? 0}
          accent="text-emerald-400"
          sub={summary && summary.total > 0 ? `${(100 - summary.cancellation_rate).toFixed(1)}% confirm rate` : undefined}
        />
        <StatCard
          label="Cancelled"
          value={summary?.cancelled ?? 0}
          accent="text-red-400"
          sub={summary && summary.total > 0 ? `${summary.cancellation_rate}% cancel rate` : undefined}
        />
        <StatCard
          label="Upcoming"
          value={summary?.upcoming ?? 0}
          accent="text-[var(--accent-cyan)]"
          sub="not yet occurred"
        />
      </div>

      {/* ── Top Event Type ── */}
      {summary?.top_event_type && (
        <Card className="px-5 py-3 mb-6 flex items-center gap-3">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wide">Most booked</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{summary.top_event_type}</p>
          </div>
        </Card>
      )}

      {/* ── Trend Chart ── */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">Bookings Over Time</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {totalTrendBookings} booking{totalTrendBookings !== 1 ? "s" : ""} in the last {trendDays} days
            </p>
          </div>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setTrendDays(opt.days)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                  ${trendDays === opt.days
                    ? "bg-brand-gradient text-white"
                    : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-[var(--border)]"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {trend.every((d) => d.count === 0) ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">No bookings in this period</p>
        ) : (
          <TrendChart data={trend} />
        )}
      </Card>

      {/* ── Breakdown ── */}
      {breakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="font-semibold text-sm text-[var(--text-primary)] mb-4">By Event Type</p>
            {breakdown.by_event_type.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No data yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {breakdown.by_event_type.map((item) => (
                  <BreakdownBar key={item.label} {...item} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm text-[var(--text-primary)] mb-4">By Status</p>
            {breakdown.by_status.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No data yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {breakdown.by_status.map((item) => (
                  <BreakdownBar key={item.label} {...item} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
