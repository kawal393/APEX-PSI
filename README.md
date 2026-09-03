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

## What This Is

**APEX PSI (Proof of Stateful Integrity)** is a commit-and-challenge evidence protocol. It
cryptographically proves **what bytes existed and when**, so an AI provider can evidence part of
its own record-keeping and transparency workflow without publishing the underlying content.

It is **not** a zero-knowledge system. There is no ZK-SNARK, no ZKML, and no circuit-based
model-execution proof anywhere in this repository. The primitives actually implemented are:

| Primitive | Where | Status |
|---|---|---|
| SHA-256 hash chains | `src/lib/engine-core.ts` | Implemented |
| Merkle trees + inclusion proofs | `src/lib/engine-core.ts` | Implemented |
| RFC 8785 (JCS) canonicalisation | `src/lib/psi-canonicalize.ts` | Implemented |
| Ed25519 detached signatures | `src/lib/psi-signatures.ts` | Implemented |
| Post-quantum LMS / ML-DSA hybrid signing | `src/lib/psi-lms.ts`, `psi-pqc.ts` | Implemented |
| Bitcoin timestamp anchoring (OpenTimestamps) | `supabase/functions/blockchain-anchor` | Implemented, per-record state shown as CONFIRMED / SUBMITTED / NOT ANCHORED |
| BN128 field-arithmetic commitments | `src/lib/engine-zk.ts` | **Experimental demonstration.** Real finite-field arithmetic, no elliptic-curve pairing, no trusted setup, no zero-knowledge guarantee |

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│                 APEX PSI v1.2                    │
├─────────────┬─────────────┬─────────────────────┤
│  Commit     │  Challenge  │  Respond            │
│  ─────────  │  ─────────  │  ─────────          │
│  SHA-256    │  Reviewer   │  Recompute          │
│  Merkle     │  flags a    │  digest, replay     │
│  Ed25519    │  record     │  chain, verify sig  │
├─────────────┴─────────────┴─────────────────────┤
│  Verification nodes α / β / γ                    │
│  2-of-3 agreement — all three nodes are          │
│  operated by APEX. No third party runs a node.   │
├─────────────────────────────────────────────────┤
│  54 predicate definitions · 11 frameworks        │
└─────────────────────────────────────────────────┘
```

The "2-of-3" threshold is a software redundancy check inside one operator's infrastructure. It is
**not** independent institutional consensus, and it should not be relied on as such.

---

## Predicate Coverage

Predicate definitions are pattern-matching rules against text. They are an authoring aid, not a
legal determination, and they do not establish compliance with any law.

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

Definitions also exist for NIST AI RMF, UK, Canada, Australia, India, Colorado and ISO/IEC 42001
material. Total in source: **54 definitions across 11 frameworks** (`src/lib/engine-core.ts`).

APEX holds no Australian Financial Services Licence and provides no financial product advice.
Mappings to MiFID II and DORA are informational research only.

Full registry: [/registry](https://ai-governance-standard.com/registry)

---

## Quick Start

**No package is published to npm or PyPI.** `@apex/psi-sdk`, `@apex/psi-verifier` and
`psi-verifier` (Python) all return 404 on the public registries. Build from this repository:

```bash
git clone https://github.com/kawal393/APEX-PSI.git
cd APEX-PSI
npm install
npm install ./packages/psi-sdk    # local path install, not a registry install
```

```typescript
import { ApexPSI } from './packages/psi-sdk/src/index';

const psi = new ApexPSI({
  endpoint: 'https://your-instance/functions/v1',
  predicates: ['EU_ART_50'],
  mode: 'blocking',
});

const result = await psi.verify(
  'Synthetic image published without machine-readable AI disclosure',
  'EU_ART_50'
);

console.log(result.compliant);      // false
console.log(result.status);         // 'BLOCKED'
console.log(result.violationFound); // matched pattern, not a legal finding
console.log(result.commitHash);     // SHA-256
console.log(result.merkleProof);    // inclusion proof
```

To verify a seal with no install at all, use the browser tool at
[/hello-psi](https://ai-governance-standard.com/hello-psi) or the reference scripts in
`public/hello-psi/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React · TypeScript · Vite · Tailwind CSS · Framer Motion |
| UI System | shadcn/ui · Radix Primitives |
| Backend | Supabase Edge Functions (Deno) · PostgreSQL with RLS |
| Cryptography | SHA-256 · Ed25519 · Merkle trees · RFC 8785 JCS · LMS / ML-DSA hybrid |
| Redundancy | 3 verification nodes, 2-of-3 agreement, all operated by APEX |
| Timestamping | OpenTimestamps / Bitcoin, state reported per record |

---

## Protocol RFCs

| RFC | Title | Status |
|---|---|---|
| PSI-RFC-001 | Bitcoin Timestamp Anchoring | Draft |
| PSI-RFC-002 | Formal Verification of Predicate Circuits | Draft |
| PSI-RFC-003 | Cross-Protocol Interoperability | Draft |

Individual submissions. No standards body has endorsed them.

---

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

---

## Licensing

This repository is **dual-licensed**, and the two halves differ:

- **Verification is MIT and free forever** — `packages/psi-verifier` (see its `LICENSE`) and the
  Python reference verifier. Anyone may read, implement and run a verifier without permission or
  payment.
- **The PSI-SEAL/1 sealing engine is proprietary — all rights reserved** — see
  `LICENSE-ENGINE.txt`. Producing seals for commercial purposes requires a licence.

So "the math is open" applies to *checking* a seal. It does not mean the whole repository is MIT.
Read both licence files before use. Where any marketing sentence conflicts with those files, the
licence files govern.

---

<p align="center">
  <strong>APEX Infrastructure</strong> — operated by ROCKYFILMS888 PTY LTD (ABN 71 672 237 795)<br/>
  <em>54 predicate definitions · 11 frameworks · 3 nodes, all operated by APEX</em><br/><br/>
  <code>Nothing here is trusted. Everything here is recomputable.</code>
</p>

---

> **Disclaimer.** Apex is not a law firm and gives no legal advice. It is not a regulator,
> not a certifier and not a notified body, and it performs no conformity assessment. The IETF
> documents referenced here are individual submissions with no endorsement or standing. This is
> a proposed standard under active development. Verify everything yourself.
