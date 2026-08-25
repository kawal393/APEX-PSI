// APEX PSI — the referee. Reads every provenance mark on a file and reports
// neutrally what each one proves and cannot prove. Favours no format,
// including its own. THE MIRROR DOES NOT BEND.

import { createC2pa, type C2pa } from "c2pa";
import wasmUrl from "c2pa/dist/assets/wasm/toolkit_bg.wasm?url";
import workerUrl from "c2pa/dist/c2pa.worker.min.js?url";
import { verifyInBandCredentials, sha256Hex } from "@/lib/c2pa-inband";
import { detectDctWatermarkInBlob } from "@/lib/psi-watermark-dct";

const VERIFY_HASH_URL =
  "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash";

export type ReaderStatus =
  | "verified"
  | "present"
  | "absent"
  | "failed"
  | "error";

export interface ReaderRow {
  id: string;
  label: string;
  status: ReaderStatus;
  detail: string;
  proves: string;
  cannotProve: string;
}

export interface VerifyAnyReport {
  fileName: string;
  fileSize: number;
  fileMime: string;
  sha256: string;
  ranAt: string;
  rows: ReaderRow[];
}

let c2paInstance: C2pa | null = null;
let c2paInit: Promise<C2pa | null> | null = null;

/** Clears the cached reader (tests and hot-reload only). */
export function resetC2paCache(): void {
  c2paInstance = null;
  c2paInit = null;
}

async function getC2pa(): Promise<C2pa | null> {
  if (c2paInstance) return c2paInstance;
  if (!c2paInit) {
    c2paInit = createC2pa({
      wasmSrc: wasmUrl,
      workerSrc: workerUrl,
      fetchRemoteManifests: false,
    })
      .then((inst) => {
        c2paInstance = inst;
        return inst;
      })
      .catch(() => null);
  }
  return c2paInit;
}

interface LooseManifest {
  title?: string;
  claimGenerator?: string;
  format?: string;
  vendor?: string | { name?: string };
}

interface LooseValidation {
  code?: string;
  explanation?: string;
  success?: boolean;
}

async function readC2paRow(file: File): Promise<ReaderRow> {
  const base: ReaderRow = {
    id: "c2pa",
    label: "C2PA Content Credentials",
    status: "absent",
    detail: "No C2PA manifest found.",
    proves:
      "That a manifest was attached at some point, and what its signer declared.",
    cannotProve:
      "What happened to the file after the manifest was attached — screenshots, recompression and cropping destroy it.",
  };
  try {
    const c2pa = await getC2pa();
    if (!c2pa) {
      return {
        ...base,
        status: "error",
        detail: "C2PA reader failed to initialise in this browser.",
      };
    }
    const result = (await c2pa.read(file)) as unknown as {
      manifestStore?: {
        activeManifest?: LooseManifest | null;
        validationStatus?: LooseValidation[] | null;
      } | null;
    };
    const store = result.manifestStore;
    const active = store?.activeManifest;
    if (!store || !active) return base;

    const validations = (store.validationStatus ?? []) as LooseValidation[];
    const failures = validations.filter((v) => v.success === false);
    const signer =
      typeof active.vendor === "string" ? active.vendor : active.vendor?.name;
    const claims = [
      active.claimGenerator ? `generator: ${active.claimGenerator}` : null,
      signer ? `signer: ${signer}` : null,
      active.format ? `asset: ${active.format}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (failures.length === 0) {
      return {
        ...base,
        status: "verified",
        detail: `Manifest present. No validation problems reported.${
          claims ? ` ${claims}` : ""
        }`,
      };
    }
    return {
      ...base,
      status: "failed",
      detail: `Manifest present but validation reported: ${failures
        .map((f) => f.code ?? f.explanation ?? "unknown")
        .join("; ")}${claims ? ` ${claims}` : ""}`,
    };
  } catch (err) {
    return {
      ...base,
      status: "error",
      detail: `C2PA read error: ${(err as Error).message}`,
    };
  }
}

async function readPsiInBandRow(file: File): Promise<ReaderRow> {
  const base: ReaderRow = {
    id: "psi-inband",
    label: "APEX PSI in-band manifest",
    status: "absent",
    detail: "No APEXPSI manifest found in this file.",
    proves:
      "That the file carried a signed, in-band provenance manifest, and its declared content.",
    cannotProve:
      "That the file survived destructive edits — the manifest dies with re-saves unless a watermark also survives.",
  };
  try {
    const v = await verifyInBandCredentials(file);
    if (!v.found) return base;
    const sigs = [
      v.ed25519Valid ? "Ed25519 ✓" : "Ed25519 ✗",
      v.mldsaValid ? "ML-DSA ✓" : "ML-DSA ✗",
      v.bindingValid ? "binding ✓" : "binding ✗",
    ].join(" · ");
    if (v.verdict === "VALID") {
      return {
        ...base,
        status: "verified",
        detail: `Manifest valid. ${sigs}. Mechanism: ${v.mechanism ?? "in-band"}.`,
      };
    }
    return {
      ...base,
      status: "failed",
      detail: `Manifest found but verdict is ${v.verdict}. ${sigs}`,
    };
  } catch (err) {
    return {
      ...base,
      status: "error",
      detail: `PSI in-band read error: ${(err as Error).message}`,
    };
  }
}

async function readWatermarkRow(file: File): Promise<ReaderRow> {
  const base: ReaderRow = {
    id: "psi-watermark",
    label: "APEX PSI survival watermark (psi.dct-qim-v2)",
    status: "absent",
    detail: "No survival watermark detected in the pixels.",
    proves:
      "That the pixels themselves still carry a registered digest — the only mark here that is designed to outlive screenshots, recompression and crops.",
    cannotProve:
      "Who created the content. It proves continuity of the pixels with the ledger, not authorship of the meaning.",
  };
  try {
    const det = await detectDctWatermarkInBlob(file);
    if (!det.present) return base;
    return {
      ...base,
      status: "verified",
      detail: `Watermark present. Digest ${det.digest?.slice(0, 16)}… · confidence ${(
        det.confidence * 100
      ).toFixed(1)}% · scale ${det.scale}×`,
    };
  } catch (err) {
    return {
      ...base,
      status: "error",
      detail: `Watermark detection error: ${(err as Error).message}`,
    };
  }
}

async function readLedgerRow(sha256: string): Promise<ReaderRow> {
  const base: ReaderRow = {
    id: "ledger",
    label: "Apex public ledger · Bitcoin anchor",
    status: "absent",
    detail: "This SHA-256 digest is not registered in the public ledger.",
    proves:
      "That this exact digest was registered at a recorded time, in a recorded phase, and anchored into the Bitcoin blockchain.",
    cannotProve:
      "That any claim about the content is true. The ledger seals existence, not meaning.",
  };
  try {
    const res = await fetch(`${VERIFY_HASH_URL}?hash=${sha256}`, {
      method: "GET",
    });
    if (!res.ok) {
      return { ...base, status: "error", detail: `Ledger probe HTTP ${res.status}.` };
    }
    const body = (await res.json()) as {
      verified?: boolean;
      predicate_id?: string;
      phase?: string;
      commit_id?: string;
    };
    if (!body.verified) return base;
    const extra = [
      body.predicate_id ? `record: ${body.predicate_id}` : null,
      body.phase ? `phase: ${body.phase}` : null,
      body.commit_id ? `anchor: ${body.commit_id}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      ...base,
      status: "verified",
      detail: `Digest verified against the ledger.${extra ? ` ${extra}` : ""}`,
    };
  } catch (err) {
    return {
      ...base,
      status: "error",
      detail: `Ledger probe error: ${(err as Error).message}`,
    };
  }
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  // Fallback for environments without Blob.arrayBuffer (older jsdom).
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function runVerifyAny(file: File): Promise<VerifyAnyReport> {
  const bytes = await blobToBytes(file);
  const sha256 = await sha256Hex(bytes);
  const isImage = file.type.startsWith("image/");

  const [c2paRow, psiRow, watermarkRow, ledgerRow] = await Promise.all([
    readC2paRow(file),
    readPsiInBandRow(file),
    isImage ? readWatermarkRow(file) : null,
    readLedgerRow(sha256),
  ]);

  const rows = [c2paRow, psiRow, watermarkRow, ledgerRow].filter(
    (r): r is ReaderRow => r !== null,
  );

  return {
    fileName: file.name,
    fileSize: file.size,
    fileMime: file.type || "unknown",
    sha256,
    ranAt: new Date().toISOString(),
    rows,
  };
}
