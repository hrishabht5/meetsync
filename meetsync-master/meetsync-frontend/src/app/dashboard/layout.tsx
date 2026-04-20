"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, AuthStatus } from "@/lib/api-client";
import { ThemeToggle } from "@/components/themeToggle";
import { useTheme } from "@/components/themeProvider";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Calendar, BarChart2, Link2, User, Clock, Webhook, Settings, LogOut, Menu, X } from "lucide-react";

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
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.auth.status()
      .then((res) => {
        if (!res.connected) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        } else {
          setAuthStatus(res);
        }
      })
      .catch(() => {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      });
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [path]);

  const sidebarContent = (
    <>
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
            } catch {
              // non-critical
            }
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-left w-full"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-page-gradient">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="DraftMeet" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-sm text-[var(--text-primary)]">DraftMeet</span>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8 transition-all"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-60 flex flex-col
          bg-[var(--bg-card)]/95 backdrop-blur-sm border-r border-[var(--border)]
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:flex md:bg-[var(--bg-card)]/60
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {authStatus?.is_impersonating && (
          <ImpersonationBanner email={authStatus.email} />
        )}
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 w-full">{children}</div>
      </main>
    </div>
  );
}
