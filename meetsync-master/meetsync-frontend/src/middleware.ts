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

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // In live mode, allow everything through
  if (LAUNCH_MODE === "live") return NextResponse.next();

  // In waitlist mode, block product routes on the public domain
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
