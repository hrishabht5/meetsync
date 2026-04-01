"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { api } from "@/lib/api-client";

const nav = [
  { href: "/dashboard", label: "Bookings", icon: "📅" },
  { href: "/dashboard/links", label: "Links", icon: "🔗" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤" },
  { href: "/dashboard/availability", label: "Availability", icon: "⏰" },
  { href: "/dashboard/webhooks", label: "API & Webhooks", icon: "🔔" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

function SearchParamHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("meetsync_token", token);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  useEffect(() => {
    api.auth.status()
      .then((res) => {
        if (!res.connected) {
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  return (
    <div className="min-h-screen flex bg-page-gradient">
      <Suspense fallback={null}>
        <SearchParamHandler />
      </Suspense>

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-card)]/60 backdrop-blur-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border)] flex items-center gap-2.5">
          <img src="/logo.png" alt="MeetSync" className="w-8 h-8 rounded-lg glow-brand-sm" />
          <span className="font-bold text-[var(--text-primary)] text-sm">MeetSync</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map((item) => {
            const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-brand-gradient text-white shadow-sm glow-brand-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8"
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--border)] flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8 transition-all"
          >
            ← Home
          </Link>
          <button
            onClick={async () => {
              try {
                await api.auth.logout();
                window.location.href = "/";
              } catch (e) {
                console.error("Logout failed", e);
              }
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-left w-full"
          >
            <span className="text-base">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
