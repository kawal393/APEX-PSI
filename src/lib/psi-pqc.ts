// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Post-Quantum Hybrid Signatures
// ML-DSA-65 (NIST FIPS 204, Dilithium3) + Ed25519 (classical) = defense-in-depth
// A receipt is "quantum-verified" iff BOTH signatures verify.
// If a cryptographically-relevant quantum computer breaks Ed25519, ML-DSA holds.
// If ML-DSA has a classical flaw, Ed25519 holds.
// ═══════════════════════════════════════════════════════════════════════
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import * as ed from "@noble/ed25519";

export const PQC_ALGO = "ML-DSA-65";
export const PQC_STANDARD = "NIST FIPS 204 (Aug 2024)";
export const HYBRID_SUITE = "Ed25519+ML-DSA-65";

function hex(b: Uint8Array) {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function unhex(h: string) {
  const clean = h.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export interface HybridSignature {
  suite: typeof HYBRID_SUITE;
  ed25519: { sig: string; pk: string };
  mldsa65: { sig: string; pk: string };
  message_hash: string;
  signed_at: string;
}

export async function hybridVerify(
  message: string | Uint8Array,
  sig: HybridSignature
): Promise<{ ok: boolean; ed25519_ok: boolean; mldsa_ok: boolean }> {
  const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
  let ed_ok = false;
  let ml_ok = false;
  try {
    ed_ok = await ed.verifyAsync(unhex(sig.ed25519.sig), msg, unhex(sig.ed25519.pk));
  } catch { ed_ok = false; }
  try {
    ml_ok = ml_dsa65.verify(unhex(sig.mldsa65.sig), msg, unhex(sig.mldsa65.pk));
  } catch { ml_ok = false; }
  return { ok: ed_ok && ml_ok, ed25519_ok: ed_ok, mldsa_ok: ml_ok };
}

// ── Institutional identity ─────────────────────────────────────────────
// The published trust anchor holds the PUBLIC half of the long-lived APEX PSI
// signing identity. Fetch it once; every APEX-sealed file can then be verified
// offline, forever, without contacting APEX.
export const ISSUER_ID = "urn:apex-psi:issuer:root-1";
export const TRUST_ANCHOR_URL =
  "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json";

export interface TrustAnchor {
  spec: string;
  issuer: string;
  issuer_name: string;
  suite: string;
  ed25519_public_key: string;
  mldsa65_public_key: string;
  valid_from: string;
  trust_anchor_url: string;
}

let anchorCache: TrustAnchor | null = null;

/** Load the published trust anchor (local mirror first, then the signer). */
export async function loadTrustAnchor(): Promise<TrustAnchor | null> {
  if (anchorCache) return anchorCache;
  const sources = [
    "/.well-known/apex-psi-trust-anchor.json",
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pqc-sign`,
  ];
  for (const url of sources) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = (await r.json()) as TrustAnchor;
      if (j?.ed25519_public_key && j?.mldsa65_public_key) {
        anchorCache = j;
        return j;
      }
    } catch { /* try next source */ }
  }
  return null;
}

/**
 * Check whether a signature was produced by the published institutional
 * identity — i.e. whether the file is ATTRIBUTABLE to APEX PSI, not merely
 * internally consistent.
 */
export async function isInstitutionalSignature(sig: HybridSignature): Promise<boolean> {
  const anchor = await loadTrustAnchor();
  if (!anchor) return false;
  return (
    sig.ed25519.pk.toLowerCase() === anchor.ed25519_public_key.toLowerCase() &&
    sig.mldsa65.pk.toLowerCase() === anchor.mldsa65_public_key.toLowerCase()
  );
}

/**
 * Sign with the institutional identity. The private keys never leave the
 * server; only the canonical claim is sent.
 */
export async function hybridSignInstitutional(message: string): Promise<HybridSignature> {
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pqc-sign`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!r.ok) throw new Error(`institutional signer unavailable (HTTP ${r.status})`);
  const j = await r.json();
  if (!j?.ed25519?.sig || !j?.mldsa65?.sig) throw new Error("institutional signer returned no signature");
  return {
    suite: HYBRID_SUITE,
    ed25519: j.ed25519,
    mldsa65: j.mldsa65,
    message_hash: j.message_hash,
    signed_at: j.signed_at,
  };
}

// Client-side ephemeral hybrid signing ("self seal").
// Proves INTEGRITY only — the keypair is random and discarded, so the seal is
// NOT attributable to any identity. Use for offline / privacy-preserving seals.
export async function hybridSignEphemeral(message: string | Uint8Array): Promise<HybridSignature> {
  const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
  const edPriv = ed.utils.randomSecretKey();
  const edPub = await ed.getPublicKeyAsync(edPriv);
  const edSig = await ed.signAsync(msg, edPriv);

  const seed = crypto.getRandomValues(new Uint8Array(32));
  const ml = ml_dsa65.keygen(seed);
  const mlSig = ml_dsa65.sign(msg, ml.secretKey);

  const digest = await crypto.subtle.digest("SHA-256", msg as BufferSource);
  return {
    suite: HYBRID_SUITE,
    ed25519: { sig: hex(edSig), pk: hex(edPub) },
    mldsa65: { sig: hex(mlSig), pk: hex(ml.publicKey) },
    message_hash: hex(new Uint8Array(digest)),
    signed_at: new Date().toISOString(),
  };
}

export { hex as bytesToHex, unhex as hexToBytes };

