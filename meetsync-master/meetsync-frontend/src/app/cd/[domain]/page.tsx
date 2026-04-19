"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/themeProvider";
import { errMsg } from "@/lib/errors";
import { Spinner } from "@/components/ui";
import { ProfileResponse, PermanentLinkRow } from "@/lib/api-client";
import { publicGet } from "@/lib/public-api";
import { Avatar } from "@/components/Avatar";

type PageData = ProfileResponse & { links: PermanentLinkRow[] };

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
    publicGet<{ username: string }>("domains/resolve", `host=${encodeURIComponent(domain)}`)
      .then(({ username }) =>
        publicGet<PageData>(`profiles/${encodeURIComponent(username)}/`)
      )
      .then(setData)
      .catch((e: unknown) => setErrorMsg(errMsg(e)))
      .finally(() => setLoading(false));
  }, [domain]);

  const accentStyle = data?.accent_color
    ? ({ "--profile-accent": data.accent_color } as React.CSSProperties)
    : {};

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 16px 80px",
        ...(data?.bg_image_url
          ? { backgroundImage: `url(${data.bg_image_url})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
          : {}),
      }}
      className={data?.bg_image_url ? "" : "bg-page-gradient"}
    >
      {!data?.bg_image_url && (
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,106,232,0.6) 0%, rgba(56,191,255,0.2) 60%, transparent 100%)" }}
        />
      )}

      <div className="relative z-10 w-full max-w-lg pt-12">
        {/* DraftMeet logo — hidden for white-label premium users */}
        {!data?.remove_branding && (
          <div className="flex items-center gap-2 mb-8 justify-center">
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="DraftMeet"
              className="w-8 h-8 rounded-lg glow-brand-sm"
            />
            <span className="text-lg font-bold text-[var(--text-primary)]">DraftMeet</span>
          </div>
        )}

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
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden glow-brand"
            style={accentStyle}
          >
            {/* Cover image */}
            {data.cover_image_url && (
              <div className="w-full h-36 overflow-hidden">
                <img
                  src={data.cover_image_url}
                  alt="Profile cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Profile header */}
            <div
              className={`px-8 pb-6 border-b border-[var(--border)] ${data.cover_image_url ? "pt-5" : "pt-8"}`}
            >
              <div className="flex items-center gap-4">
                <Avatar
                  src={data.avatar_url}
                  name={data.display_name ?? data.username}
                  size={64}
                  accentColor={data.accent_color}
                  className="glow-brand-sm"
                />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">
                    {data.display_name ?? data.username}
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">@{data.username}</p>
                  {data.headline && (
                    <p className="text-xs mt-1" style={{ color: data.accent_color || "var(--accent)" }}>
                      {data.headline}
                    </p>
                  )}
                </div>
              </div>

              {data.bio && (
                <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{data.bio}</p>
              )}

              {(data.website || data.location) && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {data.location && (
                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      📍 {data.location}
                    </span>
                  )}
                  {data.website && (
                    <a
                      href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 transition-colors hover:underline"
                      style={{ color: data.accent_color || "var(--accent)" }}
                    >
                      🔗 {data.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Booking links */}
            <div className="p-6 flex flex-col gap-3">
              {!data.links || data.links.filter((l) => l.is_active).length === 0 ? (
                <p className="text-center text-[var(--text-secondary)] text-sm py-6">
                  No active booking links.
                </p>
              ) : (
                <>
                  <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider mb-1">
                    Book a meeting
                  </p>
                  {data.links
                    .filter((l) => l.is_active)
                    .map((link) => (
                      <Link
                        key={link.id}
                        href={`/${link.slug}`}
                        className="flex items-center justify-between gap-4 bg-[var(--bg-card-hover)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:bg-[var(--accent)]/8 rounded-xl px-5 py-4 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                            {link.custom_title || link.event_type}
                          </p>
                          {link.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{link.description}</p>
                          )}
                        </div>
                        <span
                          className="text-lg transition-colors flex-shrink-0"
                          style={{ color: data.accent_color || "var(--accent)" }}
                        >
                          →
                        </span>
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
