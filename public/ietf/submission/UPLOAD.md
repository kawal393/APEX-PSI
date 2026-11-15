# Uploading `draft-singh-psi-agent-02`

**Status 16 November 2026, 06:45 Melbourne.** The draft is with the IETF.
Submission **172438** passed both submission checks and the registry is
holding our bytes. The registry has asked the author of the previous
revision — you — to approve the new revision. **That approval email is the
only thing left.**

## What the registry is holding

`submission/draft-singh-psi-agent-02.txt` and
`public/ietf/draft-singh-psi-agent-02.txt` are the same bytes, and they are
the bytes the registry is holding.

```
sha256  853c7d1db88ad9d2036258e934eaa8517155faf6df5151b8a904a6ff74d01ec5
bytes   29180      lines 728      pages 13      LF endings
```

Read back from the registry on 16 November 2026:

```
curl -s https://www.ietf.org/staging/draft-singh-psi-agent-02.txt | sha256sum
853c7d1db88ad9d2036258e934eaa8517155faf6df5151b8a904a6ff74d01ec5
```

Submission page:
<https://datatracker.ietf.org/submit/status/172438/b6e076f40c728d562283a979822fb49f/>

## The one click

The email went to `kawaljeet.singh3008@gmail.com` — the Author's Address in
the document, the same inbox that approved the `-01`. The subject line names
the draft. Clicking the approval link moves the submission from *Awaiting
Approval from Previous Version Authors* to posted; the registry then serves
<https://www.ietf.org/archive/id/draft-singh-psi-agent-02.txt> and announces
it to the `draft-singh-psi-agent` mailing list.

The same approval can be done in the browser: sign in to the datatracker and
open <https://datatracker.ietf.org/submit/approvals/>.

Do not edit the file after this. The registry holds these bytes; a different
file is a different submission.

## Why the first attempt failed, and what fixed it

The 15 November attempt (submission 172436) was cancelled by the registry's
own checker before it reached you. It named two defects, and both are fixed
and both are now guarded in CI:

1. **The License Notice was two paragraphs.** The IETF Trust provisions of
   28 Dec 2009 section 6.b(ii) paragraph 3 are one paragraph: the BCP 78
   sentence and the "Please review these documents carefully" sentence
   belong to the same paragraph. A blank line between them ends the
   paragraph early, and the checker said so: *"there's a paragraph with a
   matching beginning."*
2. **The file carried no page furniture.** idnits3 wants the expiry date on
   the first *and* the last page. A hand-written plain-text draft has no
   footer, so the last page had none. The filed `-01` shows the answer: a
   footer on every page reading `Singh   Expires <date>   [Page N]`.

`scripts/ietf-plaintext-layout.mjs` now lays the draft out the way the
accepted `-01` is laid out — running header, footer with the expiry date,
form feeds, and no paragraph cut across a page break — and it refuses to
write a file whose bytes fail a check. `npm run check:ietf-draft` fails if
the upload artifact no longer matches the source, and CI runs it on every
push.

```
node scripts/ietf-plaintext-layout.mjs          rebuild the artifact
node scripts/ietf-plaintext-layout.mjs --check  fail if it is stale
```

## After it is announced

Read the served copy, not the form:

```
curl -s https://www.ietf.org/archive/id/draft-singh-psi-agent-02.txt | sha256sum
```

It must print the digest above. The served copy is the file, byte for byte.

The registry computed the expiry from the document date: dated 15 November
2026, expiring 19 May 2027 — 185 days, the same rule the filed `-01`
followed. The draft says the same date in two places, and the script fails
the build if those two ever disagree with the document date.

## What a filed draft is, and is not

A filing shows that this text was submitted under the Author's Address on
that date. It is not a standard, not an approval, not a legal opinion, and
not a statement that anything the draft describes is true.
