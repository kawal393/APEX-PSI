# God-Level Move I — Make APEX PSI the HTTP-Level Standard for AI Compliance

The thesis: every AI response on the internet should carry a signed compliance receipt the same way every HTTPS response carries a TLS certificate. We propose `Compliance-Receipt:` as a new HTTP response header, ship reference middleware for the six largest AI runtimes so developers can adopt it with one line, and wrap the whole thing in foundation governance plus a peer-review-grade paper so it cannot be owned, forked, or killed.

This is a full institutional build — public surface, developer surface, governance surface, and academic surface — landing in one coordinated release.

---

## 1. The Header Standard: `draft-singh-psi-http-01`

A new IETF-style draft and a live spec page on the site.

**Header shape:**
```text
Compliance-Receipt: v=1; rid=psi_01HZX...; pred=eu-ai-act/art-6,nist-ai-rmf/govern-1.1;
                    status=compliant; sig=ed25519:base64...; anchor=ots:base64...;
                    verify=https://apex-psi.lovable.app/verify/psi_01HZX...
Compliance-Receipt-Policy: mode=optimistic; challenge-window=86400
```

- Versioned, multi-predicate, signed with the same Ed25519 key chain we already publish.
- `verify=` URL is mandatory and must resolve to a public receipt — that is what makes it auditable by anyone, including regulators, with zero coordination.
- `mode=optimistic` reuses our existing optimistic-ZKML posture so adoption costs nothing at p99 latency.

**Deliverables:**
- New page `/standard` (header spec, ABNF, status codes 200/451, examples, security considerations, IANA registration intent).
- `/ietf/http-header` mirrors the draft in IETF Internet-Draft format (CRLF, `text/plain;charset=utf-8`, per our existing IETF submission rules).
- `public/.well-known/compliance-receipt` JSON descriptor so any domain can advertise its receipt issuer + public key.
- Update homepage and `/protocol` to link the new standard above the existing PSI protocol spec.

---

## 2. Reference Middleware — Six Runtimes, One Line Each

A new monorepo surface under `packages/` with thin adapters that wrap an AI call, request a receipt from our Notary, and attach the `Compliance-Receipt` header.

Targets:
- `@apex/psi-openai` — wraps `openai` Node client (`client.chat.completions.create`).
- `@apex/psi-anthropic` — wraps `@anthropic-ai/sdk`.
- `@apex/psi-google` — wraps `@google/generative-ai` (Gemini + Vertex).
- `@apex/psi-bedrock` — wraps AWS Bedrock `InvokeModel`.
- `@apex/psi-vercel-ai` — middleware for the Vercel AI SDK `streamText`/`generateText`.
- `@apex/psi-express` / `@apex/psi-hono` / `@apex/psi-next` — server middleware that injects the header on any response.

Each package exposes the same one-liner:
```ts
import { withPSI } from "@apex/psi-openai";
const openai = withPSI(new OpenAI(), { predicates: ["eu-ai-act/art-6"] });
```

The middleware:
1. Hashes input+output (SHA-256, RFC 8785 canonicalized).
2. Calls `POST /notarize` (existing edge function — no protocol changes required).
3. Attaches `Compliance-Receipt` header, optionally streams via SSE trailer.
4. On `mode=blocking` and a violation, returns HTTP 451 with the receipt.

**Deliverables in this build:**
- Author full READMEs and TypeScript source for `@apex/psi-openai`, `@apex/psi-anthropic`, `@apex/psi-vercel-ai`, and `@apex/psi-hono` inside `packages/` (other four documented as roadmap on `/sdk`).
- Add `/sdk` integration cards for all six with copy-paste install + curl.
- New edge function `notarize-stream` for SSE trailers (existing `notarize` stays for one-shot).

---

## 3. Developer Activation Surface

- New page `/header` — hero "One header. Every AI response. Globally verifiable." with a live demo: paste any URL, we call it, show the `Compliance-Receipt` header parsed and verified in-browser.
- New edge function `inspect-header` — fetches a URL server-side, extracts and verifies the receipt, returns structured JSON. Rate-limited per-IP using the same in-memory pattern as `notarize`.
- Update `Hero.tsx` to add a third CTA: "Adopt the Header" alongside the existing instant-activation curl.
- Update `NotaryDocs.tsx` and `NotaryDemo.tsx` to show header output, not just JSON.

---

## 4. Foundation Scaffolding — `/foundation`

Public-facing, no legal claims we can't back, but enough scaffolding that the foundation is visibly real.

- New page `/foundation` with:
  - Mission: "Steward the PSI protocol and the Compliance-Receipt standard as public infrastructure."
  - Proposed structure: Swiss `Verein` or Estonian non-profit (marked "in formation").
  - Founding charter (Markdown, also at `/foundation/charter`).
  - Board seats: Founder (Chair), Protocol Editor, Independent Cryptographer, Regulator Liaison, Community Operator — all listed as "open" with an apply link, except Chair.
  - Patent Pledge v2: extend AMCZ-2615560564 royalty-free license to "any implementation of `draft-singh-psi-http-01`."
  - Lattice operator program: 1-page "Run a Verifier Node" with eligibility, hardware, signing key handover, monthly attestation requirement.
- Update `/patent-pledge` to link to v2.
- Update `Footer.tsx` and `Navbar.tsx` with a "Foundation" link grouped under Governance.

---

## 5. Peer-Review Paper Surface — `/paper`

The existing `/paper` route gets upgraded into a real preprint landing page.

- Add `public/papers/apex-psi-v1.pdf` placeholder + abstract on-page (we already have the strategic mission doc — port the cryptographic sections).
- Sections rendered on-page: Abstract, Threat Model, Protocol (Commit/Challenge/Prove), Security Proofs (sketch), Evaluation (latency table from real Notary measurements), Related Work, IETF Status.
- "Cite this" block with BibTeX entry referencing a Zenodo DOI placeholder.
- "Submission Status" panel: target venues (USENIX Security '26, IEEE S&P '26, ACM CCS '26), current status "preprint — Zenodo".
- Cross-link from `/research` and `/protocol`.

---

## 6. Technical Layout

```text
src/pages/
  Standard.tsx           # NEW — header spec landing
  Header.tsx             # NEW — live header inspector demo
  Foundation.tsx         # NEW — governance surface
  Paper.tsx              # UPGRADED — preprint landing
  SDK.tsx                # UPDATED — six runtime cards
packages/
  psi-openai/            # NEW
  psi-anthropic/         # NEW
  psi-vercel-ai/         # NEW
  psi-hono/              # NEW
supabase/functions/
  notarize-stream/       # NEW — SSE trailer variant of /notarize
  inspect-header/        # NEW — server-side header verifier
public/
  .well-known/compliance-receipt   # NEW
  papers/apex-psi-v1.pdf           # NEW (placeholder)
  ietf/draft-singh-psi-http-01.txt # NEW
src/App.tsx              # routes for /standard, /header, /foundation
src/components/Navbar.tsx, Footer.tsx   # nav entries
src/components/Hero.tsx  # third CTA
mem://...                # new memory entries for header standard, foundation, paper
```

No database schema changes. The header reuses existing `gallowed_ledger` rows via the existing `verify_url`. No new secrets. `inspect-header` and `notarize-stream` use existing CORS pattern and per-IP rate limiting.

---

## 7. Sequencing Inside the Single Release

1. Header spec page + `.well-known` + IETF text file. (Static, no risk.)
2. `notarize-stream` and `inspect-header` edge functions.
3. `/header` live inspector wired to `inspect-header`.
4. Four reference middleware packages with full source and READMEs.
5. `/sdk` updated with all six runtime cards.
6. `/foundation` + charter + Patent Pledge v2 link.
7. `/paper` upgrade + Zenodo placeholder + BibTeX.
8. Navbar/Footer/Hero/homepage cross-links.
9. Memory writes for each new feature so future sessions stay consistent.

---

## 8. Acceptance Criteria

- `/standard` renders the full header ABNF and a copy-paste curl that returns a real `Compliance-Receipt` header from our own Notary.
- `/header` inspector accepts any URL and visibly verifies (or rejects) its receipt against our public Ed25519 key.
- Each of the four shipped packages compiles, has a README with one-line install + usage, and links to its `/sdk` card.
- `/foundation` lists charter, board seats, and lattice operator program.
- `/paper` shows abstract + sections + BibTeX + target venues.
- All new routes wired in `App.tsx`, present in `Navbar.tsx`/`Footer.tsx`, and discoverable from the homepage.
- No regressions on existing routes, no DB migrations, no new client-exposed secrets.

---

## 9. Out of Scope for This Build (Tracked as Next Moves)

- Real distributed t-of-n MPC node operators (Lattice v2).
- Regulator Read API and 14-jurisdiction outreach kit.
- Legal incorporation of the foundation (we ship scaffolding "in formation"; incorporation is an off-platform legal action).
- USENIX submission itself (we prepare the preprint and venue list; actual submission is your call).

These four follow-ups become the next plans in sequence once this lands.
