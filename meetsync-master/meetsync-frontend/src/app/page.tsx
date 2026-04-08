import Link from "next/link";
import { ThemeToggle } from "@/components/themeToggle";
import { WaitlistForm } from "@/components/waitlistForm";

export const metadata = {
  title: "DraftMeet — Smart Scheduling, Coming Soon",
  description: "Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. Join the waitlist for free early access.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-page-gradient overflow-x-hidden">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <Link
          href="/login"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
        >
          Team Login
        </Link>
        <ThemeToggle compact />
      </div>

      {/* Glow orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(91,53,232,0.6) 0%, rgba(59,106,232,0.3) 45%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full blur-[110px] opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #38BFFF, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl gap-10 py-20">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="DraftMeet" className="w-11 h-11 rounded-xl glow-brand-sm" />
          <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-brand-gradient inline-block" />
          Currently in private beta — join the waitlist
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-5">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
            Meeting scheduling<br />
            <span className="text-gradient-brand">that just works</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
            Share a one-time booking link. Your guest picks a slot. Google Meet is created instantly — no back-and-forth, no accounts needed.
          </p>
        </div>

        {/* Waitlist CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <WaitlistForm />
          <p className="text-xs text-[var(--text-secondary)]">
            Free early access for waitlist members. No credit card required.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
          {[
            {
              icon: "🔗",
              title: "One-Time Links",
              desc: "Each link expires after a single use — no spam, no repeat bookings",
            },
            {
              icon: "📅",
              title: "Instant Google Meet",
              desc: "Calendar invite and Meet link generated the moment a slot is confirmed",
            },
            {
              icon: "⚡",
              title: "Zero Friction",
              desc: "Guests book without creating an account — just pick a time and done",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 text-left card-glow-hover"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{f.title}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Social proof placeholder */}
        <p className="text-[var(--text-secondary)] text-sm">
          Built for founders, freelancers, and teams who value their time.
        </p>

        {/* Footer */}
        <footer className="w-full pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs">
          <p>© {new Date().getFullYear()} DraftMeet. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
