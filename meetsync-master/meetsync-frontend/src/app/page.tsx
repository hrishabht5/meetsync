import Link from "next/link";
import {
  Link2, RefreshCw, CalendarCheck, Clock4,
  BarChart3, Webhook, KeyRound, MessageSquare,
  ArrowRight, Zap, Shield, Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/themeToggle";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata = {
  title: "DraftMeet — Coming Soon | Smart Scheduling",
  description:
    "DraftMeet is a smart scheduling platform with one-time booking links, Google Calendar sync, and instant Google Meet creation. Join the waitlist for early access.",
  alternates: { canonical: "https://www.draftmeet.com" },
  openGraph: {
    title: "DraftMeet — Coming Soon | Smart Scheduling",
    description:
      "One-time booking links. Google Calendar sync. Instant Google Meet. No friction. Join the waitlist.",
    url: "https://www.draftmeet.com",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DraftMeet — Smart Scheduling" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet — Coming Soon",
    description: "Smart scheduling with one-time booking links and Google Meet. Join the waitlist.",
    images: ["/og-image.png"],
  },
};

const FEATURES = [
  {
    Icon: Link2,
    title: "One-Time Booking Links",
    desc: "Each link expires after a single use — zero double-bookings, ever.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: RefreshCw,
    title: "Permanent Booking Pages",
    desc: "A reusable page at your own slug — share it everywhere you go.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
  {
    Icon: CalendarCheck,
    title: "Google Calendar Sync",
    desc: "Auto-creates Google Meet events the moment a booking is confirmed.",
    color: "rgba(56,191,255,0.12)",
    iconColor: "#38BFFF",
  },
  {
    Icon: Clock4,
    title: "Availability Management",
    desc: "Set working hours, buffer times, and custom date overrides.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: BarChart3,
    title: "Booking Analytics",
    desc: "Track trends, cancellation rates, and your top event types.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
  {
    Icon: Webhook,
    title: "Webhooks",
    desc: "Real-time POST notifications on every booking event.",
    color: "rgba(56,191,255,0.12)",
    iconColor: "#38BFFF",
  },
  {
    Icon: KeyRound,
    title: "API Keys",
    desc: "Integrate DraftMeet into your own products via REST API.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: MessageSquare,
    title: "Custom Questions",
    desc: "Collect exactly the info you need with per-link custom fields.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
];

const STEPS = [
  {
    Icon: Link2,
    n: "01",
    title: "Create a link",
    desc: "Generate a one-time or permanent booking link in seconds from your dashboard.",
  },
  {
    Icon: CalendarCheck,
    n: "02",
    title: "Guest books a slot",
    desc: "They pick from your real-time availability — no account or download needed.",
  },
  {
    Icon: Zap,
    n: "03",
    title: "Meeting created",
    desc: "Google Meet link lands in both inboxes automatically. You're ready to go.",
  },
];

const TRUST_PILLS = [
  { Icon: Shield, label: "No credit card required" },
  { Icon: Zap,    label: "Instant Google Meet" },
  { Icon: Sparkles, label: "Free early access" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-page-gradient overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-page)]/80 backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-2.5">
          <img src="/logo-light.png" alt="DraftMeet" className="logo-light w-8 h-8 rounded-lg" />
          <img src="/logo-dark.png"  alt="DraftMeet" className="logo-dark  w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </div>
        <ThemeToggle compact />
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 gap-8 min-h-[92vh]">
        {/* Animated orbs */}
        <div
          className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[160px] pointer-events-none orb-pulse"
          style={{ background: "radial-gradient(circle, rgba(91,53,232,0.55) 0%, rgba(59,106,232,0.25) 40%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none orb-pulse"
          style={{ background: "radial-gradient(circle, rgba(56,191,255,0.35), transparent 70%)", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[30%] left-[5%] w-[250px] h-[250px] rounded-full blur-[120px] pointer-events-none orb-pulse"
          style={{ background: "radial-gradient(circle, rgba(91,53,232,0.2), transparent 70%)", animationDelay: "1s" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-7 max-w-3xl">
          {/* Shimmer badge */}
          <span className="animate-scale-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-shimmer text-white text-xs font-semibold tracking-wide shadow-lg">
            <Sparkles size={13} />
            Coming Soon — Join the waitlist
          </span>

          <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.08] tracking-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the chaos</span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Share a booking link. Your guest picks a slot. A Google Meet lands in both inboxes — instantly. No back-and-forth, no friction.
          </p>

          {/* Trust pills */}
          <div className="animate-fade-up delay-300 flex flex-wrap justify-center gap-3">
            {TRUST_PILLS.map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium">
                <Icon size={12} className="text-[var(--accent)]" />
                {label}
              </span>
            ))}
          </div>

          {/* Waitlist form */}
          <div className="animate-fade-up delay-400 w-full max-w-md">
            <WaitlistForm />
            <p className="text-xs text-[var(--text-secondary)] mt-3">
              Be the first to know when we launch. No spam, ever.
            </p>
          </div>
        </div>

        {/* Floating scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float opacity-40">
          <div className="w-5 h-8 rounded-full border-2 border-[var(--border)] flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-[var(--accent)] animate-fade-in" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto w-full">
        <div className="text-center mb-14 animate-fade-up">
          <p className="text-xs font-semibold tracking-widest text-[var(--accent)] uppercase mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Everything you need to{" "}
            <span className="text-gradient-brand">schedule smarter</span>
          </h2>
          <p className="text-[var(--text-secondary)] mt-3 text-base max-w-xl mx-auto">
            Built for founders, freelancers, and teams who refuse to waste time on coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ Icon, title, desc, color, iconColor }, i) => (
            <div
              key={title}
              className="animate-fade-up bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 text-left card-glow-hover group cursor-default"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200"
                style={{ background: color }}
              >
                <Icon size={20} style={{ color: iconColor }} strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{title}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24 border-y border-[var(--border)]" style={{ background: "var(--bg-deep, var(--bg-card))" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 animate-fade-up">
            <p className="text-xs font-semibold tracking-widest text-[var(--accent)] uppercase mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">Up and running in 30 seconds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-[var(--border-accent)] to-transparent" />

            {STEPS.map(({ Icon, n, title, desc }, i) => (
              <div
                key={n}
                className="animate-fade-up flex flex-col items-center text-center gap-4 relative"
                style={{ animationDelay: `${0.15 * i}s` }}
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-[rgba(59,106,232,0.3)] animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
                  <Icon size={28} className="text-white" strokeWidth={1.8} />
                </div>
                <span className="text-xs font-bold tracking-widest text-[var(--accent)] uppercase">{n}</span>
                <p className="font-bold text-[var(--text-primary)] text-base">{title}</p>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative px-6 py-28 flex flex-col items-center gap-7 text-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none orb-pulse"
          style={{ background: "radial-gradient(ellipse at center, rgba(91,53,232,0.08) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-7 max-w-xl animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-semibold">
            <Sparkles size={13} />
            Limited early access
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Be the first to try <span className="text-gradient-brand">DraftMeet</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed">
            We're opening the doors soon. Drop your email and we'll notify you the moment it's ready — with free early access.
          </p>
          <div className="w-full max-w-md">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/logo-light.png" alt="" className="logo-light w-5 h-5 rounded" />
          <img src="/logo-dark.png"  alt="" className="logo-dark  w-5 h-5 rounded" />
          <span className="font-semibold text-[var(--text-primary)]">DraftMeet</span>
          <span className="mx-2 opacity-40">·</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </main>
  );
}
