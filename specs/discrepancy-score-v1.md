# PSI Discrepancy Score — v1

- spec id: `PSI-DISCREP-1`
- published: **2026-09-28**
- purpose: a plain, reproducible measure of the distance between **what a
  filing claims** and **what the same underlying data recomputes to** — the
  divergence number, defined so anyone can recompute it without trusting us
- base: the existing Apex Infrastructure financial-forensics ledger
  (recomputation of public filings, e.g. SEC EDGAR XBRL fact sets)

## Definitions

For one metric `m` in one subject `s`:

```
claimed(s,m)     = the value stated in the filing
recomputed(s,m)  = the value derived from the filing's own underlying facts
delta(s,m)       = claimed - recomputed
score(s,m)       = delta / max(|recomputed|, 1)        # dimensionless
score_bps(s,m)   = round(score * 10000)                # basis points
```

Materiality bands (defaults; per-jurisdiction profiles may tighten them):

| band | |score_bps| | reading |
|---|---|---|
| `MATCH` | ≤ 10 | rounds and presentation noise |
| `MINOR` | 11–100 | presentational or classification drift |
| `MATERIAL` | > 100 | the claim and the recomputation disagree by more than 1% |

A finding is the tuple `(s, m, claimed, recomputed, score_bps, band)`. Every
field of every finding is sealed (PSI-SEAL/1.0.0) and anchored (Bitcoin). The
recomputation inputs are public source data; the recomputation itself is
deterministic arithmetic anyone can re-run.

## Public read endpoint (free, keyless)

```
GET /functions/v1/discrepancy?subject=<id>&metric=<id>
→ { subject, metric, claimed, recomputed, score_bps, band,
    receipt: { seal_hash, anchor_txid, block_height } }
```

`404` means "no finding recorded", never "no discrepancy exists" — absence of
a finding is explicitly not a clean bill of health, and the API says so.

## What a discrepancy score is not

- It is **not** an accusation, a legal conclusion, a solvency judgement, or a
  rating. It is arithmetic on public numbers, with the arithmetic published.
- It does not say *why* the gap exists; explanations belong to the reader.
  The score exists so the gap cannot be quietly un-stated later.
- Bands are presentation conventions for machine consumers, not findings of
  fact about any institution.

## Consumption model

- Reading, verifying, and citing any finding: **free forever**, keyless, and
  offline-verifiable from the public rules and vectors.
- Institutional feeds (bulk history, monitoring, change-detection streams):
  the commercial edge — subscription at the data edge, per `/license`.
- Third parties may publish their own analysis built on these findings; the
  `Apex Verified` mark is what they licence, never the data.

## Neutrality clause

Scores are computed by the same published function for every subject, in every
jurisdiction, without exception, and the function is versioned. A band
computation that changed silently would be detectable in every future
seal digest — same principle as the frozen schema.
