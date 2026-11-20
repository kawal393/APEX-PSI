# Ledger shards — the public record outside APEX's rented box

These files are a copy of APEX-PSI's append-only ledger taken from the public
read door, `GET /functions/v1/audit-mirror?limit=700`, so anyone can refetch and
compare. They exist so the record does not depend on one vendor's server staying
up.

- `ledger-<first>-<last>.ndjson` — one JSON object per ledger row, ordered by `sequence_number`.
- `manifest.json` — row count, sequence range, `gaps`, `duplicate_sequences`, each shard's sha256, and the RFC 6962 root over each shard's leaves.

Rebuild from the live door and re-check every signature:

```
node scripts/ledger-git-shards.mjs "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/audit-mirror?limit=700" ledger-shards
node scripts/offline-verify-from-git.mjs
```

What the second command proves, measured on 21 Nov 2026: 700 of 700 row
signatures verify with `apex-psi-verifier` fetched from npm, using only the keys
listed in `public/.well-known/apex-psi-trust-anchor.json`, with no call to an
APEX service.

What it does not prove: completeness. These shards carry sequences 5320–6020
only — the public door stops at about 700 rows — while the ledger reports 6,019
receipts up to sequence 6,020. Sequence 5463 does not exist, and that is a
counter gap rather than a lost seal: the row number comes from a PostgreSQL
sequence, which advances even when the insert using it is rolled back, so an
aborted insert between the 1 Sept row (5462) and the 3 Sept row (5464) consumed
5463 and wrote nothing. Both neighbours are present in these shards, and the
window holds exactly that one gap and no duplicates. A shard is still a window,
not the whole record — no copy here may claim the sequence numbers are
contiguous.

These rows are seals over hashes. They authenticate an audit trail; they are not
proof that any sealed statement is true.
