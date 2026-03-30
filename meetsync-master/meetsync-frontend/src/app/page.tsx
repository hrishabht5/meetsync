"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.auth.status()
      .then((res) => setIsLoggedIn(res.connected))
      .catch(() => setIsLoggedIn(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.auth.logout();
      setIsLoggedIn(false);
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-page-gradient">
      {/* Glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-30 pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(91,53,232,0.5) 0%, rgba(59,106,232,0.3) 40%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15 pointer-events-none"
           style={{ background: "radial-gradient(circle, #38BFFF, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl gap-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MeetSync" className="w-10 h-10 rounded-xl glow-brand-sm" />
          <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">MeetSync</span>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the back-and-forth</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. No accounts. No friction.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto min-h-[52px] items-center justify-center">
          {isLoggedIn === null ? (
            <Spinner size={24} />
          ) : isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm shadow-xl shadow-[rgba(59,106,232,0.35)] transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[rgba(56,191,255,0.30)]"
              >
                Open Dashboard →
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-8 py-3 rounded-2xl bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm ring-1 ring-[var(--border)] hover:ring-[var(--border-accent)] transition-all disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <a
              href={api.auth.googleLoginUrl()}
              className="px-8 py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm shadow-xl shadow-[rgba(59,106,232,0.35)] transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[rgba(56,191,255,0.30)]"
            >
              Connect Google Account →
            </a>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-4">
          {[
            { icon: "🔗", title: "One-Time Links", desc: "Each link expires after one use" },
            { icon: "📅", title: "Google Calendar", desc: "Auto-creates Meet events" },
            { icon: "🔔", title: "Webhooks", desc: "Get notified on every booking" },
          ].map((f) => (
            <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 text-left card-glow-hover">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{f.title}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="w-full mt-16 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs">
          <p>© {new Date().getFullYear()} MeetSync. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
