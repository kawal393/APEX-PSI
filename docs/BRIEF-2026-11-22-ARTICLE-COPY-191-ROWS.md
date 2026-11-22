# BRIEF 2026-11-22 — rewrite the 191 published articles that advertise what we measured false

Board task: **010**. Owner of the write: **apexmuse** (the rows live in the project you
deploy; the credential stays with you — no key crosses to this laptop). Verifier: **qoder**,
from the public rows, with a second instrument. Master publishes nothing for this task.

## Measured state, 2026-11-22 ~11:56 AEDT, read from the live table with the public anon key

`node scripts/article-claims-check.mjs` on this laptop: **1,000 published articles, 505
banned claims**, and `node scripts/article-claims-fix.mjs` (dry run, nothing written)
plans **191 rows** to change:

| claim published | hits | articles |
|---|---|---|
| irrefutable | 173 | 108 |
| cryptographic truth | 134 | 39 |
| tamper-proof | 130 | 91 |
| banned token inside the URL itself | 33 | 33 |
| indisputable | 21 | 18 |
| trustworthy and compliant | 4 | 4 |
| unbreakable / compliant by design / world's first | 3 each | 3 each |
| absolute certainty | 1 | 1 |

Fields the dry run touches: `content_md` 184, `title` 33, `description` 16, `slug` 33.

Why it matters and not as hygiene: these are the pages a stranger reads before deciding
whether to trust a receipt we issued. A page that says "unbreakable" is the sentence a
hostile reader puts next to our own documentation, which says a signature is checkable, not
unbreakable. It is one instrument contradicting another in public.

## What to do

In the Lovable project's database, table `seo_articles`, rows `published = true`. Back up the
191 rows first (a JSON or SQL dump of the original values, kept, not printed). Then apply
these substitutions, longest phrase first, to `title`, `description`, `keywords`,
`content_md`:

```
Cryptographic Truth        -> Cryptographic Evidence
CRYPTOGRAPHIC TRUTH        -> CRYPTOGRAPHIC EVIDENCE
cryptographic truth        -> cryptographic evidence
Tamper-Proof               -> Tamper-Evident
Tamper-proof               -> Tamper-evident
TAMPER-PROOF               -> TAMPER-EVIDENT
tamper-proof               -> tamper-evident
Tamper Proof               -> Tamper Evident
tamper proof               -> tamper evident
Irrefutable                -> Independently verifiable
IRREFUTABLE                -> INDEPENDENTLY VERIFIABLE
irrefutable                -> independently verifiable
Irrefutably                -> Independently
irrefutably                -> independently
Indisputably               -> Independently
indisputably               -> independently
Indisputable               -> Independently verifiable
INDISPUTABLE               -> INDEPENDENTLY VERIFIABLE
indisputable               -> independently verifiable
Unbreakable                -> Tamper-Evident
UNBREAKABLE                -> TAMPER-EVIDENT
unbreakable                -> tamper-evident
not only compliant by design but also provably so -> auditable by design and independently verifiable
compliant by design but also provably so          -> auditable by design and independently verifiable
compliant by design        -> auditable by design
provably trustworthy and compliant -> independently verifiable
trustworthy, auditable, and compliant -> trustworthy and auditable
transparent, auditable, and policy-compliant AI systems -> transparent and auditable AI systems with policy evidence
auditable, transparent, and policy-compliant AI systems -> auditable and transparent AI systems with policy evidence
policy-compliant AI systems -> policy-auditable AI systems
trustworthy and compliant  -> trustworthy and auditable
the world's first comprehensive legal framework -> a landmark comprehensive legal framework
the world's first          -> a landmark
reconstruct historical contexts with absolute certainty -> reconstruct historical contexts from the record itself
```

And the 33 URLs: rewrite the slug token `cryptographic-truth` -> `cryptographic-evidence`.
The site already redirects an old address to the renamed one — `cryptographic-evidence` is
present in the live bundle, measured today — so a renamed row keeps its inbound links.
If a target slug is already taken by another row, **skip that rename and say so**; a
collision that hits the unique index loses the copy correction with it.

Do not delete rows. Do not change the schema. Do not touch `published`. Do not rewrite a
sentence to make a guard quiet — substitute the listed phrases and nothing else.

## Acceptance — what qoder measures, not what you report

From this laptop, against the public rows, with no credential of yours:

```
node scripts/article-claims-check.mjs     # exit 0, "0 findings" across 1,000 published articles
```

Until that exits 0 the task is open, whatever else is said about it. When it exits 0, the
next commit removes `continue-on-error: true` from the `article-claims` job, so the guard
becomes blocking and the copy cannot drift back silently.

## What this brief does not fix

The 809 clean articles; the generator that wrote these 1,000 in a batch nobody re-read
(that is the reason the phrase class came back once already, in October, and it is a
separate leg); and the 33 articles whose titles still assert a capability we do not sell —
substitution makes them honest, not good.
