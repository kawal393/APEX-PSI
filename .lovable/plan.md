## Part 1 — Why your logo isn't showing in search

I inspected the live files. There are four real defects, all fixable:

1. **The icon files are broken as icons.** `public/favicon.ico`, `favicon.png` and `apple-touch-icon.png` are all the *same* 2.1 MB, 1024×1331 **non-square** PNG. `favicon.ico` isn't an ICO at all — it's a PNG with an `.ico` extension. Google/Bing require a **square** icon, at least 48×48, in a real supported format, under a sane file size. A non-square 2 MB file gets silently dropped — which is exactly the grey globe you saw on the `apex-infrastructure.com` result.
2. **`og-image.png` is actually a JPEG** with a `.png` name. Same class of mismatch — crawlers that trust the extension can reject it.
3. **Every canonical/OG/JSON-LD URL points at `https://apex-psi.apex-infrastructure.com`**, which is not the live domain. The live domain is `https://digital-gallows.apex-infrastructure.com`. The favicon and logo Google fetches are resolved *relative to the canonical URL*, so it's looking for the icon on the wrong host. This alone breaks logo attribution.
4. **`public/apex.svg` is a plain gold triangle**, not the actual APEX brand mark that exists at `src/assets/apex-logo.png`. That's the SVG referenced first in the head and in the Organization JSON-LD `logo` field.

Also: `robots.txt` advertises `Sitemap: https://apex-psi.lovable.app/sitemap.xml` while the sitemap itself lists `digital-gallows.apex-infrastructure.com` URLs — mixed signals to crawlers.

### The fix

- Generate a proper icon set from the real APEX brand mark (`src/assets/apex-logo.png`), square, padded not stretched: `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png` (180×180), and a genuine multi-size `favicon.ico`.
- Replace `public/apex.svg` with the actual brand mark (or drop the SVG link and lead with the PNG set) so the gold APEX mark is what's served.
- Re-save `og-image` as a true PNG at 1200×630 with the logo present, and correct the `og:image` / `twitter:image` MIME + dimensions.
- Point **canonical, `og:url`, `twitter:*`, and both JSON-LD blocks** at `https://digital-gallows.apex-infrastructure.com`, and add `"logo"` + `"image"` to the Organization schema using the absolute 512px logo URL (this is the field Google reads for the knowledge-panel logo).
- Rewrite `public/manifest.json` icon entries to the new square files with correct `sizes` and add `purpose: "any maskable"`.
- Fix the `Sitemap:` line in `robots.txt` to the custom domain.
- Add `<meta name="msapplication-TileImage">` so Bing (your screenshot is Bing) picks the tile up.

**Honest expectation:** the code fix is immediate, but Google/Bing re-crawl on their own schedule — the icon typically appears within days to a few weeks, not instantly. After publishing I'll tell you exactly which URL to submit in Search Console / Bing Webmaster Tools to force a re-crawl. Note also that the first result in your screenshot (`apex-infrastructure.com`, "Open Reconciliation Infrastructure") is a **different site**, not this project — I can only fix this project's subdomain from here.

## Part 2 — Email sender (as you approved)

- Once `apex-infrastructure.com` is verified in Resend (you add the SPF/DKIM/DMARC records at your registrar and click verify), I switch the sender in `capture-lead` and the other email functions from `onboarding@resend.dev` to `noreply@apex-infrastructure.com`, then run one end-to-end lead capture so we confirm the EU AI Act pack lands in a visitor's inbox rather than only your operator address.
- If you'd rather not wait, I can flip the sender now and it will start working the moment verification completes — it just fails closed to operator-only until then.

## Technical detail

Icon generation via ImageMagick from `src/assets/apex-logo.png` with `-background none -gravity center -extent`, so a non-square mark is padded rather than distorted. All head/meta edits are in `index.html`; manifest and robots are static files under `public/`. No app logic changes.
