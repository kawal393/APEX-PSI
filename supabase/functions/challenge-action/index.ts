// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — Server-Side Challenge Endpoint
// Persists challenge hash to ledger using service role (bypasses RLS)
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { commit_id } = body;

    if (!commit_id || typeof commit_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'commit_id'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the commit
    const { data: commit, error: fetchError } = await supabase
      .from("gallows_ledger")
      .select("*")
      .eq("commit_id", commit_id)
      .single();

    if (fetchError || !commit) {
      return new Response(
        JSON.stringify({ error: `Commit ${commit_id} not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (commit.phase !== "COMMITTED") {
      return new Response(
        JSON.stringify({ error: `Commit is in phase ${commit.phase}, expected COMMITTED` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate challenge hash server-side
    const challengeTimestamp = new Date().toISOString();
    const challengeHash = await hashSHA256(
      `${commit.commit_hash}|${challengeTimestamp}|${commit.predicate_id}`
    );

    // Update the commit
    const { error: updateError } = await supabase
      .from("gallows_ledger")
      .update({
        phase: "CHALLENGED",
        challenge_hash: challengeHash,
        challenged_at: challengeTimestamp,
      })
      .eq("commit_id", commit_id);

    if (updateError) {
      console.error("[Challenge] Update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update commit", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        commit_id,
        phase: "CHALLENGED",
        challenge_hash: challengeHash,
        challenged_at: challengeTimestamp,
        engine: "APEX PSI v2.1",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[Challenge] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
