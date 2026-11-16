// Trust anchor — the published anchor bytes, handed out with the header a
// cross-origin browser needs.
//
// The anchor lives at /.well-known/apex-psi-trust-anchor.json on this site.
// That path is served by the static host, which sends no
// Access-Control-Allow-Origin: measured 17 November 2026, the cross-origin GET
// and its OPTIONS preflight both come back with no ACAO, so a browser on
// another origin cannot read the anchor at all. A verifier that depends on
// that fetch fails closed on every visit, for a reason that has nothing to do
// with the signature.
//
// So this function fetches the same bytes server side — where CORS does not
// apply — and returns them with the header a browser needs.
//
// The bytes are not restated here. One source of truth: the published file.
// If that fetch fails, this answers 502 with a JSON body. It never serves a
// substitute anchor, because a second copy of a trust anchor is a second
// thing to trust.
//
// GET  /trust-anchor          -> the anchor document, with CORS
// HEAD /trust-anchor          -> the same headers, no body
// OPTIONS /trust-anchor       -> 204, CORS preflight

const CANONICAL_ANCHOR_URL = "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json";
const UPSTREAM_TIMEOUT_MS = 8000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, origin, authorization",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "x-content-sha256, x-trust-anchor-source, etag, last-modified",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// An anchor without a published key is not an anchor. Refuse to pass one on
// rather than hand a stranger a document that cannot verify anything.
function isAnchorDocument(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  return typeof doc.ed25519_public_key === "string" && doc.ed25519_public_key.length >= 32;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD, OPTIONS" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(CANONICAL_ANCHOR_URL, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    return json(
      {
        error: "The published trust anchor could not be reached.",
        canonical_url: CANONICAL_ANCHOR_URL,
        note: "This function serves the published anchor; it does not keep a copy of it.",
      },
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return json(
      {
        error: `The published trust anchor answered ${upstream.status}.`,
        canonical_url: CANONICAL_ANCHOR_URL,
      },
      502,
    );
  }

  const body = await upstream.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return json(
      { error: "The published trust anchor is not valid JSON.", canonical_url: CANONICAL_ANCHOR_URL },
      502,
    );
  }
  if (!isAnchorDocument(parsed)) {
    return json(
      { error: "The published trust anchor carries no public key.", canonical_url: CANONICAL_ANCHOR_URL },
      502,
    );
  }

  const digest = await sha256Hex(body);
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    "X-Content-SHA256": digest,
    "X-Trust-Anchor-Source": CANONICAL_ANCHOR_URL,
  };
  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) headers["Last-Modified"] = lastModified;
  const etag = upstream.headers.get("etag");
  if (etag) headers["ETag"] = etag;

  return new Response(req.method === "HEAD" ? null : body, { status: 200, headers });
});
