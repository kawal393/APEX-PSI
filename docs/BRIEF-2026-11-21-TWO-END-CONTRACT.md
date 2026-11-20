# Two-end contract — Lovable workspace and laptop Qoder, 21 Nov 2026

Pasted to Lovable by Master. Read the ownership boundary before writing any file.
Every number below was measured, not recalled. Sources are named so either side can re-measure.

## 1. What we understand (measured)

**The ledger and its reach**
- `ledger-stats` reports `total_receipts: 6019`, highest `sequence_number: 6020`, `confirmed_anchors: 4`, latest Bitcoin block 967931, founded 22 Aug 2026.
- The public export endpoint `audit-mirror` works at `?limit=700` (700,840 bytes) and fails at `?limit=750` and above with HTTP 546 `WORKER_RESOURCE_LIMIT`. The code caps at 2000 rows; the runtime cannot deliver that.
- Therefore only sequences 5320–6020 (28 Aug 2026 → 18 Nov 2026) are retrievable by anyone. **5,319 rows — 88.4% of every receipt ever issued — are publicly unreachable and exist only inside this workspace's database.**
- Newest ledger row: 2026-11-18T23:15:53Z. No rows on 19 or 20 Nov. Because we are the only writer, empty days prove nobody tried, not that a write was refused.

**Signing identity**
- All 500 rows sampled from the public mirror verify under published key `59304685328b3cfa…` (`apex-psi-2026`), signature over `merkle_leaf_hash`. Zero rows unattributable.
- The vault seed (64 chars, fingerprint `ad51ab2226407916`) derives `111284cd6462a1ee…` (`apex-psi-2026-11`), which the live trust anchor already lists with status `pending`. The published verifier tries both keys regardless of status, so setting the seed cannot mint an unverifiable receipt.
- Lovable AI reports hosted writes return 500/503 because an older key secret is set. **Laptop cannot confirm this** — there is no Supabase management token anywhere in the vault, and the project is Lovable Cloud, not Master's Supabase account.

**Money**
- Prices actually sold: `$0`, `$11`, `$55`, `Custom` — `src/lib/commerce.ts` lines 47, 57, 67, 77. Allowances: free 100/day at 20/min, Pro 2,000/day, Ultra 20,000/day.
- **$199 and $999 do not exist as live prices.** They are archived price ids quoted only in Corrections prose. Do not wire them.
- Two live `buy.stripe.com` links are present in the shipped bundle and `create-checkout` answers 405 on GET. Measured buyers: zero.
- x402 is already coded in `notarize/index.ts` (`readX402Config`, `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` headers). It refuses with `apex_x402_door_not_configured` HTTP 503 because three settings and a payout address are unset. It needs configuration, not new code.

**Distribution**
- npm `apex-psi-mcp`: 1,446 pulls last month; daily 5–21 baseline, then 388 / 270 / 86 on 16–18 Nov. Those spikes land on publish stamps 1.2.0 (16 Nov 05:17), 1.2.1 (16 Nov 20:47), 1.2.2 (17 Nov 09:44): a publish makes existing installs refetch. npm download counts measure refetching, not people. The npm API also reports 0 for 19–20 Nov for every package including `@playwright/mcp`, so a recent zero is lag, not traffic.
- Comparison: `@playwright/mcp` 41,619,293 last month, weekly 8,508,652 → 10,706,557; `mcp-remote` 5,975,204 (a bridge, not a server).
- Official registry `registry.modelcontextprotocol.io`: our record `io.github.kawal393/apex-psi-mcp` v1.2.2 is `active`, `isLatest: true`; 1.0.1–1.2.1 are `deprecated` as of 17 Nov 09:44. **Our record has `remotes: []`** — stdio only, so a client must install Node to reach us.
- Aggregators dominate the feed: searching `filesystem` returns 50 records led by `com.pulsemcp/*`, `brave` 50 led by `ai.smithery/*`. Directories do not deliver callers; aggregator rails do.
- Smithery's hosted rail is dead (all pages 404, `run.tools` 401, measured 19–20 Nov). A `smithery.yaml` buys nothing.
- Glama, read by Master in his own signed-in browser, not measured by laptop: 408 search impressions, 1 click, that click on the keyword `apex psi`; 356 profile views; 0 deployments; 0 callers; tool inspection stamped 2026-08-12; discovery score 92%.
- The free door `POST /functions/v1/apex-psi-mcp` answers `tools/list` HTTP 200 with 5 tools (seal, verify, anchor, cite, verify_chain). Reads are live.

## 2. What is NOT known — do not state as fact
- Whether hosted writes currently refuse. Only this workspace's logs can answer it.
- Whether `APEX_PSI_ED25519_SEED` is present in this project's secrets, and whether Edge Functions were deployed after 19 Nov 06:22.
- Whether RFC 8785 canonical JSON is what actually gets hashed. The number appears in five front-end components and not in the signing code or in `AGENTS.md`, which records RFC 6962 for Merkle roots. Until proven in code, do not print "RFC 8785".
- Who minted the 141 `sealed-via-mcp` bare-hash rows.

## 3. Lovable workspace does (own these files)
1. **Secrets panel**: confirm the list of secret NAMES (names only, never values) and whether `APEX_PSI_ED25519_SEED` is present. Master pastes the value; nobody types it into chat.
2. **Function logs**: paste one failed `/notarize` line — timestamp, status, error text. This is the single most valuable thing either side can produce today.
3. **Ledger export**: run the query in section 6 and download all 6,020 rows as CSV so the record stops depending on one vendor.
4. **Lander pages** `/for/legal-ai` and `/for/fintech`: state only what a machine can check — that a receipt is verifiable offline by a third party without an APEX account, and which fields the verifier recomputes. No court or admissibility claims.
5. **Publish the site** when laptop hands over copy changes, and report the live bundle hash so the change is provable.

## 4. Lovable must NOT touch
- Payment endpoints (`notarize`, `commit-action`, x402) — already written on the hub; two edits on one money path creates drift.
- Price ids, tier numbers, `commerce.ts`.
- The ledger schema, `psi_core.ts`, the trust anchor, and any signed payload format.
- Public copy containing: "2,360 developers", $199/$999, immutable, tamper-proof, guaranteed, world's first, 100% free, unlimited, court-admissible.

## 5. Laptop Qoder does (own these)
1. Verify the CSV export: recompute every Merkle root, check all signatures, confirm sequence 6020 is present.
2. Publish the ledger to git as append-only shards plus a daily root file, so the record survives a vendor pause.
3. Prove a 2026 receipt verifies with the published npm verifier using only the git copy — no call to this workspace.
4. SDK one-line execution gates for LangChain, LlamaIndex, Smolagents and CrewAI.
5. Registry record: add our hosted door as a `streamable-http` remote so agents connect with nothing installed.
6. Cut the marketplace sentence, fix the shipped npm README line that says verification is "unlimited and free", publish 1.2.3, re-trigger Glama's inspection.

## 6. Master's part (three things, in this order)
1. Secrets: add `APEX_PSI_ED25519_SEED`, value pasted from the clipboard, Save. Then say **done**.
2. SQL editor, run and download as CSV:

```sql
select sequence_number, commit_id, action, predicate_id, phase, commit_hash,
       merkle_leaf_hash, merkle_root, merkle_proof, ed25519_signature, created_at
from gallows_ledger
order by sequence_number;
```

3. Answer yes or no: about $5–9 a month for a server we own.

## 7. Five-minute eyeball test (either side can run it)
- `GET /functions/v1/ledger-stats` → `total_receipts` is larger than the number in the CSV row count minus one.
- `POST /functions/v1/apex-psi-mcp` with `tools/list` → HTTP 200 and 5 tools.
- `GET /functions/v1/audit-mirror?limit=700` → HTTP 200. `?limit=750` → HTTP 546. If 750 returns 200, the box got bigger and this document is stale.
- After the seed is saved: one real seal returns a receipt, and `verify` accepts it. If it still fails, the error text belongs in section 2, not in a guess.
