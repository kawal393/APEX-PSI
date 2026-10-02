# APEX-SETTLE v0 — Release on Receipt (DRAFT)

Status: **DRAFT / PROPOSED.** Not implemented by any independent party. Subject to change.
APEX does not hold, move or escrow funds. This note describes a condition other
systems may check before they release something.

## Purpose
Let a payment system, data service or workflow make a release conditional on
presenting a PSI receipt that passes the open, offline verifier.

## Condition object
```json
{
  "type": "apex-settle/0",
  "condition_id": "string",
  "requires_mandate": "sha256 hex | null",
  "requires_predicate": "string | null",
  "requires_anchor": "none | submitted | confirmed",
  "release_ref": "opaque reference owned by the releasing system"
}
```

## Rules
1. `condition_hash = SHA-256(JCS(condition))`.
2. The releasing system runs the MIT verifier locally. Release is permitted only
   when integrity, signature and (if required) anchor checks pass.
3. If two receipts for the same event disagree, the releasing system SHOULD
   treat the event as CONTRADICTED and hold, and keep both receipts.
4. The decision to release, hold or refund belongs entirely to the releasing
   system and its parties. APEX is not a party and gives no instruction.
