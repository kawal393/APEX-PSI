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

// Client-side ephemeral hybrid signing (for demos / self-sealed docs).
// Production receipts should call the server hybrid signer where the
// long-lived ML-DSA private key lives.
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
