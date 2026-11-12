// merkle_profile.ts — what the published merkle_root column actually carries,
// and how a third party can recompute it.
//
// The ledger's merkle_root is written by several different writers using
// different constructions, so a single published profile string cannot
// describe all of them. Every published row names its own construction, and
// where the construction is a real tree head the mirror recomputes it and
// says so instead of asserting it.
//
// Measured 2026-11-04 against the live public audit mirror; see
// apex-protocol-factory/tools/merkle-profile-probe.mjs.

import { createHash } from "node:crypto";

export const MERKLE_HARDENED_FROM = "2026-10-13";
export const MERKLE_WINDOW_LEAVES = 256;

export type MerkleRootKind = "window_head" | "batch_head" | "salted_leaf_digest" | "audit_path_root" | "unclassified";

export interface MerkleDescription {
  merkle_profile: string;
  merkle_root_kind: MerkleRootKind;
  merkle_reproducible: boolean;
  merkle_root_verified: "matched" | "mismatch" | "not_checked";
  merkle_reproduction: string;
}

export interface MirrorRow {
  commit_id?: string | null;
  action?: string | null;
  phase?: string | null;
  created_at?: string | null;
  sequence_number?: number | null;
  merkle_root?: string | null;
  merkle_leaf_hash?: string | null;
  merkle_proof?: unknown;
}

/**
 * The Ed25519 signature on every published ledger row authenticates the Merkle
 * leaf, not the root and not a seal_hash. The leaf is
 * SHA-256(commit_id | commit_hash), so a third party can recompute it from the
 * row itself and check the signature against the published ledger key.
 */
export const LEDGER_SIGNATURE_BINDING = "merkle_leaf";

const MERKLE_PROOF_BASE = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/merkle-proof";

const sha256 = (data: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(data).digest());

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Same acceptance as psi_core.hexToBytes: hex when it is hex, UTF-8 otherwise. */
const hexToBytes = (h: string): Uint8Array => {
  const c = String(h).replace(/^sha256:/i, "").replace(/^0x/i, "");
  if (!/^[0-9a-f]*$/i.test(c) || c.length % 2) return new TextEncoder().encode(String(h));
  const o = new Uint8Array(c.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(c.substr(i * 2, 2), 16);
  return o;
};

const node = (prefix: number, ...parts: Uint8Array[]): Uint8Array => {
  const len = 1 + parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(len);
  buf[0] = prefix;
  let o = 1;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return sha256(buf);
};

/**
 * RFC 9162 sec 2.1.3.2 head over already-known leaf hashes (oldest first).
 * leaf = SHA-256(0x00 || leaf_bytes), node = SHA-256(0x01 || L || R),
 * an odd node is promoted unchanged.
 */
export function rfc9162Head(leafHashesHex: string[]): string {
  if (leafHashesHex.length === 0) return toHex(sha256(new Uint8Array()));
  let level: Uint8Array[] = leafHashesHex.map((l) => node(0x00, hexToBytes(l)));
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? node(0x01, level[i], level[i + 1]) : level[i]);
    }
    level = next;
  }
  return toHex(level[0]);
}

/** The Merkle leaf of a ledger row, as the row itself allows it to be recomputed. */
export function leafHashOf(leafHex: string): string {
  return toHex(node(0x00, hexToBytes(leafHex)));
}

export interface MerkleOptions {
  /**
   * RFC 9162 head over the rolling window that ends at this row, when the
   * caller could compute the full window. Null when the window is incomplete.
   */
  windowRoot?: string | null;
  /** True when the window was the writer's full window and was recomputed. */
  windowComputed?: boolean;
  /** RFC 9162 head over the batch run that ends at this row, when verified. */
  batchRoot?: string | null;
  /** True when batchRoot was computed over the batch's complete run. */
  batchComplete?: boolean;
}

const hasAuditPath = (row: MirrorRow): boolean =>
  Array.isArray(row.merkle_proof) && row.merkle_proof.length > 0;

const isBatchAction = (row: MirrorRow): boolean => String(row.action ?? "").startsWith("NOTARIZE-BATCH:");
const isNotarizeAction = (row: MirrorRow): boolean => String(row.action ?? "").startsWith("NOTARIZE:");

/**
 * Classify one published row.
 *
 * Order matters. The phase is checked before the action prefix because the
 * action text of a commit-action row is attacker-supplied: a row whose action
 * begins "NOTARIZE:" is still a commit row, and labelling it as a notarised
 * window head would be a lie a third party could forge.
 */
export function describeMerkle(row: MirrorRow, opts: MerkleOptions = {}): MerkleDescription {
  const action = String(row.action ?? "");
  const createdAt = String(row.created_at ?? "");
  const root = String(row.merkle_root ?? "");

  // Three states, never two: the root was recomputed and matched, the root
  // was recomputed and did not match, or the root was not recomputed here.
  const checked = opts.windowComputed === true;
  const matched = checked && !!opts.windowRoot && opts.windowRoot === root;
  const mismatched = checked && !matched;

  if (hasAuditPath(row)) {
    return {
      merkle_profile: "PSI-P1",
      merkle_root_kind: "audit_path_root",
      merkle_reproducible: true,
      merkle_root_verified: "not_checked",
      merkle_reproduction:
        "SHA-256 over the canonical-ordered concatenation of each node's hex string, with no domain-separation prefix and the odd node duplicated. Not RFC 9162. The stored merkle_proof path is replayed against the stored root.",
    };
  }

  if (createdAt && createdAt.slice(0, 10) < MERKLE_HARDENED_FROM) {
    return {
      merkle_profile: "PSI-L0",
      merkle_root_kind: "unclassified",
      merkle_reproducible: false,
      merkle_root_verified: "not_checked",
      merkle_reproduction:
        "issued before " +
        MERKLE_HARDENED_FROM +
        ", before the current Merkle profile shipped; this construction is not classified",
    };
  }

  if (String(row.phase ?? "") === "COMMITTED") {
    if (matched) {
      return {
        merkle_profile: "PSI-W1",
        merkle_root_kind: "window_head",
        merkle_reproducible: true,
        merkle_root_verified: "matched",
        merkle_reproduction:
          "RFC 9162 sec 2.1.3.2 head over the rolling 256-leaf ledger window ending at this row, recomputed over the published leaves and matched to the stored root",
      };
    }
    return {
      merkle_profile: "PSI-C1",
      merkle_root_kind: "salted_leaf_digest",
      merkle_reproducible: false,
      merkle_root_verified: mismatched ? "mismatch" : "not_checked",
      merkle_reproduction:
        "SHA-256(merkle_leaf_hash | commit timestamp) — a salted leaf digest, not a tree head; the commit timestamp is not published in the row, so a third party cannot recompute this value",
    };
  }

  if (isBatchAction(row)) {
    const batchChecked = opts.batchComplete === true;
    const batchMatched = batchChecked && !!opts.batchRoot && opts.batchRoot === root;
    if (batchChecked && !batchMatched) {
      return {
        merkle_profile: "PSI-UNK",
        merkle_root_kind: "unclassified",
        merkle_reproducible: false,
        merkle_root_verified: "mismatch",
        merkle_reproduction:
          "the action names a batch notarisation, but the stored root is not the RFC 9162 head of the batch run that ends at this row; the construction is not classified, so do not assume a tree head",
      };
    }
    return {
      merkle_profile: "PSI-B1",
      merkle_root_kind: "batch_head",
      merkle_reproducible: true,
      merkle_root_verified: batchMatched ? "matched" : "not_checked",
      merkle_reproduction: batchMatched
        ? "RFC 9162 sec 2.1.3.2 head over this batch's own leaves — the contiguous run of published leaves ending at this row that share this root — recomputed and matched to the stored root"
        : "RFC 9162 sec 2.1.3.2 head over this batch's own leaves — the contiguous run of published leaves ending at this row; the run is located by search over the published stream",
    };
  }

  if (isNotarizeAction(row)) {
    if (mismatched) {
      return {
        merkle_profile: "PSI-UNK",
        merkle_root_kind: "unclassified",
        merkle_reproducible: false,
        merkle_root_verified: "mismatch",
        merkle_reproduction:
          "the action names a notarisation, but the stored root is not the RFC 9162 window head recomputed over the published leaves; the construction is not classified, so do not assume a tree head",
      };
    }
    return {
      merkle_profile: "PSI-W1",
      merkle_root_kind: "window_head",
      merkle_reproducible: true,
      merkle_root_verified: matched ? "matched" : "not_checked",
      merkle_reproduction:
        "RFC 9162 sec 2.1.3.2 head over the rolling 256-leaf ledger window ending at this row" +
        (matched
          ? ", recomputed over the published leaves and matched to the stored root"
          : "") +
        "; the public inclusion path is at " +
        MERKLE_PROOF_BASE +
        "?receipt_id=" +
        String(row.commit_id ?? ""),
    };
  }

  return {
    merkle_profile: "PSI-UNK",
    merkle_root_kind: "unclassified",
    merkle_reproducible: false,
    merkle_root_verified: "not_checked",
    merkle_reproduction: "construction not classified; do not assume a tree head",
  };
}

export interface ClassifiedRow extends MirrorRow {
  merkle_profile: string;
  merkle_root_kind: MerkleRootKind;
  merkle_reproducible: boolean;
  merkle_reproduction: string;
}

export interface ClassifyOptions {
  /**
   * True when rowsAscending starts at the first row the ledger ever held.
   * Without it, a window or a batch run that reaches the start of the supplied
   * rows cannot be proven complete, and is never claimed to be.
   */
  fromLedgerStart?: boolean;
}

/**
 * Classify a contiguous run of published rows, oldest first.
 *
 * The caller must supply at least MERKLE_WINDOW_LEAVES - 1 rows older than the
 * newest row it wants classified, so the rolling window can be rebuilt. Rows
 * older than that are reported as an incomplete window and are never claimed
 * to be a window head.
 */
export function classifyLedger(rowsAscending: MirrorRow[], opts: ClassifyOptions = {}): ClassifiedRow[] {
  const fromLedgerStart = opts.fromLedgerStart === true;
  const leafHashes = rowsAscending.map((r) =>
    r.merkle_leaf_hash ? leafHashOf(String(r.merkle_leaf_hash)) : null,
  );

  // Prefix count of rows whose leaf hash is missing: a null anywhere in a
  // window makes that window unreproducible.
  const missingLeafBefore = new Array<number>(rowsAscending.length + 1).fill(0);
  for (let i = 0; i < rowsAscending.length; i++) {
    missingLeafBefore[i + 1] = missingLeafBefore[i] + (leafHashes[i] === null ? 1 : 0);
  }
  const leavesPresentThrough = (i: number) => missingLeafBefore[i + 1] === 0;

  return rowsAscending.map((row, i) => {
    const windowComplete =
      leavesPresentThrough(i) && (i >= MERKLE_WINDOW_LEAVES - 1 || fromLedgerStart);

    let windowRoot: string | null = null;
    if (windowComplete) {
      const start = Math.max(0, i - (MERKLE_WINDOW_LEAVES - 1));
      windowRoot = rfc9162Head(leafHashes.slice(start, i + 1) as string[]);
    }
    let batchRoot: string | null = null;
    let batchComplete = false;
    if (isBatchAction(row)) {
      const root = String(row.merkle_root ?? "");
      const run: string[] = [];
      let j = i;
      let sawBoundary = false;
      for (; j >= 0; j--) {
        const prev = rowsAscending[j];
        if (String(prev.merkle_root ?? "") !== root || !isBatchAction(prev)) {
          sawBoundary = true;
          break;
        }
        const lh = leafHashes[j];
        if (!lh) {
          sawBoundary = true;
          break;
        }
        run.unshift(lh);
      }
      // The run is complete when the row before it is known to differ, or when
      // the run reaches the first row the ledger ever held.
      const reachesStart = j < 0;
      batchComplete = sawBoundary || (reachesStart && fromLedgerStart);
      if (run.length > 0) batchRoot = rfc9162Head(run);
    }

    const d = describeMerkle(row, {
      windowRoot,
      windowComputed: windowComplete,
      batchRoot,
      batchComplete,
    });
    return { ...row, ...d };
  });
}
