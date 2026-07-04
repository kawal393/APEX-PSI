import { motion } from "framer-motion";
import { FileText, Copy, Download, ExternalLink, Clock, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const DRAFT_NAME = "draft-singh-psi-00";
const DRAFT_DATE = "March 2026";
const EXPIRY_DATE = "September 2026";

const draftText = `
Internet Engineering Task Force (IETF)                         K. Singh
Internet-Draft                                    Apex Intelligence Empire
Intended status: Standards Track                              ${DRAFT_DATE}
Expires: ${EXPIRY_DATE}


        Proof of Stateful Integrity (PSI): A Cryptographic Protocol
              for Verifiable AI Regulatory Compliance
                       ${DRAFT_NAME}

Abstract

   This document specifies the Proof of Stateful Integrity (PSI)
   Protocol, version 1.2, a cryptographic framework enabling
   organizations to prove compliance with AI regulations (including
   the EU AI Act 2026, NIST AI RMF, UK AI Safety Institute guidelines,
   and equivalent frameworks) without disclosing proprietary model
   architectures, training data, or inference logic.

   PSI achieves this through a combination of SHA-256 hash-chained
   audit trails, Ed25519 digital signatures, Merkle inclusion proofs,
   Groth16-compatible zero-knowledge commitments over BN128 fields,
   and a 3-node Multi-Party Computation (MPC) consensus mechanism
   with 2/3 threshold verification.

   The protocol introduces a Deterministic Mode that blocks
   UNACCEPTABLE and HIGH-risk actions before they enter the
   immutable ledger, and a 5-party Institutional Anchor Panel for human
   auditor ratification of automated verdicts.

Status of This Memo

   This Internet-Draft is submitted in full conformance with the
   provisions of BCP 78 and BCP 79.

   Internet-Drafts are working documents of the Internet Engineering
   Task Force (IETF).  Note that other groups may also distribute
   working documents as Internet-Drafts.  The list of current
   Internet-Drafts is at https://datatracker.ietf.org/drafts/current/.

   Internet-Drafts are draft documents valid for a maximum of six
   months and may be updated, replaced, or obsoleted by other documents
   at any time.  It is inappropriate to use Internet-Drafts as
   reference material or to cite them other than as "work in progress."

   This Internet-Draft will expire on ${EXPIRY_DATE}.

Copyright Notice

   Copyright (c) 2026 IETF Trust and the persons identified as the
   document authors.  All rights reserved.

Table of Contents

   1.  Introduction  . . . . . . . . . . . . . . . . . . . . . . .  2
   2.  Terminology . . . . . . . . . . . . . . . . . . . . . . . .  3
   3.  Protocol Overview . . . . . . . . . . . . . . . . . . . . .  4
   4.  Cryptographic Primitives  . . . . . . . . . . . . . . . . .  5
   5.  Verification Pipeline . . . . . . . . . . . . . . . . . . .  7
   6.  Deterministic Pre-Flight  . . . . . . . . . . . . . . . . .  9
   7.  Merkle Tree Construction  . . . . . . . . . . . . . . . . . 10
   8.  MPC Consensus Layer . . . . . . . . . . . . . . . . . . . . 12
   9.  Zero-Knowledge Commitments  . . . . . . . . . . . . . . . . 14
  10.  Institutional Anchor Panel  . . . . . . . . . . . . . . . . . . . . 16
  11.  Predicate Registry  . . . . . . . . . . . . . . . . . . . . 18
  12.  Proof Bundle Format . . . . . . . . . . . . . . . . . . . . 20
  13.  Legal-to-Technical Mapping . . . . . . . . . . . . . . . .  22
  14.  Security Considerations . . . . . . . . . . . . . . . . . . 24
  15.  IANA Considerations . . . . . . . . . . . . . . . . . . . . 25
  16.  APEX NOTARY Extension . . . . . . . . . . . . . . . . . . .  26
  17.  References  . . . . . . . . . . . . . . . . . . . . . . . . 30
  Authors' Addresses . . . . . . . . . . . . . . . . . . . . . . . 31

1.  Introduction

   The proliferation of artificial intelligence systems across
   critical sectors — healthcare, finance, law enforcement, education,
   and essential services — has created an urgent need for verifiable
   compliance mechanisms.  The EU AI Act (Regulation 2024/1689),
   effective August 2, 2026, mandates technical conformity assessment
   for high-risk AI systems under Articles 5-52.

   Existing compliance approaches rely on self-attestation,
   third-party audits with access to proprietary systems, or
   trust-based certification.  These approaches suffer from:

   (a) IP exposure risk — auditors must access model internals
   (b) Non-verifiability — attestations cannot be independently
       validated without re-auditing
   (c) Point-in-time snapshots — no continuous compliance monitoring
   (d) Single points of failure — a compromised auditor invalidates
       all certifications

   The PSI Protocol addresses these limitations through cryptographic
   verification primitives that enable mathematical proof of
   compliance without disclosing protected intellectual property.

   This document specifies PSI Protocol v1.2, which introduces
   Deterministic Mode (blocking non-compliant actions before commit)
   and the Institutional Anchor Panel (5-party human ratification layer).

2.  Terminology

   The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
   "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in
   this document are to be interpreted as described in RFC 2119.

   Commit:  An atomic action submitted to the PSI ledger for
            compliance verification.

   Predicate:  A machine-readable regulatory requirement derived
               from legislation (e.g., EU AI Act Article 14).

   Commit Hash:  SHA-256(JCS(action || predicate_id || timestamp))
                 where JCS denotes RFC 8785 JSON Canonicalization.

   Merkle Leaf:  SHA-256(commit_hash) used as input to the
                 binary Merkle tree.

   Merkle Root:  The root hash of the binary Merkle tree
                 containing all ledger entries.

   MPC Node:  One of three independent verification nodes
              implementing Shamir's Secret Sharing with
              2/3 threshold consensus.

   Proof Bundle:  A self-contained JSON document containing
                  all cryptographic artifacts necessary for
                  independent verification.

   Institutional Anchor Panel:  A panel of 5 independent auditors
                        providing human ratification of
                        automated MPC verdicts.

   Deterministic Pre-Flight:  A blocking check that prevents
                              UNACCEPTABLE and HIGH-risk
                              actions from entering the ledger.

3.  Protocol Overview

   The PSI Protocol operates as a 4-stage verification pipeline:

   Stage 1 — COMMIT
     The submitting entity provides an action description and
     target predicate.  The system computes:

       commit_id  = APEX-{random_hex(8)}-{random_hex(4)}
       canonical  = JCS({action, predicate_id, timestamp})
       commit_hash = SHA-256(canonical)
       merkle_leaf = SHA-256(commit_hash)

     In Deterministic Mode, a pre-flight check evaluates the
     action against predicate violation patterns.  Actions
     matching UNACCEPTABLE or HIGH-risk patterns are BLOCKED
     and never enter the ledger.

   Stage 2 — CHALLENGE
     The commit is evaluated against the predicate's violation
     patterns using pattern matching.  A challenge_hash is
     computed:

       challenge_input = JCS({commit_hash, predicate_id,
                              violation_patterns, timestamp})
       challenge_hash  = SHA-256(challenge_input)

     If violations are detected, the commit is marked with
     violation_found and proceeds to proof generation.

   Stage 3 — PROVE
     Merkle inclusion proof is generated for the commit's
     leaf hash.  The proof consists of sibling hashes at
     each tree level with left/right position indicators.

     A Groth16-compatible ZK commitment is generated over
     BN128 finite field arithmetic:

       proof_elements = {π_A, π_B, π_C}
       proof_hash = SHA-256(JCS(proof_elements))

   Stage 4 — VERIFY
     Three independent MPC nodes verify the proof:

       Node Alpha:  Primary verification
       Node Beta:   Secondary verification
       Node Gamma:  Tertiary verification

     Consensus requires 2/3 agreement.  Upon consensus:

       merkle_root = compute_root(all_leaves)
       ed25519_sig = sign(merkle_root, protocol_private_key)

     The Ed25519 signature on the Merkle root provides
     non-repudiation for the entire verification state.

4.  Cryptographic Primitives

4.1.  Hash Function

   PSI uses SHA-256 (FIPS 180-4) for all hashing operations.
   Input MUST be canonicalized using RFC 8785 JSON
   Canonicalization Scheme (JCS) before hashing to ensure
   deterministic output across implementations.

     hash = SHA-256(JCS(input))

4.2.  Digital Signatures

   Ed25519 (RFC 8032) is used for signing Merkle roots.
   The signing key is stored in PKCS8 DER format.

     signature = Ed25519.sign(merkle_root_bytes, private_key)

   The public verification key (hex):

     59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724

4.3.  Merkle Trees

   Binary Merkle trees are constructed from leaf hashes.
   If the number of leaves is odd, the last leaf is
   duplicated.  Each internal node is:

     parent = SHA-256(left_child || right_child)

4.4.  Zero-Knowledge Commitments

   Groth16-compatible commitments use BN128 finite field
   arithmetic (field prime p = 21888242871839275222246405745257275
   088548364400416034343698204186575808495617).

   Proof elements (π_A, π_B, π_C) are computed via modular
   exponentiation and inverse operations over the BN128 field.
   Structural consistency is verified through algebraic
   relation checks.

4.5.  Sequence Counter

   A monotonic sequence counter is assigned to each ledger
   entry via a PostgreSQL SEQUENCE.  Gap detection identifies
   potential log tampering:

     IF sequence_number[n] != sequence_number[n-1] + 1
       THEN flag_gap_detected(n-1, n)

5.  Verification Pipeline

5.1.  Commit Phase

   Input: {action: string, predicate_id: string}
   Output: CommitRecord with phase = "COMMITTED"

   Steps:
   1. Generate commit_id (cryptographic random)
   2. Compute canonical JSON via RFC 8785
   3. Compute commit_hash = SHA-256(canonical)
   4. Compute merkle_leaf_hash = SHA-256(commit_hash)
   5. If Deterministic Mode: run pre-flight check
      - If BLOCKED: return immediately, do not persist
   6. Persist to immutable ledger with sequence number
   7. Sign merkle_leaf_hash with Ed25519

5.2.  Challenge Phase

   Input: CommitRecord with phase = "COMMITTED"
   Output: CommitRecord with phase = "CHALLENGED"

   Steps:
   1. Retrieve predicate violation patterns
   2. Evaluate action against patterns (case-insensitive)
   3. Compute challenge_hash
   4. Record violation_found if applicable
   5. Persist challenge_hash and challenged_at timestamp

5.3.  Prove Phase

   Input: CommitRecord with phase = "CHALLENGED"
   Output: CommitRecord with phase = "PROVING"

   Steps:
   1. Build Merkle tree from all leaf hashes
   2. Generate inclusion proof for commit's leaf
   3. Generate ZK commitment (BN128 field operations)
   4. Compute proof_hash = SHA-256(JCS(zk_proof))
   5. Persist proof_hash, merkle_proof, and proven_at

5.4.  Verify Phase

   Input: CommitRecord with phase = "PROVING"
   Output: CommitRecord with phase = "VERIFIED"

   Steps:
   1. Submit to 3-node MPC cluster
   2. Each node independently verifies:
      a. Merkle inclusion proof validity
      b. Hash chain integrity
      c. ZK commitment consistency
   3. Collect verdicts (approve/reject)
   4. If 2/3 approve: VERIFIED
   5. Compute final Merkle root
   6. Sign root with Ed25519 protocol key
   7. Persist signature, verification_time_ms

6.  Deterministic Pre-Flight

   In Deterministic Mode, the pre-flight check evaluates
   every action BEFORE it enters the ledger:

     function deterministicPreFlight(action, predicate):
       for pattern in predicate.violationPatterns:
         if action.toLowerCase().includes(pattern):
           if predicate.riskLevel in [UNACCEPTABLE, HIGH]:
             return {blocked: true, reason: pattern}
       return {blocked: false}

   Actions blocked by pre-flight are NEVER committed.
   This eliminates the "optimistic flaw" where non-compliant
   states could exist in the ledger between commit and
   challenge.

7.  Merkle Tree Construction

   The Merkle tree is a complete binary tree.

   Algorithm:
   1. Collect all merkle_leaf_hash values from ledger
   2. Sort lexicographically for determinism
   3. If count is odd, duplicate last leaf
   4. Compute parent nodes: SHA-256(left || right)
   5. Repeat until single root remains

   Inclusion proof for leaf at index i:
   1. At each level, include the sibling hash
   2. Record position (left or right)
   3. Proof is array of {hash, position} pairs
   4. Verification: recompute root from leaf + proof

8.  MPC Consensus Layer

   Three independent nodes implement threshold verification
   using Shamir's Secret Sharing principles:

     Node Alpha (primary):   Structural verification
     Node Beta (secondary):  Hash chain validation
     Node Gamma (tertiary):  Cross-reference audit

   Each node independently evaluates the proof and returns
   a verdict {approve | reject} with confidence score.

   Consensus threshold: 2/3 (at least 2 approvals required)

   Node communication is via authenticated HTTPS with
   Ed25519-signed request bodies.

9.  Zero-Knowledge Commitments

   The ZK layer generates Groth16-structured proof elements
   without requiring a trusted setup ceremony.

   Field: BN128
   Prime: 21888242871839275222246405745257275088548364400416
          034343698204186575808495617

   Proof structure:
     π_A = (g^α · g^{a_i * s_i}) mod p
     π_B = (g^β · g^{b_i * s_i}) mod p
     π_C = computed via modular inverse to satisfy
           algebraic consistency relation

   Verification:
     Check that e(π_A, π_B) = e(g, g)^{αβ} · e(π_C, g^δ)
     (Currently: algebraic consistency check;
      Upgrade path: full bilinear pairing via snarkjs)

10. Institutional Anchor Panel

   The Institutional Anchor Panel provides Article 14 (Human Oversight)
   compliance through a 5-party auditor ratification layer.

   Composition:
     5 independent auditors with diverse jurisdictional
     expertise (EU, APAC, Americas, UK, MENA)

   Process:
   1. MPC-verified commits enter tribunal queue
   2. Each auditor reviews and submits verdict:
      {approve | reject} with mandatory rationale
   3. Verdicts are Ed25519-signed for non-repudiation
   4. Threshold: 3-of-5 approvals required for RATIFIED

   SLA: 48-hour response window
     If quorum not met within 48h:
       MPC verdict stands with TRIBUNAL_TIMEOUT flag

   Ratification hash:
     ratification_hash = SHA-256(
       sorted(auditor_signatures).join("||")
     )

11. Predicate Registry

   The PSI Protocol maintains a canonical registry of
   machine-readable regulatory predicates.

   Supported jurisdictions (v1.2):

   11.1. EU AI Act (2024/1689)
     Articles 5, 6, 9, 11, 12, 13, 14, 15, 50, 52
     10 predicates, enforcement: 2026-08-02

   11.2. MiFID II (2014/65/EU)
     Articles 16, 17, 25, 27
     4 predicates, enforcement: 2018-01-03

   11.3. DORA (2022/2554)
     Articles 5, 6, 9, 11, 17, 26
     6 predicates, enforcement: 2025-01-17

   11.4. NIST AI RMF 1.0 (US)
     Functions: GOVERN, MAP, MEASURE, MANAGE
     4 predicates

   11.5. UK AI Safety Institute
     Principles: Safety Testing, Transparency,
                 Human Control, Societal Wellbeing
     4 predicates

   11.6. Canada AIDA (Bill C-27)
     Sections: Risk Assessment, Mitigation,
               Record-Keeping, Notification
     4 predicates

   11.7. NDIS Quality & Safeguards (Australia)
     Standards: Worker Screening, Incident Management,
                Complaints, Restrictive Practices
     3 predicates

   11.8. Australia Privacy Act 2026 (NEW)
     Sections: Automated Decision Transparency (s15C),
               AI System Registration (s26WA),
               Algorithmic Impact Assessment (s26WB),
               Right to Explanation (s26WC)
     4 predicates, enforcement: 2026-12-10

   11.9. India IT Amendment Rules 2026 (NEW)
     Rules: AI Content Labeling (Rule 3(1)(b)(v)),
            Deepfake Prohibition (Rule 3(1)(b)(vi)),
            Algorithmic Transparency (Rule 3(2)(b)),
            User Notification (Rule 3(2)(c))
     4 predicates, enforcement: 2026-06-01

   Total: 43 predicates across 9 jurisdictions

12. Proof Bundle Format

   A proof bundle is a self-contained JSON document:

   {
     "protocol_version": "1.2",
     "commit_id": "APEX-XXXXXXXX-XXXX",
     "commit_hash": "<sha256>",
     "merkle_leaf_hash": "<sha256>",
     "merkle_root": "<sha256>",
     "merkle_proof": [{"hash": "<sha256>", "position": "left|right"}],
     "ed25519_signature": "<hex>",
     "zk_proof": {"pi_a": "<hex>", "pi_b": "<hex>", "pi_c": "<hex>"},
     "mpc_consensus": {"alpha": "approve", "beta": "approve", "gamma": "approve"},
     "predicate_id": "<id>",
     "action_hash": "<sha256>",
     "timestamp": "<ISO-8601>",
     "sequence_number": <integer>,
     "verification_time_ms": <integer>,
     "tribunal_status": "RATIFIED|PENDING|TIMEOUT",
     "ratification_hash": "<sha256>",
     "public_key": "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"
   }

13. Legal-to-Technical Mapping

   Article 12 (Record-Keeping):
     → SHA-256 hash-chained audit trail
     → RFC 8785 JSON Canonicalization
     → Monotonic sequence counter with gap detection
     → Real-time Merkle tree inclusion proofs

   Article 14 (Human Oversight):
     → 5-second Protocol Pause (Protocol Intervention Layer)
     → Open Evidence Protocol with Institutional Anchor ratification (3-of-5 threshold)
     → 48-hour SLA with auto-escalation
     → Ed25519-signed auditor verdicts

   Article 15 (Accuracy, Robustness & Cybersecurity):
     → Deterministic Mode: UNACCEPTABLE/HIGH blocked before commit
     → 3-node MPC consensus (2/3 threshold)
     → Ed25519 digital signatures on Merkle roots
     → Groth16-compatible ZK privacy commitments (BN128)

14. Security Considerations

   The PSI Protocol is designed to resist the following
   attack vectors:

   14.1. Log Tampering
      Mitigated by: SHA-256 hash chaining, monotonic sequence
      counter, Merkle inclusion proofs.

   14.2. False-Negative Attacks
      Mitigated by: Deterministic pre-flight blocking.
      Non-compliant actions never enter the ledger.

   14.3. Single-Point-of-Failure
      Mitigated by: 3-node MPC distributed verification.
      No single node can produce a valid verification.

   14.4. Auditor Compromise
      Mitigated by: 3-of-5 tribunal threshold.
      Compromising 1-2 auditors insufficient for ratification.

   14.5. IP Disclosure
      Mitigated by: ZK commitments. Verification occurs
      on hashed representations; source data never leaves
      the submitting entity's environment.

   14.6. Nationalization / Capture
      Mitigated by: Proposed PSI-RFC-004 (Decentralized
      Gallows Node Federation) enabling self-hosted nodes.

15. IANA Considerations

   This document requests registration of:

   Media types:
   - application/psi-proof+json
     (PSI proof bundle format)

   URI schemes:
   - psi://    (PSI resource identifier)

16. APEX NOTARY Extension

   The APEX NOTARY API extends PSI by exposing a public
   notarization endpoint (POST /notarize) that accepts
   arbitrary AI decision payloads and returns cryptographically
   signed, Merkle-anchored receipts.

   This enables any AI system to obtain compliance artifacts
   satisfying Article 12 (Record-Keeping) without deploying
   the full PSI verification pipeline.

   Receipt format:
   {
     "receipt_id": "APEX-NTR-XXXXXXXX",
     "timestamp": "<ISO-8601>",
     "decision_hash": "sha256:<hash>",
     "merkle_leaf": "sha256:<hash>",
     "merkle_root": "sha256:<hash>",
     "ed25519_signature": "<hex>",
     "predicate_applied": "<predicate_id>",
     "receipt_version": "PSI-1.2"
   }

17. References

17.1. Normative References

   [RFC2119]  Bradner, S., "Key words for use in RFCs to Indicate
              Requirement Levels", BCP 14, RFC 2119, March 1997.

   [RFC8032]  Josefsson, S. and I. Liusvaara, "Edwards-Curve
              Digital Signature Algorithm (EdDSA)", RFC 8032,
              January 2017.

   [RFC8785]  Rundgren, A., Jordan, B., and S. Erdtman, "JSON
              Canonicalization Scheme (JCS)", RFC 8785, June 2020.

   [FIPS180-4] National Institute of Standards and Technology,
               "Secure Hash Standard (SHS)", FIPS PUB 180-4,
               August 2015.

17.2. Informative References

   [EU-AI-ACT] European Parliament, "Regulation (EU) 2024/1689
                laying down harmonised rules on artificial
                intelligence", Official Journal L, 2024.

   [NIST-AI-RMF] National Institute of Standards and Technology,
                  "Artificial Intelligence Risk Management
                  Framework (AI RMF 1.0)", January 2023.

   [EIP-197]  Reitwiessner, C., "Precompiled contracts for optimal
              ate pairing check on the elliptic curve alt_bn128",
              EIP 197, 2017.

   [GROTH16]  Groth, J., "On the Size of Pairing-Based
              Non-interactive Arguments", EUROCRYPT 2016.


Authors' Addresses

   Kawaljeet Singh
   Apex Intelligence Empire
   Melbourne, Victoria, Australia

   Email: contact@apex-infrastructure.com
   URI:   https://apex-psi.apex-infrastructure.com
`.trim();

const IETFDraft = () => {
  const copyDraft = () => {
    navigator.clipboard.writeText(draftText);
    toast.success("Draft copied to clipboard");
  };

  const downloadDraft = () => {
    // IETF datatracker requires proper plain-text with CRLF line endings
    const crlfText = draftText.replace(/\r?\n/g, "\r\n");
    const blob = new Blob([crlfText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${DRAFT_NAME}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>IETF Draft — draft-singh-psi-00 | APEX PSI</title>
        <meta name="description" content="Internet-Draft: Proof of Stateful Integrity for verifiable AI governance. Full protocol text." />
        <link rel="canonical" href="https://digital-gallows.apex-infrastructure.com/draft" />
        <meta property="og:title" content="IETF Draft — draft-singh-psi-00 | APEX PSI" />
        <meta property="og:description" content="Internet-Draft: Proof of Stateful Integrity for verifiable AI governance. Full protocol text." />
        <meta property="og:url" content="https://digital-gallows.apex-infrastructure.com/draft" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Hero */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4">
                IETF INTERNET-DRAFT
              </Badge>
              <h1 className="text-2xl sm:text-4xl font-black mb-4">
                <span className="text-chrome-gradient">{DRAFT_NAME}</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm mb-6">
                Proof of Stateful Integrity (PSI): A Cryptographic Protocol for Verifiable AI Regulatory Compliance.
                Submitted in IETF Internet-Draft format per RFC 7322.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="sm" onClick={copyDraft}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Draft
                </Button>
                <Button variant="heroOutline" size="sm" onClick={downloadDraft}>
                  <Download className="h-4 w-4 mr-2" /> Download .txt
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="https://datatracker.ietf.org/submit/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> IETF Datatracker
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Metadata */}
        <section className="px-4 mb-8">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Document", value: DRAFT_NAME },
                { label: "Status", value: "Standards Track" },
                { label: "Published", value: DRAFT_DATE },
                { label: "Expires", value: EXPIRY_DATE },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-card/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{m.label}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Draft Body */}
        <section className="px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">RFC-FORMAT SPECIFICATION</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyDraft} className="text-muted-foreground hover:text-primary transition-colors" title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={downloadDraft} className="text-muted-foreground hover:text-primary transition-colors" title="Download">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <pre className="p-6 text-xs sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[80vh] overflow-y-auto">
                {draftText}
              </pre>
            </div>
          </div>
        </section>

        {/* Submission Guide */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-foreground mb-4">Submission Instructions</h3>
              <ol className="space-y-3 text-sm text-foreground/80 list-decimal list-inside">
                <li>Download the draft using the button above</li>
                <li>Navigate to <a href="https://datatracker.ietf.org/submit/" target="_blank" rel="noopener noreferrer" className="text-primary underline">datatracker.ietf.org/submit</a></li>
                <li>Upload the .txt file — the filename MUST be <code className="text-primary">{DRAFT_NAME}.txt</code></li>
                <li>Author: Kawaljeet Singh, Apex Intelligence Empire</li>
                <li>Once submitted, the draft receives a permanent, timestamped, publicly archived record</li>
              </ol>
              <div className="mt-4 p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> No approval, committee vote, or government permission is required.
                  Internet-Drafts are working documents — the timestamp establishes prior art.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default IETFDraft;
