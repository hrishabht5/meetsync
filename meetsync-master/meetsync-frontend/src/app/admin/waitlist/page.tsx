"use client";
import { useEffect, useState } from "react";
import { api, WaitlistEntry } from "@/lib/api-client";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { errMsg } from "@/lib/errors";

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.admin.listWaitlist()
      .then(setEntries)
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const copyEmails = () => {
    const text = entries.map((e) => e.email).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <>
      <SectionHeader
        title="Waitlist"
        subtitle={`${entries.length} signups`}
        action={
          entries.length > 0 ? (
            <button
              onClick={copyEmails}
              className="text-sm px-4 py-2 rounded-xl ring-1 ring-[var(--border-accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
            >
              {copied ? "✓ Copied!" : "Copy all emails"}
            </button>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No waitlist signups yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Joined</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.email}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--text-primary)]">{entry.email}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
