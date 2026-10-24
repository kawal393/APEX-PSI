// APEX PSI — the referee. Reads every provenance mark on a file and reports
// neutrally what each one proves and cannot prove. Favours no format,
// including its own. THE MIRROR DOES NOT BEND.

import type { C2pa } from "c2pa";
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
  if (typeof window === "undefined") return null;
  if (c2paInstance) return c2paInstance;
  if (!c2paInit) {
    c2paInit = import("c2pa").then(({ createC2pa }) => createC2pa({
      wasmSrc: `${import.meta.env.BASE_URL}wasm/c2pa-toolkit_bg.wasm`,
      workerSrc: workerUrl,
      fetchRemoteManifests: false,
    }))
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
      "That the declared content is true, or that an unknown signer is trustworthy. Destructive edits can remove credentials.",
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
        validationResults?: {
          activeManifest?: { failure?: LooseValidation[]; success?: LooseValidation[] };
          ingredientDeltas?: { validationDeltas?: { failure?: LooseValidation[] } }[];
        };
      } | null;
    };
    const store = result.manifestStore;
    const active = store?.activeManifest;
    if (!store || !active) return base;

    const validations = (store.validationStatus ?? []) as LooseValidation[];
    const results = store.validationResults;
    const failures = [
      ...validations.filter((v) => v.success === false),
      ...(results?.activeManifest?.failure ?? []),
      ...(results?.ingredientDeltas ?? []).flatMap((delta) => delta.validationDeltas?.failure ?? []),
    ];
    const successes = results?.activeManifest?.success ?? validations.filter((v) => v.success === true);
    const signer =
      typeof active.vendor === "string" ? active.vendor : active.vendor?.name;
    const claims = [
      active.claimGenerator ? `generator: ${active.claimGenerator}` : null,
      signer ? `signer: ${signer}` : null,
      active.format ? `asset: ${active.format}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (failures.length === 0 && successes.length > 0) {
      return {
        ...base,
        status: "verified",
        detail: `Manifest validation succeeded.${
          claims ? ` ${claims}` : ""
        }`,
      };
    }
    if (failures.length === 0) {
      return { ...base, status: "present", detail: `Manifest present; no affirmative validation result available.${claims ? ` ${claims}` : ""}` };
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
        detail: `Manifest valid and signed by the pinned APEX trust anchor. ${sigs}. Mechanism: ${v.mechanism ?? "in-band"}.`,
      };
    }
    if (v.verdict === "INTEGRITY_ONLY") {
      return {
        ...base,
        status: "present",
        detail: `Manifest intact, but signed by a key that is not the pinned APEX anchor — integrity only, signer not authenticated. ${sigs}.`,
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
      "That a candidate digest was detected in the pixels. The mark is designed to survive some transformations; detection alone does not authenticate it.",
    cannotProve:
      "Who created the content, whether the digest is registered, or whether a trusted signer authenticated it.",
  };
  try {
    const det = await detectDctWatermarkInBlob(file);
    if (!det.present) return base;
    return {
      ...base,
      status: "present",
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
    label: "Apex public ledger · online lookup",
    status: "absent",
    detail: "This SHA-256 digest is not registered in the public ledger.",
    proves:
      "That the APEX service reports a matching ledger entry. This is an online lookup, not an independently verified signature or Bitcoin proof.",
    cannotProve:
      "Signature authenticity, Bitcoin inclusion, or the truth of the content. Those require separate proof checks.",
  };
  try {
    const res = await fetch(`${VERIFY_HASH_URL}?hash=${sha256}`, {
      method: "GET",
    });
    if (res.status === 429) {
      // The free lookup now has a per-address flood guard. Say "we did not ask", never
      // "the ledger says no": an HTTP 429 reported as absent would be the site lying
      // about a record that may well exist.
      const wait = Number(res.headers.get("retry-after") ?? "");
      return {
        ...base,
        status: "error",
        detail: Number.isFinite(wait) && wait > 0
          ? `Lookup rate-limited; the free checker allows 20 lookups per minute per address. Nothing was asked of the ledger. Try again in about ${Math.ceil(wait)} second(s).`
          : "Lookup rate-limited; the free checker allows 20 lookups per minute per address. Nothing was asked of the ledger. Try again shortly.",
      };
    }
    if (!res.ok) {
      return { ...base, status: "error", detail: `Ledger probe HTTP ${res.status}.` };
    }
    const body = (await res.json()) as {
      verified?: boolean;
      predicate_id?: string;
      phase?: string;
      commit_id?: string;
      timestamp_anchor?: { status?: string } | null;
    };
    if (!body.verified) return base;
    const extra = [
      body.predicate_id ? `record: ${body.predicate_id}` : null,
      body.phase ? `phase: ${body.phase}` : null,
      body.commit_id ? `receipt: ${body.commit_id}` : null,
      `anchor reported: ${body.timestamp_anchor?.status ?? "not available"}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      ...base,
      status: "present",
      detail: `Service reports a matching digest.${extra ? ` ${extra}` : ""}`,
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
