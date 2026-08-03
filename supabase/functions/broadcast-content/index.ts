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
const SITE_HOST = "ai-governance-standard.com";
const SITE_ORIGIN = `https://${SITE_HOST}`;

const TOPICS = [
  // Head terms — the phrases we intend to own
  "What is AI governance? A technical definition for 2026",
  "AI governance standards compared: EU AI Act, NIST AI RMF, ISO 42001",
  "Cryptographic truth: proving what an AI system actually did",
  "Verifiable AI governance: from policy documents to cryptographic evidence",
  "AI governance framework checklist for regulated enterprises",
  "AI transparency requirements: what regulators actually ask for",
  "AI audit trail requirements under the EU AI Act",
  "AI accountability: why logs are not evidence",
  "Provenance and content credentials for AI outputs (C2PA)",
  "AI compliance automation: what can and cannot be automated",
  // Long tail — technical depth
  "EU AI Act Article 12 record-keeping compliance",
  "EU AI Act Article 50 marking and detection obligations",
  "Ed25519 signatures for AI audit trails",
  "Bitcoin-anchored proofs for AI governance",
  "IETF draft-singh-psi-00 verifiable AI compliance",
  "Post-quantum signatures for AI systems (ML-DSA and LMS)",
  "SHA-256 Merkle trees for tamper-evident AI logs",
  "NIST AI RMF vs EU AI Act comparison",
  "Cryptographic evidence for AI transparency requirements",
  "AI compliance receipts and the Compliance-Receipt HTTP header",
  "How to prove an AI decision existed at a specific time",
  "Verifiable AI governance without trusting the vendor",
  "Insurance underwriting for AI systems using cryptographic proofs",
  "OpenTimestamps and permanent AI decision records",
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function callAI(system: string, user: string, json: boolean): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!resp.ok) throw new Error(`AI gateway ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function generateArticle(topic: string): Promise<{
  title: string; description: string; keywords: string[]; content_md: string;
}> {
  // Stage 1: metadata as strict JSON (small, easy to parse)
  const metaRaw = await callAI(
    "You are an SEO expert. Output strict JSON only.",
    `Give SEO metadata for an article about: "${topic}".
Return JSON: {"title":"<60 char SEO title with primary keyword","description":"<155 char meta description","keywords":["6-10 target keywords"]}`,
    true,
  );
  const metaClean = metaRaw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const meta = JSON.parse(metaClean);

  // Stage 2: markdown content as plain text (no JSON escaping issues)
  const content = await callAI(
    "You are an expert AI governance journalist writing for developers, regulators, and CIOs. Output raw markdown only — no JSON, no code fences around the whole doc.",
    `Write a 900-1200 word factually accurate article titled "${meta.title}".

CONTEXT: APEX PSI is the open-source verifiable AI compliance protocol — SHA-256 hashing, Ed25519 signatures, Merkle trees, IETF draft-singh-psi-00, MIT-licensed. It provides cryptographic evidence that an AI decision existed at a specific time. Available at ${SITE_ORIGIN}.

STRUCTURE:
- Start with a single H1 matching the title
- Compelling intro paragraph
- 3-5 H2 sections with clear technical detail
- One comparison table (markdown)
- One fenced code snippet (JSON receipt or Ed25519 signature sample)
- Internal links: [Pramaan](${SITE_ORIGIN}/pramaan), [Quantum](${SITE_ORIGIN}/quantum), [Standard](${SITE_ORIGIN}/standard), [API](${SITE_ORIGIN}/api)
- Closing paragraph with a CTA to ${SITE_ORIGIN}

Do NOT invent regulations that don't exist. Do NOT claim official government adoption. Return raw markdown.`,
    false,
  );

  return {
    title: String(meta.title || topic).slice(0, 200),
    description: String(meta.description || "").slice(0, 300),
    keywords: Array.isArray(meta.keywords) ? meta.keywords.slice(0, 15) : [],
    content_md: content,
  };
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
    const requestedCount = Math.min(Math.max(Number(body.count) || 1, 1), 12);
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
