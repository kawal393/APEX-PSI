#!/usr/bin/env node
/**
 * make-psi-seal-fixture.mjs — writes ONE canonical signed PSI-SEAL/1 envelope
 * to test/fixtures/psi-seal-envelope.json.
 *
 * Why this exists: the drop-in promises a developer that one line installs a
 * verifier that answers a real question. A promise like that needs a document
 * a stranger can verify, and the npm tarball ships no fixture. So the estate
 * publishes one canonical envelope, with the public key that signed it, and
 * the drop-in check verifies it with the PUBLISHED npm and PyPI packages.
 *
 * The key pair here is generated once and frozen into the fixture. It is a
 * test key: it signs nothing that matters, and its private half is published
 * here on purpose so anyone can re-derive the envelope byte for byte.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { psiLeaf, psiSchemaDigest, psiSealHash, PSI_SCHEMA_ID } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const hex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s) =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));

const CONTENT = "APEX PSI canonical drop-in vector: the receipt says this text existed at this time.";
const SEALED_AT = "2026-11-15T06:00:00.000Z";

const { publicKey, privateKey } = await crypto.subtle.generateKey("ED25519", true, ["sign", "verify"]);
const publicKeyHex = hex(new Uint8Array(await crypto.subtle.exportKey("raw", publicKey)));
const privateKeyHex = hex(new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey)));
const privateKeySeed = privateKeyHex.slice(-64); // the last 32 bytes are the Ed25519 seed

const envelope = {
  schema: PSI_SCHEMA_ID,
  schema_digest: await psiSchemaDigest(),
  sealed_at: SEALED_AT,
  subject: { name: "apex-psi-drop-in-vector.txt", size_bytes: new TextEncoder().encode(CONTENT).length },
  hash: await sha(CONTENT),
  merkle: { leaf: await psiLeaf(await sha(CONTENT)) },
};
const sealHash = await psiSealHash(envelope);
const sig = new Uint8Array(
  await crypto.subtle.sign("ED25519", privateKey, new TextEncoder().encode(sealHash)),
);
envelope.signature = { alg: "Ed25519", value: hex(sig), seal_hash: sealHash };

const fixture = {
  note:
    "A canonical signed PSI-SEAL/1 envelope, published so that anyone can check that an " +
    "installed verifier answers a real question. The key pair below is a test key and is " +
    "published on purpose: the private half is the Ed25519 seed, so anyone can re-sign this " +
    "envelope and get the same bytes.",
  content: CONTENT,
  public_key: publicKeyHex,
  private_key_seed: privateKeySeed,
  envelope,
};

const out = join(here, "..", "test", "fixtures", "psi-seal-envelope.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
console.log("wrote", out);
console.log("seal_hash:", sealHash);
console.log("public key:", publicKeyHex);
