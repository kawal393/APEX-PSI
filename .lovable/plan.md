## Goal

Your YouTube promotions sent ~2,576 impressions and 133 clicks to the site. Right now those visitors are logged in `site_visits` with page path, referrer, city/country and device only — no campaign attribution, and nothing asks them for an email. They arrive, read, and vanish. This plan turns that traffic into identified, contactable leads.

Note on IP addresses: harvesting visitor IPs to identify people is a GDPR problem (and your audience is EU regulators). The defensible, more valuable play is consented email capture plus campaign attribution — that gives you a list you can actually email, without legal exposure.

## What gets built

### 1. Campaign attribution (know which ad worked)
- Capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` and the landing page on first visit, persist them for the session, and store them on every `site_visits` row.
- Add those columns to the visits table so each visit is traceable back to the exact YouTube promotion.
- Gives per-campaign numbers: visits, pages per session, and conversions — so you know whether the $0.46 ad or the $2.79 ad actually produces leads.

### 2. The capture offer (get the email)
A single high-value offer shown to unidentified visitors, not a generic newsletter box:

> **"Get the EU AI Act Article 50 Compliance Pack"** — the technical spec, the Article 50 clause mapping, and a verifiable sealed sample receipt.

Surfaced in three places, all dismissible and shown at most once per visitor:
- An inline band on the homepage under the two-pillar section.
- The existing exit-intent popup, repointed at this offer.
- A post-action prompt after someone seals a file on `/pramaan` or `/seal` — the highest-intent moment on the site ("email me the verifiable receipt for this seal").

Each submission writes email, campaign attribution, the page they converted on, and intent signal into the leads table.

### 3. Automatic follow-up
Reuse the existing `score-and-enroll-leads` / drip-queue machinery: a new lead is scored (regulator/enterprise domain, pages viewed, whether they sealed something) and enrolled in a short sequence — pack delivery, then the spec, then a contact prompt for high-score leads.

### 4. Campaign dashboard
A new "Campaigns" panel in `/admin` showing, per UTM campaign: visits, unique visitors, leads captured, conversion rate, top landing pages, and countries. Plus a CSV export of leads with their attribution, so you can work the list manually or in an email tool.

### 5. Ready-to-use tracked links
A small reference block in the admin panel that builds the tagged URLs to paste into YouTube/Reddit/email, e.g. `?utm_source=youtube&utm_medium=paid&utm_campaign=eu-aug2`, so every future ad is attributable from the first click.

## Technical details

- Migration: add `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_page` to `public.site_visits`; create `public.marketing_leads` (email, name, company, source page, intent, utm fields, visitor_id, score, status) with RLS — public `INSERT` only, reads restricted to admins via `has_role`, plus the required `GRANT`s.
- `src/hooks/use-page-tracker.ts` extended to parse UTMs on first landing, store them in `sessionStorage`, and attach them to every insert.
- New `src/components/LeadCaptureOffer.tsx` (inline + modal variants) with zod-validated email input; wired into the homepage, `ExitIntentPopup`, `/pramaan` and `/seal`.
- New `src/components/admin/CampaignPanel.tsx` reading aggregates through the existing `admin-data` edge function (extended with a `campaigns` action) so no raw visitor data is exposed client-side.
- Follow-up handled by extending the existing lead-scoring/drip functions rather than new infrastructure.
- No IP collection, no third-party trackers; the offer states what the email is used for.

## Out of scope unless you ask
- Buying company-identification services (Clearbit/RB2B-style IP-to-company enrichment).
- Retargeting pixels (Meta/Google), which would add third-party tracking to a privacy-positioned site.
