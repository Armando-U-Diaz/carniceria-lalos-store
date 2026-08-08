import "server-only";

export function isTrustedMutation(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const expectedHost = forwardedHost || request.headers.get("host") || requestUrl.host;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

export function exceedsContentLength(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const bytes = Number(value);
  return Number.isFinite(bytes) && bytes > maxBytes;
}
