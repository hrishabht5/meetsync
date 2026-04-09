"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMsg(null);
    try {
      await api.waitlist.join(email);
      setStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.toLowerCase().includes("already")) {
        setStatus("success");
        setMsg("You're already on the list — we'll be in touch!");
      } else {
        setStatus("error");
        setMsg(message);
      }
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xl shadow-lg">
          ✓
        </div>
        <p className="text-[var(--text-primary)] font-semibold text-sm">
          {msg ?? "You're on the list! We'll email you when DraftMeet launches."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm shadow-lg shadow-[rgba(59,106,232,0.3)] hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap"
      >
        {status === "loading" ? <Spinner size={16} /> : "Notify Me"}
      </button>
      {status === "error" && msg && (
        <p className="text-red-400 text-xs mt-1 sm:col-span-2">{msg}</p>
      )}
    </form>
  );
}
