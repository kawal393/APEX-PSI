// ═══════════════════════════════════════════════════════════════════════
// THE PSI CONSTITUTION — canonical text. Pages render from this data only.
// ═══════════════════════════════════════════════════════════════════════

export const CONTINUITY_LINE =
  "PSI — The Continuity Layer for Digital Civilization";

export const PSI_ONE_LINER =
  "PSI makes digital history independently verifiable.";

export const PSI_THREE_QUESTIONS = [
  "Did this record exist at a claimed time?",
  "Has it been altered since?",
  "Can anyone verify these facts independently?",
];

export const PSI_PRIMITIVE = [
  "A digital state exists",
  "A transition is declared",
  "PSI creates a cryptographic proof — seal and receipt",
  "Anyone, anywhere, verifies independently — forever",
];

export const ECONOMIC_LINE =
  "Free to verify. Free to create. Paid to operate at scale.";

export const POSITIONING_LINE =
  "PSI is free public infrastructure. APEX builds the industrial-grade systems that make PSI operational at institutional scale.";

export const NO_CONTROL_LINE =
  "Anyone can mint a basic PSI proof. Anyone can run a verifier. Anyone can host a node. APEX does not control the protocol. We operate one implementation of it, for those who need reliability, scale and contractual guarantees.";

export const FOOTER_CONSTITUTION_LINES = [
  "PSI does not judge truth. It proves existence and integrity. The ledger does not decide. It remembers.",
  "draft-singh-psi — IETF Internet-Draft. Not yet an official standard.",
  "© 2026 APEX. PSI is open. The Constitution is immutable. The infrastructure evolves.",
];

export interface PsiLaw {
  numeral: string;
  name: string;
  rule: string;
  body: string;
}

export const PSI_LAWS: PsiLaw[] = [
  {
    numeral: "I",
    name: "Verifiability",
    rule:
      "Any conformant implementation must be independently verifiable. No permission. No API key. No account. No login. Ever.",
    body:
      "If a PSI proof exists, anyone anywhere can recompute and verify it — offline, without contacting any server and without anyone's permission.",
  },
  {
    numeral: "II",
    name: "Permanence",
    rule:
      "Existing valid proofs must remain verifiable across all future protocol versions.",
    body:
      "A proof created today under PSI-SEAL/1 must still verify under PSI-SEAL/2 and every version after it. Cryptography evolves; the evidentiary chain does not break.",
  },
  {
    numeral: "III",
    name: "Forkability",
    rule:
      "No person or organisation may be technically required for verification.",
    body:
      "If APEX disappears, the specification, verifier source, schemas, test vectors, genesis parameters, historical roots, public keys and anchoring proofs are together sufficient to reconstruct and verify the entire system.",
  },
  {
    numeral: "IV",
    name: "Interoperability",
    rule:
      "Implementations must communicate through stable normative formats.",
    body:
      "One proof, readable by every system and every vendor. No proprietary containers. A Python implementation, a Go implementation, a browser and a hardware module must all produce identical results and verify each other's output.",
  },
  {
    numeral: "V",
    name: "Cryptographic Evolution",
    rule:
      "The protocol must support cryptographic replacement without invalidating historical evidence.",
    body:
      "When a suite is superseded, a new suite is added and existing proofs receive a migration proof chaining the old verification root into the new era. The chain evolves. The record does not.",
  },
];

export type PsiStatus =
  | "PRODUCTION"
  | "REFERENCE"
  | "EXPERIMENTAL"
  | "PROPOSED"
  | "PLANNED";

export const PSI_STATUS_MEANING: Record<PsiStatus, string> = {
  PRODUCTION:
    "Deployed and independently testable. Live receipts are being generated and verified.",
  REFERENCE:
    "Implementation published, specification complete, test vectors available. Ready for integration.",
  EXPERIMENTAL:
    "Prototype exists and the design is valid. Security properties still under audit. Not for production evidence.",
  PROPOSED:
    "Protocol design defined, community review invited, implementation in progress.",
  PLANNED: "On the roadmap. Not yet designed or implemented.",
};

export interface PsiNamespace {
  code: string;
  label: string;
  what: string;
  status: PsiStatus;
  href?: string;
}

export const PSI_NAMESPACES: PsiNamespace[] = [
  { code: "AI/PSI", label: "AI decisions", what: "Agent outputs, model provenance, decision records.", status: "PRODUCTION", href: "/seal" },
  { code: "PRAMAAN/PSI", label: "Human witness", what: "Testimony, witness statements, first-hand records.", status: "PRODUCTION", href: "/pramaan" },
  { code: "CODE/PSI", label: "Software", what: "Releases, build provenance, supply-chain integrity.", status: "REFERENCE", href: "/sdk" },
  { code: "GOV/PSI", label: "Public records", what: "Regulatory filings, published decisions, public notices.", status: "PROPOSED", href: "/regulator" },
  { code: "FIN/PSI", label: "Financial records", what: "Disclosures, transaction records, audit trails.", status: "PROPOSED" },
  { code: "SCIENCE/PSI", label: "Research data", what: "Experimental records, dataset state, result integrity.", status: "PROPOSED" },
  { code: "HEALTH/PSI", label: "Clinical records", what: "Medical record state, clinical trial data integrity.", status: "PLANNED" },
  { code: "SUPPLY/PSI", label: "Physical chain", what: "Logistics events, IoT sensor readings, industrial controls.", status: "PLANNED" },
];

export const PSI_NAMESPACE_LINE =
  "One protocol. Infinite namespaces. AI governance is the beachhead, not the limit.";

export interface CommonsRow {
  what: string;
  who: string;
}

export const PSI_COMMONS: CommonsRow[] = [
  { what: "PSI specification (MIT)", who: "Everyone" },
  { what: "Basic proof creation — browser, CLI, SDK", who: "Everyone" },
  { what: "Independent verification, offline, no API", who: "Everyone" },
  { what: "Reference implementation, auditable source", who: "Everyone" },
  { what: "Self-hosted node — run your own instance", who: "Anyone" },
  { what: "Test vectors, schemas, documentation", who: "Everyone" },
];

export const PSI_OPERATIONS: CommonsRow[] = [
  { what: "Managed issuance at high volume, with service levels", who: "Institutions" },
  { what: "Multi-node redundancy and uptime commitments", who: "Institutions" },
  { what: "Priority anchoring across timestamp networks", who: "Institutions" },
  { what: "Evidence retention and export archives", who: "Compliance teams" },
  { what: "Conformance review and listing", who: "Vendors and organisations" },
  { what: "Regulatory evidence packs", who: "Compliance teams" },
  { what: "Dedicated support and contractual guarantees", who: "Institutions" },
  { what: "Batch processing and bulk verification queues", who: "High-volume users" },
];

export const COMMERCE_STATE_LINE =
  "No prices are published and no purchase is available on this site. Operational services are arranged by direct agreement only. Everything in the commons stays free with no volume limit, no account and no future paywall.";

export interface ComplementRow {
  standard: string;
  relationship: string;
}

export const PSI_COMPLEMENTS: ComplementRow[] = [
  {
    standard: "EU AI Act Article 50",
    relationship:
      "PSI produces the machine-verifiable evidence trail that transparency duties rest upon. It does not interpret legal compliance.",
  },
  {
    standard: "C2PA — content provenance",
    relationship:
      "C2PA answers where content came from. PSI answers when a state or decision was recorded and whether the record changed since.",
  },
  {
    standard: "ISO/IEC 42001 — AI management",
    relationship:
      "ISO defines the controls. PSI creates the durable audit trail evidencing that those controls were exercised.",
  },
  {
    standard: "NIST AI Risk Management Framework",
    relationship:
      "NIST defines risk categories. PSI provides independently verifiable evidence of risk events and mitigations.",
  },
  {
    standard: "OpenTimestamps / timestamping",
    relationship:
      "Timestamping proves a document existed at a time. PSI proves a structured state transition, with metadata and sequence, existed at a time — and anchors it through those same networks.",
  },
  {
    standard: "NIST FIPS 204 / SP 800-208",
    relationship:
      "The signature suite adds ML-DSA-65 and LMS alongside Ed25519, so the evidence chain survives a post-quantum transition.",
  },
];

export const COMPLEMENT_LINE =
  "Existing standards are not replaced. They are given something they have always lacked — independently verifiable, portable, durable evidence.";

export const WHAT_IT_IS = [
  "A neutral, open protocol for durable evidence of digital states and their transitions.",
  "A deterministic seal — canonical JSON (RFC 8785), SHA-256, Merkle inclusion, Ed25519 with post-quantum suites.",
  "A verifier anyone can run offline, on any device, with no account.",
  "A public record of what existed, when, and whether it changed.",
];

export const WHAT_IT_ISNT = [
  "Not a judgement of truth, accuracy or intent.",
  "Not a certification, accreditation, conformity assessment or legal opinion.",
  "Not a blockchain. Proofs are anchored to Bitcoin through OpenTimestamps; PSI is not a chain.",
  "Not a zero-knowledge system. There is no ZK-SNARK, no ZKML circuit and no trusted setup.",
];

export const APEX_DISAPPEARS_TEST =
  "If the company vanishes, the website goes offline and the team disappears — can someone still verify yesterday's receipt? The answer must be yes, or the design is incomplete.";

export const BELIEF_LINE =
  "Stop building something people must believe in. Build it so belief is unnecessary.";
