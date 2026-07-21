// APEX PSI — AI Content Firehose
// Generates SEO articles about AI governance using Lovable AI,
// saves them to seo_articles, and submits URLs to IndexNow
// (instant indexing on Bing, Yandex, Seznam, Naver).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "5a1fe5a9d86545db89162919e099461320f9e878ee424c1592145af783ddd96e";
const SITE_HOST = "apex-psi.lovable.app";
const SITE_ORIGIN = `https://${SITE_HOST}`;

const TOPICS = [
  "EU AI Act Article 12 record-keeping compliance",
  "Ed25519 signatures for AI audit trails",
  "Bitcoin-anchored proofs for AI governance",
  "IETF draft-singh-psi-00 verifiable AI compliance",
  "Post-quantum signatures for AI systems (ML-DSA)",
  "SHA-256 Merkle trees for tamper-evident AI logs",
  "NIST AI RMF vs EU AI Act comparison",
  "Cryptographic evidence for AI transparency requirements",
  "AI compliance receipts and the Compliance-Receipt HTTP header",
  "How to prove an AI decision existed at a specific time",
  "Verifiable AI governance without trusting the vendor",
  "APEX PSI vs traditional AI audit logs",
  "Insurance underwriting for AI systems using cryptographic proofs",
  "Regulatory sandbox strategies for verifiable AI",
  "OpenTimestamps and permanent AI decision records",
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function generateArticle(topic: string): Promise<{
  title: string; description: string; keywords: string[]; content_md: string;
}> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `Write a 900-1200 word SEO-optimized article about: "${topic}"

CONTEXT: APEX PSI is the open-source verifiable AI compliance protocol — SHA-256 hashing, Ed25519 signatures, Merkle trees, IETF draft-singh-psi-00, MIT-licensed. It provides cryptographic evidence that an AI decision existed at a specific time. Client-side Pramaan seals produce .praman receipts. Available at ${SITE_ORIGIN}.

Return STRICT JSON only (no markdown fences, no prose before/after) with this schema:
{
  "title": "SEO title, <60 chars, includes primary keyword",
  "description": "Meta description, <155 chars, compelling",
  "keywords": ["6-10 target keywords"],
  "content_md": "Full markdown article. Include: H1, intro, 3-5 H2 sections, a comparison table, a code snippet showing a Pramaan receipt or Ed25519 signature, internal links to ${SITE_ORIGIN}/pramaan, ${SITE_ORIGIN}/quantum, ${SITE_ORIGIN}/standard, ${SITE_ORIGIN}/api, and a closing CTA. Be factually accurate. Do NOT invent regulations that don't exist. Do NOT claim APEX is officially adopted by any government."
}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert AI governance journalist. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

async function submitToIndexNow(urls: string[]): Promise<void> {
  // Ping IndexNow — used by Bing, Yandex, Seznam, Naver, Yep.
  // Google does not officially use IndexNow but does read the sitemap we ping via search-engine ping URLs.
  const body = { host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`, urlList: urls };
  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];
  await Promise.allSettled(endpoints.map(url =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  ));
  // Also ping search engine sitemap endpoints
  const sitemapUrl = `${SITE_ORIGIN}/sitemap.xml`;
  await Promise.allSettled([
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requestedCount = Math.min(Math.max(Number(body.count) || 1, 1), 5);
    const customTopic: string | undefined = body.topic;

    const results: any[] = [];
    for (let i = 0; i < requestedCount; i++) {
      const topic = customTopic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
      try {
        const article = await generateArticle(topic);
        const slug = slugify(article.title) + "-" + Math.random().toString(36).slice(2, 8);
        const { data, error } = await supabase.from("seo_articles").insert({
          slug,
          title: article.title,
          description: article.description,
          keywords: article.keywords || [],
          content_md: article.content_md,
        }).select().single();
        if (error) throw error;
        results.push({ slug: data.slug, title: data.title, url: `${SITE_ORIGIN}/articles/${data.slug}` });
      } catch (e: any) {
        results.push({ error: e.message, topic });
      }
    }

    // Submit successful URLs to IndexNow
    const urls = results.filter(r => r.url).map(r => r.url);
    if (urls.length > 0) {
      await submitToIndexNow([...urls, `${SITE_ORIGIN}/`, `${SITE_ORIGIN}/articles`]);
      await supabase.from("seo_articles")
        .update({ indexnow_submitted_at: new Date().toISOString() })
        .in("slug", results.filter(r => r.slug).map(r => r.slug));
    }

    return new Response(JSON.stringify({ success: true, generated: urls.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("broadcast-content error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
