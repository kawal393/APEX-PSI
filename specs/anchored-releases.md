# Anchored Releases — Register of Published Artifacts

- register: `PSI-RELEASES`
- opened: **2026-09-28**
- rule: every document on this shelf is listed here with its SHA-256 digest
  and publication date. Digests are computed from the committed bytes;
  recompute them yourself and compare — do not trust this table.

## How to verify an entry independently

```
sha256sum specs/<file>            # Linux / WSL
Get-FileHash -Algorithm SHA256 specs\<file>   # Windows PowerShell
```

The digest must match the lower-case hex value below, byte-for-byte, given
the same git commit. The git history of this repository (remote `origin`,
branch `main`) is itself the first-tier date proof; Bitcoin anchoring
(below) is the second tier.

## Release register — specification shelf

Published 2026-09-28. SHA-256 digests of the exact committed bytes:

| Artifact | Digest (SHA-256) | Anchor status |
|---|---|---|
| `specs/README.md` | `cf1e4087cbf888e63798ca1b22e063b5af1a5cec1d1915f534a1cd8bc95371f8` | pending next anchor run |
| `specs/psi-seal-1.md` | `cb593dd86a47a7e7947b5bf10eab221bb59b23d4020ef6c5eccd18aaf2521e39` | pending next anchor run |
| `specs/article50-profile-v2.md` | `df932bb70c4a0cec91a420d6e407b669509b736a17d877c83d72450afcc5717e` | pending next anchor run |
| `specs/interop-scitt.md` | `521dd9f65f575adf5385276d72b8db5416c07bf4cc376ba5fefa38bd05d196b7` | pending next anchor run |
| `specs/interop-c2pa.md` | `57f2249c73254d803e344517721d1d5fac77c21ddbccec8e6724f08853f98959` | pending next anchor run |
| `specs/agent-envelope-v1.md` | `54c8fe4f889c007ec3f3d7cd99e37c54c6196dd294e64a94b11f3e8f1952e70b` | pending next anchor run |
| `specs/discrepancy-score-v1.md` | `52c6c1942d9195334c1373c7a5abb66d46f81194ab0a021459e907024d4c6193` | pending next anchor run |
| `specs/evidence-package-v1.md` | `a506bd05aaa7f7afdbda09d04350a0c9038b3aa6c09ff000e8e03395ed1242c8` | pending next anchor run |
| `specs/truth-commons-charter-v1.md` | `8e1611c799e430bd20f8a174efc4a882f05ec92fe5adf5f26a711a212a9a8ff0` | pending next anchor run |

"Pending next anchor run" is the honest state: these bytes are dated by the
git commit that carries them, and they will be sealed and batch-anchored
with the next ledger anchor batch, at which point this register gains an
`anchored at block <height> / txid <txid>` line. Nothing here claims an
anchor it does not yet have.

## Prior dated artifacts (already on the public record)

| Artifact | Date | Evidence |
|---|---|---|
| IETF Internet-Draft `draft-singh-psi-00` | March 2026 | published on the IETF datatracker; lapsed under the six-month rule on 2026-09-18 — the publication date stands as prior art; re-filing in progress |
| Commit `2d3bb1d` — keyless `/v1/verify`, RFC 8785 conformance, provable-silence challenge | 2026 | git history, this repository |
| Commit `bc47b50` — PSI-SEAL/1 12-rule spec + standing challenge on `/protocol` | 2026 | git history, this repository |
| Commit `4b672fc` — Provable Silence panel | 2026 | git history, this repository |

## Ledger state at register opening (live, retrieved 2026-09-28)

Public keyless endpoint: `GET /functions/v1/ledger-stats`

```
total_receipts        5759
confirmed_anchors     4
pending_anchors       0
latest_block_height   967931
latest_anchor_txid    191a268b9f3038643fc76a49d27e29d7487094434595cac3a674d910813d63f2
founded_at            2026-08-22T10:43:09Z
```

These numbers describe the production ledger at retrieval time. Anyone may
re-retrieve them and compare. The ledger anchors in batches; this register
will be updated when the shelf's own digests enter a batch.
