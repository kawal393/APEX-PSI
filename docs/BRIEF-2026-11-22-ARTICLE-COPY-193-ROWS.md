# BRIEF 2026-11-22 — rewrite the 193 published articles that advertise what we measured false

Board task: **010**. Owner of the write: **apexmuse** (the rows live in the project you
deploy; the credential stays with you — no key crosses to this laptop). Verifier: **qoder**,
from the public rows, with a second instrument. Master publishes nothing for this task.

## Measured state, 2026-11-22 ~21:09 AEDT, read from the live table with the public anon key

`node scripts/article-claims-check.mjs` on this laptop: **1,000 published articles, 505
banned claims**. `node scripts/article-claims-fix.mjs` (dry run, nothing written) plans
**193 rows** to change.

| claim published | hits | articles |
|---|---|---|
| irrefutable | 173 | 108 |
| cryptographic truth | 134 | 39 |
| tamper-proof | 130 | 91 |
| banned token inside the URL itself | 33 | 33 |
| indisputable | 21 | 18 |
| trustworthy and compliant | 4 | 4 |
| unbreakable | 3 | 3 |
| compliant by design | 3 | 3 |
| world's first | 3 | 3 |
| absolute certainty | 1 | 1 |

**total findings: 505**

Fields the dry run touches: `content_md` 186, `title` 33, `description` 16, `slug` 33.
No slug rename is skipped for a collision — measured 0 collisions in this run.

Why it matters and not as hygiene: these are the pages a stranger reads before deciding
whether to trust a receipt we issued. A page that says "unbreakable" is the sentence a
hostile reader puts next to our own documentation, which says a signature is checkable, not
unbreakable. It is one instrument contradicting another in public.

## What to do

In the Lovable project's database, table `seo_articles`, rows `published = true`. Back up
the 193 rows first (a JSON or SQL dump of the original values, kept, not printed). Then
apply these substitutions to `title`, `description`, `keywords`, `content_md`.

**Match case-insensitively and keep the case you found** — all caps stays all caps, a
leading capital stays leading. This is not a style preference: on 22 Nov the first version
of this table matched only the exact case it was written in, so `Trustworthy and compliant`
at the start of a sentence survived the rewrite while the guard, which reads
case-insensitively, kept flagging it. A rewrite that misses the capitalised variants does
not clear the corpus.

The authoritative table is `scripts/article-copy-rules.mjs` — 25 rules, applied longest
phrase first so a specific phrase is rewritten before a shorter one inside it. It is the
same module the fixer writes from and the same one `--self-test` proves, so a copy typed
here that drifts from it is caught, not trusted. Written out:

```
cryptographic truth        -> cryptographic evidence
tamper-proof               -> tamper-evident
tamper proof               -> tamper evident
irrefutably                -> independently
irrefutable                -> independently verifiable
indisputably               -> independently
indisputable               -> independently verifiable
unbreakable                -> tamper-evident
flawless                   -> carefully reviewed
certified compliant        -> auditable
not only compliant by design but also provably so -> auditable by design and independently verifiable
compliant by design but also provably so          -> auditable by design and independently verifiable
compliant by design        -> auditable by design
provably trustworthy and compliant                -> independently verifiable
trustworthy, auditable, and compliant             -> trustworthy and auditable
transparent, auditable, and policy-compliant AI systems -> transparent and auditable AI systems with policy evidence
auditable, transparent, and policy-compliant AI systems -> auditable and transparent AI systems with policy evidence
policy-compliant AI systems -> policy-auditable AI systems
trustworthy and compliant  -> trustworthy and auditable
the world's first comprehensive legal framework   -> a landmark comprehensive legal framework
the world’s first comprehensive legal framework   -> a landmark comprehensive legal framework
the world's first          -> a landmark
the world’s first          -> a landmark
reconstruct historical contexts with absolute certainty -> reconstruct historical contexts from the record itself
with absolute certainty    -> from the record
```

Both apostrophes are listed on purpose: the generator that wrote these articles used the
curly one and the straight one, and a rule for only either leaves the other published.

And the 33 URLs: rewrite the slug token `cryptographic-truth` -> `cryptographic-evidence`.
The site already redirects an old address to the renamed one — `cryptographic-evidence` is
present in the live bundle, measured today — so a renamed row keeps its inbound links.
If a target slug is already taken by another row, **skip that rename and say so**; a
collision that hits the unique index loses the copy correction with it.

Do not delete rows. Do not change the schema. Do not touch `published`. Do not rewrite a
sentence to make a guard quiet — substitute the listed phrases and nothing else.

## Proof that this table is enough, before anyone spends a write

`node scripts/article-claims-check.mjs --after-fix` reads the live rows, applies the table
**in memory** and re-scans. Nothing is written. Measured on this laptop 22 Nov 2026:

```
--after-fix: scanning 1000 rows AS THE FIX WOULD WRITE THEM (nothing is published by this run)
article-claims-check: no published article carries a banned claim.
```

505 findings become 0 on the real corpus, not on a sample. `npm run
check:article-claims:selftest` proves separately that the guard's 11 phrase rules still
bite, that its 3 exemptions are exemptions and not mute buttons, and that no replacement
text is itself a banned phrase. Both are now wired into CI: the self-test on the blocking
rail, the live read and the `--after-fix` projection in the `article-claims` job.

## Acceptance — what qoder measures, not what you report

From this laptop, against the public rows, with no credential of yours:

```
node scripts/article-claims-check.mjs     # exit 0 across 1,000 published articles
```

Until that exits 0 the task is open, whatever else is said about it. When it exits 0, the
next commit removes `continue-on-error: true` from the `article-claims` job, so the guard
becomes blocking and the copy cannot drift back silently.

## What this brief does not fix

The 807 clean articles; the generator that wrote these 1,000 in a batch nobody re-read
(that is the reason the phrase class came back once already, in October, and it is a
separate leg); and the 33 articles whose titles still assert a capability we do not sell —
substitution makes them honest, not good. The write itself still needs a `service_role` key
for project `qhtntebpcribjiwrdtdd`, which is not in this laptop's vault, so the fix script
here plans and reports and cannot apply.
