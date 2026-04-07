"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui";
import { ThemeToggle } from "@/components/themeToggle";

type AuthTab = "login" | "signup";

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Auth form state
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    api.auth.status()
      .then((res) => {
        setIsLoggedIn(res.connected);
        if (res.connected) router.push("/dashboard");
      })
      .catch(() => setIsLoggedIn(false));
  }, [router]);

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await (tab === "signup"
        ? api.auth.signup(email, password)
        : api.auth.login(email, password));
      router.push("/dashboard");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-page-gradient">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle compact />
      </div>
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
          <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the back-and-forth</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. No accounts. No friction.
          </p>
        </div>

        {/* CTA */}
        <div className="w-full max-w-sm">
          {isLoggedIn === null ? (
            <div className="flex justify-center min-h-[52px] items-center">
              <Spinner size={24} />
            </div>
          ) : isLoggedIn ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
              {/* Google Sign-In */}
              <a
                href={api.auth.googleLoginUrl("signin")}
                className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm shadow-lg shadow-[rgba(59,106,232,0.3)] hover:opacity-90 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="white" fillOpacity="0.9"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="white" fillOpacity="0.9"/>
                </svg>
                Continue with Google
              </a>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-secondary)]">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Tab Toggle */}
              <div className="flex rounded-xl bg-[var(--bg-card-hover)] p-1 gap-1">
                {(["login", "signup"] as AuthTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setFormError(null); }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      tab === t
                        ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                />
                <input
                  type="password"
                  placeholder={tab === "signup" ? "Password (min. 8 characters)" : "Password"}
                  required
                  minLength={tab === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                />
                {formError && (
                  <p className="text-red-400 text-xs">{formError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-brand-gradient text-white font-semibold text-sm shadow-lg shadow-[rgba(59,106,232,0.3)] hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting ? <Spinner size={16} /> : tab === "login" ? "Log In" : "Create Account"}
                </button>
              </form>
            </div>
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
