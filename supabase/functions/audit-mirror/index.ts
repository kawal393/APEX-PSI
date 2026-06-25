// Audit-Mirror — public JSONL stream of recent ledger entries with a signed manifest.
// GET /audit-mirror              -> JSONL of last 500 ledger entries
// GET /audit-mirror?manifest=1   -> JSON manifest (count, latest sequence, sha256 of body, issuer key id)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ISSUER_KEY_ID = "apex-psi-2026";

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const wantManifest = url.searchParams.get("manifest") === "1";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10) || 500, 2000);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("gallows_ledger")
      .select("sequence_number, commit_id, action, predicate_id, phase, commit_hash, merkle_leaf_hash, merkle_root, ed25519_signature, created_at")
      .order("sequence_number", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const lines = (data ?? []).map((r) => JSON.stringify(r)).join("\n");
    const bodyHash = await sha256Hex(lines);
    const latestSeq = (data ?? [])[0]?.sequence_number ?? null;

    if (wantManifest) {
      const manifest = {
        protocol: "apex-psi/audit-mirror",
        version: "1.0",
        issuer_key_id: ISSUER_KEY_ID,
        generated_at: new Date().toISOString(),
        count: data?.length ?? 0,
        latest_sequence: latestSeq,
        body_sha256: bodyHash,
        format: "application/jsonl",
        verify_via: "https://apex-psi.lovable.app/verify",
        well_known: "https://apex-psi.lovable.app/.well-known/compliance-receipt",
      };
      return new Response(JSON.stringify(manifest, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      });
    }

    return new Response(lines, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "public, max-age=30",
        "X-Apex-Body-SHA256": bodyHash,
        "X-Apex-Latest-Sequence": String(latestSeq ?? ""),
        "X-Apex-Issuer-Key": ISSUER_KEY_ID,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
