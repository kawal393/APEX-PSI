# Uploading `draft-singh-psi-agent-03`

**Status 16 November 2026. The draft is with the IETF.**
Submission **172443** passed both submission checks — idnits 2.17.1 "No issues
found here" for boilerplate and for nits, idnits3 3.1.0 with **0 errors, 0
warnings, 0 comments**. The registry is holding our bytes and has asked the
author of the previous revision — you — to approve the new revision.
**That approval email is the only thing left.**

## What the registry is holding

`submission/draft-singh-psi-agent-03.txt` and
`public/ietf/draft-singh-psi-agent-03.txt` are the same bytes, and they are
the bytes the registry is holding.

```
sha256  ce14437dd82a91deb7921287d9b862caf6c1fa5b9dd5f6a55b033ab93bc753fd
bytes   34484      lines 840       pages 15      LF endings
```

Once the registry posts it, read the served copy back:

```
curl -s https://www.ietf.org/archive/id/draft-singh-psi-agent-03.txt | sha256sum
```

It must print the digest above. The served copy is the file, byte for byte.

Submission page:
<https://datatracker.ietf.org/submit/status/172443/b9a285f9b79e49d3bd3f71105b28ba77/>

## The one click

The email went to `kawaljeet.singh3008@gmail.com` — the Author's Address in
the document, the same inbox that approved the `-01` and the `-02`. The
subject line names the draft. Clicking the approval link moves the
submission from *Awaiting Approval from Previous Version Authors* to posted;
the registry then serves
<https://www.ietf.org/archive/id/draft-singh-psi-agent-03.txt> and announces
it to the `draft-singh-psi-agent` mailing list.

The same approval can be done in the browser: sign in to the datatracker and
open <https://datatracker.ietf.org/submit/approvals/>.

Do not edit the file after this. The registry holds these bytes; a different
file is a different submission.

## Why there is a `-03` at all

The `-02` was posted on 15 November 2026 (submission 172438) and it is
correctly recorded in `public/ietf/draft-singh-psi-agent-02.identity.json`,
byte for byte. But it shipped defects that a layout check could not see:

1. **The Author's Address read `URI:`** where the accepted `-01` reads
   `URL:`. The address is `https://ai-governance-standard.com`, a URL, and
   the label now says so.
2. **Four citations were wrong.** The audit now checks every reference
   against the drafts it points at.
3. **The layout engine was driven from the published file, not from a
   prose source.** So a page break could cut a paragraph in two without
   anyone noticing. On 15 November it did exactly that to the Trust's
   License Notice, which straddled pages 1 and 2 of the first `-03`.

That third one is the interesting failure. The registry's checker ends a
paragraph at a form feed, so a paragraph that straddles a page break is two
paragraphs to it — which is why the first `-03` (submission 172442) was
cancelled with *"there's a paragraph with a matching beginning"*, and why the
`-02` in the archive has a License Notice that looks split.

The prose is now the source. `drafts/ietf/draft-singh-psi-agent-03.prose.txt`
is the text; the published `.txt` is the layout of it. The layout script cuts
pages only between paragraphs, refuses to write a file whose bytes fail a
check, and refuses to write a file that is not the layout of the prose.

```
node scripts/ietf-plaintext-layout.mjs            rebuild the artifact
node scripts/ietf-plaintext-layout.mjs --check    fail if it is stale
node scripts/ietf-draft-audit.mjs                  the word-by-word audit
```

Both run on every push in CI (`npm run check:ietf-draft` and
`npm run check:ietf-audit`). The first asks whether the bytes are well
formed. The second asks whether the words are right.

## The dates

The registry computed the expiry from the document date: dated 15 November
2026, expiring 19 May 2027 — 185 days, the same rule the filed `-01` and
`-02` followed. The draft says the same date in two places, and the audit
fails the build if those two ever disagree with the document date.

## What a filed draft is, and is not

A filing shows that this text was submitted under the Author's Address on
that date. It is not a standard, not an approval, not a legal opinion, and
not a statement that anything the draft describes is true.
