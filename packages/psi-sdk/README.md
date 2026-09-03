# @apex/psi-sdk

> **Runtime AI compliance verification — Block non-compliant AI actions before they reach users.**

Part of the [APEX PSI Protocol](https://apex-psi.apex-infrastructure.com/protocol) — the definitive standard for verifiable AI governance.

---

## What This Does

The PSI SDK is the enforcement layer of APEX PSI. It sits between your AI system and your users, cryptographically verifying every output against regulatory predicates **before** it ships.

- **Commit** — SHA-256 hash + Merkle tree inclusion proof for every AI action
- **Challenge** — Regulators flag specific outputs for verification
- **Prove** — ZK-SNARK fraud proofs generated on demand
- **Block** — Non-compliant outputs stopped at the gate

---

## Install

```bash
npm install @apex/psi-sdk
```

---

## Usage

### Basic Verification

```typescript
import { ApexPSI } from '@apex/psi-sdk';

const psi = new ApexPSI({
  endpoint: 'https://your-instance.apex.dev/functions/v1',
  predicates: ['EU_ART_14', 'EU_ART_50'],
  mode: 'blocking',
});

const result = await psi.verify(
  'AI-generated financial advice without risk disclosure',
  'MIFID_ART_25'
);

console.log(result.compliant);      // false
console.log(result.status);         // 'BLOCKED'
console.log(result.violationFound); // 'no suitability check'
console.log(result.commitHash);     // SHA-256 hash chain entry
console.log(result.merkleProof);    // Cryptographic inclusion proof
```

### Express Middleware

```typescript
import express from 'express';
import { ApexPSI } from '@apex/psi-sdk';

const app = express();
const psi = new ApexPSI({
  endpoint: process.env.APEX_ENDPOINT!,
  mode: 'blocking',
});

app.use('/api/ai', psi.middleware({
  predicates: ['EU_ART_14', 'EU_ART_50', 'MIFID_ART_25'],
  mode: 'blocking',
  onViolation: (result, req, res) => {
    res.status(451).json({
      error: 'AI response blocked for regulatory compliance',
      predicate: result.predicateId,
      violation: result.violationFound,
      commitId: result.commitId,
    });
  },
}));
```

---

## License

**MIT** — The math is free. Inspect everything.

© APEX Intelligence Empire