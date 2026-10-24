/**
 * Fail-closed proof-bundle and receipt verification (24 Oct 2026).
 * Each test is one rule: a forged, unsigned, re-keyed or altered bundle must
 * never come out VALID, and a genuine ledger receipt must.
 */
import { describe, it, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { verifyProofBundle, verifyLedgerReceipt, PINNED_LEDGER_KEYS } from "@/lib/proof-bundle-verify";
import { hashSHA256, MerkleTree } from "@/lib/engine-core";
import { verifyMerkleProof } from "@/lib/engine-core";

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

// A real receipt from the public ledger, signed by the pinned APEX key.
const REAL_ROW = {
  commit_id: "APEX-781D7EA7-5D4B",
  commit_hash: "de45a59bf5126a89c827630d0a533247c1a1da6bf4f9a9b3236e590a63a1630d",
  merkle_leaf_hash: "5ca3b7d056f79b2ec7d6fd9664d644c6388eb8e2fbcba236eccd2dea4843646d",
  ed25519_signature:
    "d66721073cc192abb52efdb2938961385578ebaf03c351e44f175a2a9cb6b3e4aaa8957cef024cc6c2df61b5e175ba5de6b1b89eea14837d660cd61fa30efa09",
};

async function makeBundle() {
  const priv = ed.utils.randomPrivateKey();
  const pub = hex(await ed.getPublicKeyAsync(priv));
  const action = "Approve loan application #4411";
  const predicateId = "EU-AI-ACT-ART-14";
  const timestamp = "2026-10-24T03:00:00.000Z";
  const commitId = "APEX-TEST0001-0001";
  const commitHash = await hashSHA256(`${action}|${predicateId}|${timestamp}`);
  const leaf = await hashSHA256(`${commitId}|${commitHash}`);
  const sibling = await hashSHA256("another leaf");
  const tree = new MerkleTree();
  await tree.initFromLeaves([leaf, sibling]);
  const bundle: Record<string, any> = {
    version: "1.0", protocol: "APEX-PSI", commitId, action, predicateId, timestamp, commitHash,
    merkleLeafHash: leaf, merkleProof: await tree.getProof(0), merkleRoot: await tree.getRoot(),
    ed25519Signature: hex(await ed.signAsync(new TextEncoder().encode(leaf), priv)),
    ed25519PublicKey: pub,
  };
  return { bundle, pub, priv };
}

describe("proof bundle verification is fail-closed", () => {
  it("accepts a genuine bundle signed by a pinned key", async () => {
    const { bundle, pub } = await makeBundle();
    const v = await verifyProofBundle(bundle, { trustedKeys: [pub] });
    expect(v.valid).toBe(true);
  });

  it("rejects a bundle with the signature removed", async () => {
    const { bundle, pub } = await makeBundle();
    delete bundle.ed25519Signature;
    const v = await verifyProofBundle(bundle, { trustedKeys: [pub] });
    expect(v.valid).toBe(false);
    expect(v.steps.at(-1)?.value).toMatch(/Missing Ed25519 signature/);
  });

  it("rejects an empty signature string", async () => {
    const { bundle, pub } = await makeBundle();
    bundle.ed25519Signature = "";
    expect((await verifyProofBundle(bundle, { trustedKeys: [pub] })).valid).toBe(false);
  });

  it("rejects attacker key substitution even when the signature is mathematically valid", async () => {
    const { bundle } = await makeBundle(); // signed by a key that is NOT pinned
    const v = await verifyProofBundle(bundle); // default: pinned APEX keys only
    expect(v.valid).toBe(false);
    expect(v.steps.at(-1)?.value).toMatch(/Untrusted signing key/);
  });

  it("rejects a foreign signature when the bundle omits its public key", async () => {
    const { bundle } = await makeBundle();
    delete bundle.ed25519PublicKey;
    expect((await verifyProofBundle(bundle)).valid).toBe(false);
  });

  it("rejects a forged payload carrying a legitimate signature", async () => {
    const { bundle, pub } = await makeBundle();
    bundle.action = "Approve loan application #9999";
    expect((await verifyProofBundle(bundle, { trustedKeys: [pub] })).valid).toBe(false);
  });

  it("rejects a forged payload even when the attacker also rewrites commitHash", async () => {
    const { bundle, pub } = await makeBundle();
    bundle.action = "Approve loan application #9999";
    bundle.commitHash = await hashSHA256(`${bundle.action}|${bundle.predicateId}|${bundle.timestamp}`);
    const v = await verifyProofBundle(bundle, { trustedKeys: [pub] });
    expect(v.valid).toBe(false);
    expect(v.steps.find((s) => s.label === "Verify Ed25519 Signature")?.status).toBe("fail");
  });

  it("rejects a mismatched Merkle root", async () => {
    const { bundle, pub } = await makeBundle();
    bundle.merkleRoot = "f".repeat(64);
    expect((await verifyProofBundle(bundle, { trustedKeys: [pub] })).valid).toBe(false);
  });

  it("rejects a declared leaf that differs from the recomputed leaf", async () => {
    const { bundle, pub } = await makeBundle();
    bundle.merkleLeafHash = "a".repeat(64);
    expect((await verifyProofBundle(bundle, { trustedKeys: [pub] })).valid).toBe(false);
  });

  it("rejects invalid JSON", async () => {
    expect((await verifyProofBundle("{not json")).valid).toBe(false);
  });

  it("pins only the APEX ledger key by default", () => {
    expect(PINNED_LEDGER_KEYS).toEqual(["59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"]);
  });
});

describe("receipt lookup verifies the signature, not just the row", () => {
  it("verifies a real public-ledger receipt under the pinned APEX key", async () => {
    const v = await verifyLedgerReceipt(REAL_ROW);
    expect(v.verified).toBe(true);
    expect(v.signatureValid).toBe(true);
  });

  it("rejects a ledger row whose signature was altered", async () => {
    const v = await verifyLedgerReceipt({ ...REAL_ROW, ed25519_signature: "00".repeat(64) });
    expect(v.verified).toBe(false);
  });

  it("rejects a ledger row with no signature", async () => {
    expect((await verifyLedgerReceipt({ ...REAL_ROW, ed25519_signature: null })).verified).toBe(false);
  });

  it("rejects a ledger row whose commit hash was altered", async () => {
    expect((await verifyLedgerReceipt({ ...REAL_ROW, commit_hash: "1".repeat(64) })).verified).toBe(false);
  });
});

describe("engine inclusion proofs", () => {
  it("odd-sized trees produce proofs that reach the root for every leaf", async () => {
    const leaves = await Promise.all(["a", "b", "c", "d", "e"].map((x) => hashSHA256(x)));
    const tree = new MerkleTree();
    await tree.initFromLeaves(leaves);
    const root = await tree.getRoot();
    for (let i = 0; i < leaves.length; i++) {
      expect(await verifyMerkleProof(leaves[i], await tree.getProof(i), root)).toBe(true);
    }
  });
});
