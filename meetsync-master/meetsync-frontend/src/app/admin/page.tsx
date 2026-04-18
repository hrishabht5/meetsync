"use client";
import { useEffect, useState } from "react";
import { api, AdminStats } from "@/lib/api-client";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { errMsg } from "@/lib/errors";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
      <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
    </Card>
  );
}

function SignupChart({ data }: { data: AdminStats["signup_trend"] }) {
  if (!data.length) return null;
  const W = 640, H = 120;
  const PAD = { top: 10, right: 8, bottom: 28, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(2, cW / data.length - 2);
  const labelEvery = data.length <= 7 ? 1 : data.length <= 30 ? 5 : 10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {[0, Math.ceil(max / 2), max].map((tick) => {
        const y = PAD.top + cH - (tick / max) * cH;
        return (
          <g key={tick}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-secondary)">{tick}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.count / max) * cH);
        const x = PAD.left + i * (cW / data.length) + (cW / data.length - barW) / 2;
        const y = PAD.top + cH - barH;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill="url(#adminGrad)" opacity={0.85} />
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--text-secondary)">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-cyan)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin.stats()
      .then(setStats)
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!stats) return null;

  return (
    <>
      <SectionHeader title="Platform Overview" subtitle="Across all users" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.total_users.toLocaleString()} />
        <StatCard label="Total Bookings" value={stats.total_bookings.toLocaleString()} />
      </div>
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
          New Signups — Last 30 Days
        </p>
        <SignupChart data={stats.signup_trend} />
      </Card>
    </>
  );
}
