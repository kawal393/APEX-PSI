// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Real OpenTimestamps + Bitcoin anchoring helpers
//
// No simulation. Every value returned here comes from a live third party:
//   • OpenTimestamps public calendars  → the raw .ots timestamp proof bytes
//   • mempool.space (Esplora REST API) → real Bitcoin tip height / txids
//
// A proof is `pending` until a real Bitcoin block confirms it. It is NEVER
// reported as `confirmed` without a txid returned by a block explorer.
// ═══════════════════════════════════════════════════════════════════════

export const OTS_CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://alice.btc.calendar.opentimestamps.org",
];

export const ESPLORA_ENDPOINTS = [
  "https://mempool.space/api",
  "https://blockstream.info/api",
];

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "").replace(/^sha256:/i, "");
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Invalid hex digest");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface OtsSubmission {
  ok: boolean;
  calendar_url?: string;
  ots_base64?: string;
  ots_bytes_length?: number;
  error?: string;
}

/**
 * Submit a 32-byte SHA-256 digest to the OpenTimestamps calendars and CAPTURE
 * the returned timestamp serialization. Earlier revisions discarded this body,
 * which is why proofs could not be downloaded or independently verified.
 */
export async function submitDigestToCalendars(digestHex: string): Promise<OtsSubmission> {
  const digest = hexToBytes(digestHex);
  if (digest.length !== 32) {
    return { ok: false, error: `Digest must be 32 bytes, got ${digest.length}` };
  }

  const errors: string[] = [];
  for (const base of OTS_CALENDARS) {
    try {
      const res = await fetch(`${base}/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          Accept: "application/octet-stream",
        },
        body: digest,
      });
      if (!res.ok) {
        errors.push(`${base} -> ${res.status} ${await res.text()}`);
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0) {
        errors.push(`${base} -> empty timestamp body`);
        continue;
      }
      return {
        ok: true,
        calendar_url: base,
        ots_base64: bytesToBase64(bytes),
        ots_bytes_length: bytes.length,
      };
    } catch (e) {
      errors.push(`${base} -> ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok: false, error: errors.join(" | ") };
}

export interface BitcoinTip {
  height: number;
  hash: string;
  source: string;
}

/** Read the real Bitcoin chain tip. Throws if no explorer answers. */
export async function getBitcoinTip(): Promise<BitcoinTip> {
  const errors: string[] = [];
  for (const base of ESPLORA_ENDPOINTS) {
    try {
      const [hRes, hashRes] = await Promise.all([
        fetch(`${base}/blocks/tip/height`),
        fetch(`${base}/blocks/tip/hash`),
      ]);
      if (!hRes.ok || !hashRes.ok) {
        errors.push(`${base} -> ${hRes.status}/${hashRes.status}`);
        continue;
      }
      const height = Number((await hRes.text()).trim());
      const hash = (await hashRes.text()).trim();
      if (!Number.isFinite(height) || height <= 0) {
        errors.push(`${base} -> bad height`);
        continue;
      }
      return { height, hash, source: base };
    } catch (e) {
      errors.push(`${base} -> ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`No Bitcoin explorer reachable: ${errors.join(" | ")}`);
}

export interface TxStatus {
  found: boolean;
  confirmed: boolean;
  block_height?: number;
  block_time?: number;
  explorer_url?: string;
  error?: string;
}

/** Look up a real Bitcoin transaction. `confirmed` only when a block contains it. */
export async function getTransactionStatus(txid: string): Promise<TxStatus> {
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    return { found: false, confirmed: false, error: "Invalid txid format" };
  }
  const errors: string[] = [];
  for (const base of ESPLORA_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/tx/${txid}/status`);
      if (res.status === 404) {
        return { found: false, confirmed: false, error: "Transaction not found" };
      }
      if (!res.ok) {
        errors.push(`${base} -> ${res.status}`);
        continue;
      }
      const status = await res.json();
      return {
        found: true,
        confirmed: status.confirmed === true,
        block_height: status.block_height ?? undefined,
        block_time: status.block_time ?? undefined,
        explorer_url: `https://mempool.space/tx/${txid}`,
      };
    } catch (e) {
      errors.push(`${base} -> ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { found: false, confirmed: false, error: errors.join(" | ") };
}

/**
 * Scan the raw .ots serialization for a Bitcoin attestation.
 * The OTS Bitcoin attestation tag is the 8-byte magic below, followed by a
 * varint block height. If absent the proof is still calendar-pending, which is
 * the normal state for the first few hours after submission.
 */
const BITCOIN_ATTESTATION_TAG = [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];

const MIN_PLAUSIBLE_HEIGHT = 100000;
const MAX_PLAUSIBLE_HEIGHT = 1500000;

function readVarint(bytes: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let p = offset;
  while (p < bytes.length) {
    const b = bytes[p++];
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) return { value, next: p };
    shift += 7;
    if (shift > 42) return null;
  }
  return null;
}

/**
 * Scan the raw .ots serialization for a Bitcoin attestation. The height is the
 * LEB128 varint after the 8-byte attestation tag (skipping an optional 0xFF
 * separator, and an attestation payload-length varint when one is present, as
 * the public calendars emit). Sanity range 100000–1500000.
 */
export function extractBitcoinBlockHeight(otsBytes: Uint8Array): number | null {
  for (let i = 0; i + BITCOIN_ATTESTATION_TAG.length + 1 < otsBytes.length; i++) {
    let match = true;
    for (let j = 0; j < BITCOIN_ATTESTATION_TAG.length; j++) {
      if (otsBytes[i + j] !== BITCOIN_ATTESTATION_TAG[j]) {
        match = false;
        break;
      }
    }
    if (!match) continue;

    let p = i + BITCOIN_ATTESTATION_TAG.length;
    if (otsBytes[p] === 0xff) p++;
    const first = readVarint(otsBytes, p);
    if (!first) continue;
    if (first.value >= MIN_PLAUSIBLE_HEIGHT && first.value <= MAX_PLAUSIBLE_HEIGHT) {
      return first.value;
    }
    // The first varint was the attestation payload length — the height follows.
    const second = readVarint(otsBytes, first.next);
    if (second && second.value >= MIN_PLAUSIBLE_HEIGHT && second.value <= MAX_PLAUSIBLE_HEIGHT) {
      return second.value;
    }
  }
  return null;
}


/**
 * Build a detached OpenTimestamps proof:
 *   \x00OpenTimestamps\x00 | version 0x00 | hash-alg 0x08 | 32-byte digest | calendar bytes
 */
export function buildDetachedProof(digestHex: string, tsBytes: Uint8Array): string {
  const digest = hexToBytes(digestHex);
  if (digest.length !== 32) throw new Error(`Digest must be 32 bytes, got ${digest.length}`);

  const header = new TextEncoder().encode("\u0000OpenTimestamps\u0000");
  const out = new Uint8Array(header.length + 2 + digest.length + tsBytes.length);
  let o = 0;
  out.set(header, o);
  o += header.length;
  out[o++] = 0x00; // version
  out[o++] = 0x08; // SHA-256
  out.set(digest, o);
  o += digest.length;
  out.set(tsBytes, o);
  return bytesToBase64(out);
}

export interface OtsUpgrade {
  ok: boolean;
  ots_base64?: string;
  bytes?: Uint8Array;
  error?: string;
}

const PENDING_ATTESTATION_TAG = "83dfe30d2ef90c8e";

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function toHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export interface PendingCommitment {
  calendar: string;
  commitment: string;
}

/**
 * Walk an OTS timestamp serialization from its initial digest and collect every
 * pending calendar attestation with the commitment the calendar knows about.
 * Only SHA-256 / append / prepend / fork opcodes are handled — the ops the
 * public calendars actually emit.
 */
export async function collectPendingCommitments(
  digestHex: string,
  tsBytes: Uint8Array,
): Promise<PendingCommitment[]> {
  const found: PendingCommitment[] = [];
  const decoder = new TextDecoder();

  const walk = async (msg: Uint8Array, start: number): Promise<number> => {
    let i = start;
    let current = msg;
    while (i < tsBytes.length) {
      const tag = tsBytes[i++];
      if (tag === 0xff) {
        i = await walk(current, i);
        continue;
      }
      if (tag === 0x00) {
        const attTag = toHex(tsBytes.slice(i, i + 8));
        i += 8;
        const len = readVarint(tsBytes, i);
        if (!len) return tsBytes.length;
        i = len.next;
        const payload = tsBytes.slice(i, i + len.value);
        i += len.value;
        if (attTag === PENDING_ATTESTATION_TAG) {
          const url = readVarint(payload, 0);
          if (url) {
            found.push({
              calendar: decoder.decode(payload.slice(url.next, url.next + url.value)),
              commitment: toHex(current),
            });
          }
        }
        continue;
      }
      if (tag === 0xf0 || tag === 0xf1) {
        const len = readVarint(tsBytes, i);
        if (!len) return tsBytes.length;
        const arg = tsBytes.slice(len.next, len.next + len.value);
        i = len.next + len.value;
        current = tag === 0xf0 ? concat(current, arg) : concat(arg, current);
        continue;
      }
      if (tag === 0x08) {
        current = await sha256Bytes(current);
        continue;
      }
      // Unknown / unsupported opcode — stop this branch honestly.
      return tsBytes.length;
    }
    return i;
  };

  try {
    await walk(hexToBytes(digestHex), 0);
  } catch {
    return found;
  }
  return found;
}

/**
 * Ask a calendar to upgrade an existing timestamp to its Bitcoin attestation.
 * First tries the calendar upgrade endpoint with the raw bytes; if that is not
 * available it walks the stored timestamp and requests the upgraded timestamp
 * for each pending commitment the calendar issued.
 */
export async function upgradeTimestamp(
  calendarUrl: string,
  tsBytes: Uint8Array,
  digestHex?: string,
): Promise<OtsUpgrade> {
  const base = calendarUrl.replace(/\/$/, "");
  const errors: string[] = [];
  try {
    const res = await fetch(`${base}/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        Accept: "application/octet-stream",
      },
      body: tsBytes,
    });
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > 0) return { ok: true, bytes, ots_base64: bytesToBase64(bytes) };
      errors.push(`${base}/upgrade -> empty body`);
    } else {
      errors.push(`${base}/upgrade -> ${res.status} ${(await res.text()).slice(0, 120)}`);
    }
  } catch (e) {
    errors.push(`${base}/upgrade -> ${e instanceof Error ? e.message : String(e)}`);
  }

  if (digestHex) {
    const pending = await collectPendingCommitments(digestHex, tsBytes);
    for (const p of pending) {
      const target = (p.calendar || base).replace(/\/$/, "");
      try {
        const res = await fetch(`${target}/timestamp/${p.commitment}`, {
          headers: { Accept: "application/octet-stream" },
        });
        if (!res.ok) {
          errors.push(`${target}/timestamp -> ${res.status} ${(await res.text()).slice(0, 120)}`);
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length === 0) {
          errors.push(`${target}/timestamp -> empty body`);
          continue;
        }
        return { ok: true, bytes, ots_base64: bytesToBase64(bytes) };
      } catch (e) {
        errors.push(`${target}/timestamp -> ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { ok: false, error: errors.join(" | ") };
}


export function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
