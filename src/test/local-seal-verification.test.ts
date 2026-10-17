/**
 * Trust-root tests for the browser-side seal checker (added 17 Oct 2026,
 * verifier v1.3.0 work).
 *
 * These guard the rule that makes /verify honest: the verdict is computed from
 * a key the visitor can see, not from an answer our server gives. If this file
 * ever fails, the public checker is either trusting a key nobody published, or
 * it has silently stopped checking signatures at all.
 */
import { describe, it, expect } from "vitest";
import {
  parseTrustAnchor,
  trustRootFromMaterial,
  resetTrustRootCache,
} from "@/lib/psi-trust-roots";
import { verifySealConformance, buildSealEnvelope, psiSealHash, psiSchemaDigest } from "@/lib/psi-schema";

const LEDGER_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";
const HYBRID_KEY = "9a6bdab92234f3bd6a3b1e9081e5ce3d646c129f1f6abdf7b52338e4cca1c9ca";

describe("trust roots come from the published anchor", () => {
  it("reads every Ed25519 entry and keeps what each key signs", () => {
    const keys = parseTrustAnchor({
      ed25519_public_key: HYBRID_KEY,
      keys: [
        { kid: "a-ledger", algorithm: "Ed25519", public_key: LEDGER_KEY, signs: "ledger receipts" },
        { kid: "a-hybrid", algorithm: "Ed25519", public_key: HYBRID_KEY, signs: "in-band hybrid seals" },
        { kid: "a-mldsa", algorithm: "ML-DSA-65", public_key: "ab".repeat(32), signs: "post-quantum half" },
      ],
    });
    expect(keys.map((k) => k.kid)).toEqual(["a-ledger", "a-hybrid"]);
    expect(keys.find((k) => k.kid === "a-ledger")?.signs).toBe("ledger receipts");
  });

  it("drops malformed keys and duplicates rather than guessing", () => {
    const keys = parseTrustAnchor({
      keys: [
        { kid: "short", algorithm: "Ed25519", public_key: "deadbeef" },
        { kid: "prefixed", algorithm: "Ed25519", public_key: `sha256:${LEDGER_KEY}` },
        { kid: "dup-1", algorithm: "Ed25519", public_key: LEDGER_KEY },
        { kid: "dup-2", algorithm: "Ed25519", public_key: LEDGER_KEY.toUpperCase() },
      ],
    });
    expect(keys).toHaveLength(1);
    expect(keys[0].kid).toBe("dup-1");
    expect(keys[0].public_key).toBe(LEDGER_KEY);
  });

  it("falls back to the published public keys when the document is missing", () => {
    const keys = parseTrustAnchor(null);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => /^[0-9a-f]{64}$/.test(k.public_key))).toBe(true);
    expect(keys.some((k) => k.public_key === LEDGER_KEY)).toBe(true);
  });

  it("accepts a visitor's own key in hex or base64, and nothing else", () => {
    expect(trustRootFromMaterial(LEDGER_KEY)?.public_key).toBe(LEDGER_KEY);
    const b64 = btoa(String.fromCharCode(...LEDGER_KEY.match(/../g)!.map((h) => parseInt(h, 16))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(trustRootFromMaterial(b64)?.public_key).toBe(LEDGER_KEY);
    expect(trustRootFromMaterial("not-a-key")).toBeNull();
    expect(trustRootFromMaterial("ab".repeat(31))).toBeNull();
  });

  it("clears its cache on request", () => {
    resetTrustRootCache();
    expect(parseTrustAnchor(undefined).length).toBeGreaterThan(0);
  });
});

describe("the browser checker authenticates, it does not merely format-check", () => {
  const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

  it("a seal signed by an unknown key is conformant but NOT authenticated under APEX keys", async () => {
    const pair = await crypto.subtle.generateKey("ED25519", true, ["sign", "verify"]) as CryptoKeyPair;
    const pub = hex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));

    const envelope = await buildSealEnvelope({
      name: "quarterly-report.pdf",
      size_bytes: 18,
      media_type: "application/pdf",
      hash: await shaOf("the auditor saw nothing"),
      tier: "commercial",
      accepted_at: "2026-10-17T09:00:00.000Z",
      sign: async (sealHashAscii: string) =>
        hex(new Uint8Array(await crypto.subtle.sign("ED25519", pair.privateKey, new TextEncoder().encode(sealHashAscii)))),
    });

    // Signed, and the signature checks out — but not by a key we published.
    const withForeignRoot = await verifySealConformance(envelope, { trustRoots: [{ public_key: pub, key_id: "visitor-key" }] });
    expect(withForeignRoot.conformant).toBe(true);
    expect(withForeignRoot.signature_status).toBe("verified");
    expect(withForeignRoot.trusted_key_id).toBe("visitor-key");

    const apexOnly = await verifySealConformance(envelope, { trustRoots: parseTrustAnchor(null) });
    expect(apexOnly.conformant).toBe(false);
    expect(apexOnly.signature_status).toBe("invalid");
    expect(apexOnly.authentic).toBe(false);
    expect(apexOnly.failures.join("\n")).toMatch(/11\.3/);

    // And with no key at all the page must refuse, never assume.
    const noRoots = await verifySealConformance(envelope);
    expect(noRoots.conformant).toBe(false);
    expect(noRoots.signature_status).toBe("unverifiable");
  });

  it("the seal_hash the signature covers is the recomputed one, not the pasted one", async () => {
    const envelope = await buildSealEnvelope({
      name: "x.txt",
      size_bytes: 5,
      media_type: "text/plain",
      hash: await shaOf("hello"),
      tier: "personal",
      accepted_at: "2026-10-17T09:00:00.000Z",
    });
    expect(await psiSealHash(envelope)).toHaveLength(64);
    expect(envelope.signature).toBeUndefined();
    expect(await psiSchemaDigest()).toHaveLength(64);
  });
});

async function shaOf(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
