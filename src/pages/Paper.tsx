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
for Verifiable AI Regulatory Compliance

Kawaljeet Singh
Apex Intelligence Empire
Melbourne, Victoria, Australia
contact@apex-infrastructure.com

March 2026, revised 1 October 2026

════════════════════════════════════════════════════════════════

ABSTRACT

We present the Proof of Stateful Integrity (PSI) Protocol, a
cryptographic framework that lets an organization show that a
recorded artefact — an action, a decision, a document — existed in
a given form at a given time and has not been altered since, and
lets it do so while keeping the artefact itself out of the published
receipt. It is an evidence-integrity claim, not a compliance
conclusion: the protocol cannot certify that a recorded statement is
true, and nothing in it is a zero-knowledge proof.

PSI is built from the primitives that are implemented: (1) SHA-256
hash-chained audit trails with RFC 8785 JSON Canonicalization for
deterministic hashing, (2) Ed25519 digital signatures (RFC 8032) on
Merkle roots for non-repudiation, (3) binary Merkle trees with
inclusion proofs, checked in time proportional to the logarithm of
the tree, and (4) anchoring of signed roots to a public chain via
OpenTimestamps where enabled. A fifth item, experimental BN128 field
arithmetic, exists in the repository as a demonstration only: it
performs no pairing check, has no trusted setup, is not
zero-knowledge, and is not used in the sealing path. Verification
runs on three endpoints under a 2-of-3 agreement threshold; that is
redundancy for fault detection, not Multi-Party Computation, and all
three nodes are operated by APEX.

Version 1.2 introduces two critical advances: Deterministic Mode,
which blocks UNACCEPTABLE and HIGH-risk actions before they enter
the append-only ledger (rather than reviewing
records after the fact), and the Institutional Anchor Panel, a
ratification layer in which registered auditors approve, reject or
abstain on a verdict with a mandatory rationale, signed with Ed25519.
The panel supports the Article 14 (Human Oversight) expectation of a
reviewable human step; it does not by itself satisfy any article, and
whether it satisfies Article 14 in a given deployment depends on the
auditors actually registered, whose roster this document does not
publish.

The registry currently ships 54 machine-readable predicate definitions
across 11 regulatory frameworks — counted from the deployed registry
(src/lib/engine-core.ts) on 1 October 2026, and listed in Section 5.
A sealed artefact is verified through its digest, so the artefact
itself need not be published. That is not secrecy: to return a
compliance verdict the engine receives and stores the action text,
and a digest of low-entropy content discloses that content. Section
6.4 states the privacy property together with its limits.

Keywords: AI compliance, hash chains, Merkle trees, Ed25519,
          RFC 8785 canonicalisation, EU AI Act, regulatory technology

Note: this protocol is not a zero-knowledge system. No ZK-SNARK
or ZKML circuit is implemented. The BN128 components are an
experimental demonstration with no pairing check, no trusted
setup and no zero-knowledge property.

════════════════════════════════════════════════════════════════

1. INTRODUCTION

The proliferation of artificial intelligence systems across
critical sectors has created a compliance gap. Widely quoted
figures put AI adoption near nine in ten organisations and formal
governance adoption far behind it (Gartner, 2026); those
percentages come from a paid market-research item this paper has
not verified against the primary publication, so they are cited
only to size the problem, not as a measurement. The EU AI Act
(Regulation (EU) 2024/1689) became applicable to high-risk
systems on 2 August 2026 and mandates technical conformity
assessment for them, with maximum penalties of EUR 35 million or
7% of worldwide annual turnover, whichever is higher.

Existing compliance approaches suffer from fundamental limitations:

  (a) IP Exposure: Third-party auditors require access to model
      internals, creating intellectual property risk.
  (b) Non-Verifiability: Attestations cannot be independently
      validated without re-auditing.
  (c) Temporal Snapshots: Point-in-time audits provide no
      continuous compliance monitoring.
  (d) Single Points of Failure: A compromised auditor
      invalidates all certifications.

PSI addresses (b) and (c) directly. It addresses (a) only in the
narrow sense set out in Section 6.4: the published receipt carries
a digest rather than the artefact, while the operator's own engine
still receives and stores the text it screens. It does not address
(d): every verification endpoint in the current deployment is
operated by one party. What the protocol supplies is cryptographic
evidence about bytes — that a given artefact existed in a given
form at a given time. It does not prove compliance; it produces
records a provider or a reviewer can check.

Related work includes Quox VOLT (2026), which provides verifiable
operations logging but lacks a multi-node agreement layer and a
human ratification layer. AIGA Protocol (IETF draft, 2025)
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

Unlike systems that only review records after the fact, Deterministic Mode evaluates every action BEFORE
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
  │  Layer 4: Redundant verification (3-node, 2-of-3) │
  │  Layer 3: BN128 arithmetic (demo; not in path)     │
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

3.3 Experimental BN128 Field Arithmetic (not zero-knowledge)

BN128 finite-field commitments, structurally modelled on Groth16 but with no pairing check, no trusted setup and no zero-knowledge guarantee
(p = 21888...95617):

  π_A = (g^α · g^(a_i · s_i)) mod p
  π_B = (g^β · g^(b_i · s_i)) mod p
  π_C = algebraic_consistency(π_A, π_B, witness)

Current status: a demonstration reachable in the playground. It is
not part of the seal, the receipt or the verification path, and no
privacy property of the protocol follows from it. It is described
here because it appears in the repository and a reader will find it.
Possible future path: full bilinear pairing via snarkjs + Circom —
which would be a different protocol and a different document.

3.4 Ed25519 Digital Signatures

Every Merkle root is signed using Ed25519 (RFC 8032):

  signature = Ed25519.sign(merkle_root, sovereign_key)

Public verification key (hex):
  59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724

3.5 Redundant Verification Quorum

Three independently deployed endpoints re-run the checks over the
same input, which each of them receives in the clear. They hold no
secret shares and exchange no cryptographic protocol with one
another, so this is redundancy, not Multi-Party Computation:

  Node α (Alpha), Node β (Beta), Node γ (Gamma)
  In the current deployment all three execute the same digest
  recomputation and the same predicate screen; the division of
  duties implied by earlier text is not implemented.

Agreement threshold: 2 of 3 (≥2 approvals required), so that a
crashed, upgraded or faulty node cannot by itself change a verdict.
All three nodes are operated by APEX. The quorum therefore raises
availability and defect detection; it does not distribute trust, and
non-repudiation rests on the signatures of Section 3.4 and on
anchoring, not on the count of nodes.

════════════════════════════════════════════════════════════════

4. SOVEREIGN TRIBUNAL

The Institutional Anchor Panel is the human review path relied on for
EU AI Act Article 14 (Human Oversight). Its implemented shape is:

  - a 3-of-5 ratification threshold written into the code as a
    constant; the count of auditors actually registered is read from
    the deployment database, so "5 independent auditors with
    jurisdictional diversity" is a configuration target and is not a
    verified property of the live panel
  - verdicts limited to approve, reject or abstain, each with a
    mandatory rationale
  - Ed25519-signed verdicts
  - a 48-hour review window with escalation

Ratification is a governance control on the operator's own screen. It
is not independent assurance to the public unless the auditor
identities, their credentials and the panel charter are published,
and it satisfies no article of any law by itself.

  ratification_hash = SHA-256(
    sorted(auditor_signatures).join("||")
  )

════════════════════════════════════════════════════════════════

5. PREDICATE REGISTRY

54 predicate definitions across 11 regulatory frameworks:

  EU AI Act:                  10 definitions
  MiFID II (research only):    4 definitions
  DORA (research only):        6 definitions
  NIST AI RMF 1.0:             4 definitions
  UK AI Safety Institute:      4 definitions
  Canada AIDA (C-27):          7 definitions
  NDIS (Australia):            3 definitions
  Australia Privacy Act:       4 definitions
  India IT Amendment:          4 definitions
  Colorado AI Act:             3 definitions
  ISO/IEC 42001:               5 definitions
  ─────────────────────────────────────────
  Total:                      54 definitions

  Definitions are text pattern rules. They are an authoring
  aid, not a legal determination, and they do not establish
  compliance with any law.

════════════════════════════════════════════════════════════════

6. SECURITY ANALYSIS

6.1 Tamper Evidence In The Log
  SHA-256 chaining plus a monotonic sequence counter means a
  deleted, reordered or edited record breaks the chain at a
  determinable point. Detecting that requires recomputing the
  chain, so detection is O(n) in the length of the log; a Merkle
  inclusion proof locates a single record in O(log n). Neither
  figure is O(1), and both are tamper-evident rather than
  tamper-proof: whoever holds the signing key can rebuild a whole
  log consistently unless a root has been anchored or published
  somewhere they do not control.

6.2 False-Negative Reduction
  Deterministic pre-flight screens HIGH/UNACCEPTABLE actions
  before ledger entry (vs. reviewing records after the fact). It
  detects only what its patterns name, so it reduces false
  negatives exactly as far as the pattern set reaches and no
  further.

6.3 What the Quorum Does and Does Not Do
  Three endpoints under a 2-of-3 threshold raise availability and
  surface a faulty or divergent node. They do not remove the
  single point of failure: all three are operated by APEX and all
  three can reach the same signing material. The 3-of-5 tribunal
  threshold is a constant in the code; how many auditors are
  actually registered is read from the deployment database, so the
  panel limits single-auditor compromise only to the extent that
  roster is filled and genuinely independent.

6.4 Disclosure, And Its Limits
  A sealed artefact is verified through its SHA-256 digest, so the
  artefact itself need not be published next to the receipt. That
  is the entire privacy property and it has three hard limits.
  (1) No zero-knowledge proof is involved — nothing here proves a
  statement about content while hiding the content, because no
  such statement is being proved. (2) The action text screened by
  the predicates is received and stored by the operator, so the
  operator sees it. (3) A digest of short or predictable content
  is a commitment an attacker can guess and re-hash, so
  low-entropy artefacts are disclosed by their own hashes.
  Confidentiality against the operator is not a property of this
  protocol.

════════════════════════════════════════════════════════════════

7. IMPLEMENTATION

There is no published package manager artefact for this protocol.

  Repository: https://github.com/kawal393/APEX-PSI
    The verification side (canonicalisation, Merkle construction,
    receipt checks) is MIT-licensed and readable without an
    account. The engine that generates seals is not open source,
    so an outside reader can verify a receipt but cannot re-run
    the full pipeline from published code alone.
  Live:       ai-governance-standard.com

Runtime: Deno (Edge Functions), React (Frontend)
Database: PostgreSQL with Row-Level Security
Signing: Web Crypto API (Ed25519, PKCS8 DER)

════════════════════════════════════════════════════════════════

8. FUTURE WORK

None of the following is implemented. They are listed because an
earlier version of this document described several of them in the
present tense, and a reader is entitled to know which claims moved
from 'we do' to 'we intend to'. A roadmap item is not a property of
the protocol until it ships and is verified.

  (a) Bitcoin Timestamp Anchoring — anchoring Merkle roots to
      the Bitcoin blockchain via OpenTimestamps for tamper-evident
      third-party proof of existence. Where an anchor exists, the
      receipt records it; general-purpose Bitcoin anchoring of
      every root is not deployed.

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

What PSI actually demonstrates is narrower than what earlier drafts
of this paper claimed. Hash chaining, RFC 8785 canonicalisation,
Merkle inclusion proofs and Ed25519 signatures, joined to a human
ratification screen and a deterministic pre-flight check, produce a
receipt on which an artefact's existence and form at a point in
time can be independently re-checked. That is an evidence-integrity
property, and it is genuinely useful: it removes the 'trust me'
step from an audit trail.

It is not a compliance verdict, it is not zero-knowledge, and it is
not multi-party computation. No article of any regulation is
satisfied by a hash. Anyone reading this paper should hold three
tiers apart: the primitives in Section 3 that are implemented and
reachable; the BN128 demonstration that exists but is not in the
sealing path; and the roadmap in Section 8 that is not built.

The regulatory calendar moved while this paper was being written:
obligations for high-risk systems under the EU AI Act became
applicable on 2 August 2026. This paper makes no prediction about
when any other jurisdiction's rules take effect. It claims only
that the demand for machine-checkable evidence of what a system
did, and when, is growing, and that a protocol which produces that
evidence honestly is worth more than one which overstates it.

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

Note on references [3], [7] and [8]: Groth's pairing-based
arguments, Shamir's secret sharing and the alt_bn128 pairing
precompile are background to claims this paper no longer makes. No
SNARK is constructed and no secret sharing is performed in the
deployment, so those works are cited as the standards against which
the withdrawn claims would have had to be measured, not as evidence
for anything implemented here. Reference [9] has not been verified
against the primary publication.
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
        <title>Apex PSI White Paper — Verifiable AI Governance — Apex PSI — Universal Verification Protocol</title>
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
                A Cryptographic Protocol for Verifiable AI Regulatory Compliance
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Kawaljeet Singh · Apex Intelligence Empire · March 2026, revised 1 October 2026
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="sm" onClick={copyPaper}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Paper
                </Button>
                <Button variant="heroOutline" size="sm" onClick={downloadPaper}>
                  <Download className="h-4 w-4 mr-2" /> Download .txt
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="https://datatracker.ietf.org/doc/draft-singh-psi/" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4 mr-2" /> IETF Record (draft-singh-psi)
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
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">SELF-HOSTED PREPRINT — NOT PEER REVIEWED</span>
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
              <h3 className="text-lg font-bold text-foreground mb-3">Publication status</h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li><span className="text-muted-foreground">This document:</span> <span className="text-primary font-mono">self-hosted preprint</span> — not peer reviewed, not indexed by arXiv, and no DOI has been issued for it.</li>
                <li><span className="text-muted-foreground">arXiv listing:</span> none. No arXiv identifier exists for this work and none has been requested.</li>
                <li><span className="text-muted-foreground">Conference submission:</span> none. USENIX Security, IEEE S&amp;P and ACM CCS are venues that publish comparable work; this paper has been submitted to none of them.</li>
                <li><span className="text-muted-foreground">Registered DOI:</span> none. The Zenodo record sometimes cited here belongs to a different author's unrelated framework and says nothing about PSI.</li>
                <li><span className="text-muted-foreground">Companion IETF draft:</span> <a className="text-primary underline" href="/draft">draft-singh-psi, revision 01</a> — Informational, filed 29 August 2026. Its revision 02 withdraws the zero-knowledge and multi-party computation language that this paper also withdraws.</li>
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
                  AI Regulatory Compliance},
  year         = {2026},
  howpublished = {\url{https://ai-governance-standard.com/paper}},
  publisher    = {Self-published technical preprint},
  note         = {Not peer reviewed. No DOI issued.
                  Companion IETF draft: draft-singh-psi,
                  revision 01 (Informational)}
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
