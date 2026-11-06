// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — POST-QUANTUM CHECKERS FOR THE SEAL CHECKER (added 7 Nov 2026)
//
// WHY THIS FILE EXISTS. Measured 7 Nov 2026 against the published 1.3.0
// verifier (npm and PyPI alike): a seal carrying a GENUINE Ed25519 signature
// over its seal_hash, plus `pq_alg: "ML-DSA-65"` and a `pq_value` of 512
// bytes of random noise, was reported as `conformant: true`,
// `signature_status: "verified"`, `authentic: true`, zero failures.
//
// The cause is structural. R10 hashes the envelope WITHOUT the signature
// member, so the Ed25519 half of a hybrid seal never covers `pq_value`. Every
// shipped verifier READ those fields and acted on none of them.
//
// The verifier package therefore refuses to report a seal as verified while a
// declared post-quantum signature is unchecked (R11.7). It ships no
// post-quantum algorithm — it stays dependency-free — so the caller supplies
// the checker. This module is the browser's checker.
//
// A seal that declares an algorithm this page cannot check is reported
// `unverifiable`, never `verified`. That is the whole point.
// ═══════════════════════════════════════════════════════════════════════

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import type { PsiPostQuantumChecker } from "../../packages/psi-verifier/src/index";
import type { SealTrustKey } from "./psi-trust-roots";

export const ML_DSA_65 = "ML-DSA-65";

/** FIPS 204 lengths: ML-DSA-65 signature 3309 bytes, public key 1952 bytes. */
const ML_DSA_65_SIG_BYTES = 3309;
const ML_DSA_65_PK_BYTES = 1952;

function hexToBytes(h: string): Uint8Array | null {
  const clean = h.trim().toLowerCase();
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function fromBase64(text: string): Uint8Array | null {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Accepts hex or standard / URL-safe base64, and requires the exact byte length. */
function decodeMaterial(input: string, byteLength: number): Uint8Array | null {
  const t = input.trim();
  if (t.length === byteLength * 2 && /^[0-9a-fA-F]+$/.test(t)) return hexToBytes(t);
  const b = fromBase64(t);
  return b && b.length === byteLength ? b : null;
}

/**
 * An ML-DSA-65 checker over the published post-quantum key(s).
 *
 * The message is the ASCII `seal_hash` — the same bytes the Ed25519 half
 * signs — so a hybrid seal is one claim, not two unrelated ones.
 */
export function postQuantumCheckers(keys: readonly SealTrustKey[]): PsiPostQuantumChecker[] {
  const ml = keys.filter((k) => k.algorithm.toUpperCase() === ML_DSA_65);
  if (ml.length === 0) return [];
  return [
    {
      alg: ML_DSA_65,
      public_key: ml[0].public_key,
      verify(message: Uint8Array, signature: string, publicKey: string): boolean {
        const sig = decodeMaterial(signature, ML_DSA_65_SIG_BYTES);
        if (!sig) return false;
        const candidates = [publicKey, ...ml.map((k) => k.public_key)].filter(Boolean);
        for (const candidate of candidates) {
          const pk = decodeMaterial(candidate, ML_DSA_65_PK_BYTES);
          if (!pk) continue;
          try {
            if (ml_dsa65.verify(sig, message, pk)) return true;
          } catch {
            /* a key this implementation cannot use — try the next one */
          }
        }
        return false;
      },
    },
  ];
}
