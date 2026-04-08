import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { ThemeToggle } from "@/components/themeToggle";

export const metadata = {
  title: "Smart Scheduling — Share a Booking Link",
};

export default function HomePage() {
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

        {/* Headline — fully server-rendered and crawlable */}
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the back-and-forth</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. No accounts. No friction.
          </p>
        </div>

        {/* Auth CTA — client island */}
        <div className="w-full max-w-sm">
          <AuthCard />
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
