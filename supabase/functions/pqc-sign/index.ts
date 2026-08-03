// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Institutional Hybrid Signer (server)
//
// This is the single institutional signing identity for APEX PSI.
// It holds a long-lived Ed25519 + ML-DSA-65 (NIST FIPS 204) keypair derived
// from a dedicated server-only seed, and signs canonical (RFC 8785) claims.
//
// The PUBLIC half of the identity is published as a trust anchor document:
//   GET  /functions/v1/pqc-sign            → trust anchor JSON
//   GET  https://<site>/.well-known/apex-psi-trust-anchor.json  (static mirror)
//
// A verifier fetches the anchor ONCE and can then verify every APEX-sealed
// file forever, offline, without contacting APEX again.
//
//   POST { message: "<canonical claim>" } → hybrid signature + issuer ref
// ═══════════════════════════════════════════════════════════════════════
import { ml_dsa65 } from "https://esm.sh/@noble/post-quantum@0.6.1/ml-dsa";
import * as ed from "https://esm.sh/@noble/ed25519@3.0.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

export const ISSUER_ID = "urn:apex-psi:issuer:root-1";
export const ISSUER_NAME = "APEX PSI — Proof of Stateful Integrity";
const SITE = "https://ai-governance-standard.com";
const ANCHOR_URL = `${SITE}/.well-known/apex-psi-trust-anchor.json`;
const VALID_FROM = "2026-01-01T00:00:00Z";

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return hex(new Uint8Array(buf));
}

// Deterministic seed from a DEDICATED server-only secret → stable long-lived
// keypair. APEX_PSI_SIGNING_SEED exists only for this purpose; the older
// fallbacks are kept so previously issued keys stay reproducible if the
// dedicated seed is ever unavailable.
async function serverSeed(kind: "ed25519" | "mldsa"): Promise<Uint8Array> {
  const src =
    Deno.env.get("APEX_PSI_SIGNING_SEED") ||
    Deno.env.get("APEX_LATTICE_KEY") ||
    "psi-fallback";
  const h = await sha256Hex(`APEX-PSI-PQC|${kind}|${src}`);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const edSeed = await serverSeed("ed25519");
    const mlSeed = await serverSeed("mldsa");
    const edPub = await ed.getPublicKeyAsync(edSeed);
    const mlKeys = ml_dsa65.keygen(mlSeed);

    const anchor = {
      spec: "PSI-TRUST-ANCHOR-v1",
      issuer: ISSUER_ID,
      issuer_name: ISSUER_NAME,
      suite: "Ed25519+ML-DSA-65",
      standards: ["RFC 8032", "NIST FIPS 204", "RFC 8785", "FIPS 180-4"],
      ed25519_public_key: hex(edPub),
      mldsa65_public_key: hex(mlKeys.publicKey),
      valid_from: VALID_FROM,
      canonicalization: "RFC 8785 (JCS)",
      spec_url: `${SITE}/inband`,
      verify_url: `${SITE}/verify`,
      trust_anchor_url: ANCHOR_URL,
      note:
        "Public half of the APEX PSI institutional signing identity. Files sealed by APEX PSI chain to this anchor. Fetch once, verify offline forever.",
    };

    if (req.method === "GET") {
      return new Response(JSON.stringify(anchor, null, 2), {
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = (body?.message ?? "").toString();
    if (!message) return new Response(JSON.stringify({ error: "missing 'message'" }), { status: 400, headers: cors });
    if (message.length > 200_000) return new Response(JSON.stringify({ error: "message too large" }), { status: 400, headers: cors });

    const msgBytes = new TextEncoder().encode(message);
    const edSig = await ed.signAsync(msgBytes, edSeed);
    const mlSig = ml_dsa65.sign(msgBytes, mlKeys.secretKey);
    const digest = await crypto.subtle.digest("SHA-256", msgBytes);

    return new Response(JSON.stringify({
      suite: "Ed25519+ML-DSA-65",
      issuer: ISSUER_ID,
      issuer_name: ISSUER_NAME,
      trust_anchor: ANCHOR_URL,
      ed25519: { sig: hex(edSig), pk: hex(edPub) },
      mldsa65: { sig: hex(mlSig), pk: hex(mlKeys.publicKey) },
      message_hash: hex(new Uint8Array(digest)),
      signed_at: new Date().toISOString(),
      standard: "NIST FIPS 204",
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "sign_failed" }), { status: 500, headers: cors });
  }
});
