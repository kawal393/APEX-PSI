// APEX PSI — shared hardened primitives (Merkle profile, strict signing,
// atomic post-quantum slot allocation).
//
// Merkle profile "RFC6962-SHA256": leaves are ordered chronologically
// (oldest first, by ledger sequence) and hashed with RFC 6962 / RFC 9162
// domain separation: leaf = H(0x00 || leaf_bytes), node = H(0x01 || L || R).
// An odd node is promoted unchanged (RFC 6962 MTH split, no duplication).

export const MERKLE_PROFILE = "RFC6962-SHA256";

const hexToBytes = (h: string): Uint8Array => {
  const c = h.replace(/^sha256:/i, "").replace(/^0x/i, "");
  if (!/^[0-9a-f]*$/i.test(c) || c.length % 2) return new TextEncoder().encode(h);
  const o = new Uint8Array(c.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(c.substr(i * 2, 2), 16);
  return o;
};
const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

async function h(prefix: number, ...parts: Uint8Array[]): Promise<Uint8Array> {
  const len = 1 + parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(len);
  buf[0] = prefix;
  let o = 1;
  for (const p of parts) { buf.set(p, o); o += p.length; }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

/** RFC 6962 Merkle Tree Hash over leaves given oldest → newest. */
export async function rfc6962Root(leavesHex: string[]): Promise<string> {
  if (leavesHex.length === 0) return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array())));
  let level = await Promise.all(leavesHex.map((l) => h(0x00, hexToBytes(l))));
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? await h(0x01, level[i], level[i + 1]) : level[i]);
    }
    level = next;
  }
  return toHex(level[0]);
}

/**
 * Strict Ed25519 signing. Throws on any failure — a signing engine never
 * issues a pseudo-signature.
 */
export async function signEd25519Strict(data: string, serviceKey: string): Promise<string> {
  if (!serviceKey) throw new Error("signing key unavailable");
  const km = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`APEX-SIGNING-KEY-${serviceKey}`)));
  const pkcs8 = new Uint8Array(48);
  pkcs8.set([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  pkcs8.set(km, 16);
  const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(data));
  return toHex(new Uint8Array(sig));
}

/**
 * Atomically reserve `count` LMS one-time slots from the shared database
 * counter. Never derive a slot from a row count: concurrent requests would
 * receive the same index and reuse a one-time key.
 */
// deno-lint-ignore no-explicit-any
export async function reserveLmsSlots(supabase: any, count = 1): Promise<number> {
  const { data, error } = await supabase.rpc("next_lms_slot", { p_count: count });
  if (error || data === null || data === undefined) throw new Error(`LMS slot reservation failed: ${error?.message ?? "no slot"}`);
  return Number(data);
}

/**
 * RFC 6962 / RFC 9162 audit path for leaf `index` in a tree of `leavesHex`
 * (oldest → newest). Siblings are listed bottom-up. Matches rfc6962Root.
 */
export async function rfc6962AuditPath(leavesHex: string[], index: number): Promise<string[]> {
  async function mth(ls: Uint8Array[]): Promise<Uint8Array> {
    if (ls.length === 1) return ls[0];
    let k = 1; while (k * 2 < ls.length) k *= 2;
    return h(0x01, await mth(ls.slice(0, k)), await mth(ls.slice(k)));
  }
  async function path(m: number, ls: Uint8Array[]): Promise<Uint8Array[]> {
    if (ls.length <= 1) return [];
    let k = 1; while (k * 2 < ls.length) k *= 2;
    return m < k
      ? [...(await path(m, ls.slice(0, k))), await mth(ls.slice(k))]
      : [...(await path(m - k, ls.slice(k))), await mth(ls.slice(0, k))];
  }
  const hashed = await Promise.all(leavesHex.map((l) => h(0x00, hexToBytes(l))));
  return (await path(index, hashed)).map(toHex);
}

/**
 * ML-DSA-65 (NIST FIPS 204) signing under the published institutional
 * trust-anchor key (same seed derivation as pqc-sign). Throws on failure.
 */
export async function signMlDsa65Strict(message: string): Promise<{ sig: string; pk: string }> {
  const { ml_dsa65 } = await import("https://esm.sh/@noble/post-quantum@0.6.1/ml-dsa");
  const src = Deno.env.get("APEX_PSI_SIGNING_SEED") || Deno.env.get("APEX_LATTICE_KEY");
  if (!src) throw new Error("ML-DSA seed unavailable");
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`APEX-PSI-PQC|mldsa|${src}`)));
  const keys = ml_dsa65.keygen(d);
  const sig = ml_dsa65.sign(new TextEncoder().encode(message), keys.secretKey);
  return { sig: toHex(sig), pk: toHex(keys.publicKey) };
}
