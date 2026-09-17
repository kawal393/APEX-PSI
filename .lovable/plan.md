# Grand Hero — Font & "Standard" Update

## What changes

1. **Typeface: Institutional Classic**
   - Load **Libre Baskerville** (headings) and **IBM Plex Sans** (body) via Google Fonts in `index.html`.
   - Update `tailwind.config.ts` `fontFamily.serif` to Libre Baskerville so the Grand Hero headline renders in it.
   - The hero keeps its massive scale; only the typeface changes — stately, book-like, charter feel.

2. **Add "standard" as the subline**
   - Headline stays: "THE WORLD'S FIRST & ONLY — Global Open Protocol for Digital Truth".
   - The mono subline changes from "Open sourced. Free forever." to include the standard claim:
     - Line 1: **The open standard for digital truth.**
     - Line 2: Open sourced. Free forever.

## Scope guardrails

- Only `src/components/GrandHero.tsx`, `tailwind.config.ts`, and `index.html` (font link) are touched.
- No other homepage sections, copy, or layout change.
- Buttons (The Protocol / Straight to the Engine) stay exactly as they are.

## Technical details

- Google Fonts: `Libre+Baskerville:ital,wght@0,400;0,700;1,400` and `IBM+Plex+Sans:wght@400;500;600`.
- `fontFamily.serif` becomes `['"Libre Baskerville"', 'Georgia', 'serif']` — this also affects other serif usages site-wide (charter/declaration text), which is consistent with the chosen direction.
- Verify with a preview screenshot of the homepage hero.
