// ═══════════════════════════════════════════════════════════════════════
// APEX GALLOWS — Public Hash Verification API
// POST /verify-hash { hash: "..." }
// GET /verify-hash?hash=...
// Returns verification status against the immutable ledger
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let hash: string | null = null;

    // Support both GET (query param) and POST (body)
    if (req.method === "GET") {
      const url = new URL(req.url);
      hash = url.searchParams.get("hash");
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        hash = body.hash;
      } catch {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON body",
            verified: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!hash || typeof hash !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid 'hash' parameter",
          verified: false,
          usage: {
            GET: "/verify-hash?hash=<sha256_hash>",
            POST: "{ \"hash\": \"<sha256_hash>\" }",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Search across all hash columns
    // Normalize: accept "sha256:<hex>" prefixed hashes and receipt IDs
    const clean = hash.trim().replace(/^sha256:/i, "");

    const { data, error } = await supabase
      .from("gallows_ledger")
      .select("*")
      .or(
        `commit_hash.eq.${clean},merkle_leaf_hash.eq.${clean},proof_hash.eq.${clean},challenge_hash.eq.${clean},commit_id.eq.${clean}`
      )
      .limit(1);

    if (error) {
      console.error("Database query error:", error);
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          verified: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          verified: false,
          found: false,
          message: "Hash not found in the APEX PSI immutable ledger",
          queried_hash: hash,
          queried_at: new Date().toISOString(),
          engine: "APEX PSI v2.0",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const entry = data[0];
    const hasMerkleProof = entry.merkle_proof && entry.merkle_root;

    return new Response(
      JSON.stringify({
        verified: true,
        found: true,
        merkle_verified: hasMerkleProof,
        commit_id: entry.commit_id,
        predicate_id: entry.predicate_id,
        phase: entry.phase,
        status: entry.status,
        merkle_root: entry.merkle_root,
        ed25519_signature: entry.ed25519_signature,
        signed_payload: entry.merkle_leaf_hash ? `sha256:${entry.merkle_leaf_hash}` : null,
        post_quantum: !!entry.pq_signature,
        pq_signature: entry.pq_signature ?? null,
        pq_public_key: entry.pq_public_key ?? null,
        pq_algorithm: entry.pq_algorithm ?? null,
        action_summary: entry.action.length > 100 
          ? entry.action.substring(0, 97) + "..." 
          : entry.action,
        created_at: entry.created_at,
        challenged_at: entry.challenged_at,
        proven_at: entry.proven_at,
        verification_time_ms: entry.verification_time_ms,
        violation_found: entry.violation_found,
        queried_hash: hash,
        queried_at: new Date().toISOString(),
        engine: "APEX PSI v2.0",
        algorithm: entry.pq_signature
          ? "SHA-256 + Ed25519 + LMS-W4-SHA256"
          : "SHA-256 + Ed25519",
        eu_ai_act_compliance: entry.status === "APPROVED",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        verified: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
