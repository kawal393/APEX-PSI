// Derive the PUBLIC half of our institutional Ed25519 identity.
//
// The live signing code derives its key from a seed string:
//   supabase/functions/_shared/psi_core.ts
//     institutionalSigningSeed()  ->  APEX_PSI_ED25519_SEED, else the service_role key
//     signEd25519Strict(data, seed) -> seed = SHA-256("APEX-SIGNING-KEY-" + seed)
//
// The published trust anchor holds only the public half. To publish a new anchor
// you need the matching public key, and the only safe way to get it is to derive
// it from the same seed the functions use — on the operator's own machine.
//
// ROTATION ORDER (no window in which a receipt cannot be verified):
//   1. Set APEX_PSI_ED25519_SEED in Supabase secrets. Setting a secret restarts
//      the functions, so the new key is live from this moment.
//   2. Run this script and publish BOTH public keys in the anchor's keys[] — the
//      old one and the new one. The verifier tries every Ed25519 key the anchor
//      lists, so receipts signed before and after the rotation both verify.
//   3. Only then mark the old key "rotated" in the anchor, once no live signature
//      is being made with it.
//
// The seed is read from APEX_PSI_ED25519_SEED (env) or from the vault entry
// APEX_PSI_ED25519_SEED. It is NEVER printed. Only public keys are printed.
//
// Usage:
//   node scripts/derive-anchor-key.mjs                 # derive from the env / vault
//   node scripts/derive-anchor-key.mjs --check <pub>   # does <pub> match the seed here?

import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";

const VAULT_PATH = "C:/Users/apex1/.apex-vault/credentials.env";
const VAULT_NAMES = ["APEX_PSI_ED25519_SEED", "APEX_PSI_SIGNING_SEED"];

// The derivation prefixes the live code actually uses. Two surfaces sign with
// Ed25519 and they do not share a prefix, so they do not share a public key.
export const PREFIXES = {
  ledger: "APEX-SIGNING-KEY-", // psi_core.signEd25519Strict: ledger, /notarize, /authorize
  proof: "APEX-PSI-PROOF|", // predicate-prove: predicate_proofs
};

/**
 * The Ed25519 private key the live signing code uses for a seed.
 *
 * ONE place knows the PKCS#8 shape. `psi_core.signEd25519Strict` builds the same
 * 32-byte key material with `SHA-256(prefix || seed)`, so a seal made here is
 * signed by the key the published anchor already lists — no second identity.
 * The returned key is extractable ONLY so the public half can be read out as a
 * JWK; callers that just sign never export it.
 */
export async function privateKeyFromSeed(prefix, seed) {
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(`${prefix}${seed}`));
  const km = new Uint8Array(digest);
  const pkcs8 = new Uint8Array(48);
  pkcs8.set([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  pkcs8.set(km, 16);
  return webcrypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, true, ["sign"]);
}

/** Sign `message` (ASCII string) under the ledger prefix and return 128 hex. */
export async function signWithSeed(prefix, seed, message) {
  const key = await privateKeyFromSeed(prefix, seed);
  const sig = await webcrypto.subtle.sign("Ed25519", key, new TextEncoder().encode(message));
  return Buffer.from(sig).toString("hex");
}

export async function publicKeyFromSeed(prefix, seed) {
  const key = await privateKeyFromSeed(prefix, seed);
  const jwk = await webcrypto.subtle.exportKey("jwk", key);
  return Buffer.from(jwk.x, "base64url").toString("hex");
}

export function readSeed() {
  const fromEnv = process.env.APEX_PSI_ED25519_SEED;
  if (fromEnv && fromEnv.trim()) return { seed: fromEnv.trim(), from: "the environment" };
  let text;
  try {
    text = readFileSync(VAULT_PATH, "utf8");
  } catch {
    return null;
  }
  for (const name of VAULT_NAMES) {
    const m = text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*"?([^"\\r\\n]+)"?\\s*$`, "m"));
    if (m) return { seed: m[1].trim(), from: `the vault (${name})` };
  }
  return null;
}

const isCli = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isCli) {
  const check = process.argv.includes("--check") ? process.argv[process.argv.indexOf("--check") + 1] : null;
  const found = readSeed();
  if (!found) {
    console.log(
      "no signing seed found. Set APEX_PSI_ED25519_SEED in the environment, or paste it into the vault as APEX_PSI_ED25519_SEED.",
    );
    process.exit(2);
  }
  console.log(`seed source: ${found.from} (the seed itself is never printed)\n`);
  const derived = {};
  for (const [name, prefix] of Object.entries(PREFIXES)) {
    const pub = await publicKeyFromSeed(prefix, found.seed);
    derived[name] = pub;
    console.log(`${name.padEnd(7)} public key : ${pub}`);
  }
  if (check) {
    const target = String(check).toLowerCase().replace(/^0x/, "");
    const hit = Object.entries(derived).find(([, pub]) => pub === target);
    console.log(
      hit
        ? `\nMATCH: that key is the ${hit[0]} key for this seed.`
        : `\nno match: ${target} is not derivable from this seed.`,
    );
    process.exit(hit ? 0 : 1);
  }
  console.log(
    "\npublish the ledger key as the anchor's active key; keep the old key in keys[] marked rotated so every receipt already issued still verifies.",
  );
}
