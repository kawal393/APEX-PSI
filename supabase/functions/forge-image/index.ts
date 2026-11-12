// APEX FORGE — AI image generation via Lovable AI Gateway.
// Returns base64 PNG; client overlays the APEX VERIFIED stamp + notarizes the hash.
import { resolveCaller } from "../_shared/caller.ts";

const ALLOWED_MODELS = new Set(["google/gemini-2.5-flash-image"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    // Paid AI generation: signed-in users only.
    const caller = await resolveCaller(req);
    if (!caller.userId && !caller.service) {
      return new Response(JSON.stringify({ error: "sign_in_required", message: "Sign in to generate images." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { prompt, model } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 2 || prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const useModel = typeof model === "string" && ALLOWED_MODELS.has(model) ? model : "google/gemini-2.5-flash-image";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: "user", content: prompt.trim() }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      console.error("forge-image upstream error:", res.status, await res.text());
      return new Response(JSON.stringify({ error: "upstream_error", status: res.status }), {
        status: res.status === 429 || res.status === 402 ? res.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const images = data?.choices?.[0]?.message?.images;
    const b64 = images?.[0]?.image_url?.url || images?.[0]?.url;
    if (!b64) {
      return new Response(JSON.stringify({ error: "no_image_returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // b64 is already a data URL (data:image/png;base64,...)
    return new Response(JSON.stringify({ image: b64, model: useModel, prompt: prompt.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("forge-image error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
