"use client";
import { useEffect, useState } from "react";
import { api, AdminDomain } from "@/lib/api-client";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { errMsg } from "@/lib/errors";

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<AdminDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin.listDomains()
      .then(setDomains)
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <>
      <SectionHeader
        title="Custom Domains"
        subtitle={`${domains.length} registered`}
      />

      {domains.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No custom domains registered yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Domain</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Owner</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Added</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{d.domain}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {d.username ? `@${d.username}` : d.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.verified
                          ? "bg-green-500/15 text-green-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {d.verified ? "Verified" : "Pending DNS"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
