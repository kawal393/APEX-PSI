// ═══════════════════════════════════════════════════════════════════════
// Minimal deterministic CBOR (RFC 8949) encoder + decoder.
// Used for C2PA claims, assertions and COSE_Sign1 structures, which are all
// CBOR — not JSON. Deterministic encoding (definite lengths, shortest ints,
// insertion-ordered maps) so claim bytes are reproducible.
// ═══════════════════════════════════════════════════════════════════════

export class CborTag {
  constructor(public tag: number, public value: unknown) {}
}

function head(major: number, len: number): number[] {
  const mt = major << 5;
  if (len < 24) return [mt | len];
  if (len < 0x100) return [mt | 24, len];
  if (len < 0x10000) return [mt | 25, len >> 8, len & 255];
  return [mt | 26, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255];
}

export function cborEncode(value: unknown): Uint8Array {
  const out: number[] = [];
  const enc = new TextEncoder();

  const write = (v: unknown): void => {
    if (v === null || v === undefined) { out.push(0xf6); return; }
    if (typeof v === "boolean") { out.push(v ? 0xf5 : 0xf4); return; }
    if (typeof v === "number") {
      if (Number.isInteger(v) && Math.abs(v) < 0x100000000) {
        if (v >= 0) out.push(...head(0, v));
        else out.push(...head(1, -v - 1));
        return;
      }
      // float64
      const buf = new Uint8Array(8);
      new DataView(buf.buffer).setFloat64(0, v);
      out.push(0xfb, ...buf);
      return;
    }
    if (typeof v === "string") {
      const b = enc.encode(v);
      out.push(...head(3, b.length), ...b);
      return;
    }
    if (v instanceof Uint8Array) {
      out.push(...head(2, v.length), ...v);
      return;
    }
    if (v instanceof CborTag) {
      out.push(...head(6, v.tag));
      write(v.value);
      return;
    }
    if (Array.isArray(v)) {
      out.push(...head(4, v.length));
      for (const item of v) write(item);
      return;
    }
    if (v instanceof Map) {
      out.push(...head(5, v.size));
      for (const [k, val] of v) { write(k); write(val); }
      return;
    }
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    out.push(...head(5, entries.length));
    for (const [k, val] of entries) { write(k); write(val); }
  };

  write(value);
  return new Uint8Array(out);
}

// ── decoder ────────────────────────────────────────────────────────────
export function cborDecode(bytes: Uint8Array): unknown {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  let p = 0;

  function len(ai: number): number {
    if (ai < 24) return ai;
    if (ai === 24) return bytes[p++];
    if (ai === 25) { const v = dv.getUint16(p); p += 2; return v; }
    if (ai === 26) { const v = dv.getUint32(p); p += 4; return v; }
    if (ai === 27) { const v = Number(dv.getBigUint64(p)); p += 8; return v; }
    throw new Error("indefinite length not supported");
  }

  function read(): unknown {
    const ib = bytes[p++];
    const major = ib >> 5;
    const ai = ib & 31;
    switch (major) {
      case 0: return len(ai);
      case 1: return -1 - len(ai);
      case 2: { const n = len(ai); const b = bytes.subarray(p, p + n); p += n; return new Uint8Array(b); }
      case 3: { const n = len(ai); const s = dec.decode(bytes.subarray(p, p + n)); p += n; return s; }
      case 4: { const n = len(ai); const arr: unknown[] = []; for (let i = 0; i < n; i++) arr.push(read()); return arr; }
      case 5: {
        const n = len(ai);
        const map = new Map<unknown, unknown>();
        for (let i = 0; i < n; i++) { const k = read(); map.set(k, read()); }
        // string-keyed maps become plain objects for ergonomics
        if ([...map.keys()].every((k) => typeof k === "string")) return Object.fromEntries(map as Map<string, unknown>);
        return map;
      }
      case 6: { const tag = len(ai); return new CborTag(tag, read()); }
      default: {
        if (ai === 20) return false;
        if (ai === 21) return true;
        if (ai === 22) return null;
        if (ai === 23) return undefined;
        if (ai === 25) { p += 2; return NaN; }
        if (ai === 26) { const v = dv.getFloat32(p); p += 4; return v; }
        if (ai === 27) { const v = dv.getFloat64(p); p += 8; return v; }
        return null;
      }
    }
  }
  return read();
}
