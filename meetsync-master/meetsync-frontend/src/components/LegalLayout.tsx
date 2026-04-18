"use client";

import Link from "next/link";

export interface Section {
  id: string;
  num: number;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  badge: string;
  lastUpdated: string;
  sections: Section[];
  otherPage: { href: string; label: string };
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  badge,
  lastUpdated,
  sections,
  otherPage,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-bg)" }}>

      {/* ── Sticky nav ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "color-mix(in srgb, var(--bg-card) 80%, transparent)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                background: "var(--gradient-brand)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}
            >
              DraftMeet
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link
              href={otherPage.href}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all px-3 py-1.5 rounded-lg text-[13px]"
              style={{ textDecoration: "none" }}
            >
              {otherPage.label}
            </Link>
            <Link
              href="/"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg text-[13px] font-semibold"
              style={{ textDecoration: "none" }}
            >
              ← Home
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "64px 24px 56px",
          textAlign: "center",
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--gradient-glow)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          {/* Badge pill */}
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "var(--gradient-brand)",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            {badge}
          </span>

          <h1
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* ── Body: TOC + Content ── */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Sticky TOC */}
        <aside
          style={{
            position: "sticky",
            top: 72,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 0",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              padding: "0 16px 10px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 8,
            }}
          >
            Contents
          </p>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-card-hover)] border-l-2 border-transparent hover:border-[var(--accent)] transition-all"
              style={{
                padding: "6px 16px",
                fontSize: 12.5,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "var(--gradient-brand)",
                  color: "#fff",
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.num}
              </span>
              <span style={{ lineHeight: 1.3 }}>{s.title}</span>
            </a>
          ))}
        </aside>

        {/* Content */}
        <article style={{ minWidth: 0 }}>{children}</article>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            © {new Date().getFullYear()} DraftMeet. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/terms" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>
              Privacy
            </Link>
            <Link href="/" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
              Back to DraftMeet →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Reusable section wrapper ── */
export function LegalSection({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        marginBottom: 40,
        scrollMarginTop: 80,
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--gradient-brand)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {num}
        </span>
        <h2
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>

      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 14.5,
          lineHeight: 1.75,
        }}
      >
        {children}
      </div>
    </section>
  );
}

/* ── Callout / highlight box ── */
export function Callout({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning" | "important";
}) {
  const colors: Record<typeof variant, { border: string; bg: string; dot: string }> = {
    info:      { border: "var(--accent)",      bg: "var(--accent-glow)",      dot: "var(--accent)" },
    warning:   { border: "var(--accent-warm)", bg: "var(--accent-warm-glow)", dot: "var(--accent-warm)" },
    important: { border: "var(--accent-cyan)", bg: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)", dot: "var(--accent-cyan)" },
  };
  const c = colors[variant];
  return (
    <div
      style={{
        borderLeft: `3px solid ${c.border}`,
        background: c.bg,
        borderRadius: "0 8px 8px 0",
        padding: "12px 16px",
        margin: "16px 0",
        fontSize: 13.5,
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Sub-section heading ── */
export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: "var(--text-primary)",
        marginTop: 20,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 4,
          height: 14,
          background: "var(--gradient-brand)",
          borderRadius: 2,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {children}
    </h3>
  );
}

/* ── Styled list ── */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
              marginTop: 7,
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
