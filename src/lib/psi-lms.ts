// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — LMS-W4-SHA256 (NIST SP 800-208 style hash-based signatures)
//
// Winternitz-4 one-time signatures (68 SHA-256 chains, 16 deep) as the leaves
// of a depth-5 Merkle tree (32 one-time keys per LMS key). Pure SHA-256 via
// the Web Crypto API — no exotic math, verifiable offline forever.
//
// Hash-based signatures are believed secure against quantum adversaries:
// Grover only halves the preimage security of SHA-256 (128-bit post-quantum).
// ═══════════════════════════════════════════════════════════════════════

export const LMS_ALGORITHM = "LMS-W4-SHA256" as const;
export const LMS_STANDARD = "NIST SP 800-208 (LMS / HSS, Oct 2020)";

const CHAIN_LEN = 16; // W=4 → 2^4 levels per chain
const MSG_CHAINS = 64; // 256-bit hash / 4 bits
const CKSUM_CHAINS = 4; // 16 bits of checksum room (max checksum 960)
export const TOTAL_CHAINS = MSG_CHAINS + CKSUM_CHAINS; // 68
export const TREE_HEIGHT = 5;
export const LMS_LEAVES = 1 << TREE_HEIGHT; // 32 one-time signatures per key

export interface LMSSignature {
  leaf_index: number;
  wots_signature: string; // hex, 68 × 32 bytes
  auth_path: string[]; // 5 sibling hashes (hex)
  algorithm: typeof LMS_ALGORITHM;
  public_key: string; // 32-byte Merkle root (hex)
}

export interface LMSPrivateKey {
  seed: string; // hex master seed for this LMS key
  epoch: number; // key generation number (rotates every 32 signatures)
}

export interface LMSKeyPair {
  privateKey: LMSPrivateKey;
  publicKey: string; // 32-byte Merkle root (hex)
}

// ── byte helpers ───────────────────────────────────────────────────────
export function toHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function fromHex(h: string): Uint8Array {
  const clean = h.replace(/^0x/, "").trim();
  const out = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const d = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return new Uint8Array(d);
}

const enc = new TextEncoder();
const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const u16 = (n: number) => new Uint8Array([(n >>> 8) & 255, n & 255]);

const DOMAIN_OTS = enc.encode("APEX-LMS-W4-OTS");
const DOMAIN_NODE = enc.encode("APEX-LMS-NODE");

// ── W-OTS ──────────────────────────────────────────────────────────────
/** Deterministic secret for chain `idx` of the one-time key at `leaf`. */
async function chainSecret(seed: Uint8Array, leaf: number, idx: number): Promise<Uint8Array> {
  return await sha256(concat(seed, u32(leaf), u16(idx), DOMAIN_OTS));
}

/** Iterate SHA-256 `times` steps forward along a Winternitz chain. */
async function walk(value: Uint8Array, times: number): Promise<Uint8Array> {
  let v = value;
  for (let i = 0; i < times; i++) v = await sha256(v);
  return v;
}

/** Message + checksum Winternitz coefficients (68 values in 0..15). */
function coefficients(msgHash: Uint8Array): number[] {
  const v: number[] = [];
  for (let i = 0; i < 32; i++) {
    v.push((msgHash[i] >> 4) & 0x0f);
    v.push(msgHash[i] & 0x0f);
  }
  let checksum = 0;
  for (const x of v) checksum += CHAIN_LEN - 1 - x;
  // 16 bits of checksum → 4 nibbles, most significant first
  for (let s = CKSUM_CHAINS - 1; s >= 0; s--) v.push((checksum >> (s * 4)) & 0x0f);
  return v;
}

/** Compress the 68 chain tops into the one-time public key (a Merkle leaf). */
async function wotsPublicKey(seed: Uint8Array, leaf: number): Promise<Uint8Array> {
  const tops: Uint8Array[] = [];
  for (let i = 0; i < TOTAL_CHAINS; i++) {
    tops.push(await walk(await chainSecret(seed, leaf, i), CHAIN_LEN - 1));
  }
  return await sha256(concat(...tops));
}

async function nodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  return await sha256(concat(DOMAIN_NODE, left, right));
}

// ── LMS key (depth-5 Merkle tree over 32 one-time keys) ────────────────
interface ExpandedKey { leaves: Uint8Array[]; levels: Uint8Array[][]; root: Uint8Array }

const keyCache = new Map<string, ExpandedKey>();

async function expandKey(priv: LMSPrivateKey): Promise<ExpandedKey> {
  const cacheKey = `${priv.seed}:${priv.epoch}`;
  const hit = keyCache.get(cacheKey);
  if (hit) return hit;

  const seed = await sha256(concat(fromHex(priv.seed), u32(priv.epoch), enc.encode("APEX-LMS-EPOCH")));
  const leaves: Uint8Array[] = [];
  for (let i = 0; i < LMS_LEAVES; i++) leaves.push(await wotsPublicKey(seed, i));

  const levels: Uint8Array[][] = [leaves];
  let level = leaves;
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(await nodeHash(level[i], level[i + 1]));
    levels.push(next);
    level = next;
  }
  const expanded: ExpandedKey = { leaves, levels, root: level[0] };
  keyCache.set(cacheKey, expanded);
  return expanded;
}

/** Generate a fresh LMS key pair (random master seed, epoch 0). */
export async function generateLMSKey(): Promise<LMSKeyPair> {
  const privateKey: LMSPrivateKey = { seed: toHex(crypto.getRandomValues(new Uint8Array(32))), epoch: 0 };
  const { root } = await expandKey(privateKey);
  return { privateKey, publicKey: toHex(root) };
}

/** Derive the deterministic LMS key for a master seed and epoch. */
export async function deriveLMSKey(masterSeedHex: string, epoch = 0): Promise<LMSKeyPair> {
  const privateKey: LMSPrivateKey = { seed: masterSeedHex, epoch };
  const { root } = await expandKey(privateKey);
  return { privateKey, publicKey: toHex(root) };
}

/** Public key (Merkle root) for a private key, without signing. */
export async function lmsPublicKey(privateKey: LMSPrivateKey): Promise<string> {
  const { root } = await expandKey(privateKey);
  return toHex(root);
}

/**
 * Sign a message with the one-time key at `leafIndex` (0..31).
 * A leaf MUST NOT be reused — rotate the epoch after 32 signatures.
 */
export async function lmsSign(
  message: Uint8Array,
  privateKey: LMSPrivateKey,
  leafIndex = 0,
): Promise<LMSSignature> {
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= LMS_LEAVES) {
    throw new Error(`leafIndex out of range (0..${LMS_LEAVES - 1})`);
  }
  const expanded = await expandKey(privateKey);
  const seed = await sha256(concat(fromHex(privateKey.seed), u32(privateKey.epoch), enc.encode("APEX-LMS-EPOCH")));

  const msgHash = await sha256(message);
  const coeffs = coefficients(msgHash);

  const parts: Uint8Array[] = [];
  for (let i = 0; i < TOTAL_CHAINS; i++) {
    parts.push(await walk(await chainSecret(seed, leafIndex, i), coeffs[i]));
  }

  const auth_path: string[] = [];
  let idx = leafIndex;
  for (let h = 0; h < TREE_HEIGHT; h++) {
    const sibling = idx ^ 1;
    auth_path.push(toHex(expanded.levels[h][sibling]));
    idx >>= 1;
  }

  return {
    leaf_index: leafIndex,
    wots_signature: toHex(concat(...parts)),
    auth_path,
    algorithm: LMS_ALGORITHM,
    public_key: toHex(expanded.root),
  };
}

/**
 * Verify an LMS signature. Recomputes the one-time public key from the
 * signature, folds the authentication path, and compares the Merkle root.
 */
export async function lmsVerify(
  message: Uint8Array,
  signature: LMSSignature,
  publicKey?: string,
): Promise<boolean> {
  try {
    if (!signature || signature.algorithm !== LMS_ALGORITHM) return false;
    if (signature.auth_path?.length !== TREE_HEIGHT) return false;
    const sigBytes = fromHex(signature.wots_signature);
    if (sigBytes.length !== TOTAL_CHAINS * 32) return false;
    const leafIndex = signature.leaf_index;
    if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= LMS_LEAVES) return false;

    const msgHash = await sha256(message);
    const coeffs = coefficients(msgHash);

    const tops: Uint8Array[] = [];
    for (let i = 0; i < TOTAL_CHAINS; i++) {
      const part = sigBytes.slice(i * 32, i * 32 + 32);
      tops.push(await walk(part, CHAIN_LEN - 1 - coeffs[i]));
    }
    let node = await sha256(concat(...tops)); // reconstructed Merkle leaf

    let idx = leafIndex;
    for (let h = 0; h < TREE_HEIGHT; h++) {
      const sibling = fromHex(signature.auth_path[h]);
      node = idx % 2 === 0 ? await nodeHash(node, sibling) : await nodeHash(sibling, node);
      idx >>= 1;
    }

    const expected = (publicKey || signature.public_key || "").toLowerCase().replace(/^0x/, "");
    return !!expected && toHex(node) === expected;
  } catch {
    return false;
  }
}

