/**
 * Server-side proxy helpers for custom-domain booking pages.
 * When a guest visits a custom domain the browser origin is that domain,
 * so direct calls to api.draftmeet.com would fail CORS. These helpers
 * route through the Next.js /api/public/[...path] route handler instead.
 */

async function proxyRequest<T>(path: string, init?: RequestInit, qs = ""): Promise<T> {
  const url = `/api/public/${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function publicGet<T>(path: string, qs = ""): Promise<T> {
  return proxyRequest<T>(path, undefined, qs);
}

export function publicPost<T>(path: string, body: unknown): Promise<T> {
  return proxyRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
