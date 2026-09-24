// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — VERIFY-ACTION  (PSI-ACT/1, the counterparty's Gate)
// POST /verify-action { receipt_id | commit_hash, action_type?, policy_ref? }
// GET  /verify-action?receipt_id=...
//
// A counterparty calls this BEFORE honouring an agent action. It RECOMPUTES
// the seal chain from the stored record (so a tampered row is detected), runs
// real post-quantum LMS-W4 verification, checks revocation, expiry, and policy
// scope, and returns an ALLOW/DENY with the full proof + Bitcoin anchor.
//
// The Gate's power is not enforcement — it is that an unproven action becomes
// cheap to REFUSE. Apex states only the integrity/existence of the record; it
// never asserts the action was correct, safe, or lawful (no warranty).
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lmsVerify, LMS_ALGORITHM, LMS_STANDARD } from "../_shared/pq_lms.ts";
import { recomputeLeaf, isKnownAction, ACT_TERMS, PSI_ACT_SCHEMA_ID, gateDecision } from "../_shared/action.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function bad(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ allowed: false, error: msg, verified: false }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let receiptId: string | null = null;
    let commitHash: string | null = null;
    let claimedAction: string | undefined;
    let claimedPolicy: string | undefined;

    if (req.method === "GET") {
      const url = new URL(req.url);
      receiptId = url.searchParams.get("receipt_id");
      commitHash = url.searchParams.get("commit_hash")?.replace(/^sha256:/i, "") || null;
      claimedAction = url.searchParams.get("action_type") || undefined;
      claimedPolicy = url.searchParams.get("policy_ref") || undefined;
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        receiptId = body.receipt_id || null;
        commitHash = (body.commit_hash || "").replace(/^sha256:/i, "") || null;
        claimedAction = body.action_type;
        claimedPolicy = body.policy_ref;
      } catch {
        return bad("Invalid JSON body");
      }
    } else {
      return bad("Method not allowed", 405);
    }

    if (!receiptId && !commitHash) return bad("Provide 'receipt_id' or 'commit_hash'");

    // ── LOOKUP ──
    let q = supabase.from("notary_action_receipts").select("*");
    if (receiptId) q = q.eq("receipt_id", receiptId);
    else q = q.eq("commit_hash", commitHash);
    const { data, error } = await q.limit(1).maybeSingle();

    if (error) {
      console.error("[VerifyAction] query error:", error);
      return bad("Lookup failed", 500);
    }
    if (!data) {
      return new Response(JSON.stringify({
        allowed: false, found: false, verified: false,
        reason: "no_such_receipt",
        message: "No matching authorization receipt exists. Refuse the action.",
        checked_at: new Date().toISOString(), engine: "APEX PSI GATE v1.0",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── RECOMPUTE INTEGRITY from the stored record (detects tampering) ──
    const { commitHash: rc, merkleLeaf: rl } = await recomputeLeaf(data.canonical_payload, data.receipt_id);
    const commitOk = rc === data.commit_hash;
    const leafOk = rl === data.merkle_leaf_hash;
    const integrity_verified = commitOk && leafOk;

    // ── REAL POST-QUANTUM VERIFICATION over the (recomputed) leaf ──
    let pqVerified: boolean | null = null;
    let pqError: string | null = null;
    if (data.pq_signature && leafOk) {
      try {
        pqVerified = await lmsVerify(
          new TextEncoder().encode(rl),
          data.pq_signature as Parameters<typeof lmsVerify>[1],
          data.pq_public_key ?? undefined,
        );
        if (!pqVerified) pqError = "LMS-W4-SHA256 signature failed verification";
      } catch (e) {
        pqVerified = false;
        pqError = `Post-quantum verification error: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (data.pq_signature && !leafOk) {
      pqVerified = false;
      pqError = "leaf mismatch — cannot verify PQ";
    }

    // ── GATE STATE ──
    const revoked = data.status === "revoked";
    const expired = !!data.expires_at && new Date(data.expires_at).getTime() < Date.now();
    const policy_ok = isKnownAction(data.action_type)
      && (!claimedAction || claimedAction === data.action_type)
      && (!claimedPolicy || claimedPolicy === data.policy_ref);

    const { allowed, reason } = gateDecision({ integrity_verified, post_quantum_verified: pqVerified, revoked, expired, policy_ok });

    // ── ANCHOR (Bitcoin / OpenTimestamps), if sealed onward ──
    const { data: proof } = await supabase.from("ots_proofs")
      .select("id, status, calendar_url, bitcoin_block_height, bitcoin_txid, confirmations, submitted_at, created_at, target_hash")
      .or(`commit_id.eq.${data.anchor_commit_id ?? data.receipt_id},target_hash.eq.${data.merkle_root ?? ""}`)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const functionsBase = `${supabaseUrl}/functions/v1`;

    return new Response(JSON.stringify({
      allowed,
      reason,
      verified: integrity_verified,
      found: true,
      receipt_id: data.receipt_id,
      agent_id: data.agent_id,
      action_type: data.action_type,
      policy_ref: data.policy_ref,
      predicate_applied: data.predicate_id,
      issued_at: data.issued_at,
      expires_at: data.expires_at,
      revoked,
      expired,
      policy_ok,
      integrity_verified,
      post_quantum: !!data.pq_signature,
      pq_verified: pqVerified,
      pq_error: pqError,
      pq_algorithm: data.pq_algorithm ?? (data.pq_signature ? LMS_ALGORITHM : null),
      pq_standard: data.pq_signature ? LMS_STANDARD : null,
      commit_hash: `sha256:${data.commit_hash}`,
      merkle_leaf: `sha256:${data.merkle_leaf_hash}`,
      merkle_root: data.merkle_root ? `sha256:${data.merkle_root}` : null,
      ed25519_signature: data.ed25519_signature,
      timestamp_anchor: proof ? {
        status: proof.status,
        calendar_url: proof.calendar_url,
        bitcoin_block_height: proof.bitcoin_block_height,
        bitcoin_txid: proof.bitcoin_txid,
        confirmations: proof.confirmations ?? null,
        explorer_url: proof.bitcoin_txid ? `https://mempool.space/tx/${proof.bitcoin_txid}` : null,
        ots_download_url: `${functionsBase}/ots-proof?id=${proof.id}`,
      } : null,
      schema: data.schema_id ?? PSI_ACT_SCHEMA_ID,
      terms: ACT_TERMS,
      checked_at: new Date().toISOString(),
      engine: "APEX PSI GATE v1.0 — recomputation result (not a verdict)",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[VerifyAction] Error:", err);
    return new Response(JSON.stringify({ allowed: false, verified: false, error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
