"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ProfileResponse, PermanentLinkRow } from "@/lib/api-client";
import { useTheme } from "@/components/themeProvider";
import { errMsg } from "@/lib/errors";
import { Card, Spinner } from "@/components/ui";

type PageData = ProfileResponse & { links: PermanentLinkRow[] };

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;

  const { theme } = useTheme();
  const [data, setData] = useState<PageData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    api.profiles.getPublic(username)
      .then(setData)
      .catch((e: unknown) => setErrorMsg(errMsg(e)))
      .finally(() => setLoading(false));
  }, [username]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-page-gradient">
      {/* Background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,106,232,0.6) 0%, rgba(56,191,255,0.2) 60%, transparent 100%)" }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="DraftMeet" className="w-8 h-8 rounded-lg glow-brand-sm" />
          <span className="text-lg font-bold text-[var(--text-primary)]">DraftMeet</span>
        </div>

        {loading && (
          <div className="flex justify-center py-20"><Spinner size={36} /></div>
        )}

        {!loading && errorMsg && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-10 text-center glow-brand">
            <div className="text-5xl mb-4">👤</div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">Profile not found</p>
            <p className="text-[var(--text-secondary)] text-sm mt-2">{errorMsg}</p>
          </div>
        )}

        {!loading && data && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden glow-brand">
            {/* Profile header */}
            <div className="px-8 pt-8 pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-2xl font-bold text-white glow-brand-sm">
                  {(data.display_name ?? data.username)[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">{data.display_name ?? data.username}</h1>
                  <p className="text-sm text-[var(--text-secondary)]">@{data.username}</p>
                </div>
              </div>
              {data.bio && (
                <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{data.bio}</p>
              )}
            </div>

            {/* Booking links */}
            <div className="p-6 flex flex-col gap-3">
              {data.links.length === 0 ? (
                <p className="text-center text-[var(--text-secondary)] text-sm py-6">No active booking links.</p>
              ) : (
                <>
                  <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider mb-1">Book a meeting</p>
                  {data.links.map((lk) => (
                    <Link
                      key={lk.id}
                      href={`/u/${data.username}/${lk.slug}`}
                      className="flex items-center justify-between gap-4 bg-[var(--bg-card-hover)] hover:bg-[var(--accent)]/10 border border-[var(--border)] hover:border-[var(--border-accent)] rounded-xl px-5 py-4 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">{lk.event_type}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">/{data.username}/{lk.slug}</p>
                      </div>
                      <span className="text-[var(--accent)] group-hover:text-[var(--accent-cyan)] text-lg transition-colors">→</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
