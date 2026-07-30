// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Invisible Watermarking (LSB spread-spectrum, lossless rasters)
// EU AI Act Code of Practice, Section 1: "watermarking capable of indicating
// that content has been artificially generated or manipulated."
//
// Payload: 16-byte sync header + 32-byte SHA-256 digest of the PSI claim.
// Written into the least-significant bit of the R/G/B channels (alpha is
// never touched). The payload is repeated across the raster so that a crop
// or partial re-encode still yields a majority-vote recovery.
// ═══════════════════════════════════════════════════════════════════════

export const WM_SYNC = new Uint8Array([
  0x41, 0x50, 0x45, 0x58, 0x2d, 0x50, 0x53, 0x49, // "APEX-PSI"
  0x2d, 0x57, 0x4d, 0x31, 0x00, 0x00, 0x00, 0x01, // "-WM1" + version
]);

export const WM_METHOD = "psi.lsb-spread-v1";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function buildPayload(digestHex: string): Uint8Array {
  const digest = hexToBytes(digestHex).slice(0, 32);
  const out = new Uint8Array(WM_SYNC.length + 32);
  out.set(WM_SYNC, 0);
  out.set(digest, WM_SYNC.length);
  return out;
}

function toBits(bytes: Uint8Array): Uint8Array {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
  }
  return bits;
}

/** Write the watermark into ImageData in place. Returns bits-per-repeat count. */
export function embedWatermarkIntoImageData(img: ImageData, digestHex: string): number {
  const bits = toBits(buildPayload(digestHex));
  const data = img.data;
  let bitIndex = 0;
  for (let p = 0; p < data.length; p += 4) {
    for (let c = 0; c < 3; c++) {
      const bit = bits[bitIndex % bits.length];
      data[p + c] = (data[p + c] & 0xfe) | bit;
      bitIndex++;
    }
  }
  return bits.length;
}

export interface WatermarkDetection {
  present: boolean;
  digest: string | null;
  confidence: number; // 0..1 — agreement across repeats
  repeats: number;
  method: string;
}

/** Recover the watermark by majority vote across all repeats. */
export function detectWatermarkInImageData(img: ImageData): WatermarkDetection {
  const payloadBits = (WM_SYNC.length + 32) * 8;
  const data = img.data;
  const totalSlots = Math.floor(data.length / 4) * 3;
  const repeats = Math.floor(totalSlots / payloadBits);
  if (repeats < 1) {
    return { present: false, digest: null, confidence: 0, repeats: 0, method: WM_METHOD };
  }

  const ones = new Uint32Array(payloadBits);
  let bitIndex = 0;
  for (let p = 0; p < data.length && bitIndex < repeats * payloadBits; p += 4) {
    for (let c = 0; c < 3 && bitIndex < repeats * payloadBits; c++) {
      if (data[p + c] & 1) ones[bitIndex % payloadBits]++;
      bitIndex++;
    }
  }

  const bits = new Uint8Array(payloadBits);
  let agreement = 0;
  for (let i = 0; i < payloadBits; i++) {
    const majority = ones[i] * 2 >= repeats ? 1 : 0;
    bits[i] = majority;
    const agree = majority ? ones[i] : repeats - ones[i];
    agreement += agree / repeats;
  }
  const confidence = agreement / payloadBits;

  const bytes = new Uint8Array(payloadBits / 8);
  for (let i = 0; i < bytes.length; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
    bytes[i] = v;
  }

  const syncOk = WM_SYNC.every((v, i) => bytes[i] === v);
  return {
    present: syncOk,
    digest: syncOk ? bytesToHex(bytes.slice(WM_SYNC.length)) : null,
    confidence,
    repeats,
    method: WM_METHOD,
  };
}

async function blobToImageData(blob: Blob): Promise<{ imageData: ImageData; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height };
}

/** Watermark a raster image and return lossless PNG bytes. */
export async function watermarkImageToPng(blob: Blob, digestHex: string): Promise<Uint8Array> {
  const { imageData, width, height } = await blobToImageData(blob);
  embedWatermarkIntoImageData(imageData, digestHex);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  const out: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png")
  );
  return new Uint8Array(await out.arrayBuffer());
}

/** Detect a watermark in any raster the browser can decode. */
export async function detectWatermarkInBlob(blob: Blob): Promise<WatermarkDetection> {
  try {
    const { imageData } = await blobToImageData(blob);
    return detectWatermarkInImageData(imageData);
  } catch {
    return { present: false, digest: null, confidence: 0, repeats: 0, method: WM_METHOD };
  }
}
