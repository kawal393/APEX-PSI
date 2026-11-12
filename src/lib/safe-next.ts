/**
 * Where to send someone after sign-in. Only same-site paths are accepted:
 * absolute URLs, protocol-relative "//host", backslash forms such as "/\host",
 * and control characters all fall back, so a crafted link can never
 * redirect a visitor to another site.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || typeof raw !== "string" || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const base = "https://apex.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
