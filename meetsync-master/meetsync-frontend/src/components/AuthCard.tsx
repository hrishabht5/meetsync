"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Eye, EyeOff } from "lucide-react";

type AuthTab = "login" | "signup";
type AuthView = "form" | "forgot" | "forgot-sent";

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [tab, setTab] = useState<AuthTab>("login");
  const [view, setView] = useState<AuthView>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    api.auth.status()
      .then((res) => {
        if (res.connected) {
          setIsLoggedIn(true);
          router.push(nextPath);
        }
      })
      .catch(() => {});
  }, [router, nextPath]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.auth.logout();
      setIsLoggedIn(false);
    } catch {
      // non-critical
    } finally {
      setLoggingOut(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSubmitting(true);
    try {
      await api.auth.forgotPassword(forgotEmail);
    } catch {
      // Always show success to prevent email enumeration on the frontend
    } finally {
      setForgotSubmitting(false);
      setView("forgot-sent");
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
      router.push(nextPath);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoggedIn) {
    return (
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
    );
  }

  if (view === "forgot") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Reset your password</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Enter your email and we&apos;ll send a reset link if an account exists.
          </p>
        </div>
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forgot-email" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder="you@company.com"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all"
            />
          </div>
          {forgotError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <span>⚠</span>
              <span>{forgotError}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={forgotSubmitting}
            className="w-full py-2.5 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 transition-all duration-150 disabled:opacity-50 flex items-center justify-center"
          >
            {forgotSubmitting
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : "Send reset link"}
          </button>
        </form>
        <button
          onClick={() => { setView("form"); setForgotError(null); }}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center"
        >
          ← Back to log in
        </button>
      </div>
    );
  }

  if (view === "forgot-sent") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Check your email</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            If an account with that email exists, we&apos;ve sent a password reset link.
            The link expires in 1 hour.
          </p>
        </div>
        <button
          onClick={() => { setView("form"); setForgotEmail(""); setForgotError(null); }}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm ring-1 ring-[var(--border)] hover:ring-[var(--border-accent)] transition-all"
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
      {/* Google Sign-In — white button per Google branding guidelines */}
      <a
        href={api.auth.googleLoginUrl("signin")}
        className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-[#3c4043] font-medium text-sm border border-[#dadce0] hover:bg-[#f8f9fa] shadow-sm transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Password{tab === "signup" ? " (min. 8 characters)" : ""}
            </label>
            {tab === "login" && (
              <button
                type="button"
                onClick={() => { setView("forgot"); setForgotEmail(email); setForgotError(null); }}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              placeholder={tab === "signup" ? "Create a strong password" : "Enter your password"}
              required
              minLength={tab === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {tab === "signup" && (
          <p className="text-xs text-[var(--text-secondary)]">
            Password must be 8+ characters with at least one uppercase letter and one number.
          </p>
        )}

        {formError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <span>⚠</span>
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 transition-all duration-150 disabled:opacity-50 flex items-center justify-center"
        >
          {submitting
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : tab === "login" ? "Log In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
