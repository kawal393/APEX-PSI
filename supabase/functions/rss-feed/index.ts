// APEX PSI — RSS 2.0 feed for AI-generated articles.
// Consumed by news aggregators, Feedly, IFTTT, Zapier, and AI crawlers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://digital-gallows.apex-infrastructure.com";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from("seo_articles")
    .select("slug,title,description,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const escape = (s: string) => s.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;","\"":"&quot;" }[c]!));

  const items = (data || []).map(a => `
    <item>
      <title>${escape(a.title)}</title>
      <link>${SITE}/articles/${a.slug}</link>
      <guid isPermaLink="true">${SITE}/articles/${a.slug}</guid>
      <description>${escape(a.description)}</description>
      <pubDate>${new Date(a.created_at).toUTCString()}</pubDate>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>APEX PSI — Verifiable AI Governance</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Cryptographic evidence for AI compliance. IETF draft-singh-psi-00.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
