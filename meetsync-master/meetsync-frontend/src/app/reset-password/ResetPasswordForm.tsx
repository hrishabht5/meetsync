"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api-client";

type FormView = "form" | "success" | "invalid";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [view, setView] = useState<FormView>(token ? "form" : "invalid");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.resetPassword(token, newPassword);
      setView("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "invalid") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Invalid reset link</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          This password reset link is missing or invalid. Reset links expire after 1 hour and can only be used once.
        </p>
        <Link
          href="/login"
          className="w-full py-2.5 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm ring-1 ring-[var(--border)] hover:ring-[var(--border-accent)] transition-all text-center block"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Password updated</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Your password has been changed. You can now log in with your new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full py-2.5 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 transition-all duration-150"
        >
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Set a new password</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Must be 8+ characters with at least one uppercase letter and one number.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your new password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 transition-all duration-150 disabled:opacity-50 flex items-center justify-center"
        >
          {submitting
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : "Update password"}
        </button>
      </form>

      <Link
        href="/login"
        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center"
      >
        ← Back to log in
      </Link>
    </div>
  );
}
