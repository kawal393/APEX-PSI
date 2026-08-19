// APEX PSI — build-time sitemap generator.
// Runs on predev/prebuild; writes public/sitemap.xml with all static routes
// plus every published AI-governance article (so Google can discover them
// on the canonical domain, not on the functions host).

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://ai-governance-standard.com";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qhtntebpcribjiwrdtdd.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

interface Entry {
  path: string;
  priority?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  lastmod?: string;
}

const staticEntries: Entry[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/pramaan", priority: "0.9", changefreq: "weekly" },
  { path: "/eu-ai-act", priority: "0.9", changefreq: "weekly" },
  { path: "/inband", priority: "0.9", changefreq: "weekly" },
  { path: "/robustness", priority: "0.9", changefreq: "weekly" },
  { path: "/eu-code", priority: "0.9", changefreq: "weekly" },
  { path: "/verify", priority: "0.9", changefreq: "weekly" },
  { path: "/hello-psi", priority: "0.9", changefreq: "weekly" },
  { path: "/spec", priority: "0.9", changefreq: "monthly" },
  { path: "/articles", priority: "0.9", changefreq: "daily" },
  { path: "/seal", priority: "0.8", changefreq: "weekly" },
  { path: "/forge", priority: "0.8", changefreq: "weekly" },
  { path: "/protocol", priority: "0.8", changefreq: "monthly" },
  { path: "/standard", priority: "0.8", changefreq: "monthly" },
  { path: "/quantum", priority: "0.8", changefreq: "monthly" },
  { path: "/api", priority: "0.8", changefreq: "monthly" },
  { path: "/assess", priority: "0.8", changefreq: "monthly" },
  { path: "/regulator", priority: "0.8", changefreq: "monthly" },
  { path: "/regulations", priority: "0.8", changefreq: "monthly" },
  { path: "/header", priority: "0.7", changefreq: "monthly" },
  { path: "/hardening", priority: "0.7", changefreq: "monthly" },
  { path: "/sdk", priority: "0.7", changefreq: "monthly" },
  { path: "/notary", priority: "0.7", changefreq: "monthly" },
  { path: "/explorer", priority: "0.7", changefreq: "weekly" },
  { path: "/live", priority: "0.8", changefreq: "always" },
  { path: "/gallery", priority: "0.7", changefreq: "weekly" },
  { path: "/witness-wall", priority: "0.7", changefreq: "weekly" },
  { path: "/agi-ledger", priority: "0.7", changefreq: "monthly" },
  { path: "/models", priority: "0.7", changefreq: "weekly" },
  { path: "/standards", priority: "0.7", changefreq: "monthly" },
  { path: "/architecture", priority: "0.7", changefreq: "monthly" },
  { path: "/research", priority: "0.7", changefreq: "monthly" },
  { path: "/governance", priority: "0.7", changefreq: "monthly" },
  { path: "/foundation", priority: "0.7", changefreq: "monthly" },
  { path: "/landscape", priority: "0.6", changefreq: "monthly" },
  { path: "/compare", priority: "0.6", changefreq: "monthly" },
  { path: "/paper", priority: "0.6", changefreq: "monthly" },
  { path: "/draft", priority: "0.6", changefreq: "monthly" },
  { path: "/submission-kit", priority: "0.6", changefreq: "monthly" },
  { path: "/cite", priority: "0.6", changefreq: "monthly" },
  { path: "/registry", priority: "0.6", changefreq: "weekly" },
  { path: "/lattice", priority: "0.6", changefreq: "weekly" },
  { path: "/challenge", priority: "0.6", changefreq: "monthly" },
  { path: "/gallows", priority: "0.7", changefreq: "monthly" },
  { path: "/badge", priority: "0.6", changefreq: "monthly" },
  { path: "/partner", priority: "0.6", changefreq: "monthly" },
  { path: "/pledge", priority: "0.5", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
];

async function fetchArticles(): Promise<Entry[]> {
  if (!SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seo_articles?select=slug,updated_at&published=eq.true&order=created_at.desc&limit=5000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) {
      console.warn(`sitemap: article fetch failed (${res.status}), continuing with static routes`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string | null }>;
    return rows.map((r) => ({
      path: `/articles/${r.slug}`,
      priority: "0.7",
      changefreq: "weekly" as const,
      lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
  } catch (e) {
    console.warn("sitemap: article fetch error, continuing with static routes", e);
    return [];
  }
}

function render(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

const all = [...staticEntries, ...(await fetchArticles())];
writeFileSync(resolve("public/sitemap.xml"), render(all));
console.log(`sitemap.xml written (${all.length} entries)`);
