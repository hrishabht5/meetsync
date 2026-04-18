"use client";
import { useEffect, useState } from "react";
import { api, AdminUser } from "@/lib/api-client";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const load = (q: string, p: number) => {
    setLoading(true);
    api.admin.listUsers({ search: q, page: p, limit: 50 })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
      })
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load("", 1); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(search, 1);
  };

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      await api.admin.impersonate(userId);
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      alert(errMsg(e));
      setImpersonating(null);
    }
  };

  return (
    <>
      <SectionHeader
        title="Users"
        subtitle={`${total.toLocaleString()} total accounts`}
      />

      <form onSubmit={handleSearch} className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-all"
        >
          Search
        </button>
      </form>

      {loading && <div className="flex justify-center py-16"><Spinner size={32} /></div>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">User</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Bookings</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[var(--text-secondary)] text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {u.display_name || u.username || "—"}
                      </p>
                      {u.username && (
                        <p className="text-xs text-[var(--text-secondary)]">@{u.username}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                      {u.booking_count}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleImpersonate(u.id)}
                        disabled={impersonating === u.id}
                        className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-[var(--border-accent)] text-[var(--accent)] hover:ring-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50"
                      >
                        {impersonating === u.id ? "Loading…" : "Impersonate →"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <button
                onClick={() => { const p = page - 1; setPage(p); load(search, p); }}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-all"
              >
                ← Prev
              </button>
              <span className="text-xs text-[var(--text-secondary)]">Page {page}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); load(search, p); }}
                disabled={!hasMore}
                className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
