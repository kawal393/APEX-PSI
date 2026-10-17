// APEX PSI — TRUST ROOTS FOR R11 (added 17 Oct 2026, v1.3.0 authenticity work)
//
// The verifier can only authenticate a signature against a public key the
// caller chose to trust. This module reads the published trust anchor —
// /.well-known/apex-psi-trust-anchor.json, a STATIC file anyone can mirror —
// and turns its Ed25519 entries into trust roots. Nothing here asks our
// server whether a seal is valid: the answer is computed in the visitor's own
// browser from the key document and the seal bytes.

import type { PsiTrustRoot } from "../../packages/psi-verifier/src/index";

export interface SealTrustKey {
  kid: string;
  public_key: string;
  algorithm: string;
  /** What this key is actually used for, straight from the anchor document. */
  signs: string;
}

interface LooseAnchor {
  spec?: string;
  issuer?: string;
  ed25519_public_key?: string;
  keys?: {
    kid?: string;
    key_id?: string;
    algorithm?: string;
    public_key?: string;
    signs?: string;
    use?: string;
  }[];
}

const HEX64 = /^[0-9a-fA-F]{64}$/;

/**
 * The published anchor is the source of truth. These two constants are the
 * same public keys, inlined so the checker still works from a file:// copy,
 * an offline build, or a mirror that dropped the .well-known path. They are
 * public halves; inlining them leaks nothing.
 */
const BUILT_IN_KEYS: SealTrustKey[] = [
  {
    kid: "apex-psi-ledger-ed25519",
    public_key: "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724",
    algorithm: "Ed25519",
    signs: "ledger receipts — the bare lowercase hex Merkle leaf, NOT the seal_hash",
  },
  {
    kid: "apex-psi-hybrid-ed25519",
    public_key: "9a6bdab92234f3bd6a3b1e9081e5ce3d646c129f1f6abdf7b52338e4cca1c9ca",
    algorithm: "Ed25519",
    signs: "in-band hybrid seals (Ed25519 + ML-DSA-65), NOT a ledger receipt",
  },
];

/**
 * Pull every usable Ed25519 key out of a trust-anchor document. A malformed or
 * absent document yields the built-in public keys, never an empty list — a
 * verifier with no candidate key silently reports "unverifiable", which is a
 * worse outcome than trying the published identity and saying so.
 */
export function parseTrustAnchor(doc: unknown): SealTrustKey[] {
  const anchor = (doc && typeof doc === "object" ? doc : {}) as LooseAnchor;
  const keys: SealTrustKey[] = [];
  const seen = new Set<string>();
  const push = (kid: string, publicKey: unknown, algorithm: unknown, signs: string) => {
    if (typeof publicKey !== "string" || !HEX64.test(publicKey)) return;
    const normalized = { kid, public_key: publicKey.toLowerCase(), algorithm: String(algorithm || "Ed25519"), signs };
    // One entry per KEY, not per label: the real anchor lists the same hybrid
    // public key twice (top-level `ed25519_public_key` and again inside `keys[]`),
    // and a verifier that counted it twice would overstate how many identities
    // it checked.
    if (seen.has(normalized.public_key)) return;
    seen.add(normalized.public_key);
    keys.push(normalized);
  };

  for (const entry of Array.isArray(anchor.keys) ? anchor.keys : []) {
    const algorithm = String(entry?.algorithm ?? "Ed25519");
    // Only Ed25519 can satisfy R11 today; ML-DSA/LMS rows are listed elsewhere
    // and must not be fed to an Ed25519 verifier as if they were interchangeable.
    if (algorithm.toLowerCase() !== "ed25519") continue;
    push(String(entry?.kid ?? entry?.key_id ?? "unnamed-key"), entry?.public_key, algorithm, String(entry?.signs ?? entry?.use ?? ""));
  }
  if (typeof anchor.ed25519_public_key === "string") {
    push("apex-psi-identity-ed25519", anchor.ed25519_public_key, "Ed25519", "the institutional in-band identity (top-level key)");
  }

  return keys.length > 0 ? keys : BUILT_IN_KEYS;
}

export interface TrustRootsResult {
  roots: PsiTrustRoot[];
  keys: SealTrustKey[];
  /** Where the document actually came from, for honest labelling in the UI. */
  source: string;
}

/** The fetched document may describe pinned keys; it cannot silently introduce a new signing identity. */
export function pinnedAnchorKeys(doc: unknown): SealTrustKey[] {
  if (!doc || typeof doc !== "object") return [];
  const anchor = doc as LooseAnchor;
  if (anchor.spec !== "PSI-TRUST-ANCHOR-v1" || anchor.issuer !== "urn:apex-psi:issuer:root-1") return [];
  const pins = new Set(BUILT_IN_KEYS.map((key) => key.public_key));
  return parseTrustAnchor(doc).filter((key) => pins.has(key.public_key));
}

export function sealSignerDescription(keyId?: string): string {
  return keyId === "visitor-supplied-key"
    ? "The public key you supplied signed this seal, over exactly these bytes. This does not authenticate it as an APEX-issued seal."
    : "A pinned APEX public key signed this seal, over exactly these bytes.";
}

const SOURCES = [
  "/.well-known/apex-psi-trust-anchor.json",
  "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json",
];

let cache: TrustRootsResult | null = null;

/** Fetch the published anchor (local mirror first) and build trust roots. */
export async function loadSealTrustRoots(refresh = false): Promise<TrustRootsResult> {
  if (cache && !refresh) return cache;
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const keys = pinnedAnchorKeys(await res.json());
      if (keys.length === 0) continue;
      cache = { keys, roots: keys.map((k) => ({ public_key: k.public_key, key_id: k.kid })), source: `${url} · checked against built-in public-key pins` };
      return cache;
    } catch {
      /* try the next source */
    }
  }
  const keys = parseTrustAnchor(null);
  cache = { keys, roots: keys.map((k) => ({ public_key: k.public_key, key_id: k.kid })), source: "built-in copy of the published anchor" };
  return cache;
}

/** Forget the cached anchor (tests and key-rotation UI only). */
export function resetTrustRootCache(): void {
  cache = null;
}

/**
 * A visitor-supplied key, as hex or base64, added to the candidate set. The
 * verifier never invents trust — but it must let a regulator bring their own.
 */
export function trustRootFromMaterial(material: string, label = "supplied-key"): PsiTrustRoot | null {
  const text = material.trim();
  if (HEX64.test(text)) return { public_key: text.toLowerCase(), key_id: label };
  const candidate = text.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (candidate.length !== 43 || !/^[A-Za-z0-9+/]+$/.test(candidate)) return null;
  try {
    const raw = Uint8Array.from(atob(`${candidate}=`), (c) => c.charCodeAt(0));
    if (raw.length !== 32) return null;
    return { public_key: Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join(""), key_id: label };
  } catch {
    return null;
  }
}
