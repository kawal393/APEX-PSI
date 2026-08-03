// APEX PSI — Dynamic sitemap.xml including AI-generated articles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://ai-governance-standard.com";

const STATIC = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/pramaan", priority: "0.9", changefreq: "weekly" },
  { loc: "/live", priority: "0.8", changefreq: "always" },
  { loc: "/quantum", priority: "0.9", changefreq: "weekly" },
  { loc: "/standard", priority: "0.9", changefreq: "weekly" },
  { loc: "/api", priority: "0.9", changefreq: "weekly" },
  { loc: "/articles", priority: "0.9", changefreq: "daily" },
  { loc: "/assess", priority: "0.8", changefreq: "weekly" },
  { loc: "/gallows", priority: "0.8", changefreq: "weekly" },
  { loc: "/verify", priority: "0.8", changefreq: "weekly" },
  { loc: "/regulations", priority: "0.8", changefreq: "monthly" },
  { loc: "/architecture", priority: "0.7", changefreq: "monthly" },
  { loc: "/sdk", priority: "0.7", changefreq: "monthly" },
  { loc: "/protocol", priority: "0.8", changefreq: "monthly" },
  { loc: "/research", priority: "0.7", changefreq: "monthly" },
  { loc: "/governance", priority: "0.7", changefreq: "monthly" },
  { loc: "/foundation", priority: "0.7", changefreq: "monthly" },
  { loc: "/hardening", priority: "0.7", changefreq: "monthly" },
  { loc: "/challenge", priority: "0.7", changefreq: "monthly" },
  { loc: "/compare", priority: "0.6", changefreq: "monthly" },
  { loc: "/eu-ai-act", priority: "0.8", changefreq: "monthly" },
  { loc: "/registry/check", priority: "0.9", changefreq: "weekly" },
  { loc: "/registry", priority: "0.7", changefreq: "weekly" },
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from("seo_articles")
    .select("slug,updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1000);

  const { data: seals } = await supabase
    .from("gallows_ledger")
    .select("commit_hash,created_at")
    .not("commit_hash", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  const receiptEntries = (seals || []).map(s =>
    `  <url><loc>${SITE}/r/${s.commit_hash}</loc><lastmod>${new Date(s.created_at).toISOString()}</lastmod><priority>0.5</priority><changefreq>monthly</changefreq></url>`
  ).join("\n");

  const staticEntries = STATIC.map(u =>
    `  <url><loc>${SITE}${u.loc}</loc><priority>${u.priority}</priority><changefreq>${u.changefreq}</changefreq></url>`
  ).join("\n");

  const articleEntries = (data || []).map(a =>
    `  <url><loc>${SITE}/articles/${a.slug}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod><priority>0.7</priority><changefreq>weekly</changefreq></url>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${articleEntries}
${receiptEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
