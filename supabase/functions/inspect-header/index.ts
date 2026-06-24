// Inspect any URL for a Compliance-Receipt header.
// Server-side fetch, header parsing, optional Ed25519 signature verification
// against the issuer's /.well-known/compliance-receipt descriptor.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ParsedHeader = {
  v?: string;
  rid?: string;
  pred?: string;
  status?: string;
  sig?: string;
  anchor?: string;
  verify?: string;
};

// Simple per-IP rate limit (in-memory, soft).
const ipHits = new Map<string, { count: number; reset: number }>();
const RL_LIMIT = 30;
const RL_WINDOW_MS = 60_000;
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipHits.get(ip);
  if (!bucket || bucket.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= RL_LIMIT;
}

function parseHeader(raw: string): ParsedHeader {
  const out: ParsedHeader = {};
  // Split top-level by ";", preserving "=" with possible "=" in base64 sig
  const parts = raw.split(/\s*;\s*/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim().toLowerCase();
    const v = p.slice(idx + 1).trim();
    if (k in out || ["v", "rid", "pred", "status", "sig", "anchor", "verify"].includes(k)) {
      (out as any)[k] = v;
    }
  }
  return out;
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(clean.padEnd(clean.length + ((4 - (clean.length % 4)) % 4), "="));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importEd25519Spki(pemOrB64: string): Promise<CryptoKey | null> {
  try {
    const b64 = pemOrB64.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
    const der = b64ToBytes(b64);
    return await crypto.subtle.importKey("spki", der, { name: "Ed25519" }, false, ["verify"]);
  } catch {
    return null;
  }
}

async function fetchWellKnown(issuerUrl: string): Promise<{ pem: string } | null> {
  try {
    const u = new URL(issuerUrl);
    const res = await fetch(`${u.origin}/.well-known/compliance-receipt`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const k = json?.public_keys?.[0];
    if (k?.pem) return { pem: k.pem };
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: "Provide a valid http(s) URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Block private/loopback
  try {
    const u = new URL(url);
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/i.test(u.hostname)) {
      return new Response(JSON.stringify({ error: "Refusing to fetch private address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let upstream: Response | null = null;
  try {
    upstream = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000), redirect: "follow" });
    if (!upstream.headers.get("compliance-receipt")) {
      // Some servers don't reflect on HEAD; try GET without consuming much.
      upstream = await fetch(url, { method: "GET", signal: AbortSignal.timeout(6000), redirect: "follow" });
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ url, has_header: false, error: `Fetch failed: ${(e as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const raw = upstream.headers.get("compliance-receipt");
  const status = upstream.status;

  if (!raw) {
    return new Response(
      JSON.stringify({ url, has_header: false, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const parsed = parseHeader(raw);

  let signature_verified = false;
  let issuer: string | undefined;
  if (parsed.sig && parsed.verify && parsed.rid) {
    try {
      const verifyUrl = new URL(parsed.verify);
      issuer = verifyUrl.origin;
      const wk = await fetchWellKnown(parsed.verify);
      if (wk) {
        const key = await importEd25519Spki(wk.pem);
        if (key) {
          const sigB64 = parsed.sig.replace(/^ed25519:/i, "");
          const sig = b64ToBytes(sigB64);
          const msg = new TextEncoder().encode(parsed.rid);
          signature_verified = await crypto.subtle.verify({ name: "Ed25519" }, key, sig, msg);
        }
      }
    } catch {
      // soft-fail; signature_verified stays false
    }
  }

  return new Response(
    JSON.stringify({
      url,
      status,
      has_header: true,
      header_raw: raw,
      parsed,
      signature_verified,
      issuer,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
