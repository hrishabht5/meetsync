/**
 * Public API proxy — used exclusively by custom-domain booking pages.
 *
 * When a guest visits meet.johndoe.com their browser origin is that domain,
 * not draftmeet.com, so direct calls to api.draftmeet.com would be blocked
 * by the backend CORS policy.  This server-side proxy forwards the request
 * from the Next.js origin (same deployment as the custom domain) so no CORS
 * preflight is involved.
 *
 * Only public (unauthenticated) endpoints are forwarded here.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const joined = pathSegments.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND}/${joined}${qs}`;

  const init: RequestInit = { method: request.method };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    init.body = body;
    init.headers = { "Content-Type": "application/json" };
  }

  try {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: true, message: "Upstream request failed" }, { status: 502 });
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return proxy(request, path);
}
