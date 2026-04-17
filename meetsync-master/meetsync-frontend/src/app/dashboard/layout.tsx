"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { ThemeToggle } from "@/components/themeToggle";
import { useTheme } from "@/components/themeProvider";
import { Calendar, BarChart2, Link2, User, Clock, Webhook, Settings, LogOut } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Bookings", Icon: Calendar },
  { href: "/dashboard/analytics", label: "Analytics", Icon: BarChart2 },
  { href: "/dashboard/links", label: "Links", Icon: Link2 },
  { href: "/dashboard/profile", label: "Profile", Icon: User },
  { href: "/dashboard/availability", label: "Availability", Icon: Clock },
  { href: "/dashboard/webhooks", label: "API & Webhooks", Icon: Webhook },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { theme } = useTheme();

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
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-card)]/60 backdrop-blur-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border)] flex items-center gap-2.5">
          <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="DraftMeet" className="w-8 h-8 rounded-lg glow-brand-sm" />
          <span className="font-bold text-[var(--text-primary)] text-sm">DraftMeet</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map((item) => {
            const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)] pl-[10px] pr-3"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8 border-l-2 border-transparent pl-[10px] pr-3"
                  }`}
              >
                <item.Icon size={16} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--border)] flex flex-col gap-1">
          <ThemeToggle />
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
            <LogOut size={16} strokeWidth={1.5} />
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
