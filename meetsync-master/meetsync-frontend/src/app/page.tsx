import Link from "next/link";
import Image from "next/image";
import {
  Link2, RefreshCw, CalendarCheck, Clock4,
  BarChart3, Webhook, KeyRound, MessageSquare,
  Zap, Shield, Sparkles, ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/themeToggle";
import { WaitlistForm } from "@/components/WaitlistForm";

const IS_LIVE = (process.env.NEXT_PUBLIC_LAUNCH_MODE ?? process.env.LAUNCH_MODE) === "live";

export const metadata = {
  title: "DraftMeet: Free Calendly Alternative with Automatic Google Meet",
  description:
    "Create one-time or permanent booking links, auto-generate Google Meet events, and manage availability in one place. The free Calendly alternative built for speed.",
  alternates: { canonical: "https://www.draftmeet.com" },
  openGraph: {
    title: "DraftMeet: Free Calendly Alternative with Automatic Google Meet",
    description:
      "Share a booking link, let clients self-schedule, and auto-create Google Meet events. No back-and-forth. Free to start — built for founders & freelancers.",
    url: "https://www.draftmeet.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet: Free Calendly Alternative with Automatic Google Meet",
    description:
      "One-time booking links. Permanent booking pages. Automatic Google Meet. The free Calendly alternative for freelancers and founders.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I create a one-time booking link?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In DraftMeet, open any event type and generate a one-time link. It expires automatically after the first booking is completed — perfect for sending to a single client without exposing your permanent booking page.",
      },
    },
    {
      "@type": "Question",
      name: "Does DraftMeet automatically create Google Meet links?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. When a guest books a meeting, DraftMeet automatically creates a Google Meet event and sends the video conference link to both parties in the confirmation email. No manual step required.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best free Calendly alternative?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "DraftMeet offers one-time booking links, permanent booking pages, automatic Google Meet creation, and booking analytics on its free plan — features Calendly reserves for paid tiers.",
      },
    },
    {
      "@type": "Question",
      name: "Can I connect DraftMeet to Google Calendar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. DraftMeet syncs with Google Calendar to read your real-time availability, prevent double-bookings, and automatically write new booking events to your calendar with a Google Meet link attached.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between a one-time booking link and a permanent booking page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A one-time booking link expires after a single use — ideal for cold outreach or one-off consultations. A permanent booking page lives at a fixed URL and can be shared publicly or embedded on your website indefinitely. DraftMeet supports both.",
      },
    },
  ],
};

const FEATURES = [
  {
    Icon: Link2,
    title: "One-Time Booking Links",
    desc: "Each link expires after a single booking — zero double-bookings, zero misuse.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: RefreshCw,
    title: "Permanent Booking Pages",
    desc: "A reusable page at your own custom slug — share it everywhere, forever.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
  {
    Icon: CalendarCheck,
    title: "Google Calendar Sync",
    desc: "Syncs your real-time availability and auto-creates Google Meet events on every booking.",
    color: "rgba(56,191,255,0.12)",
    iconColor: "#38BFFF",
  },
  {
    Icon: Clock4,
    title: "Availability Management",
    desc: "Set working hours, buffer times, and custom date overrides to stay in control.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: BarChart3,
    title: "Booking Analytics",
    desc: "Track booking volume, cancellation rates, and top event types over time.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
  {
    Icon: Webhook,
    title: "Webhooks",
    desc: "Real-time POST notifications on every booking event — connect any tool.",
    color: "rgba(56,191,255,0.12)",
    iconColor: "#38BFFF",
  },
  {
    Icon: KeyRound,
    title: "API Keys",
    desc: "Developer-friendly REST API to integrate DraftMeet into your own products.",
    color: "rgba(91,53,232,0.12)",
    iconColor: "#5B35E8",
  },
  {
    Icon: MessageSquare,
    title: "Custom Questions",
    desc: "Collect exactly the guest info you need with per-link custom fields.",
    color: "rgba(59,106,232,0.12)",
    iconColor: "#3B6AE8",
  },
];

const STEPS = [
  {
    Icon: Link2,
    n: "01",
    title: "Create a booking link",
    desc: "Generate a one-time or permanent scheduling link from your dashboard in seconds.",
  },
  {
    Icon: CalendarCheck,
    n: "02",
    title: "Guest self-schedules",
    desc: "They pick from your real-time availability — no account or download needed.",
  },
  {
    Icon: Zap,
    n: "03",
    title: "Google Meet created",
    desc: "A Google Meet event lands in both inboxes automatically. You're ready to go.",
  },
];

const TRUST_PILLS = [
  { Icon: Shield,   label: "No credit card required" },
  { Icon: Zap,      label: "Instant Google Meet" },
  { Icon: Sparkles, label: IS_LIVE ? "Free to start" : "Free early access" },
];

const FAQS = [
  {
    q: "How do I create a one-time booking link?",
    a: "In DraftMeet, open any event type and generate a one-time link. It expires after the first booking — perfect for sending to a single client without exposing your permanent booking page.",
  },
  {
    q: "Does DraftMeet automatically create Google Meet links?",
    a: "Yes. When a guest books, DraftMeet auto-creates a Google Meet event and sends the conference link to both parties. No manual step required — the meeting is ready the moment it's booked.",
  },
  {
    q: "What is the best free Calendly alternative?",
    a: "DraftMeet gives you one-time booking links, permanent booking pages, automatic Google Meet creation, and booking analytics on its free plan — features Calendly locks behind paid tiers.",
  },
  {
    q: "What's the difference between a one-time link and a permanent booking page?",
    a: "A one-time link expires after a single use — ideal for cold outreach or one-off consultations. A permanent booking page lives at a fixed URL you can share anywhere, indefinitely. DraftMeet supports both.",
  },
  {
    q: "Can I connect DraftMeet to Google Calendar?",
    a: "Yes. DraftMeet syncs with Google Calendar to read your real-time availability, prevent double-bookings, and write new bookings directly to your calendar — each with a Google Meet link attached.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="min-h-screen flex flex-col bg-page-gradient overflow-x-hidden">

        {/* ── Nav ── */}
        <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-page)]/80 backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-light.png" alt="DraftMeet logo" width={32} height={32} className="logo-light rounded-lg" priority />
            <Image src="/logo-dark.png"  alt="DraftMeet logo" width={32} height={32} className="logo-dark  rounded-lg" />
            <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
          </div>
          <ThemeToggle compact />
        </nav>

        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 gap-8 min-h-[92vh]">
          {/* Animated orbs */}
          <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[160px] pointer-events-none orb-pulse"
               style={{ background: "radial-gradient(circle, rgba(91,53,232,0.55) 0%, rgba(59,106,232,0.25) 40%, transparent 70%)" }} />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none orb-pulse"
               style={{ background: "radial-gradient(circle, rgba(56,191,255,0.35), transparent 70%)", animationDelay: "2s" }} />
          <div className="absolute top-[30%] left-[5%] w-[250px] h-[250px] rounded-full blur-[120px] pointer-events-none orb-pulse"
               style={{ background: "radial-gradient(circle, rgba(91,53,232,0.2), transparent 70%)", animationDelay: "1s" }} />

          <div className="relative z-10 flex flex-col items-center gap-7 max-w-3xl">
            <span className="animate-scale-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-shimmer text-white text-xs font-semibold tracking-wide shadow-lg">
              <Sparkles size={13} />
              {IS_LIVE ? "Free to start — no credit card" : "Coming Soon — Join the waitlist"}
            </span>

            {/* H1 — primary keyword in first 6 words */}
            <h1 className="animate-fade-up text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.08] tracking-tight">
              Smart scheduling links<br />
              <span className="text-gradient-brand">without the chaos</span>
            </h1>

            {/* LSI-rich subheadline */}
            <p className="animate-fade-up delay-200 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Share a booking link, let clients self-schedule from your real-time availability, and get a Google Meet event created automatically. The{" "}
              <strong className="text-[var(--text-primary)] font-semibold">free Calendly alternative</strong>{" "}
              built for founders, freelancers, and remote teams.
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

            {/* Hero CTA */}
            <div className="animate-fade-up delay-400 w-full max-w-md">
              {IS_LIVE ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <Zap size={15} />
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--accent)] transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <WaitlistForm />
                  <p className="text-xs text-[var(--text-secondary)] mt-3">
                    Be the first to know when we launch. No spam, ever.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Scroll indicator */}
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
            {/* H2 — secondary keyword */}
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Everything you need.{" "}
              <span className="text-gradient-brand">Nothing you don't.</span>
            </h2>
            <p className="text-[var(--text-secondary)] mt-3 text-base max-w-xl mx-auto">
              One-time booking links. Permanent scheduling pages. Google Calendar sync. Booking analytics. Webhooks. API keys. All free.
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
                {/* H3 inside feature card */}
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">{title}</h3>
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
              {/* H2 — long-tail keyword: "schedule a meeting without back and forth" */}
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                Eliminate the back-and-forth in 3 steps
              </h2>
              <p className="text-[var(--text-secondary)] mt-3 text-base max-w-lg mx-auto">
                Share your availability link. Guest self-schedules. Google Meet event is created automatically. Done.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
              <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-[var(--border-accent)] to-transparent" />
              {STEPS.map(({ Icon, n, title, desc }, i) => (
                <div key={n} className="animate-fade-up flex flex-col items-center text-center gap-4" style={{ animationDelay: `${0.15 * i}s` }}>
                  <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-[rgba(59,106,232,0.3)] animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
                    <Icon size={28} className="text-white" strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-[var(--accent)] uppercase">{n}</span>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">{title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 py-24 max-w-3xl mx-auto w-full">
          <div className="text-center mb-12 animate-fade-up">
            <p className="text-xs font-semibold tracking-widest text-[var(--accent)] uppercase mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Frequently asked questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map(({ q, a }, i) => (
              <details
                key={q}
                className="animate-fade-up bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl group overflow-hidden"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                  <span>{q}</span>
                  <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="relative px-6 py-28 flex flex-col items-center gap-7 text-center overflow-hidden border-t border-[var(--border)]">
          <div className="absolute inset-0 pointer-events-none orb-pulse"
               style={{ background: "radial-gradient(ellipse at center, rgba(91,53,232,0.08) 0%, transparent 70%)" }} />
          <div className="relative z-10 flex flex-col items-center gap-7 max-w-xl animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-semibold">
              <Sparkles size={13} />
              {IS_LIVE ? "Free to start" : "Limited early access"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Start scheduling in{" "}
              <span className="text-gradient-brand">under 2 minutes</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed">
              {IS_LIVE
                ? "Create your free DraftMeet account and send your first booking link in under 2 minutes — no credit card required."
                : "Join the waitlist and be the first to get free early access to DraftMeet — the scheduling tool that eliminates back-and-forth for good."}
            </p>
            <div className="w-full max-w-md">
              {IS_LIVE ? (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-gradient text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Zap size={15} />
                  Create free account
                </Link>
              ) : (
                <WaitlistForm />
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="px-6 py-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <Image src="/logo-light.png" alt="DraftMeet" width={20} height={20} className="logo-light rounded" />
            <Image src="/logo-dark.png"  alt="DraftMeet" width={20} height={20} className="logo-dark  rounded" />
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
    </>
  );
}
