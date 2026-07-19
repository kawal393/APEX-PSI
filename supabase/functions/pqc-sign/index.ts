// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Post-Quantum Hybrid Signer (server)
// Signs an arbitrary message with BOTH Ed25519 and ML-DSA-65 (Dilithium3).
// Returns a self-contained HybridSignature JSON any client can verify.
// ═══════════════════════════════════════════════════════════════════════
import { ml_dsa65 } from "https://esm.sh/@noble/post-quantum@0.6.1/ml-dsa";
import * as ed from "https://esm.sh/@noble/ed25519@3.0.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return hex(new Uint8Array(buf));
}

// Deterministic seed from server secret → stable long-lived keypair.
// (For a real deployment, replace this with a KMS-held ML-DSA seed.)
async function serverSeed(kind: "ed25519" | "mldsa"): Promise<Uint8Array> {
  const src = Deno.env.get("APEX_LATTICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "psi-fallback";
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

    if (req.method === "GET") {
      return new Response(JSON.stringify({
        suite: "Ed25519+ML-DSA-65",
        standard: "NIST FIPS 204",
        ed25519_public_key: hex(edPub),
        mldsa65_public_key: hex(mlKeys.publicKey),
        pk_size_bytes: mlKeys.publicKey.length,
        sig_size_bytes_approx: 3309,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = (body?.message ?? "").toString();
    if (!message) return new Response(JSON.stringify({ error: "missing 'message'" }), { status: 400, headers: cors });
    if (message.length > 100_000) return new Response(JSON.stringify({ error: "message too large" }), { status: 400, headers: cors });

    const msgBytes = new TextEncoder().encode(message);
    const edSig = await ed.signAsync(msgBytes, edSeed);
    const mlSig = ml_dsa65.sign(mlKeys.secretKey, msgBytes);
    const digest = await crypto.subtle.digest("SHA-256", msgBytes);

    return new Response(JSON.stringify({
      suite: "Ed25519+ML-DSA-65",
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
