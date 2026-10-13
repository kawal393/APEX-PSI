import { rfc6962Root, signEd25519Strict, signMlDsa65Strict, MERKLE_PROFILE } from "../_shared/psi_core.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-apex-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashSHA256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function generateReceiptId(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `APEX-NTR-${hex.toUpperCase()}`;
}

const signEd25519 = signEd25519Strict;
const computeBinaryMerkleRoot = rfc6962Root;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { decisions } = body;

    if (!Array.isArray(decisions) || decisions.length === 0) {
      return new Response(JSON.stringify({ error: "Missing 'decisions' array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (decisions.length > 100) {
      return new Response(JSON.stringify({ error: "Max 100 decisions per batch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (decisions.some((item) => !(typeof item === "string" ? item : item?.decision)?.trim?.())) {
      return new Response(JSON.stringify({ error: "Every decision must be non-empty text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    // API key check
    const apiKey = req.headers.get("x-apex-api-key");
    let tier = "free";
    if (apiKey) {
      const keyHash = await hashSHA256(apiKey);
      const { data: keyData } = await supabase
        .from("notary_api_keys")
        .select("*")
        .eq("api_key_hash", keyHash)
        .eq("revoked", false)
        .single();
      if (keyData) {
        tier = keyData.tier;
        userId = keyData.user_id;
      }
    }

    if (tier === "free" && decisions.length > 20) {
      return new Response(JSON.stringify({
        error: "Public batches are limited to 20 decisions (the public per-minute allowance). Use an API key for batches up to 100.",
        public_batch_limit: 20, keyed_batch_limit: 100,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (tier === "free") {
      const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const visitorDigest = await hashSHA256(`${supabaseKey}|${clientIP}`);
      const { data: reserved, error: quotaError } = await supabase.rpc("reserve_public_notary_quota", {
        p_visitor_digest: visitorDigest, p_count: decisions.length,
        p_daily_limit: 100, p_minute_limit: 20,
      });
      if (quotaError) {
        console.error("[Notary-Batch] Quota check failed:", quotaError);
        return new Response(JSON.stringify({ error: "Public capacity temporarily unavailable" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (!reserved) {
        return new Response(JSON.stringify({ error: "Public allowance reached", daily_limit: 100, minute_limit: 20 }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" }
        });
      }
    }

    const timestamp = new Date().toISOString();
    const receipts = [];
    const ledgerRows = [];
    const allLeaves: string[] = [];

    for (const item of decisions) {
      const decision = typeof item === "string" ? item : item.decision;
      if (!decision || typeof decision !== "string") continue;

      const modelId = typeof item === "object" ? item.model_id : null;
      const context = typeof item === "object" ? item.context : null;
      const predicateId = (typeof item === "object" ? item.predicate : null) || "EU_ART_12";

      const receiptId = await generateReceiptId();
      const canonicalPayload = JSON.stringify({
        decision: decision.trim(), model_id: modelId, context, predicate: predicateId, timestamp,
      });

      const decisionHash = await hashSHA256(canonicalPayload);
      const commitHash = await hashSHA256(`${decision.trim()}|${predicateId}|${timestamp}`);
      const merkleLeaf = await hashSHA256(`${receiptId}|${commitHash}`);
      allLeaves.push(merkleLeaf);

      const signature = await signEd25519(merkleLeaf, supabaseKey);
      const mldsa = await signMlDsa65Strict(merkleLeaf);

      receipts.push({
        receipt_id: receiptId, timestamp, decision_hash: `sha256:${decisionHash}`,
        merkle_leaf: `sha256:${merkleLeaf}`, ed25519_signature: signature,
        mldsa65_signature: mldsa.sig, mldsa65_public_key: mldsa.pk, merkle_profile: MERKLE_PROFILE,
        merkle_scope: "batch", predicate_applied: predicateId, receipt_version: "PSI-1.2",
      });

      ledgerRows.push({
        commit_id: receiptId, user_id: userId,
        action: `NOTARIZE-BATCH: ${decision.trim().substring(0, 500)}`,
        predicate_id: predicateId, phase: "VERIFIED", status: "APPROVED",
        commit_hash: commitHash, merkle_leaf_hash: merkleLeaf,
        ed25519_signature: signature, mldsa65_signature: mldsa.sig, merkle_root: "", // filled below
      });
    }

    // Compute batch Merkle root across ALL leaves
    const batchMerkleRoot = await computeBinaryMerkleRoot(allLeaves);

    // Set root on all rows and receipts
    for (let i = 0; i < ledgerRows.length; i++) {
      ledgerRows[i].merkle_root = batchMerkleRoot;
      (receipts[i] as Record<string, unknown>).merkle_root = `sha256:${batchMerkleRoot}`;
    }

    // Bulk insert
    const { error: insertError } = await supabase.from("gallows_ledger").insert(ledgerRows);
    if (insertError) {
      console.error("[Notary-Batch] Insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Failed to persist batch" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      batch_size: receipts.length,
      batch_merkle_root: `sha256:${batchMerkleRoot}`,
      receipts,
      tier,
      engine: "APEX NOTARY Batch v1.0",
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[Notary-Batch] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
