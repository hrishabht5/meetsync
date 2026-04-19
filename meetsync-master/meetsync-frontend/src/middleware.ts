import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH MODE — controls whether draftmeet.com shows waitlist-only or full app
//
// To go live:
//   1. Set  LAUNCH_MODE=live  in Vercel environment variables
//   2. Redeploy — no code changes required
//
// Current default: "waitlist" (only the landing page + waitlist are accessible)
// ─────────────────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_ prefix ensures this is available in Edge middleware at runtime.
// Set NEXT_PUBLIC_LAUNCH_MODE=live in Vercel env vars to open the full app.
const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE ?? process.env.LAUNCH_MODE ?? "waitlist";

// Hostnames that enforce waitlist-only access when LAUNCH_MODE=waitlist
const PUBLIC_ONLY_HOSTS = ["www.draftmeet.com", "draftmeet.com"];

// Routes allowed in waitlist mode
const PUBLIC_ALLOWED = ["/", "/privacy", "/terms"];
const PUBLIC_ALLOWED_PREFIXES = [
  "/_next/",
  "/favicon",
  "/logo",
  "/og-image",
  "/api/waitlist",
  "/robots",
  "/sitemap",
  "/_vercel",
];

// Hostnames that are part of our own infrastructure (not custom user domains)
const MAIN_HOSTNAMES = new Set([
  "draftmeet.com",
  "www.draftmeet.com",
  "localhost",
]);

function isOwnHost(hostname: string): boolean {
  return (
    MAIN_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".localhost")
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip port for comparison
  const { pathname } = request.nextUrl;

  // ── Custom domain routing ──────────────────────────────────────────────────
  // If the request arrives on a hostname that is not our own infrastructure,
  // rewrite it to /cd/[domain]/[...rest] so the custom-domain booking pages
  // handle the resolution. The browser URL stays as the user's custom domain.
  // API routes and Next.js internals are excluded from rewriting.
  if (!isOwnHost(hostname) && !pathname.startsWith("/api/")) {
    const rest = pathname === "/" ? "" : pathname;
    const url = request.nextUrl.clone();
    url.pathname = `/cd/${hostname}${rest}`;
    return NextResponse.rewrite(url);
  }

  // ── Launch-mode gate (main domain only) ───────────────────────────────────
  if (LAUNCH_MODE === "live") return NextResponse.next();

  const isPublicOnlyHost = PUBLIC_ONLY_HOSTS.some(
    (h) => host === h || host.startsWith(h)
  );

  if (isPublicOnlyHost) {
    const isAllowed =
      PUBLIC_ALLOWED.includes(pathname) ||
      PUBLIC_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static files Next.js serves internally
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
