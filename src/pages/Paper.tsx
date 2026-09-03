import { motion } from "framer-motion";
import { FileText, Copy, Download, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const paperText = `
PSI: Proof of Stateful Integrity — A Cryptographic Protocol
for Verifiable AI Regulatory Compliance Without IP Disclosure

Kawaljeet Singh
Apex Intelligence Empire
Melbourne, Victoria, Australia
contact@apex-infrastructure.com

March 2026

════════════════════════════════════════════════════════════════

ABSTRACT

We present the Proof of Stateful Integrity (PSI) Protocol, a
cryptographic framework enabling organizations to prove compliance
with AI regulations — including the EU AI Act (2024/1689), NIST
AI RMF, and 7 additional jurisdictional frameworks — without
disclosing proprietary model architectures, training data, or
inference logic.

PSI achieves verifiable compliance through five cryptographic
primitives: (1) SHA-256 hash-chained audit trails with RFC 8785
JSON Canonicalization for deterministic hashing, (2) Ed25519
digital signatures (RFC 8032) on Merkle roots for non-repudiation,
(3) Binary Merkle trees with inclusion proofs for O(log n)
verification, (4) experimental BN128 field commitments (not zero-knowledge)
over BN128 finite fields for privacy preservation, and (5) a
3-node Multi-Party Computation consensus with 2/3 threshold
verification to eliminate single-point-of-failure attacks.

Version 1.2 introduces two critical advances: Deterministic Mode,
which blocks UNACCEPTABLE and HIGH-risk actions before they enter
the immutable ledger (eliminating the "optimistic flaw" inherent
in post-hoc fraud proof systems), and the Institutional Anchor Panel, a
5-party human auditor ratification layer satisfying EU AI Act
Article 14 (Human Oversight) requirements through Ed25519-signed
verdicts with mandatory rationale.

The protocol currently supports 43 machine-readable predicates
across 11 regulatory frameworks. All verification occurs on hashed
representations — source data never leaves the submitting entity's
environment.

Keywords: AI compliance, zero-knowledge proofs, Merkle trees,
          multi-party computation, EU AI Act, regulatory technology

════════════════════════════════════════════════════════════════

1. INTRODUCTION

The proliferation of artificial intelligence systems across
critical sectors has created a "compliance gap" — 88% of
organizations use AI, but only 18% have implemented governance
frameworks (Gartner, 2026). The EU AI Act, effective August 2,
2026, mandates technical conformity assessment for high-risk AI
systems, with penalties up to €35 million or 7% of global revenue.

Existing compliance approaches suffer from fundamental limitations:

  (a) IP Exposure: Third-party auditors require access to model
      internals, creating intellectual property risk.
  (b) Non-Verifiability: Attestations cannot be independently
      validated without re-auditing.
  (c) Temporal Snapshots: Point-in-time audits provide no
      continuous compliance monitoring.
  (d) Single Points of Failure: A compromised auditor
      invalidates all certifications.

We address these limitations through cryptographic verification
primitives that enable mathematical proof of compliance without
disclosing protected intellectual property.

Related work includes Quox VOLT (2026), which provides verifiable
operations logging but lacks zero-knowledge proofs, MPC consensus,
and human tribunal ratification. AIGA Protocol (IETF draft, 2025)
addresses AI governance at the informational level but provides
no cryptographic verification mechanism.

════════════════════════════════════════════════════════════════

2. PROTOCOL ARCHITECTURE

2.1 Verification Pipeline

The PSI Protocol operates as a 4-stage pipeline:

  COMMIT → CHALLENGE → PROVE → VERIFY

Each stage produces cryptographic artifacts that are independently
verifiable by any party possessing the public key.

2.2 Deterministic Mode

Unlike "optimistic" compliance systems that generate fraud proofs
after the fact, Deterministic Mode evaluates every action BEFORE
it enters the ledger:

  deterministicPreFlight(action, predicate):
    for pattern in predicate.violationPatterns:
      if action.includes(pattern):
        if predicate.riskLevel ∈ {UNACCEPTABLE, HIGH}:
          return BLOCKED
    return APPROVED

This ensures the ledger contains ONLY verified, compliant states.

2.3 Cryptographic Stack

  ┌─────────────────────────────────────────────┐
  │  Layer 5: Institutional Anchor Panel (Human Oversight)│
  │  Layer 4: MPC Consensus (3-node, 2/3 threshold)│
  │  Layer 3: BN128 commitments (experimental)      │
  │  Layer 2: Merkle Trees (inclusion proofs)      │
  │  Layer 1: Hash Chain (SHA-256 + JCS + Ed25519) │
  └─────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════

3. CRYPTOGRAPHIC PRIMITIVES

3.1 Hash-Chained Audit Trail

All inputs are canonicalized using RFC 8785 JSON Canonicalization
Scheme before hashing with SHA-256 (FIPS 180-4):

  commit_hash = SHA-256(JCS({action, predicate_id, timestamp}))
  merkle_leaf = SHA-256(commit_hash)

The monotonic sequence counter detects log deletion or tampering:

  IF seq[n] ≠ seq[n-1] + 1 → GAP_DETECTED

3.2 Merkle Tree Construction

Binary Merkle trees provide O(log n) inclusion proofs:

  parent = SHA-256(child_left ∥ child_right)

Proof: Array of sibling hashes with position indicators.
Verification: Recompute root from leaf + proof path.

3.3 Zero-Knowledge Commitments

BN128 finite-field commitments, structurally modelled on Groth16 but with no pairing check, no trusted setup and no zero-knowledge guarantee
(p = 21888...95617):

  π_A = (g^α · g^(a_i · s_i)) mod p
  π_B = (g^β · g^(b_i · s_i)) mod p
  π_C = algebraic_consistency(π_A, π_B, witness)

Current implementation: structural consistency verification.
Upgrade path: full bilinear pairing via snarkjs + Circom.

3.4 Ed25519 Digital Signatures

Every Merkle root is signed using Ed25519 (RFC 8032):

  signature = Ed25519.sign(merkle_root, sovereign_key)

Public verification key (hex):
  59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724

3.5 MPC Consensus

Three independent nodes implement threshold verification:

  Node α (Alpha): Structural verification
  Node β (Beta):  Hash chain validation
  Node γ (Gamma): Cross-reference audit

Consensus: 2/3 threshold (≥2 approvals required)

════════════════════════════════════════════════════════════════

4. SOVEREIGN TRIBUNAL

The Institutional Anchor Panel satisfies EU AI Act Article 14 (Human
Oversight) through a 5-party auditor ratification layer:

  - 5 independent auditors with jurisdictional diversity
  - 3-of-5 approval threshold for RATIFIED status
  - Ed25519-signed verdicts with mandatory rationale
  - 48-hour SLA with auto-escalation

  ratification_hash = SHA-256(
    sorted(auditor_signatures).join("||")
  )

════════════════════════════════════════════════════════════════

5. PREDICATE REGISTRY

54 predicate definitions across 11 regulatory frameworks:

  EU AI Act (Art. 5-52):     10 predicates
  MiFID II (Art. 16-27):      4 predicates
  DORA (Art. 5-26):            6 predicates
  NIST AI RMF 1.0:             4 predicates
  UK AI Safety Institute:      4 predicates
  Canada AIDA (C-27):          4 predicates
  NDIS (Australia):             3 predicates
  Australia Privacy Act 2026:   4 predicates (NEW)
  India IT Amendment 2026:      4 predicates (NEW)

════════════════════════════════════════════════════════════════

6. SECURITY ANALYSIS

6.1 Log Tampering Resistance
  SHA-256 hash chaining + monotonic sequence counter +
  Merkle inclusion proofs = O(1) tamper detection

6.2 False-Negative Prevention
  Deterministic pre-flight blocks HIGH/UNACCEPTABLE actions
  before ledger entry (vs. optimistic post-hoc detection)

6.3 Distributed Trust
  3-node MPC eliminates single-point-of-failure.
  5-party Tribunal eliminates single-auditor compromise.

6.4 Privacy Preservation
  ZK commitments ensure verification occurs on hashed
  representations. Source data never leaves the submitter.

════════════════════════════════════════════════════════════════

7. IMPLEMENTATION

The reference implementation is open source (MIT License):

  Repository: github.com/apex-intelligence-empire
  SDK:        apex-psi-sdk (npm package)
  Live:       ai-governance-standard.com

Runtime: Deno (Edge Functions), React (Frontend)
Database: PostgreSQL with Row-Level Security
Signing: Web Crypto API (Ed25519, PKCS8 DER)

════════════════════════════════════════════════════════════════

8. FUTURE WORK

The PSI Protocol roadmap includes:

  (a) Bitcoin Timestamp Anchoring — anchoring Merkle roots to
      the Bitcoin blockchain via OpenTimestamps for immutable
      third-party proof of existence.

  (b) Formal Verification — machine-verifiable proofs that
      predicate patterns correctly implement regulatory text
      using Coq/Lean theorem provers.

  (c) Decentralized Engine Node Federation — enabling any
      organization to run an independent Engine node that
      federates with the protocol ledger.

  (d) APEX NOTARY API — a public notarization endpoint
      enabling any AI system to obtain cryptographically
      signed receipts for every decision, creating a global
      compliance audit trail.

════════════════════════════════════════════════════════════════

9. CONCLUSION

The PSI Protocol demonstrates that cryptographic verification
can satisfy AI regulatory requirements without requiring IP
disclosure. The combination of deterministic pre-flight blocking,
hash-chained audit trails, Merkle proofs, ZK commitments, MPC
consensus, and human tribunal ratification provides defense-in-
depth against compliance fraud, log tampering, and single-point
attacks.

As AI regulation expands globally — with Australia mandating
obligations by December 2026, India by June 2026, and the full
EU AI Act by August 2026 — protocol-level compliance verification
will become infrastructure, not optional tooling.

════════════════════════════════════════════════════════════════

REFERENCES

[1] European Parliament. Regulation (EU) 2024/1689 (AI Act). 2024.
[2] NIST. AI Risk Management Framework 1.0. January 2023.
[3] Groth, J. On the Size of Pairing-Based Non-interactive
    Arguments. EUROCRYPT 2016.
[4] Josefsson, S. Edwards-Curve Digital Signature Algorithm
    (EdDSA). RFC 8032. January 2017.
[5] Rundgren, A. JSON Canonicalization Scheme (JCS).
    RFC 8785. June 2020.
[6] NIST. Secure Hash Standard (SHS). FIPS PUB 180-4. 2015.
[7] Shamir, A. How to Share a Secret. Communications of the
    ACM, 22(11):612-613, 1979.
[8] Reitwiessner, C. Precompiled contracts for optimal ate
    pairing check on alt_bn128. EIP-197. 2017.
[9] Gartner. AI Governance Market Forecast 2026-2030. 2026.
`.trim();

const Paper = () => {
  const copyPaper = () => {
    navigator.clipboard.writeText(paperText);
    toast.success("Paper copied to clipboard");
  };

  const downloadPaper = () => {
    const blob = new Blob([paperText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "psi-protocol-v1.2-preprint.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Apex PSI White Paper — Verifiable AI Governance — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Full white paper on Proof of Stateful Integrity: canonicalization, signature schemes, Merkle anchoring, and adversarial review." />
        <link rel="canonical" href="https://ai-governance-standard.com/paper" />
        <meta property="og:title" content="APEX PSI White Paper — Verifiable AI Governance" />
        <meta property="og:description" content="Full white paper on Proof of Stateful Integrity: canonicalization, signature schemes, Merkle anchoring, and adversarial review." />
        <meta property="og:url" content="https://ai-governance-standard.com/paper" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4">
                TECHNICAL PREPRINT
              </Badge>
              <h1 className="text-xl sm:text-3xl font-black mb-4 leading-tight">
                <span className="text-chrome-gradient">PSI: Proof of Stateful Integrity</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-2">
                A Cryptographic Protocol for Verifiable AI Regulatory Compliance Without IP Disclosure
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Kawaljeet Singh · Apex Intelligence Empire · March 2026
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="sm" onClick={copyPaper}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Paper
                </Button>
                <Button variant="heroOutline" size="sm" onClick={downloadPaper}>
                  <Download className="h-4 w-4 mr-2" /> Download .txt
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="https://arxiv.org/submit" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4 mr-2" /> arXiv Submit
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">PREPRINT — arXiv cs.CR</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyPaper} className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={downloadPaper} className="text-muted-foreground hover:text-primary transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <pre className="p-6 text-xs sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[80vh] overflow-y-auto">
                {paperText}
              </pre>
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="text-lg font-bold text-foreground mb-3">Submission status</h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li><span className="text-muted-foreground">Current:</span> <span className="text-primary font-mono">preprint — Zenodo (pending DOI)</span></li>
                <li><span className="text-muted-foreground">Target venue:</span> USENIX Security '26</li>
                <li><span className="text-muted-foreground">Cross-list:</span> IEEE S&amp;P '26 · ACM CCS '26</li>
                <li><span className="text-muted-foreground">arXiv categories:</span> cs.CR, cs.AI</li>
                <li><span className="text-muted-foreground">Companion IETF:</span> <a className="text-primary underline" href="/ietf/draft-singh-psi-http-01.txt">draft-singh-psi-http-01</a></li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cite this
              </div>
              <pre className="p-4 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{`@misc{singh2026psi,
  author       = {Singh, Kawaljeet},
  title        = {{PSI}: Proof of Stateful Integrity --
                  A Cryptographic Protocol for Verifiable
                  AI Regulatory Compliance Without IP Disclosure},
  year         = {2026},
  publisher    = {Zenodo},
  doi          = {10.5281/zenodo.PENDING},
  url          = {https://ai-governance-standard.com/paper},
  note         = {Companion IETF draft: draft-singh-psi-http-01}
}`}
              </pre>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default Paper;
