# @apex/psi-sdk

> **Not published to npm.** This name returns 404 on the public registry. The source lives in
> `packages/psi-sdk` — build it from the repository.

Part of the [APEX PSI Protocol](https://ai-governance-standard.com/protocol) — a proposed open
standard for verifiable AI governance. Not a regulator, not a certifier, not legal advice.

---

## What This Does

The PSI SDK sits between your AI system and your users and records, hashes and (optionally)
blocks outputs against predicate definitions before they ship.

- **Commit** — SHA-256 digest + Merkle inclusion proof for every action
- **Challenge** — a reviewer flags a specific record
- **Respond** — the record is recomputed, the chain replayed, the Ed25519 signature checked
- **Block** — outputs matching a predicate's violation patterns can be stopped at the gate

There is **no zero-knowledge proof and no ZK-SNARK** in this SDK. Predicate matching is
pattern-based and is an authoring aid, not a legal determination.

---

## Install

```bash
# not published to npm — build from the repository
git clone https://github.com/kawal393/APEX-PSI.git
npm install ./packages/psi-sdk
```

---

## Usage

### Basic Verification

```typescript
import { ApexPSI } from '@apex/psi-sdk';

const psi = new ApexPSI({
  endpoint: 'https://your-instance/functions/v1',
  predicates: ['EU_ART_14', 'EU_ART_50'],
  mode: 'blocking',
});

const result = await psi.verify(
  'AI-generated advice published without the required disclosure',
  'EU_ART_50'
);

console.log(result.compliant);      // false
console.log(result.status);         // 'BLOCKED'
console.log(result.violationFound); // matched pattern
console.log(result.commitHash);     // SHA-256 hash chain entry
console.log(result.merkleProof);    // inclusion proof
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
  predicates: ['EU_ART_14', 'EU_ART_50'],
  mode: 'blocking',
  onViolation: (result, req, res) => {
    res.status(451).json({
      error: 'AI response blocked by a local predicate rule',
      predicate: result.predicateId,
      violation: result.violationFound,
      commitId: result.commitId,
    });
  },
}));
```

---

## Licence

This SDK is **MIT**. The PSI-SEAL/1 sealing engine it can talk to is proprietary — see
`LICENSE-ENGINE.txt` at the repository root. Verification is free forever.

© APEX Infrastructure
