// A signer must never issue a receipt under a key the public trust anchor does
// not list: such a receipt fails every independent check while looking valid.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLISHED_LEDGER_ED25519_KEYS, signEd25519Strict } from "./psi_core";

describe("published signing identity guard", () => {
  it("refuses to sign with a seed whose key the anchor does not list", async () => {
    await expect(signEd25519Strict("leaf", "not-the-published-seed")).rejects.toThrow(/not published/);
  });

  it("lists only keys the published trust anchor carries", () => {
    const anchor = JSON.parse(readFileSync("public/.well-known/apex-psi-trust-anchor.json", "utf8"));
    const listed = anchor.keys.map((k: { public_key: string }) => k.public_key);
    for (const key of PUBLISHED_LEDGER_ED25519_KEYS) expect(listed).toContain(key);
  });
});
