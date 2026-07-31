// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Public Verification Status API
// The "DNS of AI Compliance"
// GET /verify-status?entity=<id>    — Check single entity
// GET /verify-status?action=registry — List all verified entities
// GET /verify-status?action=stats   — Registry statistics
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const entityId = url.searchParams.get("entity");

    // ── Single entity lookup ──
    if (entityId) {
      const { data: comp } = await supabase
        .from("compliance_pulse")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();

      if (!comp) {
        return json({ verified: false, found: false, message: "Entity not found in APEX PSI Registry", entity_id: entityId }, 404);
      }

      const { data: proofs } = await supabase
        .from("verification_history")
        .select("article_number, article_title, status, merkle_proof_hash, verified_at")
        .eq("compliance_result_id", entityId);

      return json({
        verified: comp.status === "compliant",
        found: true,
        entity: {
          id: comp.id,
          name: comp.company_name,
          status: comp.status,
          score: comp.overall_score,
          mode: comp.trio_mode,
          last_verified: comp.updated_at,
        },
        articles: proofs || [],
        cryptographic_assurance: {
          hash_algorithm: "SHA-256",
          signature_scheme: "Ed25519",
          proof_structure: "Merkle Inclusion Proof",
          canonicalization: "RFC 8785 (JCS)",
        },
        verification_portal: "https://digital-gallows.apex-infrastructure.com/verify",
        queried_at: new Date().toISOString(),
        engine: "APEX PSI Protocol v1.0",
      });
    }

    // ── Registry listing ──
    if (action === "registry") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const { data, count } = await supabase
        .from("compliance_pulse")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return json({
        registry: (data || []).map((d) => ({
          id: d.id,
          name: d.company_name,
          status: d.status,
          score: d.overall_score,
          mode: d.trio_mode,
          last_verified: d.updated_at,
          verified: d.status === "compliant",
        })),
        total: count || 0,
        limit,
        offset,
        engine: "APEX PSI Protocol v1.0",
        queried_at: new Date().toISOString(),
      });
    }

    // ── Statistics ──
    if (action === "stats") {
      const { data } = await supabase.from("compliance_pulse").select("status, trio_mode");
      const entries = data || [];

      return json({
        total_entities: entries.length,
        verified: entries.filter((e) => e.status === "compliant").length,
        mostly_compliant: entries.filter((e) => e.status === "mostly_compliant").length,
        partially_compliant: entries.filter((e) => e.status === "partially_compliant").length,
        non_compliant: entries.filter((e) => e.status === "non_compliant").length,
        modes: {
          SHIELD: entries.filter((e) => e.trio_mode === "SHIELD").length,
          SWORD: entries.filter((e) => e.trio_mode === "SWORD").length,
          JUDGE: entries.filter((e) => e.trio_mode === "JUDGE").length,
        },
        engine: "APEX PSI Protocol v1.0",
        queried_at: new Date().toISOString(),
      });
    }

    // ── Usage info ──
    return json({
      engine: "APEX PSI Protocol v1.0 — Public Verification API",
      description: "The DNS of AI Compliance. Query any entity's verification status against the EU AI Act.",
      endpoints: {
        entity_lookup: "/verify-status?entity=<compliance_result_id>",
        registry: "/verify-status?action=registry&limit=50&offset=0",
        statistics: "/verify-status?action=stats",
      },
      documentation: "https://digital-gallows.apex-infrastructure.com/protocol",
      verification_portal: "https://digital-gallows.apex-infrastructure.com/verify",
    });
  } catch (err) {
    console.error("Verify-status error:", err);
    return json({ error: "Internal server error", verified: false }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
