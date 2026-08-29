// THE REFERENCE — data arrays. Update records here only; pages render from this data.

export interface ReferenceCase {
  id: string;
  path: string;
  label: string;
  status: "live" | "reserved";
  cardText: string;
}

export const REFERENCE_CASES: ReferenceCase[] = [
  { id: "case-001", path: "/case-001", label: "The Worker", status: "live", cardText: "The first sealed worker record. Facts only. No verdicts." },
  { id: "case-002", path: "/case-002", label: "The Money", status: "reserved", cardText: "Institutional scale. Announced when the seal exists." },
  { id: "case-003", path: "/case-003", label: "The Regulator", status: "reserved", cardText: "The regulator's own words, returned sealed." },
];

export interface GenesisProof {
  label: string;
  value: string;
}

export const GENESIS_PROOF: GenesisProof[] = [
  { label: "Document SHA-256", value: "f91ba473ee1e88b349d3a4dee18a27d9d8adbc3e1ef1e32aadcd94960a7b7b9b" },
  { label: "Receipt", value: "APEX-NTR-C29D90C714C99F96" },
  { label: "Sealed decision hash", value: "d60e050719f8be3223c5e51e1cc80a990fad552a4b1692fb2c042097e626e04e" },
  { label: "Merkle leaf", value: "b9895d1bd7ce676c46d251a72544f5b6463e501a6fd173626b2199c0a2fe0480" },
  { label: "Signature", value: "Ed25519 + LMS-W4-SHA256 (post-quantum, NIST SP 800-208)" },
  { label: "Status", value: "VERIFIED / APPROVED" },
  { label: "Source", value: "github.com/kawal393/psi-seal-spec (genesis-zero/, commit 8360674)" },
];

export const GENESIS_DOC_URL =
  "https://raw.githubusercontent.com/kawal393/psi-seal-spec/main/genesis-zero/GENESIS_ZERO.md";
export const GENESIS_SOURCE_URL =
  "https://github.com/kawal393/psi-seal-spec/blob/main/genesis-zero/GENESIS_ZERO.md";
export const GENESIS_VERIFY_URL =
  "https://apex-infrastructure.com/verify/d60e050719f8be3223c5e51e1cc80a990fad552a4b1692fb2c042097e626e04e";

export interface CaseRecord {
  date: string;
  fact: string;
  hash: string | null; // sealed decision hash — null → SEAL PENDING
  documentHash?: string; // SHA-256 of the sealed source artifact
  receipt?: string; // notary receipt id
  artifactUrl?: string; // link to the sealed artifact on GitHub
  rawUrl?: string; // raw bytes URL, used for in-browser recomputation
}

export const CASE_001_RECORDS: CaseRecord[] = [
  {
    date: "17 Aug 2026, 00:46 AEST",
    fact: "Uber Support (agent 'Mahak', Uber Pacific Pty Ltd, Level 8, 1 O'Connell Street, Sydney) acknowledged in writing receipt of the worker's notice and APP 12 access request, and stated it would be processed in accordance with applicable privacy laws.",
    hash: "ee74bacdbef9e4dce922f9cba0d253e4084564ba6efe59fd7ee20b223917a2ef",
    documentHash: "f57d4b3e7e558480f828dc5b20ba8878418ad049ee4134d35f97893c9352d10b",
    receipt: "APEX-NTR-20E2092FA5304F81",
    artifactUrl:
      "https://github.com/kawal393/psi-seal-spec/blob/f855406/case-001/ROW1_UBER_ACKNOWLEDGMENT_2026-08-17.md",
    rawUrl:
      "https://raw.githubusercontent.com/kawal393/psi-seal-spec/f855406/case-001/ROW1_UBER_ACKNOWLEDGMENT_2026-08-17.md",
  },
  {
    date: "23 Aug 2026",
    fact: "$93.37 earned for completed work on Sunday 23 August was not received.",
    hash: null,
  },
  {
    date: "26 Aug 2026",
    fact: "The worker raised the unpaid payout concern with Uber.",
    hash: null,
  },
  {
    date: "30 Aug 2026",
    fact: "The deadline set by the worker's letter passed. No response received.",
    hash: null,
  },
];

export const CASE_001_RESERVED_SLOTS = 5;

/** The fence line carried by every reference exhibit. */
export const FENCE_LINE =
  "This record certifies existence, timestamp and integrity — not the truth of any claim. The ledger does not judge. It remembers.";

export const verifyUrlFor = (hash: string) => `https://apex-infrastructure.com/verify/${hash}`;

/** Door one — recomputation on this site. */
export const siteVerifyUrlFor = (hash: string) =>
  `https://www.ai-governance-standard.com/verify?hash=${hash}`;

/** The line printed under both verification doors. */
export const TWO_DOORS_LINE =
  "Two independent doors, one ledger. If they ever disagree, the correction is public and the finder is credited.";
