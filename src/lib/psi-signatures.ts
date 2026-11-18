// ═══════════════════════════════════════════════════════════════════════
// PSI Protocol — Ed25519 Digital Signatures
// Non-repudiation layer: every Merkle root is signed
// ═══════════════════════════════════════════════════════════════════════

import * as ed from "@noble/ed25519";

// The PSI Protocol public verification key (exposed on /protocol page)
// This is the public half of the Ed25519 keypair used to sign Merkle roots.
// The private key is stored server-side as an edge function secret.
// Anyone can verify signatures using this public key.
export const PSI_PUBLIC_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";

/**
 * Every ledger key a receipt may be signed under.
 *
 * The first is the pre-rotation key: the signing seed it derives from used to
 * fall back to the database credential, so it stays listed so every receipt
 * already issued still verifies. The second derives from the dedicated
 * APEX_PSI_ED25519_SEED secret and becomes the signing key the moment that
 * secret is set in the signing project.
 */
export const PSI_PUBLIC_KEYS: readonly string[] = [
  PSI_PUBLIC_KEY,
  "111284cd6462a1eeeae71f58d68745e75a7c3de7a69b7328d5953af1fe840e46",
];

/**
 * The pinned key whose signature covers `message`, or null when none does.
 * A bundle declares the key that actually signed it instead of the key the
 * site happens to consider current, so a receipt signed under either key
 * exports a bundle that verifies.
 */
export async function findSigningKey(
  message: string,
  signatureHex: string,
  candidates: readonly string[] = PSI_PUBLIC_KEYS,
): Promise<string | null> {
  for (const key of candidates) {
    if (await verifyEd25519Signature(message, signatureHex, key)) return key;
  }
  return null;
}

/**
 * Verify an Ed25519 signature against a message and the PSI public key.
 * Used by the /verify page for local, in-browser proof verification.
 */
export async function verifyEd25519Signature(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = hexToBytes(signatureHex);
    const pubBytes = hexToBytes(publicKeyHex);
    return await ed.verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Proof Bundle interface — the JSON file a regulator drags into /verify
 */
export interface PSIProofBundle {
  version: "1.0";
  protocol: "APEX-PSI";
  commitId: string;
  action: string;
  predicateId: string;
  timestamp: string;
  sequenceNumber?: number;
  commitHash: string;
  merkleLeafHash: string;
  merkleProof: { hash: string; position: "left" | "right" }[];
  merkleRoot: string;
  ed25519Signature?: string;
  ed25519PublicKey?: string;
  canonicalizationScheme: "RFC-8785-JCS";
  hashAlgorithm: "SHA-256";
  signatureAlgorithm: "Ed25519";
}
