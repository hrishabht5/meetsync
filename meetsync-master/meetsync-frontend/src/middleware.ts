import { NextRequest, NextResponse } from "next/server";

// Hostnames that show ONLY the public landing page (no product access)
const PUBLIC_ONLY_HOSTS = ["www.draftmeet.com", "draftmeet.com"];

// Routes that are allowed on public-only hosts
const PUBLIC_ALLOWED = ["/", "/privacy", "/terms"];
const PUBLIC_ALLOWED_PREFIXES = ["/_next/", "/favicon", "/logo", "/og-image", "/api/waitlist", "/robots", "/sitemap", "/_vercel"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  const isPublicOnlyHost = PUBLIC_ONLY_HOSTS.some((h) => host === h || host.startsWith(h));

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
