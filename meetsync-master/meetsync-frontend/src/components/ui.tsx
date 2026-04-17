// Reusable UI primitives

import React from "react";

// ── Badge ─────────────────────────────────────────────
const badgeVariants: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  used:      "bg-purple-500/15  text-purple-400  ring-1 ring-purple-500/30",
  pending:   "bg-amber-500/15   text-amber-400   ring-1 ring-amber-500/30",
  warning:   "bg-amber-500/15   text-amber-400   ring-1 ring-amber-500/30",
  expired:   "bg-zinc-500/15    text-zinc-400    ring-1 ring-zinc-500/30",
  revoked:   "bg-zinc-500/15    text-zinc-400    ring-1 ring-zinc-500/30",
  cancelled: "bg-red-500/15     text-red-400     ring-1 ring-red-500/30",
  success:   "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  error:     "bg-red-500/15     text-red-400     ring-1 ring-red-500/30",
};

export function Badge({ status, children }: { status: string; children: React.ReactNode }) {
  const cls = badgeVariants[status] ?? "bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────
type BtnVariant = "primary" | "warm" | "danger" | "ghost" | "secondary";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  loading?: boolean;
  size?: "sm" | "md";
}

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";
const btnVariants: Record<BtnVariant, string> = {
  primary:   "bg-brand-gradient text-white shadow-lg shadow-[rgba(59,106,232,0.30)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[rgba(56,191,255,0.25)] active:brightness-95 active:translate-y-0 active:scale-[0.97]",
  danger:    "bg-red-600/10 hover:bg-red-600/20 text-red-400 ring-1 ring-red-500/30",
  ghost:     "hover:bg-[var(--accent)]/8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
  secondary: "bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] ring-1 ring-[var(--border)] hover:ring-[var(--border-accent)]",
  warm:      "bg-warm-gradient text-white shadow-lg shadow-[rgba(245,158,11,0.25)] glow-warm hover:brightness-110 hover:-translate-y-0.5 active:brightness-95 active:translate-y-0 active:scale-[0.97]",
};
const btnSizes = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5 text-sm" };

export function Button({ variant = "primary", loading, size = "md", children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl card-glow-hover ${className}`}>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>}
      <input
        className={`w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/40 transition-all
          ${error ? "border-red-500/50 focus:ring-red-500/40" : ""}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg className="animate-spin text-[var(--accent-cyan)]" style={{ width: size, height: size }} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── EmptyState ────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="text-5xl">{icon}</div>
      <p className="font-semibold text-[var(--text-primary)] text-lg">{title}</p>
      {subtitle && <p className="text-sm text-[var(--text-secondary)] max-w-xs">{subtitle}</p>}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
