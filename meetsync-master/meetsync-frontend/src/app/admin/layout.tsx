"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { useTheme } from "@/components/themeProvider";
import { BarChart2, Users, Mail, Globe, LogOut } from "lucide-react";

const nav = [
  { href: "/admin",         label: "Overview",  Icon: BarChart2, exact: true },
  { href: "/admin/users",   label: "Users",     Icon: Users },
  { href: "/admin/waitlist",label: "Waitlist",  Icon: Mail },
  { href: "/admin/domains", label: "Domains",   Icon: Globe },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    api.auth.status()
      .then((res) => {
        if (!res.connected || !res.is_admin) {
          window.location.href = "/dashboard";
        }
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  return (
    <div className="min-h-screen flex bg-page-gradient">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-card)]/60 backdrop-blur-sm">
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5 mb-1">
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="DraftMeet"
              className="w-7 h-7 rounded-lg glow-brand-sm"
            />
            <span className="font-bold text-[var(--text-primary)] text-sm">DraftMeet</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map(({ href, label, Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all border-l-2 pl-[10px] pr-3
                  ${active
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8 border-transparent"
                  }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[var(--border)] flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)]/8 transition-all"
          >
            ← Dashboard
          </Link>
          <button
            onClick={async () => {
              await api.auth.logout().catch(() => {});
              window.location.href = "/";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-left w-full"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
