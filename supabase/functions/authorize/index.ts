// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — AUTHORIZE  (PSI-ACT/1, "the Gate")
// POST /authorize  { agent_id, action_type, intent, policy_ref?, predicate_id?, expires_in_seconds? }
//
// Seals a PROPOSED action BEFORE it is performed, producing an Authorization
// Receipt: a tamper-evident, Ed25519 + LMS-W4-SHA256 signed, Merkle-rooted,
// Bitcoin-anchorable record of "this agent intended this action, at this time,
// under this policy." The counterparty then calls verify-action before honouring
// it. Apex never executes or judges the action — it only issues the checkable
// record. Output is AS-IS; never a warranty or compliance statement.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lmsSignInstitutional, LMS_ALGORITHM } from "../_shared/pq_lms.ts";
import { signEd25519Strict, reserveLmsSlots } from "../_shared/psi_core.ts";
import {
  sha256Hex,
  randomReceiptId,
  canonicalActionPayload,
  recomputeLeaf,
  merkleRootHex,
  isKnownAction,
  ACTION_TYPES,
  PSI_ACT_SCHEMA_ID,
  ACT_TERMS,
} from "../_shared/action.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-apex-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_PER_MINUTE_KEYED = 60;
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const rec = rateLimitCache.get(key);
  if (!rec || now > rec.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}

const signEd25519 = signEd25519Strict;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional API key: raises the per-minute rate + binds the receipt to an owner.
    let userId: string | null = null;
    let keyed = false;
    const apiKey = req.headers.get("x-apex-api-key");
    if (apiKey) {
      const keyHash = await sha256Hex(apiKey);
      const { data: keyData } = await supabase
        .from("notary_api_keys").select("*").eq("api_key_hash", keyHash).eq("revoked", false).single();
      if (keyData) { userId = keyData.user_id; keyed = true; }
    }
    if (!keyed) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id ?? null;
      }
    }

    if (!checkRateLimit(clientIP, keyed ? RATE_LIMIT_PER_MINUTE_KEYED : RATE_LIMIT_PER_MINUTE)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retry_after_seconds: 60 }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { agent_id, action_type, intent, policy_ref, predicate_id, expires_in_seconds } = body;

    if (!agent_id || typeof agent_id !== "string" || agent_id.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing 'agent_id'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isKnownAction(action_type)) {
      return new Response(JSON.stringify({ error: "Unknown 'action_type'", allowed_types: ACTION_TYPES }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!intent || typeof intent !== "object") {
      return new Response(JSON.stringify({ error: "Missing 'intent' object" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const issuedAt = new Date().toISOString();
    const expiresIn = Number(expires_in_seconds) > 0 ? Number(expires_in_seconds) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    const receiptId = await randomReceiptId();
    const canonical = canonicalActionPayload({
      agent_id: agent_id.trim(),
      action_type,
      intent,
      policy_ref: policy_ref || "APEX-GATE/1",
      predicate_id: predicate_id || "EU_ART_50",
      issued_at: issuedAt,
      expires_at: expiresAt,
    });
    if (canonical.length > 20000) {
      return new Response(JSON.stringify({ error: "Action payload exceeds 20000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { commitHash, merkleLeaf } = await recomputeLeaf(canonical, receiptId);

    // Rolling Merkle root over recent action receipts (self-contained tree),
    // conforming to PSI-SEAL/1 R8 (raw-byte parents, odd node promoted).
    let merkleRoot: string;
    try {
      const { data: recent } = await supabase.from("notary_action_receipts")
        .select("merkle_leaf_hash").order("created_at", { ascending: false }).limit(255);
      const leaves = [merkleLeaf, ...(recent?.map((r: { merkle_leaf_hash: string }) => r.merkle_leaf_hash) || [])];
      merkleRoot = await merkleRootHex(leaves);
    } catch {
      merkleRoot = merkleLeaf;
    }

    const signature = await signEd25519(merkleLeaf, supabaseKey);

    // Post-quantum LMS-W4 over the same leaf. Counter = number of PQ-sealed
    // action receipts, so each one-time leaf is used once and the key rotates.
    let pqSignature: Record<string, unknown> | null = null;
    let pqPublicKey: string | null = null;
    try {
      const slot = await reserveLmsSlots(supabase, 1);
      const sig = await lmsSignInstitutional(new TextEncoder().encode(merkleLeaf), slot);
      pqSignature = sig as unknown as Record<string, unknown>;
      pqPublicKey = sig.public_key;
    } catch (e) {
      console.error("[Authorize] LMS signing failed:", e);
    }

    const { error: insertError } = await supabase.from("notary_action_receipts").insert({
      receipt_id: receiptId,
      user_id: userId,
      agent_id: agent_id.trim(),
      action_type,
      policy_ref: policy_ref || "APEX-GATE/1",
      predicate_id: predicate_id || "EU_ART_50",
      canonical_payload: canonical,
      issued_at: issuedAt,
      expires_at: expiresAt,
      commit_hash: commitHash,
      merkle_leaf_hash: merkleLeaf,
      merkle_root: merkleRoot,
      ed25519_signature: signature,
      pq_signature: pqSignature,
      pq_public_key: pqPublicKey,
      pq_algorithm: pqSignature ? LMS_ALGORITHM : null,
      anchor_commit_id: receiptId,
      schema_id: PSI_ACT_SCHEMA_ID,
      status: "issued",
    });
    if (insertError) {
      console.error("[Authorize] Insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Failed to persist authorization receipt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1] || "";
    return new Response(JSON.stringify({
      receipt_id: receiptId,
      agent_id: agent_id.trim(),
      action_type,
      policy_ref: policy_ref || "APEX-GATE/1",
      predicate_applied: predicate_id || "EU_ART_50",
      issued_at: issuedAt,
      expires_at: expiresAt,
      commit_hash: `sha256:${commitHash}`,
      merkle_leaf: `sha256:${merkleLeaf}`,
      merkle_root: `sha256:${merkleRoot}`,
      ed25519_signature: signature,
      pq_signature: pqSignature,
      pq_public_key: pqPublicKey,
      post_quantum: !!pqSignature,
      algorithm: pqSignature ? "SHA-256 + Ed25519 + LMS-W4-SHA256" : "SHA-256 + Ed25519",
      signed_payload: `sha256:${merkleLeaf}`,
      verify_url: `https://${projectId}.supabase.co/functions/v1/verify-action`,
      verify_by: { receipt_id: receiptId, commit_hash: `sha256:${commitHash}` },
      terms: ACT_TERMS,
      schema: PSI_ACT_SCHEMA_ID,
      engine: "APEX PSI GATE v1.0 — Authorization Receipt",
    }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[Authorize] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
