/**
 * R11.7 guard for the browser-side seal checker (added 7 Nov 2026).
 *
 * MEASURED 7 Nov 2026: the published verifier — npm 1.3.0 and PyPI 1.3.0
 * alike — reported a seal carrying a GENUINE Ed25519 signature over its
 * seal_hash, plus `pq_alg: "ML-DSA-65"` and a `pq_value` of 512 bytes of
 * random noise, as `conformant: true`, `signature_status: "verified"`,
 * `authentic: true`, zero failures.
 *
 * The cause is structural, not a typo: R10 hashes the envelope WITHOUT the
 * signature member, so the Ed25519 half of a hybrid seal never covers
 * `pq_value`. Every shipped verifier read those fields and acted on none.
 *
 * These tests fail if the site ever goes back to blessing that claim.
 */
import { describe, it, expect } from "vitest";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { verifySealConformance, buildSealEnvelope } from "@/lib/psi-schema";
import { postQuantumCheckers } from "@/lib/psi-post-quantum";
import type { SealTrustKey } from "@/lib/psi-trust-roots";

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

async function shaOf(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return hex(new Uint8Array(digest));
}

/** A conformant, genuinely Ed25519-signed seal, then a post-quantum claim bolted on. */
async function signedSeal() {
  const pair = (await crypto.subtle.generateKey("ED25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const publicKey = hex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const envelope = await buildSealEnvelope({
    name: "quarterly-report.pdf",
    size_bytes: 18,
    media_type: "application/pdf",
    hash: await shaOf("the auditor saw nothing"),
    tier: "commercial",
    accepted_at: "2026-11-07T00:00:00.000Z",
    sign: async (sealHashAscii: string) =>
      hex(new Uint8Array(await crypto.subtle.sign("ED25519", pair.privateKey, new TextEncoder().encode(sealHashAscii)))),
  });
  return { envelope, publicKey, trustRoots: [{ public_key: publicKey, key_id: "visitor-key" }] };
}

describe("a declared post-quantum signature must be checked before a seal is called signed", () => {
  it("a post-quantum claim nobody checked is unverifiable, not verified", async () => {
    const { envelope, trustRoots } = await signedSeal();
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_alg = "ML-DSA-65";
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_value = "ab".repeat(512);

    const result = await verifySealConformance(envelope, { trustRoots });
    expect(result.conformant).toBe(false);
    expect(result.signature_status).toBe("unverifiable");
    expect(result.authentic).toBe(false);
    expect(result.post_quantum_status).toBe("unverifiable");
    expect(result.failures.join("\n")).toMatch(/11\.11/);
  });

  it("a post-quantum claim that does not verify is invalid, not a warning", async () => {
    const { envelope, trustRoots } = await signedSeal();
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_alg = "ML-DSA-65";
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_value = "ab".repeat(512);

    const seed = crypto.getRandomValues(new Uint8Array(32));
    const ml = ml_dsa65.keygen(seed);
    const keys: SealTrustKey[] = [
      { kid: "test-mldsa65", public_key: hex(ml.publicKey), algorithm: "ML-DSA-65", signs: "test key" },
    ];

    const result = await verifySealConformance(envelope, { trustRoots, postQuantum: postQuantumCheckers(keys) });
    expect(result.conformant).toBe(false);
    expect(result.signature_status).toBe("invalid");
    expect(result.post_quantum_status).toBe("invalid");
    expect(result.failures.join("\n")).toMatch(/11\.12/);
  });

  it("a genuinely signed post-quantum half passes, and is reported as verified", async () => {
    const { envelope, trustRoots } = await signedSeal();
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const ml = ml_dsa65.keygen(seed);
    const pqValue = ml_dsa65.sign(new TextEncoder().encode(envelope.signature!.seal_hash), ml.secretKey);
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_alg = "ML-DSA-65";
    (envelope.signature as { pq_alg?: string; pq_value?: string }).pq_value = hex(pqValue);

    const keys: SealTrustKey[] = [
      { kid: "test-mldsa65", public_key: hex(ml.publicKey), algorithm: "ML-DSA-65", signs: "test key" },
    ];
    const result = await verifySealConformance(envelope, { trustRoots, postQuantum: postQuantumCheckers(keys) });
    expect(result.conformant).toBe(true);
    expect(result.signature_status).toBe("verified");
    expect(result.post_quantum_status).toBe("verified");
  });

  it("a seal that declares no post-quantum signature is unaffected", async () => {
    const { envelope, trustRoots } = await signedSeal();
    const result = await verifySealConformance(envelope, { trustRoots });
    expect(result.conformant).toBe(true);
    expect(result.signature_status).toBe("verified");
    expect(result.post_quantum_status).toBe("absent");
  });
});
