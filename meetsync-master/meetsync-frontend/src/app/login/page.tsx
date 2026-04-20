import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthCard } from "@/components/AuthCard";
import { ThemeToggle } from "@/components/themeToggle";

export const metadata = {
  title: "Log In — DraftMeet",
};

export default function LoginPage() {
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
          <Image src="/logo-light.png" alt="DraftMeet" width={40} height={40} className="logo-light rounded-xl glow-brand-sm" priority />
          <Image src="/logo-dark.png"  alt="DraftMeet" width={40} height={40} className="logo-dark  rounded-xl glow-brand-sm" />
          <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight">
            Schedule meetings<br />
            <span className="text-gradient-brand">without the back-and-forth</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. No accounts. No friction.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <Suspense>
            <AuthCard />
          </Suspense>
        </div>

        <footer className="w-full mt-16 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs">
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
