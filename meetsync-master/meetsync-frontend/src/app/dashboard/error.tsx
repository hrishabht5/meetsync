"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Something went wrong</h2>
      <button
        onClick={reset}
        className="px-4 py-2 bg-brand-gradient text-white rounded-xl text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
