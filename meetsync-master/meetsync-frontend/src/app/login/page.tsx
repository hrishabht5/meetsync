import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { ThemeToggle } from "@/components/themeToggle";

export const metadata = {
  title: "Log In — DraftMeet",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-page-gradient">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle compact />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-30 pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(91,53,232,0.5) 0%, rgba(59,106,232,0.3) 40%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm gap-6 w-full">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="DraftMeet" className="w-9 h-9 rounded-xl glow-brand-sm" />
          <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </Link>

        <div className="w-full">
          <AuthCard />
        </div>
      </div>
    </main>
  );
}
