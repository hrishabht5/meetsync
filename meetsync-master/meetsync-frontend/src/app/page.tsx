import Link from "next/link";
import { ThemeToggle } from "@/components/themeToggle";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata = {
  title: "DraftMeet — Coming Soon | Smart Scheduling",
  description: "DraftMeet is a smart scheduling platform with one-time booking links, Google Calendar sync, and instant Google Meet creation. Join the waitlist.",
  openGraph: {
    title: "DraftMeet — Coming Soon",
    description: "Smart scheduling with one-time booking links and Google Meet. Join the waitlist.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DraftMeet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet — Coming Soon",
    description: "Smart scheduling with one-time booking links and Google Meet. Join the waitlist.",
    images: ["/og-image.png"],
  },
};

const FEATURES = [
  { icon: "🔗", title: "One-Time Booking Links", desc: "Each link expires after a single use — zero double-bookings, ever." },
  { icon: "🔁", title: "Permanent Booking Pages", desc: "A reusable page at your own slug — share it everywhere." },
  { icon: "📅", title: "Google Calendar Sync", desc: "Auto-creates Google Meet events the moment a booking is confirmed." },
  { icon: "🕐", title: "Availability Management", desc: "Set working hours, buffer times, and custom date overrides." },
  { icon: "📊", title: "Booking Analytics", desc: "Track trends, cancellation rates, and your top event types." },
  { icon: "🔔", title: "Webhooks", desc: "Real-time POST notifications on every booking event." },
  { icon: "🔑", title: "API Keys", desc: "Integrate DraftMeet into your own products via REST API." },
  { icon: "💬", title: "Custom Questions", desc: "Collect exactly the info you need with per-link custom fields." },
];

const STEPS = [
  { n: "1", title: "Create a link", desc: "Generate a one-time or permanent booking link in seconds." },
  { n: "2", title: "Guest books a slot", desc: "They pick from your available times — no account needed." },
  { n: "3", title: "Meeting created", desc: "Google Meet link lands in both inboxes automatically." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-page-gradient overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-page)]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo-light.png" alt="DraftMeet" className="logo-light w-8 h-8 rounded-lg" />
          <img src="/logo-dark.png" alt="DraftMeet" className="logo-dark w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </div>
        <ThemeToggle compact />
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 gap-8 min-h-[90vh]">
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(91,53,232,0.6) 0%, rgba(59,106,232,0.3) 40%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full blur-[120px] opacity-15 pointer-events-none"
             style={{ background: "radial-gradient(circle, #38BFFF, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold tracking-wide shadow-lg">
            🚀 Coming Soon
          </span>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-[var(--text-primary)] leading-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the back-and-forth</span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
            DraftMeet turns your availability into a shareable booking link. Guests pick a slot, a Google Meet is created instantly — no accounts, no friction.
          </p>

          {/* Waitlist form */}
          <div className="w-full max-w-md">
            <WaitlistForm />
            <p className="text-xs text-[var(--text-secondary)] mt-3">
              Be the first to know when we launch. No spam, ever.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Everything you need to schedule smarter</h2>
          <p className="text-[var(--text-secondary)] mt-3 text-base">Built for founders, freelancers, and teams who value their time.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 text-left card-glow-hover">
              <div className="text-3xl mb-3">{f.icon}</div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{f.title}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-20 bg-[var(--bg-card)]/30 border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {s.n}
                </div>
                <p className="font-semibold text-[var(--text-primary)]">{s.title}</p>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 py-20 flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">Get early access</h2>
        <p className="text-[var(--text-secondary)] max-w-md">Join the waitlist and be the first to try DraftMeet when we open the doors.</p>
        <div className="w-full max-w-md">
          <WaitlistForm />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs max-w-6xl mx-auto w-full">
        <p>© {new Date().getFullYear()} DraftMeet. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </main>
  );
}
