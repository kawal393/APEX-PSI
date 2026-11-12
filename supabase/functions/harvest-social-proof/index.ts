import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall, resolveCaller } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEARCH_QUERIES = [
  '"PSI Protocol" AI compliance',
  '"Provable Stateful Integrity"',
  '"apex psi" compliance',
  '"APEX" AI governance IETF',
  'site:reddit.com "PSI Protocol"',
  'site:linkedin.com "PSI Protocol" OR "APEX compliance"',
  '"draft-singh-psi" IETF',
  '"APEX compliance" verification',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!lovableKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Paid crawling and AI runs only for the daily scheduler or an admin.
  if (!isInternalCall(req)) {
    const caller = await resolveCaller(req);
    if (!caller.isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Create harvest log entry
  const { data: logEntry, error: logErr } = await supabase
    .from("harvest_log")
    .insert({ status: "running", queries_run: 0, results_found: 0, entries_qualified: 0, entries_inserted: 0 })
    .select()
    .single();

  if (logErr) {
    console.error("Failed to create log entry:", logErr);
    return new Response(JSON.stringify({ error: "Failed to create log" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const logId = logEntry.id;
  const errors: string[] = [];
  let totalResults = 0;
  let totalQualified = 0;
  let totalInserted = 0;
  let queriesRun = 0;

  // Get existing source_urls to deduplicate
  const { data: existingProofs } = await supabase
    .from("social_proof")
    .select("source_url")
    .not("source_url", "is", null);
  const existingUrls = new Set((existingProofs || []).map((p: any) => p.source_url).filter(Boolean));

  for (const query of SEARCH_QUERIES) {
    try {
      queriesRun++;
      console.log(`Searching: ${query}`);

      const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!searchResp.ok) {
        const errText = await searchResp.text();
        errors.push(`Search failed for "${query}": ${searchResp.status} ${errText}`);
        continue;
      }

      const searchData = await searchResp.json();
      const results = searchData.data || [];
      totalResults += results.length;

      if (results.length === 0) continue;

      // Send to AI for analysis
      for (const result of results) {
        if (!result.url || existingUrls.has(result.url)) continue;

        const content = result.markdown || result.description || result.title || "";
        if (!content || content.length < 30) continue;

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are a social proof analyst for APEX Compliance / PSI Protocol. Analyze the following web content and determine if it contains a positive mention, endorsement, or compliment about APEX, PSI Protocol, APEX PSI, or Provable Stateful Integrity.

RULES:
- Only extract POSITIVE or NEUTRAL-POSITIVE mentions
- Skip self-promotional posts by the APEX team itself (by Jaskirat Singh or APEX official accounts)
- Skip spam, irrelevant content, or generic mentions
- Skip negative criticism entirely
- Extract the most quotable sentence or paragraph (max 200 chars)
- Identify the author if possible

Respond using the extract_proof tool.`,
                },
                {
                  role: "user",
                  content: `URL: ${result.url}\nTitle: ${result.title || "N/A"}\n\nContent:\n${content.slice(0, 3000)}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_proof",
                    description: "Extract social proof from web content",
                    parameters: {
                      type: "object",
                      properties: {
                        is_positive: { type: "boolean", description: "True if this is a positive/endorsing mention" },
                        quote: { type: "string", description: "The most quotable excerpt (max 200 chars)" },
                        author_name: { type: "string", description: "Author name if identifiable, or 'Unknown'" },
                        author_title: { type: "string", description: "Author role/title if identifiable, or empty" },
                        author_affiliation: { type: "string", description: "Author company/org if identifiable, or empty" },
                        source_type: { type: "string", enum: ["linkedin", "reddit", "citation", "commentary", "ietf", "blog"] },
                        reason: { type: "string", description: "Brief reason for classification" },
                      },
                      required: ["is_positive", "quote", "author_name", "source_type", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_proof" } },
            }),
          });

          if (!aiResp.ok) {
            if (aiResp.status === 429) {
              errors.push("AI rate limited, pausing");
              await new Promise((r) => setTimeout(r, 5000));
              continue;
            }
            errors.push(`AI error: ${aiResp.status}`);
            continue;
          }

          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) continue;

          const extraction = JSON.parse(toolCall.function.arguments);

          if (!extraction.is_positive || !extraction.quote || extraction.quote.length < 20) {
            continue;
          }

          totalQualified++;

          // Insert into social_proof
          const { error: insertErr } = await supabase.from("social_proof").insert({
            quote: extraction.quote.slice(0, 500),
            author_name: extraction.author_name || "Unknown",
            author_title: extraction.author_title || "",
            author_affiliation: extraction.author_affiliation || "",
            source_url: result.url,
            source_type: extraction.source_type || "commentary",
            approved: false,
            featured: false,
          });

          if (insertErr) {
            errors.push(`Insert failed: ${insertErr.message}`);
          } else {
            totalInserted++;
            existingUrls.add(result.url);
          }
        } catch (aiErr: any) {
          errors.push(`AI processing error: ${aiErr.message}`);
        }
      }

      // Small delay between searches to avoid rate limits
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      errors.push(`Query "${query}" error: ${err.message}`);
    }
  }

  // Update harvest log
  await supabase
    .from("harvest_log")
    .update({
      completed_at: new Date().toISOString(),
      queries_run: queriesRun,
      results_found: totalResults,
      entries_qualified: totalQualified,
      entries_inserted: totalInserted,
      errors: errors.length > 0 ? errors : null,
      status: errors.length > 0 ? "completed_with_errors" : "completed",
    })
    .eq("id", logId);

  console.log(`Harvest complete: ${queriesRun} queries, ${totalResults} results, ${totalQualified} qualified, ${totalInserted} inserted`);

  return new Response(
    JSON.stringify({
      success: true,
      queries_run: queriesRun,
      results_found: totalResults,
      entries_qualified: totalQualified,
      entries_inserted: totalInserted,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
