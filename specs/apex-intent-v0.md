# APEX-INTENT v0 — Pre-Action Mandate (DRAFT)

Status: **DRAFT / PROPOSED.** Not implemented by any independent party. Subject to change.

## Purpose
Record, before an automated system acts, what it was authorised to do — so the
action can later be compared with the authority it was given. A mandate does not
make an action correct, safe or lawful. It records a stated limit.

## Object
```json
{
  "type": "apex-intent/0",
  "mandate_id": "string",
  "issuer_key": "ed25519 public key (hex)",
  "subject": "agent or system identifier",
  "allowed_actions": ["string"],
  "limits": { "budget": "string", "max_calls": 0 },
  "not_before": "RFC 3339",
  "expires": "RFC 3339",
  "parent_mandate": "sha256 hex | null"
}
```

## Rules
1. `mandate_hash = SHA-256(JCS(mandate))` per RFC 8785.
2. The issuer signs `mandate_hash` with Ed25519; the signature list follows PSI-SEAL/1 §3.
3. A child mandate MUST NOT widen `allowed_actions` or `limits` of its parent.
4. Any PSI receipt produced under a mandate SHOULD carry `mandate_hash` in its payload.
5. Verification reports only: signature valid, chain unbroken, within time window,
   action listed. It never reports intent, good faith or compliance.
