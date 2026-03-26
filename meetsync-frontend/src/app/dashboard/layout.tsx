"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api-client";

const nav = [
  { href: "/dashboard", label: "Bookings", icon: "📅" },
  { href: "/dashboard/links", label: "Links", icon: "🔗" },
  { href: "/dashboard/availability", label: "Availability", icon: "⏰" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "🔔" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Handle token from URL
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("meetsync_token", token);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // 2. Protect dashboard routes
    api.auth.status()
      .then((res) => {
        if (!res.connected) {
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex" style={{ background: "#0f1117" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[#2e3248] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#2e3248] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <path d="M3 9h18M9 4v5M15 4v5"/>
            </svg>
          </div>
          <span className="font-bold text-white text-sm">MeetSync</span>
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
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#2e3248] flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
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
