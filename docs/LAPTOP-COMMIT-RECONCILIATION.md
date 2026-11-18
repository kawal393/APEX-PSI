# The laptop-only commits, reconciled

**Measured 16 Nov 2026.** Five commits lived on a local `main` branch that was
never pushed: 357 commits behind `origin/main`, 5 ahead. `git cherry` proved
none of them was patch-equivalent to anything on `origin/main`, so they were
genuinely unique work — not copies. Each one was then checked against the
published tree and given a disposition. Nothing was dropped silently.

| Commit | What it did | Disposition |
|---|---|---|
| `33d9170` | Moved the last two pages' tier labels from Builder/Scale to Pro/Ultra | **Superseded.** `origin/main` names Pro and Ultra, and the site's Corrections page records the rename and why. |
| `ef9d62b` | Rebuilt the homepage as a four-chamber gateway portal; rewrote AdversarialReview to drop ZK-capability, first-mover and ASF/verdict claims | **Superseded.** The portal design is gone: the published homepage is the `what / why / explore / live` view switcher. The claim cuts were redone more strictly — `origin/main`'s AdversarialReview carries the ZK critique as a *withdrawal* ("PSI uses no ZK and no MPC"), not a claim. |
| `5a9db8c` | One word: `overflow-x-hidden` → `overflow-x-clip` on the page wrapper, so the sticky nav bar stops scrolling away | **Carried forward, and it was needed.** See below. |
| `c6bc0e7` | Verifier 1.3.0: R11 authenticity actually checked | **Superseded.** The verifier is 1.7.0 on both indexes; the 1.3.0 release that blessed a declared post-quantum signature is deprecated and labelled. |
| `411f57e` | Three surfaces re-measured against the shipped verifier; one repo contradicted another | **Superseded.** Re-measured on 12–16 Nov by the guards that now run in CI: `check:version-truth`, `check:verifier-truth`, `check:article-claims`, `check:sticky-nav`. |

## The one that was not superseded

`5a9db8c` was written on 3 October 2026 and never reached the published tree.
The site has carried the broken bar ever since.

`overflow-x: hidden` on the wrapper computes the other axis to `auto`, so the
wrapper becomes a scroll container. A `position: sticky` descendant then
resolves against that wrapper instead of the viewport, so it scrolls away with
the page. `overflow-x: clip` clips the overflow without creating a scroll
container, so the sticky bar resolves to the viewport as intended.

**Measured on the live site**, 16 Nov 2026, headless Chrome at 1280×900, after
scrolling 1200px:

```
live site          nav top = -1114   sticks: false   (no bar on screen)
live site + clip   nav top =     0   sticks: true
local build        nav top =     0   sticks: true
```

The frames are the proof: on the live page after the scroll there is no
navigation bar at all; on the built page the nav bar and the view-switcher bar
are both still on screen, over the same content at the same scroll position.

Four pages carried the wrapper — `/`, `/products`, `/sealed-memory`,
`/enforcement-watch` — and all four are fixed.
`scripts/sticky-nav-check.mjs` refuses the class in CI, and it was proven by
re-breaking the wrapper and watching the check fail.

## What this means for the local branch

The local `main` branch is a divergent lineage, five commits of dead work and
one live defect. The published tree is the current one. Nothing on the local
branch is worth merging: the branch's future is a rebase onto `origin/main`
and then deletion, not a merge.
