> **Disclaimer.** Apex is not a law firm and gives no legal advice. It is not a regulator,
> not a certifier and not a notified body, and it performs no conformity assessment. The IETF
> documents referenced here are individual submissions with no endorsement or standing. This is
> a proposed standard under active development. Verify everything yourself.

<p align="center">
  <img src="public/apex.svg" width="120" alt="APEX PSI" />
</p>

<h1 align="center">APEX PSI Protocol</h1>
<h3 align="center">A proposed open standard for verifiable AI governance</h3>

<p align="center">
  <strong>Machine-checkable evidence. Not a regulator, and not enforcement.</strong>
</p>

<p align="center">
  <a href="https://ai-governance-standard.com">Live Platform</a> ·
  <a href="https://ai-governance-standard.com/protocol">Protocol Spec</a> ·
  <a href="https://ai-governance-standard.com/engine">PSI Engine</a> ·
  <a href="https://ai-governance-standard.com/verify">Verify a Proof</a>
</p>

<p align="center">
  <code>RFC 8785 (JCS) · Ed25519 Signatures · SHA-256 Hash Chains · Monotonic Sequencing</code>
</p>

---

## The Situation

Governments demanded AI transparency. AI companies refused to open up. Regulators wrote laws no one could follow. **The industry froze.**

We didn't wait.

We open-sourced the math. Built stateful verification. Made byte-state and time provable without disclosure. No committee. No permission. **Just code.**

> An individual submission. No standards body has endorsed it.

---

## What This Is

**APEX PSI (Proof of Stateful Integrity)** is an Optimistic ZKML protocol that cryptographically proves what bytes existed and when, so a provider can evidence part of its own EU AI Act Article 50 workflow — without exposing proprietary models, training data, or business logic.

The architecture assumes compliance by default (**Optimistic**) and generates expensive fraud proofs only when challenged, supporting a provider's own work on Articles 12, 14, 15 and Annex III of the EU AI Act.

### The Math Is Free. The Fortress Is Paid.

| Layer | What It Does | Status |
|---|---|---|
| **Commit** | SHA-256 hash chain + Merkle tree of AI action | ✅ Live |
| **Challenge** | Regulator flags a specific output for proof | ✅ Live |
| **Prove** | ZK-SNARK fraud proof generated on demand | Experimental — not a production compliance proof |
| **Anchor** | Optional Bitcoin/Ethereum timestamp anchoring | RFC-001 |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 APEX PSI v1.2                    │
├─────────────┬─────────────┬─────────────────────┤
│  Commit     │  Challenge  │  Prove              │
│  ─────────  │  ─────────  │  ─────────          │
│  SHA-256    │  Regulator  │  ZK-SNARK           │
│  Merkle     │  Flag       │  Fraud Proof        │
│  Ed25519    │  Scope      │  Verification       │
├─────────────┴─────────────┴─────────────────────┤
│                  Apex Lattice                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Node α  │  │ Node β  │  │ Node γ  │         │
│  │ (Alpha) │  │ (Beta)  │  │ (Gamma) │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│   MPC (2-of-3) — all nodes operated by APEX      │
├─────────────────────────────────────────────────┤
│  43 Predicates · 9 Jurisdictions · 3 Apex nodes │
└─────────────────────────────────────────────────┘
```

---

## Predicate Coverage

### EU AI Act
| Predicate | Article | Risk Tier |
|---|---|---|
| `EU_ART_5` | Prohibited Practices | UNACCEPTABLE |
| `EU_ART_6` | High-Risk Classification | HIGH |
| `EU_ART_9` | Risk Management | HIGH |
| `EU_ART_10` | Data Governance | HIGH |
| `EU_ART_11` | Technical Documentation | HIGH |
| `EU_ART_12` | Record-Keeping | HIGH |
| `EU_ART_13` | Transparency to Users | HIGH |
| `EU_ART_14` | Human Oversight | HIGH |
| `EU_ART_15` | Accuracy & Robustness | HIGH |
| `EU_ART_50` | Transparency Obligations | LIMITED |
| `EU_ART_52` | Disclosure Obligations | LIMITED |
| `EU_ANNEX_III` | High-Risk Classification | HIGH |

### NIST AI RMF · UK AISI · Canada AIDA

APEX holds no Australian Financial Services Licence and provides no financial product advice. Mappings to MiFID II and DORA are informational research only.

Full predicate registry available at [/registry](https://ai-governance-standard.com/registry)

---

## Quick Start

```bash
# @apex/psi-sdk is not published to npm. Build it from the repository:
npm install ./packages/psi-sdk
```

```typescript
import { ApexPSI } from '@apex/psi-sdk';

const psi = new ApexPSI({
  endpoint: 'https://your-instance.apex.dev/functions/v1',
  predicates: ['EU_ART_50'],
  mode: 'blocking',
});

const result = await psi.verify(
  'Synthetic image published without machine-readable AI disclosure',
  'EU_ART_50'
);

console.log(result.compliant);      // false
console.log(result.status);         // 'BLOCKED'
console.log(result.violationFound); // 'no Article 50 transparency marking present'
console.log(result.commitHash);     // 'a3f8c2...' (SHA-256)
console.log(result.merkleProof);    // Inclusion proof
```

APEX holds no Australian Financial Services Licence and provides no financial product advice.
Mappings to MiFID II and DORA are informational research only.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React · TypeScript · Vite · Tailwind CSS · Framer Motion |
| UI System | shadcn/ui · Radix Primitives |
| Backend | Supabase Edge Functions (Deno) |
| Cryptography | SHA-256 · Ed25519 · Merkle Trees · RFC 8785 JCS |
| Consensus | 3-Node MPC (Alpha, Beta, Gamma) · 2-of-3 Threshold |
| Database | PostgreSQL with RLS · Immutable Ledger |
| Verification | Optimistic ZKML · Fraud Proofs on Demand |

---

## Protocol RFCs

| RFC | Title | Status |
|---|---|---|
| PSI-RFC-001 | Bitcoin Timestamp Anchoring | Draft |
| PSI-RFC-002 | Formal Verification of Predicate Circuits | Draft |
| PSI-RFC-003 | Cross-Protocol Interoperability | Draft |

---

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

---

## License

**MIT** — The math is free. Inspect everything.

---

<p align="center">
  <strong>APEX Intelligence Empire</strong><br/>
  <em>43 Predicates · 9 Jurisdictions · 3 nodes, all operated by APEX</em><br/><br/>
  <code>Trust is not earned. It is verified.</code>
</p>
---

> **Disclaimer.** Apex is not a law firm and gives no legal advice. It is not a regulator,
> not a certifier and not a notified body, and it performs no conformity assessment. The IETF
> documents referenced here are individual submissions with no endorsement or standing. This is
> a proposed standard under active development. Verify everything yourself.
