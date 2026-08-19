import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 10 per IP per hour
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= 10) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 attestations per hour." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    }

    const body = await req.json();
    const { commit_id, verification_result } = body;

    if (
      !commit_id ||
      typeof commit_id !== "string" ||
      commit_id.length < 4 ||
      commit_id.length > 128 ||
      !/^[A-Za-z0-9_:.-]+$/.test(commit_id)
    ) {
      return new Response(JSON.stringify({ error: "commit_id is required and must be a valid identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validResults = ["VERIFIED", "FAILED", "CONTESTED"];
    if (!verification_result || !validResults.includes(verification_result)) {
      return new Response(JSON.stringify({ error: "verification_result must be VERIFIED, FAILED, or CONTESTED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate attestor hash from IP + User-Agent (anonymous but unique)
    const ua = req.headers.get("user-agent") || "unknown";
    const attestorData = new TextEncoder().encode(`${ip}|${ua}`);
    const attestorDigest = await crypto.subtle.digest("SHA-256", attestorData);
    const attestor_hash = Array.from(new Uint8Array(attestorDigest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate attestation hash
    const attestationData = new TextEncoder().encode(`${commit_id}|${attestor_hash}|${verification_result}|${Date.now()}`);
    const attestationDigest = await crypto.subtle.digest("SHA-256", attestationData);
    const attestation_hash = Array.from(new Uint8Array(attestationDigest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.from("public_attestations").insert({
      commit_id,
      attestor_hash,
      verification_result,
      attestation_hash,
    }).select().single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      attestation_id: data.id,
      attestation_hash,
      attestor_hash: attestor_hash.substring(0, 16) + "...",
      commit_id,
      verification_result,
      message: "Attestation anchored to the public ledger",
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
