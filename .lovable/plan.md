# Project Lifespan Clock

## What changes

- Add an elegant live counter to the opening homepage section beneath the main statement.
- Anchor it to the earliest verified project conversation: **27 February 2026 at 11:02 UTC** (**9:02 PM Sydney time**).
- Present the start as “ACTIVE SINCE 27 FEBRUARY 2026” with a continuously ticking **days · hours · minutes · seconds** display.
- Keep the existing headline, supporting line, and both links unchanged.

## Design

- Use the existing antique-gold, bone-white, obsidian, and monospace visual language.
- Make the clock feel like a permanent protocol chronometer rather than a promotional countdown.
- Keep all values stable-width to prevent layout shifting and fit the complete opening section on mobile and desktop.
- Respect reduced-motion preferences; only the numerals update.

## Technical details

- Build the timer inside `GrandHero.tsx` using a one-second interval with cleanup.
- Derive elapsed time from the fixed UTC timestamp `2026-02-27T11:02:00Z` so time zones cannot alter the result.
- Verify the visible timestamp and ticking behavior in the homepage preview at desktop and mobile sizes.
