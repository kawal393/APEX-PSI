// ═══════════════════════════════════════════════════════════════════════
// APEX — AI-Powered Translation Edge Function
// Translates UI strings on-demand using Lovable AI, with DB caching
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { target_lang, source } = await req.json();

    if (!target_lang || !source) {
      return new Response(JSON.stringify({ error: "Missing target_lang or source" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from("translation_cache")
      .select("translations")
      .eq("lang", target_lang)
      .single();

    if (cached?.translations) {
      return new Response(JSON.stringify({ translations: cached.translations, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI for translation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "Translation service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Flatten the nested JSON into key-value pairs for translation
    const flatSource = flattenObject(source);
    const sourceText = JSON.stringify(flatSource);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following JSON object values from English to ${target_lang}. Keep all JSON keys exactly the same. Only translate the values. Return ONLY valid JSON, no markdown, no explanation. Maintain the same JSON structure. Keep brand names (APEX, APEX PSI, PSI, EU AI Act, MiFID II, DORA, SHIELD, SWORD, JUDGE) untranslated.`,
          },
          {
            role: "user",
            content: sourceText,
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      console.error("[Translate] AI response error:", aiResponse.status);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let translatedText = aiData.choices?.[0]?.message?.content || "";

    // Clean up potential markdown wrapping
    translatedText = translatedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let translatedFlat: Record<string, string>;
    try {
      translatedFlat = JSON.parse(translatedText);
    } catch {
      console.error("[Translate] Failed to parse AI response");
      return new Response(JSON.stringify({ error: "Translation parse error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unflatten back to nested structure
    const translations = unflattenObject(translatedFlat);

    // Cache the translation
    await supabase
      .from("translation_cache")
      .upsert({ lang: target_lang, translations, updated_at: new Date().toISOString() }, { onConflict: "lang" });

    return new Response(JSON.stringify({ translations, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Translate] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function flattenObject(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
}

function unflattenObject(obj: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = obj[key];
  }
  return result;
}
