"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/themeProvider";
import { errMsg } from "@/lib/errors";
import { Card, Spinner } from "@/components/ui";
import { ProfileResponse, PermanentLinkRow } from "@/lib/api-client";

type PageData = ProfileResponse & { links: PermanentLinkRow[] };

// Calls the server-side proxy so the browser never hits api.draftmeet.com
// directly (which would fail CORS from a custom domain origin).
async function publicGet<T>(path: string, qs = ""): Promise<T> {
  const res = await fetch(`/api/public/${path}${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export default function CustomDomainProfilePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = use(params);
  const { theme } = useTheme();
  const [data, setData] = useState<PageData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;
    // Resolve domain → username, then load profile
    publicGet<{ username: string }>("domains/resolve", `host=${encodeURIComponent(domain)}`)
      .then(({ username }) =>
        publicGet<PageData>(`profiles/${encodeURIComponent(username)}/`)
      )
      .then(setData)
      .catch((e: unknown) => setErrorMsg(errMsg(e)))
      .finally(() => setLoading(false));
  }, [domain]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-page-gradient">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,106,232,0.6) 0%, rgba(56,191,255,0.2) 60%, transparent 100%)" }}
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img
            src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            alt="DraftMeet"
            className="w-8 h-8 rounded-lg glow-brand-sm"
          />
          <span className="text-lg font-bold text-[var(--text-primary)]">DraftMeet</span>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size={36} />
          </div>
        )}

        {!loading && errorMsg && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-10 text-center glow-brand">
            <div className="text-5xl mb-4">🔗</div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">Page Not Found</p>
            <p className="text-[var(--text-secondary)] text-sm mt-2">{errorMsg}</p>
          </div>
        )}

        {!loading && data && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {data.display_name || data.username}
              </h1>
              {data.bio && (
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm mx-auto">
                  {data.bio}
                </p>
              )}
            </div>

            {data.links && data.links.length > 0 ? (
              data.links
                .filter((l) => l.is_active)
                .map((link) => (
                  <Link key={link.id} href={`/${link.slug}`}>
                    <Card className="p-5 hover:border-[var(--border-accent)] transition-all cursor-pointer group">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                            {link.custom_title || link.event_type}
                          </p>
                          {link.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {link.description}
                            </p>
                          )}
                        </div>
                        <span className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors text-lg flex-shrink-0">
                          →
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-[var(--text-secondary)] text-sm">No booking links available.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
