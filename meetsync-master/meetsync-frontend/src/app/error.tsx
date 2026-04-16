"use client";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to console in dev; swap for a real error reporting service (e.g. Sentry) in prod.
    console.error("[DraftMeet error boundary]", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f5f3ff)",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-inter, sans-serif)",
      }}
    >
      <p style={{ fontSize: "3rem", fontWeight: 700, color: "var(--accent, #3B6AE8)", marginBottom: "0.5rem" }}>
        Something went wrong
      </p>
      <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: "2rem", maxWidth: "400px" }}>
        An unexpected error occurred. Our team has been notified. Please try again or return to the home page.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.5rem",
            background: "var(--accent, #3B6AE8)",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: "0.625rem 1.5rem",
            background: "transparent",
            color: "var(--accent, #3B6AE8)",
            border: "1px solid var(--accent, #3B6AE8)",
            borderRadius: "0.5rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          Go home
        </a>
      </div>
    </main>
  );
}
