# New Opening Hero — "The World's First & Only"

## What you'll see
The very first thing on the homepage becomes one massive, majestic headline block:

```
THE WORLD'S FIRST & ONLY
GLOBAL OPEN PROTOCOL FOR DIGITAL TRUTH

Open sourced. Free forever.

[ THE PROTOCOL ]   [ STRAIGHT TO THE ENGINE ]
```

- Massive display typography (huge caps, gold/chrome gradient treatment on the main line, matching the existing Bloomberg-terminal + obsidian/gold language).
- Two buttons directly beneath: **The Protocol** → `/protocol`, **Straight to the Engine** → `/engine`. Both routes already exist, no new pages.
- Everything currently on the homepage stays — this block is added above, not replacing.

## Changes (frontend only)
1. New component `src/components/OpeningHero.tsx`:
   - Line 1 "THE WORLD'S FIRST & ONLY" — large mono caps kicker with gold treatment.
   - Line 2 "Global Open Protocol for Digital Truth" — the largest text on the page, rendered as the page's H1 (so the site keeps exactly one H1 for SEO; the existing hero's "APEX PSI" headline is demoted from h1 to styled text — its look is unchanged).
   - Line 3 "Open sourced. Free forever." — clean supporting line.
   - Two link buttons in the existing button style (hero / heroOutline variants).
   - Subtle entrance animation consistent with the current hero (fade/rise), no heavy motion.
2. `src/pages/Index.tsx`: render `<OpeningHero />` as the first element inside the page, before `CoreDeclaration`.
3. Demote the existing Hero h1 to a non-h1 element (visual styling untouched).
4. Update the homepage `<title>`/meta description to carry the new headline wording.

## Honesty guardrail
"First & only" is the owner's positioning claim; the existing zero-claim and disclaimers blocks remain untouched below it, so the site still states that PSI proves existence and integrity, not truth.

## Verification
- TypeScript check and build pass.
- Playwright screenshot of the top of the homepage at desktop and mobile widths: headline fully visible, no clipping, both buttons readable and in the first screen.
- Confirm single H1 in the served HTML.
