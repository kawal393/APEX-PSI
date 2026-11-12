// Outbound fetch for user-supplied URLs. Refuses anything that resolves to a
// private, loopback, link-local, metadata or otherwise internal address, only
// allows http(s) on default ports, and re-checks every redirect hop.

const BLOCKED_HOST_SUFFIXES = [".internal", ".local", ".localhost", ".lan", ".home", ".corp", ".intranet"];

function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  if (p.some((x) => x > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function inCidr(ip: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base)!;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((ip & mask) >>> 0) === ((b & mask) >>> 0);
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

export function isBlockedIp(ip: string): boolean {
  const addr = ip.replace(/^\[|\]$/g, "").toLowerCase();
  const v4 = ipv4ToInt(addr);
  if (v4 !== null) return V4_BLOCKS.some(([b, n]) => inCidr(v4, b, n));
  if (!addr.includes(":")) return true; // not an IP we understand
  if (addr === "::" || addr === "::1") return true;
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIp(mapped[1]);
  if (/^::ffff:/.test(addr)) return true;
  if (/^(fc|fd)/.test(addr)) return true;          // unique local
  if (/^fe[89ab]/.test(addr)) return true;          // link-local
  if (/^ff/.test(addr)) return true;                // multicast
  if (/^64:ff9b:/.test(addr)) return true;          // NAT64
  if (/^2001:db8:/.test(addr)) return true;         // documentation
  return false;
}

async function resolveAll(host: string): Promise<string[]> {
  const out: string[] = [];
  let resolved = false;
  for (const type of ["A", "AAAA"] as const) {
    try {
      // deno-lint-ignore no-explicit-any
      const recs = await (Deno as any).resolveDns(host, type);
      resolved = true;
      out.push(...recs);
    } catch {
      /* fall through to DNS-over-HTTPS */
    }
  }
  if (resolved) return out;
  for (const type of ["A", "AAAA"]) {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) throw new Error("dns_unavailable");
    const j = await r.json();
    for (const a of j?.Answer ?? []) {
      if ((type === "A" && a.type === 1) || (type === "AAAA" && a.type === 28)) out.push(String(a.data));
    }
  }
  return out;
}

export class UnsafeUrlError extends Error {}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new UnsafeUrlError("Only http(s) URLs are allowed");
  if (u.username || u.password) throw new UnsafeUrlError("Credentials in URLs are not allowed");
  if (u.port && !((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80"))) {
    throw new UnsafeUrlError("Only default ports are allowed");
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s)) || !host.includes(".") && !host.includes(":")) {
    throw new UnsafeUrlError("Refusing to fetch private address");
  }
  const literal = host.replace(/^\[|\]$/g, "");
  if (ipv4ToInt(literal) !== null || literal.includes(":")) {
    if (isBlockedIp(literal)) throw new UnsafeUrlError("Refusing to fetch private address");
    return u;
  }
  let addrs: string[];
  try {
    addrs = await resolveAll(host);
  } catch {
    throw new UnsafeUrlError("Could not resolve host");
  }
  if (addrs.length === 0) throw new UnsafeUrlError("Could not resolve host");
  if (addrs.some(isBlockedIp)) throw new UnsafeUrlError("Refusing to fetch private address");
  return u;
}

export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 3): Promise<Response> {
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertPublicUrl(current);
    const res = await fetch(u.toString(), { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel();
      current = new URL(res.headers.get("location")!, u).toString();
      continue;
    }
    return res;
  }
  throw new UnsafeUrlError("Too many redirects");
}
