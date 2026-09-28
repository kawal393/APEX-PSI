# Anchored Releases — Register of Published Artifacts

- register: `PSI-RELEASES`
- opened: **2026-09-28**
- rule: every document on this shelf is listed here with its SHA-256 digest
  and publication date. Digests are of the **committed git blob bytes**
  (LF-normalised — see the verification note below); recompute them yourself
  and compare — do not trust this table.

## How to verify an entry independently

A digest is only meaningful against a defined byte sequence. This repository
checks out with `core.autocrlf=true`, so a working-tree file on Windows
carries CRLF while the committed blob is LF — the two hash differently. The
digests below are of the **canonical committed blob (LF)**, which is the same
on every platform. Verify against the blob, not a possibly-CRLF working copy:

```
# platform-independent, reads the committed blob directly:
git cat-file blob HEAD:specs/<file> | sha256sum          # Linux / WSL / Git-Bash

# or from a working copy, normalising CRLF -> LF first:
python -c "import hashlib;print(hashlib.sha256(open('specs/<file>','rb').read().replace(b'\r\n',b'\n')).hexdigest())"
```

A `.gitattributes` pins `specs/*.md` to `eol=lf`, so on any future checkout
the working files are LF and a plain `sha256sum specs/<file>` also matches.

The digest must match the lower-case hex value below, byte-for-byte, given
the same git commit. The git history of this repository (remote `origin`,
branch `main`) is itself the first-tier date proof; Bitcoin anchoring
(below) is the second tier.

## Release register — specification shelf

Published 2026-09-28. SHA-256 digests of the canonical committed (LF) blobs
at the shelf commit:

| Artifact | Digest (SHA-256, LF blob) | Anchor status |
|---|---|---|
| `specs/README.md` | `e55a3f9b665e82ec740935aac6a86789ea2fdca199cd72c7186b35a2a69a1f20` | pending next anchor run |
| `specs/psi-seal-1.md` | `4d76cd88024b2f116e68e300e068bef1fdd560da631837bad49729f7b44d7914` | pending next anchor run |
| `specs/article50-profile-v2.md` | `b8cb4f045f2b21b9b7175d69f89d7629d5c66324ed3665b0c254c7bf781f4046` | pending next anchor run |
| `specs/interop-scitt.md` | `5c9f2fbb7921c4090ebd2b57a65e605a51bf0a788c848ee230684e98b01bf7a2` | pending next anchor run |
| `specs/interop-c2pa.md` | `426c1ded219f9a9529262bb5587622e95fdeced8358fd629ac9cccca2c75b5af` | pending next anchor run |
| `specs/agent-envelope-v1.md` | `3a384e6bf639aadb02e7145e464d43427eb025b9b5db0afe9c31c9f4a782c958` | pending next anchor run |
| `specs/discrepancy-score-v1.md` | `2234b2abee94c72a7398a4c211b62038502258940d4e0e7fffebdf7637e52b69` | pending next anchor run |
| `specs/evidence-package-v1.md` | `0587d7804cd7d0aa387c7290a0d984d71b62e66150d8eebfffcc354a1197397b` | pending next anchor run |
| `specs/truth-commons-charter-v1.md` | `5e140ae12696d315337483156f613712492fcf8dbd8d5167e8e177ff53b7628e` | pending next anchor run |

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
