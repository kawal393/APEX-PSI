import { describe, it, expect } from "vitest";
import * as V from "../../packages/psi-verifier/src/index";

async function makeSeal() {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pub = Array.from(new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = "b".repeat(64);
  const env: any = { schema: V.PSI_SCHEMA_ID, schema_digest: await V.psiSchemaDigest(), sealed_at: "2026-10-17T10:00:00.000Z", subject: { name: "x", size_bytes: 1 }, hash, merkle: { leaf: await V.psiLeaf(hash) } };
  const sh = await V.psiSealHash(env);
  const sig = new Uint8Array(await crypto.subtle.sign("Ed25519", kp.privateKey, new TextEncoder().encode(sh)));
  env.signature = { alg: "Ed25519", value: Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join(""), seal_hash: sh };
  return { env, pub };
}

describe("psi-verifier signature check", () => {
  it("accepts a genuinely signed seal", async () => {
    const { env, pub } = await makeSeal();
    expect((await V.verifySeal(env, pub)).conformant).toBe(true);
  });
  it("rejects a garbage signature", async () => {
    const { env, pub } = await makeSeal();
    env.signature.value = "00".repeat(64);
    expect((await V.verifySeal(env, pub)).conformant).toBe(false);
  });
  it("rejects a seal signed by a different key", async () => {
    const { env } = await makeSeal();
    expect((await V.verifySeal(env)).conformant).toBe(false);
  });
  it("rejects a seal with no signature", async () => {
    const { env, pub } = await makeSeal();
    delete env.signature;
    expect((await V.verifySeal(env, pub)).conformant).toBe(false);
  });
});
