# PSI Agent Envelope — v1

- spec id: `PSI-AGENTENV-1`
- published: **2026-09-28**
- purpose: a minimal, machine-verifiable record format for agreements and
  transactions between autonomous agents — the evidence layer that sits on top
  of any payment or transport rail (x402, AP2, MCP, HTTP, or none)
- design rule: the envelope proves **which bytes were promised, when they
  existed, and whether the fulfilment matches** — it never decides disputes
  and never moves money

## Envelope shape

An envelope is a PSI subject: it canonicalises (RFC 8785 JCS), seals
(PSI-SEAL/1.0.0), and anchors (Bitcoin) exactly like any other sealed record.

```
{
  "kind":          "apex.agent.envelope.v1",
  "channel_id":    "<string, issuer-scoped, stable per agreement>",
  "obligation": {
    "digest":      "<64-hex SHA-256 of the offer/terms bytes>",
    "amount":      "<optional decimal string, e.g. '0.002'>",
    "asset":       "<optional ISO 4217 code or asset id>",
    "deadline":    "<optional RFC 3339 UTC>",
    "counterparty": "<optional public key or identity string>"
  },
  "fulfilment": {
    "digest":      "<64-hex SHA-256 of the delivered-response bytes>",
    "completed_at":"<optional RFC 3339 UTC>"
  },
  "status":        "offered | accepted | fulfilled | failed | expired",
  "rail_ref":      "<optional external id, e.g. an x402 payment reference>"
}
```

Rules inherited from PSI-SEAL/1, not restated: digests lowercase 64-hex;
timestamps RFC 3339 UTC with `Z`; the envelope is JCS-canonicalised; the seal
digest covers the envelope minus signature and licence (R10).

## The three checks

1. **Obligation check** — the sealed `obligation.digest` recomputes against the
   offer bytes originally presented. Proves what was promised has not been
   rewritten after the fact.
2. **Fulfilment check** — `fulfilment.digest` recomputes against the delivered
   bytes. Proves the response was not swapped afterwards.
3. **Timing check** — the Merkle root containing both digests is anchored.
   Proves both existed by the anchored block height. `deadline`, when present,
   is compared against the anchor's inclusion time only in the loose direction
   the chain allows: "existed by block N", never a wall-clock guarantee.

A fourth observable is derived, not asserted: **gap** — the pair
(`obligation.digest`, `fulfilment.digest`) is either both-present, or marked
`failed`/`expired`. An envelope can never hide an unfulfilled promise behind
silence: an anchor with an obligation leaf and no fulfilment leaf is visible
as such in the receipt.

## Mapping to payment rails

| Rail concept | Envelope field |
|---|---|
| x402 payment requirement / receipt | `rail_ref`, plus the payment bytes sealed as a nested digest |
| MCP tool call | call bytes as `obligation.digest`, result bytes as `fulfilment.digest` |
| HTTP API metering event | request/response pair digests, `channel_id` = API key id |
| agent-to-agent protocol message | message bytes as the subject; `channel_id` per session |

The envelope is rail-agnostic on purpose: it stores *evidence of* a
transaction, never the settlement itself.

## What the envelope does not claim

- It is not a smart contract: it enforces nothing, moves nothing, and
  executes nothing. Enforcement, if any, is whatever the parties' own systems
  decide to do with the verified facts.
- It is not a legal characterisation of an agreement. `status` is a technical
  observation recorded by the issuer's system, sealed so it cannot be
  quietly edited later.
- It expresses no adjudication. Two counterparties may seal the same channel
  with different views; both receipts verify; the divergence is the finding.

## Free and paid

Reading and verifying any envelope: free, keyless, offline-verifiable,
forever. Issuing envelopes at volume: metered at the sealing edge, per
`/license`.
