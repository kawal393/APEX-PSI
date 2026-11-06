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
  mldsa65_public_key?: string;
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
 * The post-quantum half of the published hybrid suite: ML-DSA-65 (NIST FIPS
 * 204), 1952 raw bytes. R10 hashes the envelope WITHOUT the signature member,
 * so the Ed25519 half of a hybrid seal never covers `signature.pq_value` —
 * a declared post-quantum signature is a separate claim that must be checked
 * against this key (R11.7). Inlined for the same reason as the Ed25519 pins
 * above: the check must work from a file:// copy or an offline build.
 */
const BUILT_IN_PQ_KEYS: SealTrustKey[] = [
  {
    kid: "apex-psi-mldsa65",
    public_key: "fa0322cc49200a676f4681e0b59859f730664139405793b440f8de5b16e7d7991be31736cb6562ea367bf7cbbc252423a4d31577d4bbaafcc4adb83cb004448521c6fe835b6b77b632af6193f3c5db9c3f41f628ce44c9f97e5a415aede16b5d4df9c8fcf8a73210edd977bd3be273b3261f1c5ac7284f88c169e45a2e85463ab1edf4b5ec42a44fa45f4352bec66e0513d945aceb8997382c940934553cf023a6912029e829c40de4fd20bf79f2a2a1e4703ea1777df880e6322f90957b1628104fb85f3f0e575926cacde4049797c7aab55fef12299943a79ee8d62d6f13a3648de5cb2bf61f2f47b6f98c5bed5f06b443846aaf2ae202552294b84c64ac77c82f8bc8118a1f3e7cecb3fbd799a4742a86e513b09d35b95adb5e8947d94f6bb382ff29b84e774718f816a0819ecc6ca9ebee95b1755d7f78d4dd8dd394b0d8979c92977a8a5e72b7e964abc3b4ac7879e54618a19e5300f8f9436fa8dc761f7a9a7ce8def5f82427aafa4ae890dee28b08512e349e3252a225308d1f4d2552ece477ef6e76c4d44f3310685f79e1f7ad24441c7dce5597a85bf1392195d6143fdfd66b430e14f935e278167daa75a9b5b505c08de58f4cd75156c176103a437170db5a7cd3ed4eef1668fa362bd1c8594c45ebd0daa1c39b14cc13b5b85530df24b913c9f1ac6eab943dfbe0f92656812ca58ca38bef1e256c2233de8f990cbadbe681ebbb153ed6617d4da25fd093d8e6afcbf79be88e1b52e73100acc2f8301eb53290f828e4dabe985ba70a282e64ac4eec8aa9d4064e262cc28a394ec0f7aa4b4803b961e49f4888fa56e9177f140e4c1d938db5232f38ab62cd2f7c684ba09bffff9ca582753f140723e09ce255b45200362e2d9e6305e5c23a242580abd4c06ec0c97fc354510d390d7261fd04e4b2f20a1081f1bba385c80f32eedcb1148f9b8356b235970194d847e21aeaff88076d71a5e0eda5d2fab991b5538b281a886d89e874bf2999fe59d1de5430d264294c1a4fda3c92a434bbace75717c2abc86ffaaff52d17aad7675d073c2ec89780c2aad63ffe688b49853a0c81ad49b7b1e29f9b13c182f6ab36ac3b8d96bbfe98cb357ff745bf7ddd47796241fbd2efb2bf09db426d60d2b7d29b0c71875ac8dd5da7e22decf7814906d70dd81bb378d5479a98b9062d0b902339ec59471f3b51ebd8ec28850acdee5fe35b8a56178d6db8579cc6e379071994d1241551f2529a05c1848d07e5a1475a872806096e1ddd89fb8bc6145d02d920d6d6068b7ccbc149ed0d92eb1de421b2bd88fb95211ac5be2609dbb6611ef8882a8b417a1e92708879620c7c02f82f377b410b8a1d3783dfa2b97d830bf035bc8077f3830a369bb8eb102464cecd46bdf4d0434cca7dd6f05b7b5df1d58c6885fae3ede52dfda6f0be3e965e9a8acef4852016be830aa36041c9e06a18ef9b6d2a57549bde978678642ea10a8bc3aa1650ed5e43f18ab2dc82d357db1a676e16cf38651783e256f054f24dd454f1d6242aa6386b97056256844d715e858759c53b7c24652f1868fb052511cbbae502d56ad03d11c5248df809e8a0fbcc4622d72bc7ea43f213290d426f8bcdc569b9cae4e391d4cf13e730d0fe2d91b407a44df2eb2fd96089cf385939d5d82a824f050fee126a6d566ec0036fed39ef7deec6abc113a385b5519cff4dd0ed4c87ddee650bb2d1c7a58825c0562f211ea18ee61a50ddd6c51526add2fb2024918a13a94bff029e09119e1006e8844b8298b4e95c2e845c9c8c3bf29659ca94090dc4f157eb5b923b409367f8ed7fb01ebc52afe50f9ab97bc147d387476705793f50357c3f41b196ea8176199d69839fa9ddbff19c794fcbb37755fe8a3f7d8e48dfea64a489c03e5ebc48c24d0923e59eff07389afd73274120a8dd491027ef8fef16ac6948b7bd1026bc2ba15713aeb7834bd83595b9c8ca063bacfc955e8a0e5217a453c3d026f701cc433b23899b1d6edb549e1bb8d01233a36fd26fdd6e774b20ba92ce9733cbb6f83dd9203dd165be4fd2332ca77dbf349da51b0dcb275dc798bb11f3ae34b05b06fa3f47ed37a175b643d2cbf02307bbbf95e7b07c384f3c0b10419a952b97e9a14105ac88ff3cc99e8014ae2c72d219dd5d42623ed7d1b6ef14246810f6dcd53154d48c83804db31434a2a0e1b893025180fd8160de310be27b6063c3adb66d4ac1a81767b2adcf564f7381f2cdb136b021181fbd318b39a0a0dabce8995d38d2fbc6dc9c3c58c558e5b87439d1ac1f76bb5d48e45bfb077981516a746b9acb8193a4254b50148b51762fffb4e6e997837fb4ea7a07c877041785ce66aca33d52865052a6381994f52d99cbb1349edb627f49776eed00387e0f6f08afb3bc9f234782b4c90f112b749948a33ad4b868484e15261a02f28b23ffaf37c0e1ea532cc09c3a8058b174dc568a331e3bd69567e3c278e7070f2edae6f7c77a1c1b895d1179a96c4a294e1111276365bc89b4ee580538a59674bc1077ef5529169245f4f9fba5adb3922fd4b65994f58292acb0f65701a90ba79d06f199b9a5b2883b46006e3bd46321cc3ff24a810e2aad3fbd2e2cba804c9bfcd0e21cc74e94f44c51a92aa89cdc6f1da559b5825dfdf3032958e400e1b7208cf64b197403c63a4c6bc081c0800570233eb6faa7b364d974cd59c3ea621ff5d23103c52fb43143a340ea0de119ab18d3170d1888e534880d962b5473f09d60b94c5a63c642",
    algorithm: "ML-DSA-65",
    signs: "post-quantum half of the hybrid suite (NIST FIPS 204)",
  },
];

/** ML-DSA-65 public keys are 1952 raw bytes; a shorter string is not a key. */
const MLDSA65_HEX_LEN = 1952 * 2;

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
  /**
   * The published post-quantum keys (ML-DSA-65) a seal's declared
   * `signature.pq_alg` is checked against. Empty means this page can check no
   * post-quantum signature, so a seal that declares one is reported
   * unverifiable rather than verified.
   */
  pqKeys: SealTrustKey[];
  /** Where the document actually came from, for honest labelling in the UI. */
  source: string;
}

/**
 * Pull every usable ML-DSA-65 key out of a trust-anchor document. The
 * post-quantum half is a separate key from the Ed25519 half and must never be
 * handed to an Ed25519 verifier as if the two were interchangeable.
 */
export function parsePostQuantumAnchorKeys(doc: unknown): SealTrustKey[] {
  const anchor = (doc && typeof doc === "object" ? doc : {}) as LooseAnchor;
  const keys: SealTrustKey[] = [];
  const seen = new Set<string>();
  const push = (kid: string, publicKey: unknown, signs: string) => {
    if (typeof publicKey !== "string") return;
    const normalized = publicKey.trim().toLowerCase();
    if (normalized.length !== MLDSA65_HEX_LEN || !/^[0-9a-f]+$/.test(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    keys.push({ kid, public_key: normalized, algorithm: "ML-DSA-65", signs });
  };

  for (const entry of Array.isArray(anchor.keys) ? anchor.keys : []) {
    if (String(entry?.algorithm ?? "").toUpperCase() !== "ML-DSA-65") continue;
    push(String(entry?.kid ?? entry?.key_id ?? "unnamed-pq-key"), entry?.public_key, String(entry?.signs ?? entry?.use ?? ""));
  }
  push("apex-psi-mldsa65", anchor.mldsa65_public_key, "post-quantum half of the hybrid suite (NIST FIPS 204)");

  return keys.length > 0 ? keys : BUILT_IN_PQ_KEYS;
}

/** The fetched document may describe pinned keys; it cannot silently introduce a new signing identity. */
export function pinnedPostQuantumKeys(doc: unknown): SealTrustKey[] {
  if (!doc || typeof doc !== "object") return [];
  const anchor = doc as LooseAnchor;
  if (anchor.spec !== "PSI-TRUST-ANCHOR-v1" || anchor.issuer !== "urn:apex-psi:issuer:root-1") return [];
  const pins = new Set(BUILT_IN_PQ_KEYS.map((key) => key.public_key));
  return parsePostQuantumAnchorKeys(doc).filter((key) => pins.has(key.public_key));
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
      const doc = await res.json();
      const keys = pinnedAnchorKeys(doc);
      if (keys.length === 0) continue;
      const pqKeys = pinnedPostQuantumKeys(doc);
      cache = {
        keys,
        pqKeys: pqKeys.length > 0 ? pqKeys : BUILT_IN_PQ_KEYS,
        roots: keys.map((k) => ({ public_key: k.public_key, key_id: k.kid })),
        source: `${url} · checked against built-in public-key pins`,
      };
      return cache;
    } catch {
      /* try the next source */
    }
  }
  const keys = parseTrustAnchor(null);
  cache = {
    keys,
    pqKeys: BUILT_IN_PQ_KEYS,
    roots: keys.map((k) => ({ public_key: k.public_key, key_id: k.kid })),
    source: "built-in copy of the published anchor",
  };
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
