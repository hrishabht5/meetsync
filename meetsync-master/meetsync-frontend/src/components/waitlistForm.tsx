"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.waitlist.join(email);
      setResult({ success: true, message: res.message });
    } catch {
      setResult({ success: false, message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center shadow-lg shadow-[rgba(59,106,232,0.4)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-[var(--text-primary)] font-semibold text-base">{result.message}</p>
        <p className="text-[var(--text-secondary)] text-sm">Share the word — help us grow faster.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
      />
      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm shadow-xl shadow-[rgba(59,106,232,0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? "Joining..." : "Get Early Access"}
      </button>
      {result && !result.success && (
        <p className="text-red-400 text-xs mt-1 sm:col-span-2">{result.message}</p>
      )}
    </form>
  );
}
