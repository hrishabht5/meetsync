import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/themeToggle";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password — DraftMeet",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-page-gradient">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle compact />
      </div>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(91,53,232,0.5) 0%, rgba(59,106,232,0.3) 40%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full gap-8">
        <Link href="/login" className="flex items-center gap-3">
          <Image src="/logo-light.png" alt="DraftMeet" width={36} height={36} className="logo-light rounded-xl glow-brand-sm" priority />
          <Image src="/logo-dark.png"  alt="DraftMeet" width={36} height={36} className="logo-dark  rounded-xl glow-brand-sm" />
          <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
        </Link>

        <div className="w-full">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
