# ai-governance-standard.com — Status, Value, and the Compounding Search Engine

## 1. Where we actually stand (verified now)

| Check | Result |
|---|---|
| `https://ai-governance-standard.com` | Live — HTTP 302 to `www`, HSTS enabled. The DNS flip worked. |
| Canonical / og:url / title in `index.html` | Already pointed at the new domain, with all three IETF drafts asserted |
| Sitemap generator base URL | Already `https://ai-governance-standard.com` |
| Legacy hostname still hardcoded | ~24 files in `src/` and `supabase/functions/` still emit `digital-gallows.apex-infrastructure.com` — including `dynamic-sitemap`, `rss-feed`, `broadcast-content` (so every new AI article links and pings the *old* host) |
| Per-page head support | `react-helmet-async` is installed |

## 2. Domain value — the honest number

Semrush, US database:

| Term | Volume | Difficulty |
|---|---|---|
| ai governance | 8,100/mo | 66 — hard |
| ai governance framework | 2,900/mo | 50 |
| ai governance platform | 1,600/mo | 35 |
| ai compliance software | 880/mo | 41 |
| ai governance standards | 590/mo | 54 |
| eu ai act article 50 | 50/mo | 0 — wide open |
| **ai governance standard** (exact match) | **10/mo** | 0 |

Read it straight: the exact phrase our domain matches is almost never typed. The domain's value is **not** its search volume — it is that an exact-match category name gives instant institutional credibility to a regulator or procurement officer who sees the URL, plus a strong topical signal that helps us rank for the 8,100/mo head term over time. The traffic prize is `ai governance` / `framework` / `platform`; the *fastest* wins are `eu ai act article 50` and `ai audit trail`, where difficulty is 0-16 and nobody has claimed the ground.

## 3. What I'll build: a search loop where every visit compounds

Not just SEO copy — a system where traffic feeds itself.

### A. Point the entire machine at the new domain
Replace every remaining legacy hostname with the `SITE_URL` constant so the sitemap, RSS feed, and every generated article link and IndexNow ping strengthen `ai-governance-standard.com` instead of splitting authority with the old host. Legacy host keeps resolving; it just stops being cited.

### B. Own the three phrases, and the ones that are actually winnable
- A dedicated, regulator-facing pillar page for **AI governance standard**, plus targeted pages for **EU AI Act Article 50** and **AI audit trail** (difficulty 0-16, real intent, currently unclaimed).
- Per-route titles, descriptions, canonicals and JSON-LD via the already-installed Helmet, so every page competes on its own term instead of inheriting the homepage's.
- `DefinedTerm` + `TechArticle` + `FAQPage` structured data so AI answer engines (which is where "what is the AI governance standard" is increasingly asked) can quote us as the definition.

### C. Make each visit add power — the compounding part
This is the actual ask. Four mechanisms:

1. **Every verification becomes a public, indexable page.** Each seal/verify produces a permanent receipt URL with its own metadata and sitemap entry. 1,649 sealed records become 1,649 indexed proof pages. Usage literally manufactures search surface.
2. **Free badge that backlinks.** Anyone who seals anything gets an embeddable "APEX Verified" badge whose HTML links back to their receipt on our domain. Every user becomes a backlink — the one SEO input we cannot buy.
3. **A query-intelligence loop.** Log what visitors search and land on, and feed the top unanswered queries into the existing `broadcast-content` article generator, so the content engine writes against real demand instead of a fixed topic list. Traffic decides what we publish next.
4. **Capture, then convert.** Route every high-intent landing (Article 50 page, verify page) to a single offer — the Article 50 Readiness Report — with the capture path tested end to end. 3,246 visits and 0 leads is the most expensive defect on the site.

### D. Keep search engines permanently fed
Auto-ping IndexNow and refresh the sitemap whenever a new article, receipt, or attestation is created, so new surface is indexed in hours rather than weeks.

## 4. Technical notes
- Sweep `digital-gallows.apex-infrastructure.com` → `SITE_URL` across `src/` and `supabase/functions/`; `dynamic-sitemap`, `rss-feed`, and `broadcast-content` are the high-impact three.
- New public receipt route reads existing ledger rows; sitemap generator gains a receipts section alongside its article query.
- Badge embed extends the existing `/embed/seal` widget with a mandatory backlink to the receipt URL.
- Query loop: a small table of landing-page/query pairs written by the existing `use-page-tracker` hook, read by `broadcast-content` to pick topics.
- No claim on any new page goes beyond what the ledger can prove; anchors still read "pending" until a Bitcoin block confirms.

## 5. Scope check
Section A (hostname sweep) is pure correctness and should ship regardless. Sections B-D are new build. Approve and I start at A and work down in order.
