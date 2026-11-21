# Ledger shards — the public record outside APEX's rented box

These files are a copy of APEX-PSI's append-only ledger taken from the public
read door, `GET /functions/v1/audit-mirror?limit=700`, so anyone can refetch and
compare. They exist so the record does not depend on one vendor's server staying
up.

- `ledger-<first>-<last>.ndjson` — one JSON object per ledger row, ordered by `sequence_number`.
- `manifest.json` — row count, sequence range, `gaps`, `duplicate_sequences`, each shard's sha256, `copy_root` (the RFC 6962 root over every leaf in this git copy), and the root of each shard.
- `ROOTS.tsv` — one tab-separated line per day the copy moved: date, row count, sequence range, gap count and `copy_root`. A run over an unchanged ledger adds nothing.

Rebuild from the live door and re-check every signature:

```
node scripts/ledger-shard-refresh.mjs            # fetch, merge, gate — publishes nothing
node scripts/ledger-shard-refresh.mjs --publish  # ... and commit + push only if all seven gates are green
```

`ledger-shard-refresh.mjs` merges into what is already here, so the copy accumulates
instead of sliding. Without `--merge` a re-run would replace the shards with the door's
newest window and drop the oldest receipts — the failure mode that makes a rolling mirror
a bad archive.

What the second command proves, measured on 21 Nov 2026: 700 of 700 row
signatures verify with `apex-psi-verifier` fetched from npm, using only the keys
listed in `public/.well-known/apex-psi-trust-anchor.json`, with no call to an
APEX service.

What it does not prove: completeness. These shards carry sequences 5320–6020
only, while the ledger reports 6,019 receipts up to sequence 6,020 — 700 of 6,020,
11.6%. Sequence 5463 does not exist, and that is a
counter gap rather than a lost seal: the row number comes from a PostgreSQL
sequence, which advances even when the insert using it is rolled back, so an
aborted insert between the 1 Sept row (5462) and the 3 Sept row (5464) consumed
5463 and wrote nothing. Both neighbours are present in these shards, and the
window holds exactly that one gap and no duplicates. A shard is still a window,
not the whole record — no copy here may claim the sequence numbers are
contiguous.

Why 700 and not more, measured on 21 Nov 2026 against the live door: `limit=800`,
`900`, `1000`, `1500` and `2000` all answer HTTP 546 `WORKER_RESOURCE_LIMIT`, and
`offset=` / `before=` are ignored — `limit=10&offset=5000` returns exactly the same
window as `limit=10`. `audit-mirror` can only ever hand over its newest ~700 rows, so
no amount of fetching reaches sequence 5319 or below. Backfilling the other 5,320 rows
needs one of two things, neither of which a script on this machine can supply: a cursor
parameter added to `audit-mirror`, or a database dump (Act 1). Until then this directory
is a growing window, not the whole record, and any claim that it holds sequences 1–6020
is false.

These rows are seals over hashes. They authenticate an audit trail; they are not
proof that any sealed statement is true.
