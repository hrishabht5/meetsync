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
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0f1117 0%, #12103a 100%)" }}>
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20"
           style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <path d="M3 9h18M9 4v5M15 4v5"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">MeetSync</span>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Schedule meetings<br />
            <span className="text-indigo-400">without the back-and-forth</span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
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
                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                Open Dashboard →
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-8 py-3 rounded-2xl bg-white/8 hover:bg-white/12 text-zinc-200 font-semibold text-sm ring-1 ring-white/10 transition-all disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <a
              href={api.auth.googleLoginUrl()}
              className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
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
            <div key={f.title} className="bg-white/4 border border-white/8 rounded-2xl p-4 text-left hover:bg-white/6 transition-all">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-zinc-500 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
