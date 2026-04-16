"use client";
import Link from "next/link";

export default function NotFound() {
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
      <p style={{ fontSize: "4rem", fontWeight: 700, color: "var(--accent, #3B6AE8)", marginBottom: "0.5rem" }}>
        404
      </p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text, #111827)", marginBottom: "0.75rem" }}>
        Page not found
      </h1>
      <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: "2rem", maxWidth: "360px" }}>
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.625rem 1.5rem",
          background: "var(--accent, #3B6AE8)",
          color: "#fff",
          borderRadius: "0.5rem",
          fontWeight: 600,
          fontSize: "0.875rem",
          textDecoration: "none",
        }}
      >
        Back to DraftMeet
      </Link>
    </main>
  );
}
