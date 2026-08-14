// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Robust transform-domain watermark  (psi.dct-qim-v2)
//
// Replaces the fragile LSB scheme (psi.lsb-spread-v1) which did not survive
// lossy re-encoding. This mark lives in the 8x8 block DCT of the luminance
// channel, embedded with quantisation index modulation (QIM / dither
// modulation) on mid-frequency coefficients.
//
// Design targets (see /robustness for the measured benchmark):
//   • JPEG re-encode q75 / q50
//   • 0.5x and 2x resampling
//   • 25% crop
//   • screenshot-style re-capture (resample + requantise)
//   • one social-platform-style recompression pass
//
// Payload  : 32-bit sync word "PSI1" + 128-bit digest prefix = 160 bits.
// Tiling   : the 160 bits are laid out on a 16x10 block tile which repeats
//            across the whole raster, so every payload bit is carried by many
//            blocks (majority vote) and a crop only *rotates* the tile — the
//            detector brute-forces all 160 rotations and locks on the sync word.
// Scale    : the detector also brute-forces a small set of rescale candidates,
//            so a resized asset is normalised back onto the block grid.
// ═══════════════════════════════════════════════════════════════════════

export const WM2_METHOD = "psi.dct-qim-v2";
export const WM2_SPEC = "8x8 block DCT · QIM on mid-band coefficients · 16x10 tile · majority vote";

const TILE_W = 16;
const TILE_H = 10;
export const PAYLOAD_BITS = TILE_W * TILE_H; // 160
const SYNC_BITS = 32;
const DIGEST_BITS = PAYLOAD_BITS - SYNC_BITS; // 128
const SYNC_WORD = [0x50, 0x53, 0x49, 0x31]; // "PSI1"

/** Embedding strength (DCT quantisation step). Higher = more robust, more visible. */
export const DEFAULT_DELTA = 30;

// mid-frequency coefficients: robust to JPEG quantisation, invisible to the eye
const COEFFS: Array<[number, number]> = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
];

// ── DCT-II / III on 8x8 blocks ─────────────────────────────────────────
const COS = (() => {
  const t = new Float64Array(64);
  for (let u = 0; u < 8; u++)
    for (let x = 0; x < 8; x++) t[u * 8 + x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  return t;
})();
const C0 = Math.SQRT1_2;

function dct8x8(block: Float64Array, out: Float64Array) {
  const tmp = new Float64Array(64);
  for (let y = 0; y < 8; y++)
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let x = 0; x < 8; x++) s += block[y * 8 + x] * COS[u * 8 + x];
      tmp[y * 8 + u] = s * 0.5 * (u === 0 ? C0 : 1);
    }
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 8; y++) s += tmp[y * 8 + u] * COS[v * 8 + y];
      out[v * 8 + u] = s * 0.5 * (v === 0 ? C0 : 1);
    }
}

function idct8x8(coef: Float64Array, out: Float64Array) {
  const tmp = new Float64Array(64);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let s = 0;
      for (let u = 0; u < 8; u++) s += (u === 0 ? C0 : 1) * coef[y * 8 + u] * COS[u * 8 + x];
      tmp[y * 8 + x] = s * 0.5;
    }
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++) {
      let s = 0;
      for (let v = 0; v < 8; v++) s += (v === 0 ? C0 : 1) * tmp[v * 8 + x] * COS[v * 8 + y];
      out[y * 8 + x] = s * 0.5;
    }
}

// ── payload helpers ────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** 160-bit payload: sync word then the first 16 bytes of the digest. */
export function buildBits(digestHex: string): Uint8Array {
  const digest = hexToBytes(digestHex).slice(0, DIGEST_BITS / 8);
  const bytes = new Uint8Array(PAYLOAD_BITS / 8);
  bytes.set(SYNC_WORD, 0);
  bytes.set(digest, SYNC_WORD.length);
  const bits = new Uint8Array(PAYLOAD_BITS);
  for (let i = 0; i < bytes.length; i++)
    for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
  return bits;
}

function bitsToBytes(bits: Uint8Array): Uint8Array {
  const out = new Uint8Array(bits.length / 8);
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
    out[i] = v;
  }
  return out;
}

// ── luminance <-> RGB ──────────────────────────────────────────────────
function toLuma(img: ImageData): Float64Array {
  const y = new Float64Array(img.width * img.height);
  const d = img.data;
  for (let i = 0, p = 0; i < y.length; i++, p += 4)
    y[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  return y;
}

function applyLumaDelta(img: ImageData, before: Float64Array, after: Float64Array) {
  const d = img.data;
  for (let i = 0, p = 0; i < before.length; i++, p += 4) {
    const dl = after[i] - before[i];
    if (dl === 0) continue;
    d[p] = Math.max(0, Math.min(255, Math.round(d[p] + dl)));
    d[p + 1] = Math.max(0, Math.min(255, Math.round(d[p + 1] + dl)));
    d[p + 2] = Math.max(0, Math.min(255, Math.round(d[p + 2] + dl)));
  }
}

function bitIndex(bx: number, by: number): number {
  return (by % TILE_H) * TILE_W + (bx % TILE_W);
}

// ── embed ──────────────────────────────────────────────────────────────
/** Embed the robust mark into ImageData in place. Returns the block count used. */
export function embedDctWatermark(img: ImageData, digestHex: string, delta = DEFAULT_DELTA): number {
  const bits = buildBits(digestHex);
  const { width: W, height: H } = img;
  const luma = toLuma(img);
  const out = Float64Array.from(luma);
  const block = new Float64Array(64);
  const coef = new Float64Array(64);
  const rec = new Float64Array(64);
  let used = 0;

  for (let by = 0; by * 8 + 8 <= H; by++) {
    for (let bx = 0; bx * 8 + 8 <= W; bx++) {
      const bit = bits[bitIndex(bx, by)];
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) block[y * 8 + x] = luma[(by * 8 + y) * W + bx * 8 + x] - 128;
      dct8x8(block, coef);
      for (const [u, v] of COEFFS) {
        const idx = v * 8 + u;
        const c = coef[idx];
        let q = Math.round(c / delta);
        if ((q & 1) !== bit) q += c / delta >= q ? 1 : -1;
        coef[idx] = q * delta;
      }
      idct8x8(coef, rec);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) out[(by * 8 + y) * W + bx * 8 + x] = rec[y * 8 + x] + 128;
      used++;
    }
  }
  applyLumaDelta(img, luma, out);
  return used;
}

// ── detect ─────────────────────────────────────────────────────────────
export interface Wm2Detection {
  present: boolean;
  digest: string | null;
  /** Fraction of embedded coefficient votes that agreed with the decoded bit. */
  confidence: number;
  /** Sync-word bit agreement (1 = perfect lock). */
  syncScore: number;
  blocks: number;
  rotation: number;
  scale: number;
  offsetX?: number;
  offsetY?: number;
  method: string;
}

const EMPTY: Wm2Detection = {
  present: false, digest: null, confidence: 0, syncScore: 0,
  blocks: 0, rotation: 0, scale: 1, offsetX: 0, offsetY: 0, method: WM2_METHOD,
};

function softVotes(
  luma: Float64Array,
  W: number,
  H: number,
  delta: number,
  ox = 0,
  oy = 0
): { votes: Float64Array; weight: Float64Array; blocks: number } {
  const votes = new Float64Array(PAYLOAD_BITS); // signed: >0 → 1
  const weight = new Float64Array(PAYLOAD_BITS);
  const block = new Float64Array(64);
  const coef = new Float64Array(64);
  let blocks = 0;

  for (let by = 0; oy + by * 8 + 8 <= H; by++) {
    for (let bx = 0; ox + bx * 8 + 8 <= W; bx++) {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
          block[y * 8 + x] = luma[(oy + by * 8 + y) * W + ox + bx * 8 + x] - 128;
      dct8x8(block, coef);
      const idx = bitIndex(bx, by);
      for (const [u, v] of COEFFS) {
        const c = coef[v * 8 + u] / delta;
        const q = Math.round(c);
        const conf = 1 - 2 * Math.abs(c - q); // 1 = right on the lattice point
        const bit = q & 1 ? 1 : 0;
        votes[idx] += (bit ? 1 : -1) * Math.max(conf, 0.02);
        weight[idx] += Math.max(conf, 0.02);
      }
      blocks++;
    }
  }
  return { votes, weight, blocks };
}

/**
 * Decode the tile. A crop translates the block grid, which shifts the tile in
 * BOTH axes, so the search is over the 16x10 two-dimensional shift group
 * (160 candidates) — the sync word tells us which shift is the true origin.
 */
function decodeFromVotes(votes: Float64Array, weight: Float64Array, blocks: number, scale: number): Wm2Detection {
  const bits = new Uint8Array(PAYLOAD_BITS);
  for (let i = 0; i < PAYLOAD_BITS; i++) bits[i] = votes[i] > 0 ? 1 : 0;

  let best: Wm2Detection = { ...EMPTY, blocks, scale };
  const syncBits = buildBits("0".repeat(64)).subarray(0, SYNC_BITS);
  const shifted = new Uint8Array(PAYLOAD_BITS);
  const srcIdx = new Int32Array(PAYLOAD_BITS);

  for (let sy = 0; sy < TILE_H; sy++) {
    for (let sx = 0; sx < TILE_W; sx++) {
      for (let r = 0; r < TILE_H; r++)
        for (let c = 0; c < TILE_W; c++) {
          const j = ((r + sy) % TILE_H) * TILE_W + ((c + sx) % TILE_W);
          srcIdx[r * TILE_W + c] = j;
          shifted[r * TILE_W + c] = bits[j];
        }
      let agree = 0;
      for (let i = 0; i < SYNC_BITS; i++) if (shifted[i] === syncBits[i]) agree++;
      const syncScore = agree / SYNC_BITS;
      if (syncScore > best.syncScore) {
        let wsum = 0, csum = 0;
        for (let i = 0; i < PAYLOAD_BITS; i++) {
          wsum += weight[srcIdx[i]];
          csum += Math.abs(votes[srcIdx[i]]);
        }
        const bytes = bitsToBytes(shifted);
        best = {
          present: syncScore >= 0.9,
          digest: bytesToHex(bytes.subarray(SYNC_WORD.length)),
          confidence: wsum ? csum / wsum : 0,
          syncScore,
          blocks,
          rotation: sy * TILE_W + sx,
          scale,
          method: WM2_METHOD,
        };
      }
    }
  }
  return best;
}

/** Candidate rescale factors tried by the detector (resize / screenshot recovery). */
export const SCALE_CANDIDATES = [1, 2, 0.5, 0.8, 1.25, 1.5, 1 / 1.5, 4, 0.25];

function rescale(img: ImageData, factor: number): ImageData | null {
  const w = Math.round(img.width * factor);
  const h = Math.round(img.height * factor);
  if (w < 64 || h < 64 || w > 6000 || h > 6000) return null;
  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  src.getContext("2d")!.putImageData(img, 0, 0);
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Detect the robust mark. Search is staged so the common case stays fast:
 *   A) each rescale candidate at grid offset (0,0)
 *   B) if no lock, the full 8x8 grid-offset search (recovers arbitrary crops)
 *      at the most promising scales
 */
export function detectDctWatermarkInImageData(img: ImageData, delta = DEFAULT_DELTA): Wm2Detection {
  let best: Wm2Detection = { ...EMPTY };
  const cache = new Map<number, ImageData | null>();
  const at = (scale: number) => {
    if (!cache.has(scale)) cache.set(scale, scale === 1 ? img : rescale(img, scale));
    return cache.get(scale) ?? null;
  };

  const probe = (scale: number, ox: number, oy: number) => {
    const cand = at(scale);
    if (!cand || cand.width < 8 + ox || cand.height < 8 + oy) return;
    const luma = toLuma(cand);
    const { votes, weight, blocks } = softVotes(luma, cand.width, cand.height, delta, ox, oy);
    const d = decodeFromVotes(votes, weight, blocks, scale);
    if (d.syncScore > best.syncScore) best = { ...d, offsetX: ox, offsetY: oy };
  };

  for (const scale of SCALE_CANDIDATES) {
    probe(scale, 0, 0);
    if (best.syncScore === 1) return best;
  }

  for (const scale of SCALE_CANDIDATES) {
    for (let oy = 0; oy < 8; oy++) {
      for (let ox = 0; ox < 8; ox++) {
        if (ox === 0 && oy === 0) continue;
        probe(scale, ox, oy);
        if (best.syncScore === 1) return best;
      }
    }
  }
  return best;
}

// ── blob helpers ───────────────────────────────────────────────────────
export async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToCanvas(img: ImageData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality)
  );
}

/** Mark a raster and return the encoded bytes (PNG by default, JPEG if asked). */
export async function watermarkImageRobust(
  blob: Blob,
  digestHex: string,
  output: { type?: string; quality?: number; delta?: number } = {}
): Promise<Uint8Array> {
  const img = await blobToImageData(blob);
  embedDctWatermark(img, digestHex, output.delta ?? DEFAULT_DELTA);
  const out = await canvasToBlob(imageDataToCanvas(img), output.type ?? "image/png", output.quality);
  return new Uint8Array(await out.arrayBuffer());
}

/** Detect the robust mark in any raster the browser can decode. */
export async function detectDctWatermarkInBlob(blob: Blob, delta = DEFAULT_DELTA): Promise<Wm2Detection> {
  try {
    return detectDctWatermarkInImageData(await blobToImageData(blob), delta);
  } catch {
    return { ...EMPTY };
  }
}

// ── distortion channel (used by the live demo and the benchmark) ────────
export type DistortionId =
  | "none" | "jpeg75" | "jpeg50" | "resize50" | "resize200"
  | "crop25" | "screenshot" | "social" | "chain";

export const DISTORTIONS: Array<{ id: DistortionId; label: string; detail: string }> = [
  { id: "none", label: "No distortion", detail: "Lossless PNG round-trip" },
  { id: "jpeg75", label: "JPEG q75", detail: "Single JPEG re-encode at quality 0.75" },
  { id: "jpeg50", label: "JPEG q50", detail: "Single JPEG re-encode at quality 0.50" },
  { id: "resize50", label: "Resize 0.5x", detail: "Bilinear downscale to half width/height" },
  { id: "resize200", label: "Resize 2x", detail: "Bilinear upscale to double width/height" },
  { id: "crop25", label: "Crop 25%", detail: "Centre crop removing 25% of the area" },
  { id: "screenshot", label: "Screenshot", detail: "Resample at 1.25x device ratio then JPEG q80" },
  { id: "social", label: "Social repost", detail: "Downscale to 1080px wide then JPEG q65 twice" },
  { id: "chain", label: "Chained attack", detail: "JPEG q50, then 0.5x downscale, then 25% centre crop" },
];

async function encodeDecode(img: ImageData, type: string, quality: number): Promise<ImageData> {
  const blob = await canvasToBlob(imageDataToCanvas(img), type, quality);
  return blobToImageData(blob);
}

function cropCenter(img: ImageData, keep: number): ImageData {
  const w = Math.max(64, Math.round(img.width * Math.sqrt(keep)));
  const h = Math.max(64, Math.round(img.height * Math.sqrt(keep)));
  const x = Math.round((img.width - w) / 2);
  const y = Math.round((img.height - h) / 2);
  const src = imageDataToCanvas(img);
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Apply one distortion to marked ImageData, entirely client-side. */
export async function applyDistortion(img: ImageData, id: DistortionId): Promise<ImageData> {
  switch (id) {
    case "none":
      return encodeDecode(img, "image/png", 1);
    case "jpeg75":
      return encodeDecode(img, "image/jpeg", 0.75);
    case "jpeg50":
      return encodeDecode(img, "image/jpeg", 0.5);
    case "resize50":
      return rescale(img, 0.5) ?? img;
    case "resize200":
      return rescale(img, 2) ?? img;
    case "crop25":
      return cropCenter(img, 0.75);
    case "screenshot": {
      const up = rescale(img, 1.25) ?? img;
      return encodeDecode(up, "image/jpeg", 0.8);
    }
    case "chain": {
      const a = await encodeDecode(img, "image/jpeg", 0.5);
      const b = rescale(a, 0.5) ?? a;
      return cropCenter(b, 0.75);
    }
    case "social": {
      const factor = Math.min(1, 1080 / img.width);
      const down = factor === 1 ? img : rescale(img, factor) ?? img;
      const once = await encodeDecode(down, "image/jpeg", 0.65);
      return encodeDecode(once, "image/jpeg", 0.65);
    }
  }
}

export interface BenchRow {
  id: DistortionId;
  label: string;
  detail: string;
  recovered: boolean;
  bitAccuracy: number;
  syncScore: number;
  scale: number;
}

/** Run the full distortion set against one marked image. Returns per-distortion rows. */
export async function runRobustnessBench(
  source: Blob,
  digestHex: string,
  delta = DEFAULT_DELTA,
  onRow?: (row: BenchRow) => void
): Promise<BenchRow[]> {
  const base = await blobToImageData(source);
  embedDctWatermark(base, digestHex, delta);
  const expected = buildBits(digestHex);
  const rows: BenchRow[] = [];

  for (const d of DISTORTIONS) {
    const marked = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
    const distorted = await applyDistortion(marked, d.id);
    const det = detectDctWatermarkInImageData(distorted, delta);
    const expectedDigest = bytesToHex(bitsToBytes(expected).subarray(SYNC_WORD.length));
    let acc = 0;
    if (det.digest) {
      const a = hexToBytes(expectedDigest);
      const b = hexToBytes(det.digest);
      let same = 0;
      for (let i = 0; i < a.length; i++)
        for (let k = 0; k < 8; k++) if (((a[i] >> k) & 1) === ((b[i] >> k) & 1)) same++;
      acc = same / (a.length * 8);
    }
    const row: BenchRow = {
      id: d.id,
      label: d.label,
      detail: d.detail,
      recovered: det.present && det.digest === expectedDigest,
      bitAccuracy: acc,
      syncScore: det.syncScore,
      scale: det.scale,
    };
    rows.push(row);
    onRow?.(row);
  }
  return rows;
}
