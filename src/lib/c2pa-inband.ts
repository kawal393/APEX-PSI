// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — In-Band Signed Tamperproof Metadata (PSI-INBAND-v1, JUMBF-framed).
// NOTE: this is NOT C2PA. It borrows JUMBF framing (ISO 19566-2) for container
// placement only; claims are JCS-canonical JSON signed with Ed25519 + ML-DSA-65,
// not CBOR/COSE_Sign1. Do not describe it as C2PA or C2PA-compatible anywhere.
//
// EU AI Act Code of Practice on Transparent Generative AI, Section 1:
// mandatory marking via "in-band signed metadata attached to the content
// and/or watermarking".
//
// This module writes a hybrid-signed (Ed25519 + ML-DSA-65 / NIST FIPS 204)
// PSI claim INTO the asset bytes themselves, using the container mechanism
// each format defines for C2PA:
//
//   JPEG  → APP11 marker segments carrying a JUMBF superbox ("JP" prefix)
//   PNG   → `caBX` ancillary chunk before IEND (CRC32 checked)
//   MP4   → top-level `uuid` box with the C2PA UUID
//   WAV   → RIFF `C2PA` chunk (RIFF size field repaired)
//   PDF   → trailing marked block after %%EOF
//   other → trailing marked block
//
// Every container carries the same self-describing JSON box so extraction is
// deterministic:  "APEXPSI-C2PA-V1" | uint32be length | UTF-8 JSON
//
// Tamper evidence: the claim binds `hard_binding.pre_embed_sha256`, the
// SHA-256 of the exact asset bytes before the box was inserted. A verifier
// strips the box, re-hashes, and compares. Any edit to a single byte of the
// asset OR of the claim breaks either the binding or the hybrid signature.
// ═══════════════════════════════════════════════════════════════════════

import {
  hybridSignEphemeral, hybridSignInstitutional, hybridVerify, isInstitutionalSignature,
  HybridSignature, HYBRID_SUITE, ISSUER_ID, TRUST_ANCHOR_URL,
} from "@/lib/psi-pqc";
import { jcsCanonicalize } from "@/lib/psi-canonicalize";
import { watermarkImageToPng, detectWatermarkInBlob, WM_METHOD, WatermarkDetection } from "@/lib/psi-watermark";

export const PSI_BOX_MAGIC = "APEXPSI-C2PA-V1";
export const PSI_MANIFEST_SPEC = "PSI-INBAND-v1";
export const C2PA_UUID = new Uint8Array([
  0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81,
]);

/**
 * Seal mode.
 *  institutional — signed by the published APEX PSI identity. Attributable:
 *                  the manifest chains to /.well-known/apex-psi-trust-anchor.json
 *  self          — ephemeral random keypair, discarded after signing. Proves
 *                  integrity only; NOT attributable to any identity.
 */
export type SealMode = "institutional" | "self";

export const SELF_SEAL_ISSUER = "urn:apex-psi:issuer:self-sealed";

export const DIGITAL_SOURCE_TYPES = {
  aiGenerated: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
  aiEdited: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
  capture: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
} as const;

export type SourceType = keyof typeof DIGITAL_SOURCE_TYPES;

export interface PsiClaim {
  spec: typeof PSI_MANIFEST_SPEC;
  claim_generator: string;
  instance_id: string;
  created_at: string;
  format: string;
  title: string;
  signature_suite: typeof HYBRID_SUITE;
  /** Identity that signed this claim, or the self-sealed sentinel. */
  issuer: string;
  /** Where the public half of the issuer identity is published. */
  trust_anchor: string | null;
  assertions: Array<{ label: string; data: Record<string, unknown> }>;
  hard_binding: { alg: "sha256"; pre_embed_sha256: string; size_bytes: number };
  verify_url: string;
}

export interface PsiManifest {
  magic: typeof PSI_BOX_MAGIC;
  claim: PsiClaim;
  signature: HybridSignature;
}


// ── byte helpers ───────────────────────────────────────────────────────
const enc = new TextEncoder();
const dec = new TextDecoder();

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}
function readU32be(b: Uint8Array, o: number) {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
}
function u32le(n: number): Uint8Array {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}

export async function sha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const buf = bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes;
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

// ── the PSI JSON box ───────────────────────────────────────────────────
function packBox(manifest: PsiManifest): Uint8Array {
  const json = enc.encode(JSON.stringify(manifest));
  return concat(enc.encode(PSI_BOX_MAGIC), u32be(json.length), json);
}

function unpackBox(bytes: Uint8Array): { manifest: PsiManifest; start: number; end: number } | null {
  const magic = enc.encode(PSI_BOX_MAGIC);
  const at = indexOfBytes(bytes, magic);
  if (at < 0) return null;
  const lenAt = at + magic.length;
  if (lenAt + 4 > bytes.length) return null;
  const len = readU32be(bytes, lenAt);
  const start = lenAt + 4;
  if (len <= 0 || start + len > bytes.length) return null;
  try {
    const manifest = JSON.parse(dec.decode(bytes.subarray(start, start + len))) as PsiManifest;
    return { manifest, start: at, end: start + len };
  } catch {
    return null;
  }
}

// ── container writers ──────────────────────────────────────────────────
function jumbfSuperbox(payload: Uint8Array): Uint8Array {
  // JUMBF description box (jumd) + content box (json-ish bidb) inside a jumb superbox.
  const jumd = concat(enc.encode("jumd"), C2PA_UUID, new Uint8Array([0x03]), enc.encode("psi.c2pa\0"));
  const jumdBox = concat(u32be(4 + jumd.length), jumd);
  const contentBox = concat(u32be(8 + payload.length), enc.encode("bidb"), payload);
  const inner = concat(jumdBox, contentBox);
  return concat(u32be(8 + inner.length), enc.encode("jumb"), inner);
}

const APP11_MAX = 65000;

function embedJpeg(src: Uint8Array, box: Uint8Array): Uint8Array {
  if (!(src[0] === 0xff && src[1] === 0xd8)) throw new Error("Not a JPEG");
  const jumbf = jumbfSuperbox(box);
  const segments: Uint8Array[] = [];
  let seq = 1;
  for (let off = 0; off < jumbf.length; off += APP11_MAX) {
    const chunk = jumbf.subarray(off, Math.min(off + APP11_MAX, jumbf.length));
    // APP11 payload: "JP" | box instance (2) | packet sequence (4) | data
    const payload = concat(enc.encode("JP"), new Uint8Array([0x00, 0x01]), u32be(seq++), chunk);
    const segLen = payload.length + 2;
    segments.push(concat(new Uint8Array([0xff, 0xeb]), new Uint8Array([(segLen >> 8) & 255, segLen & 255]), payload));
  }
  return concat(src.subarray(0, 2), ...segments, src.subarray(2));
}

function extractJpeg(src: Uint8Array): Uint8Array | null {
  if (!(src[0] === 0xff && src[1] === 0xd8)) return null;
  let i = 2;
  const parts: Uint8Array[] = [];
  while (i + 4 <= src.length) {
    if (src[i] !== 0xff) { i++; continue; }
    const marker = src[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xda || marker === 0xd9) break;
    const len = (src[i + 2] << 8) + src[i + 3];
    if (len < 2) break;
    if (marker === 0xeb) {
      const payload = src.subarray(i + 4, i + 2 + len);
      if (payload[0] === 0x4a && payload[1] === 0x50) parts.push(payload.subarray(8));
    }
    i += 2 + len;
  }
  return parts.length ? concat(...parts) : null;
}

function stripJpeg(src: Uint8Array): Uint8Array {
  if (!(src[0] === 0xff && src[1] === 0xd8)) return src;
  const out: Uint8Array[] = [src.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= src.length) {
    if (src[i] !== 0xff) { out.push(src.subarray(i)); return concat(...out); }
    const marker = src[i + 1];
    if (marker === 0xda || marker === 0xd9) { out.push(src.subarray(i)); return concat(...out); }
    const len = (src[i + 2] << 8) + src[i + 3];
    if (len < 2) { out.push(src.subarray(i)); return concat(...out); }
    const seg = src.subarray(i, i + 2 + len);
    const isPsiApp11 = marker === 0xeb && seg[4] === 0x4a && seg[5] === 0x50;
    if (!isPsiApp11) out.push(seg);
    i += 2 + len;
  }
  return concat(...out);
}

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunks(src: Uint8Array) {
  const chunks: Array<{ type: string; start: number; end: number; data: Uint8Array }> = [];
  let i = 8;
  while (i + 8 <= src.length) {
    const len = readU32be(src, i);
    const type = dec.decode(src.subarray(i + 4, i + 8));
    const end = i + 12 + len;
    if (end > src.length) break;
    chunks.push({ type, start: i, end, data: src.subarray(i + 8, i + 8 + len) });
    i = end;
    if (type === "IEND") break;
  }
  return chunks;
}

function embedPng(src: Uint8Array, box: Uint8Array): Uint8Array {
  if (!PNG_SIG.every((v, i) => src[i] === v)) throw new Error("Not a PNG");
  const chunks = pngChunks(src);
  const iend = chunks.find((c) => c.type === "IEND");
  const insertAt = iend ? iend.start : src.length;
  const body = concat(enc.encode("caBX"), box);
  const chunk = concat(u32be(box.length), body, u32be(crc32(body)));
  return concat(src.subarray(0, insertAt), chunk, src.subarray(insertAt));
}

function extractPng(src: Uint8Array): Uint8Array | null {
  if (!PNG_SIG.every((v, i) => src[i] === v)) return null;
  const c = pngChunks(src).find((x) => x.type === "caBX");
  return c ? c.data : null;
}

function stripPng(src: Uint8Array): Uint8Array {
  if (!PNG_SIG.every((v, i) => src[i] === v)) return src;
  const parts: Uint8Array[] = [src.subarray(0, 8)];
  for (const c of pngChunks(src)) if (c.type !== "caBX") parts.push(src.subarray(c.start, c.end));
  return concat(...parts);
}

function embedMp4(src: Uint8Array, box: Uint8Array): Uint8Array {
  const payload = concat(C2PA_UUID, box);
  const uuidBox = concat(u32be(8 + payload.length), enc.encode("uuid"), payload);
  return concat(src, uuidBox);
}

function embedWav(src: Uint8Array, box: Uint8Array): Uint8Array {
  const pad = box.length % 2 ? 1 : 0;
  const chunk = concat(enc.encode("C2PA"), u32le(box.length), box, new Uint8Array(pad));
  const out = concat(src, chunk);
  if (dec.decode(out.subarray(0, 4)) === "RIFF") out.set(u32le(out.length - 8), 4);
  return out;
}

function trailerBlock(box: Uint8Array): Uint8Array {
  return concat(enc.encode("\n%%APEX-PSI-C2PA-BEGIN\n"), box, enc.encode("\n%%APEX-PSI-C2PA-END\n"));
}

// ── format detection ───────────────────────────────────────────────────
export type Container = "jpeg" | "png" | "mp4" | "wav" | "pdf" | "trailer";

export function detectContainer(bytes: Uint8Array, mime?: string): Container {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (PNG_SIG.every((v, i) => bytes[i] === v)) return "png";
  if (dec.decode(bytes.subarray(0, 4)) === "RIFF" && dec.decode(bytes.subarray(8, 12)) === "WAVE") return "wav";
  if (dec.decode(bytes.subarray(4, 8)) === "ftyp") return "mp4";
  if (dec.decode(bytes.subarray(0, 5)) === "%PDF-") return "pdf";
  if (mime?.startsWith("video/")) return "mp4";
  return "trailer";
}

export const CONTAINER_MECHANISM: Record<Container, string> = {
  jpeg: "APP11 marker segment · JUMBF superbox",
  png: "caBX ancillary chunk (CRC32)",
  mp4: "ISO BMFF top-level uuid box (C2PA UUID)",
  wav: "RIFF C2PA chunk",
  pdf: "trailing signed block after %%EOF",
  trailer: "trailing signed block",
};

// ── public API ─────────────────────────────────────────────────────────
export interface EmbedOptions {
  sourceType?: SourceType;
  generator?: string;
  title?: string;
  watermark?: boolean; // rasters only; forces lossless PNG output
  extraAssertions?: Array<{ label: string; data: Record<string, unknown> }>;
  verifyBase?: string;
  /** Default "institutional" — falls back to a self seal if the signer is unreachable. */
  mode?: SealMode;
}

export interface EmbedResult {
  blob: Blob;
  fileName: string;
  manifest: PsiManifest;
  container: Container;
  mechanism: string;
  watermarked: boolean;
  preEmbedSha256: string;
  finalSha256: string;
  claimDigest: string;
  /** Mode actually used (may differ from the request if the signer was down). */
  mode: SealMode;
  issuer: string;
}


const VERIFY_BASE = "https://ai-governance-standard.com/verify";

/**
 * Attach in-band, hybrid-signed, tamper-evident PSI-INBAND-v1 metadata
 * (and, for rasters, an invisible watermark) to a file.
 */
export async function embedInBandCredentials(file: File | Blob, opts: EmbedOptions = {}): Promise<EmbedResult> {
  const name = (file as File).name || "asset.bin";
  const mime = file.type || "application/octet-stream";
  const sourceType: SourceType = opts.sourceType ?? "capture";
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(await file.arrayBuffer());
  let container = detectContainer(bytes, mime);

  // Strip any prior PSI box so re-sealing is idempotent, never nested.
  bytes = stripExistingBox(bytes, container);

  // 1. Watermark first (rasters only) — the claim then binds the watermarked pixels.
  let watermarked = false;
  let outName = name;
  if (opts.watermark && (container === "png" || container === "jpeg")) {
    const claimSeed = await sha256Hex(bytes);
    bytes = await watermarkImageToPng(new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime }), claimSeed);
    container = "png";
    watermarked = true;
    outName = name.replace(/\.(jpe?g|png|webp|bmp)$/i, "") + ".png";
  }

  const preEmbedSha256 = await sha256Hex(bytes);

  const requestedMode: SealMode = opts.mode ?? "institutional";
  const instanceId = `urn:uuid:${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const buildClaim = (mode: SealMode): PsiClaim => ({
    spec: PSI_MANIFEST_SPEC,
    claim_generator: opts.generator ?? "APEX-PSI/1.0 (apex-pramaan)",
    instance_id: instanceId,
    created_at: createdAt,
    format: mime,
    title: outName,
    signature_suite: HYBRID_SUITE,
    issuer: mode === "institutional" ? ISSUER_ID : SELF_SEAL_ISSUER,
    trust_anchor: mode === "institutional" ? TRUST_ANCHOR_URL : null,
    assertions: [
      {
        label: "c2pa.actions",
        data: {
          actions: [
            {
              action: "c2pa.created",
              digitalSourceType: DIGITAL_SOURCE_TYPES[sourceType],
              softwareAgent: opts.generator ?? "APEX PSI",
              when: createdAt,
            },
          ],
        },
      },
      {
        label: "c2pa.hash.data",
        data: { alg: "sha256", hash: preEmbedSha256, exclusions: [{ box: PSI_BOX_MAGIC }] },
      },
      ...(watermarked
        ? [{ label: "psi.watermark", data: { method: WM_METHOD, channels: "RGB-LSB", payload: "sync16+sha256" } }]
        : []),
      ...(opts.extraAssertions ?? []),
    ],
    hard_binding: { alg: "sha256", pre_embed_sha256: preEmbedSha256, size_bytes: bytes.length },
    verify_url: `${opts.verifyBase ?? VERIFY_BASE}?h=${preEmbedSha256}`,
  });

  let mode: SealMode = requestedMode;
  let claim = buildClaim(mode);
  let signature: HybridSignature;
  if (mode === "institutional") {
    try {
      signature = await hybridSignInstitutional(jcsCanonicalize(claim));
    } catch {
      // Signer unreachable → degrade to an honest self seal rather than
      // claiming an attribution we cannot prove.
      mode = "self";
      claim = buildClaim(mode);
      signature = await hybridSignEphemeral(jcsCanonicalize(claim));
    }
  } else {
    signature = await hybridSignEphemeral(jcsCanonicalize(claim));
  }

  const manifest: PsiManifest = { magic: PSI_BOX_MAGIC, claim, signature };
  const box = packBox(manifest);

  let out: Uint8Array;
  switch (container) {
    case "jpeg": out = embedJpeg(bytes, box); break;
    case "png": out = embedPng(bytes, box); break;
    case "mp4": out = embedMp4(bytes, box); break;
    case "wav": out = embedWav(bytes, box); break;
    default: out = concat(bytes, trailerBlock(box)); break;
  }

  const outType = watermarked ? "image/png" : mime;
  const blob = new Blob([out.slice().buffer as ArrayBuffer], { type: outType });
  return {
    blob,
    fileName: outName,
    manifest,
    container,
    mechanism: CONTAINER_MECHANISM[container],
    watermarked,
    preEmbedSha256,
    finalSha256: await sha256Hex(out),
    claimDigest: signature.message_hash,
    mode,
    issuer: claim.issuer,
  };
}


function stripExistingBox(bytes: Uint8Array, container: Container): Uint8Array {
  if (container === "jpeg") return stripJpeg(bytes);
  if (container === "png") return stripPng(bytes);
  const found = unpackBox(bytes);
  if (!found) return bytes;
  // For appended containers the box lives in a trailing structure — cut from
  // the enclosing header (uuid/C2PA/marker) onwards.
  const markers = ["\n%%APEX-PSI-C2PA-BEGIN\n", "uuid", "C2PA"];
  let cut = found.start;
  for (const m of markers) {
    const at = indexOfBytes(bytes, enc.encode(m));
    if (at >= 0 && at < cut) cut = at;
  }
  if (container === "mp4" || container === "wav") cut = Math.max(0, cut - 8);
  return bytes.subarray(0, cut);
}

export interface InBandVerification {
  found: boolean;
  container: Container | null;
  mechanism: string | null;
  manifest: PsiManifest | null;
  signatureValid: boolean;
  ed25519Valid: boolean;
  mldsaValid: boolean;
  bindingValid: boolean;
  computedSha256: string | null;
  watermark: WatermarkDetection | null;
  verdict: "VALID" | "TAMPERED" | "UNSIGNED";
  /** Issuer declared in the claim (or null when unsigned). */
  issuer: string | null;
  /** True only if the signing keys match the published APEX PSI trust anchor. */
  issuerVerified: boolean;
  /** Human-readable attribution verdict. */
  attribution: "APEX PSI institutional seal" | "Self-sealed (integrity only)" | "Unknown issuer" | "None";
  notes: string[];
}

/** Extract and cryptographically verify in-band credentials from a file. */
export async function verifyInBandCredentials(file: File | Blob): Promise<InBandVerification> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const container = detectContainer(bytes, file.type);
  const notes: string[] = [];

  let boxBytes: Uint8Array | null = null;
  if (container === "jpeg") boxBytes = extractJpeg(bytes);
  else if (container === "png") boxBytes = extractPng(bytes);
  if (!boxBytes) boxBytes = bytes; // trailer/uuid/RIFF: scan raw

  const found = unpackBox(boxBytes);
  const watermark = container === "png" || container === "jpeg" ? await detectWatermarkInBlob(file) : null;

  if (!found) {
    return {
      found: false, container, mechanism: CONTAINER_MECHANISM[container], manifest: null,
      signatureValid: false, ed25519Valid: false, mldsaValid: false, bindingValid: false,
      computedSha256: await sha256Hex(bytes), watermark,
      verdict: "UNSIGNED",
      issuer: null, issuerVerified: false, attribution: "None",
      notes: ["No APEX PSI in-band manifest present in this asset."],
    };
  }

  const manifest = found.manifest;
  const canonical = jcsCanonicalize(manifest.claim);
  const sig = await hybridVerify(canonical, manifest.signature);
  if (!sig.ed25519_ok) notes.push("Ed25519 signature does not match the claim.");
  if (!sig.mldsa_ok) notes.push("ML-DSA-65 signature does not match the claim.");

  const stripped = stripExistingBox(bytes, container);
  const computedSha256 = await sha256Hex(stripped);
  const bindingValid = computedSha256 === manifest.claim.hard_binding.pre_embed_sha256;
  if (!bindingValid) notes.push("Hard binding mismatch — the asset bytes changed after sealing.");
  if (watermark && manifest.claim.assertions.some((a) => a.label === "psi.watermark")) {
    if (!watermark.present) notes.push("Declared watermark could not be recovered (asset was re-encoded or cropped).");
  }

  // Attribution: do the signing keys actually match the published anchor?
  const issuer = manifest.claim.issuer ?? null;
  const issuerVerified = sig.ok && (await isInstitutionalSignature(manifest.signature));
  let attribution: InBandVerification["attribution"];
  if (issuerVerified) {
    attribution = "APEX PSI institutional seal";
    notes.push(`Signing keys match the published trust anchor (${issuer}). This seal is attributable.`);
  } else if (issuer === SELF_SEAL_ISSUER || issuer === null) {
    attribution = "Self-sealed (integrity only)";
    notes.push("Self seal: an ephemeral keypair signed this claim. It proves the bytes are unmodified, not who sealed them.");
  } else {
    attribution = "Unknown issuer";
    notes.push(`Claim declares issuer "${issuer}" but the signing keys do not match the published APEX PSI trust anchor.`);
  }

  const ok = sig.ok && bindingValid;
  if (ok) notes.push("Hybrid signature and hard binding both verify. Asset is unmodified since sealing.");

  return {
    found: true, container, mechanism: CONTAINER_MECHANISM[container], manifest,
    signatureValid: sig.ok, ed25519Valid: sig.ed25519_ok, mldsaValid: sig.mldsa_ok,
    bindingValid, computedSha256, watermark,
    verdict: ok ? "VALID" : "TAMPERED",
    issuer, issuerVerified, attribution,
    notes,

  };
}

export { detectWatermarkInBlob };
