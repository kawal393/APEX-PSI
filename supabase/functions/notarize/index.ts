import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lmsSignInstitutional, LMS_ALGORITHM } from "../_shared/pq_lms.ts";
import { rfc6962Root, signEd25519Strict, reserveLmsSlots, MERKLE_PROFILE, signMlDsa65Strict } from "../_shared/psi_core.ts";
import {
  readX402Config,
  decodePaymentHeader,
  checkPaymentPayload,
  callFacilitator,
  encodePaymentRequiredHeader,
  settlementHeader,
  type X402Config,
  type PaymentPayload,
  type Requirements,
} from "../_shared/x402.ts";
import { buildAllowance, allowanceHeaders, upgradePlans, type Allowance } from "../_shared/allowance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-apex-api-key, payment-signature, x-payment, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_PER_MINUTE = 20;
const FREE_DAILY_LIMIT = 100;

const X402_DESCRIPTION = "One hosted APEX PSI receipt, checkable by a stranger without an account.";
const X402_EXPOSE_HEADERS = "PAYMENT-REQUIRED, PAYMENT-RESPONSE, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining";

function x402Challenge(config: X402Config, resourceUrl: string, body: Record<string, unknown>) {
  return new Response(JSON.stringify({
    ...body,
    pay_with: {
      protocol: "x402",
      version: 2,
      scheme: "exact",
      asset: config.asset,
      network: config.network,
      price_atomic_units: config.amountAtomic,
      one_payment_buys: "one hosted receipt",
    },
    how_to_pay: "Replay this request with a PAYMENT-SIGNATURE header: base64 of the x402 v2 PaymentPayload for the requirement in the PAYMENT-REQUIRED header. We verify and settle through our facilitator; the amount is signed by you, not quoted by us.",
  }), {
    status: 402,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "PAYMENT-REQUIRED": encodePaymentRequiredHeader(config, resourceUrl, X402_DESCRIPTION, "Payment required for hosted issuance."),
      "Access-Control-Expose-Headers": X402_EXPOSE_HEADERS,
    },
  });
}

function paymentRefusal(status: number, reason: string, detail: string | undefined, resource: string, config: X402Config) {  return new Response(JSON.stringify({
    error: reason,
    detail: detail || null,
    message: "The payment you sent was not accepted. Nothing was charged and no receipt was minted.",
  }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "PAYMENT-RESPONSE": settlementHeader({ success: false, errorReason: reason }, config, true),
      "PAYMENT-REQUIRED": encodePaymentRequiredHeader(config, resource, X402_DESCRIPTION, reason),
      "Access-Control-Expose-Headers": X402_EXPOSE_HEADERS,
    },
  });
}

// A capped caller is either told to pay, or told to come back tomorrow. The 402
// branch is the one that needs no human awake; the 429 branch is what runs until a
// receive address is configured, and it keeps the keys today's clients read.
function capResponse(config: X402Config | null, resource: string, body: Record<string, unknown>, rateHeaders: Record<string, string>) {
  if (config) {
    return x402Challenge(config, resource, {
      ...body,
      error: "Allowance reached — pay for this call instead",
      allowance_error: body.error,
    });
  }
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...rateHeaders },
  });
}

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

async function hmacSHA256(secret: string, body: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { decision, model_id, context, predicate } = body;

    if (!decision || typeof decision !== "string" || decision.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing 'decision' field" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (decision.length > 10000) {
      return new Response(JSON.stringify({ error: "Decision exceeds 10000 chars" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate if token provided
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    // Check API key for higher limits
    const apiKey = req.headers.get("x-apex-api-key");
    let tier = "free";
    let dailyLimit = FREE_DAILY_LIMIT;
    let usedToday: number | null = null;

    const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const requesterDigest = await hashSHA256(`${supabaseKey}|${clientIP}`);

    // x402 v2 door: a machine can buy this execution outright instead of borrowing a
    // human's allowance. Payment is established before quota is consulted, and the
    // price always comes from our configuration, never from what the caller brought.
    const x402Door = readX402Config((name) => Deno.env.get(name));
    const paymentHeader = req.headers.get("payment-signature") || req.headers.get("x-payment");
    let paid: { payer: string; nonceKey: string; payload: PaymentPayload; requirements: Requirements } | null = null;

    if (paymentHeader && !x402Door.ok) {
      return new Response(JSON.stringify({
        error: "apex_x402_door_not_configured",
        detail: `no machine-payment door on this deployment; missing ${x402Door.missing.join(", ")}`,
        human_purchase: `${Deno.env.get("SITE_URL") ?? "https://ai-governance-standard.com"}/upgrade`,
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (paymentHeader && x402Door.ok) {
      const resource = req.url;
      const config = x402Door.config;
      const payload = decodePaymentHeader(paymentHeader);
      if (!payload) {
        return paymentRefusal(400, "invalid_payload", "PAYMENT-SIGNATURE is not base64-encoded JSON", resource, config);
      }
      const check = await checkPaymentPayload(config, payload, Math.floor(Date.now() / 1000));
      if (!check.ok) {
        return paymentRefusal(check.status, check.reason, check.detail, resource, config);
      }

      const { data: claimed, error: claimError } = await supabase.rpc("claim_x402_payment", {
        p_nonce_key: check.nonceKey,
        p_payment_digest: check.paymentDigest,
        p_network: config.network,
        p_asset: config.asset,
        p_pay_to: config.payTo,
        p_amount_atomic: config.amountAtomic,
        p_payer: check.payer,
        p_resource_url: resource,
        p_requester_digest: requesterDigest,
      });
      if (claimError) {
        // Failing closed here is the point: without the claim we cannot promise that
        // one payment bought one receipt.
        console.error("[Notary] Payment claim failed:", claimError);
        return paymentRefusal(402, "apex_payment_ledger_unavailable", claimError.message, resource, config);
      }
      if (!claimed) {
        return paymentRefusal(402, "apex_payment_nonce_already_claimed", "this authorization has already bought a receipt", resource, config);
      }

      const verify = await callFacilitator(config, "/verify", payload, check.requirements, fetch);
      if (!verify.ok) {
        const reason = verify.result.invalidReason || verify.result.errorReason || `verify_http_${verify.httpStatus}`;
        await supabase.from("x402_payments")
          .update({ status: "verify_failed", reason })
          .eq("nonce_key", check.nonceKey);
        return paymentRefusal(402, reason, undefined, resource, config);
      }

      paid = { payer: verify.result.payer || check.payer, nonceKey: check.nonceKey, payload, requirements: check.requirements };
      tier = "x402";
    }

    if (apiKey) {
      const keyHash = await hashSHA256(apiKey);
      const { data: keyData } = await supabase
        .from("notary_api_keys")
        .select("*")
        .eq("api_key_hash", keyHash)
        .eq("revoked", false)
        .single();
      if (keyData) {
        // A caller that paid for this execution is not the key's tier any more;
        // the key only tells us whose account the receipt belongs to.
        if (!paid) tier = keyData.tier;
        dailyLimit = keyData.daily_limit;
        // Reset daily counter if needed
        const lastReset = new Date(keyData.last_reset);
        const now = new Date();
        if (now.toDateString() !== lastReset.toDateString()) {
          await supabase.from("notary_api_keys").update({ daily_used: 1, last_reset: now.toISOString() }).eq("id", keyData.id);
          if (!paid) usedToday = 1;
        } else if (keyData.daily_used >= dailyLimit && dailyLimit !== -1 && !paid) {
          // Quiet metered door: a capped machine is told where to raise its own
          // limit. No human, no email. The public site still shows no price.
          return capResponse(x402Door.ok ? x402Door.config : null, req.url, {
            error: "Daily limit exceeded",
            tier,
            limit: dailyLimit,
            remaining: 0,
            upgrade_url: `${Deno.env.get("SITE_URL") ?? "https://ai-governance-standard.com"}/upgrade`,
            plans: upgradePlans(),
            offline_verification: "Verification and local sealing are always free and offline; only hosted issuance is metered.",
          }, {
            "X-RateLimit-Limit": String(dailyLimit),
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.max(1, Math.ceil((function () { const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0); return (m.getTime() - n.getTime()) / 1000; }())))),
            "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining",
          });
        } else if (!paid) {
          await supabase.from("notary_api_keys").update({ daily_used: keyData.daily_used + 1 }).eq("id", keyData.id);
          usedToday = keyData.daily_used + 1;
        }
        userId = keyData.user_id;
      }
    }

    if (tier === "free") {
      const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const visitorDigest = await hashSHA256(`${supabaseKey}|${clientIP}`);
      const { data: reserved, error: quotaError } = await supabase.rpc("reserve_public_notary_quota", {
        p_visitor_digest: visitorDigest, p_count: 1,
        p_daily_limit: FREE_DAILY_LIMIT, p_minute_limit: RATE_LIMIT_PER_MINUTE,
      });
      if (quotaError) {
        console.error("[Notary] Quota check failed:", quotaError);
        return new Response(JSON.stringify({ error: "Public capacity temporarily unavailable" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (!reserved) {
        const site = Deno.env.get("SITE_URL") ?? "https://ai-governance-standard.com";
        return capResponse(x402Door.ok ? x402Door.config : null, req.url, {
          error: "Public allowance reached",
          tier: "free",
          daily_limit: FREE_DAILY_LIMIT,
          minute_limit: RATE_LIMIT_PER_MINUTE,
          remaining: 0,
          retry_after: 60,
          upgrade_url: `${site}/upgrade`,
          plans: upgradePlans(),
          next_step: "Get an API key at /upgrade and send it as the x-apex-api-key header for 2,000 (Pro) or 20,000 (Ultra) hosted receipts per day. Verification stays free.",
          offline_verification: "Verification is always free and offline; only hosted issuance is metered.",
        }, {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(FREE_DAILY_LIMIT),
          "X-RateLimit-Remaining": "0",
          "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining",
        });
      }
      // Read back today's count for the meter. A failed read only drops the meter.
      const { data: usageRow } = await supabase
        .from("notary_public_usage")
        .select("receipts_used")
        .eq("visitor_digest", visitorDigest)
        .eq("usage_day", new Date().toISOString().slice(0, 10))
        .maybeSingle();
      if (usageRow && typeof usageRow.receipts_used === "number") usedToday = usageRow.receipts_used;
    }

    const predicateId = predicate || "EU_ART_12";
    const timestamp = new Date().toISOString();
    const receiptId = await generateReceiptId();

    // Build canonical payload
    const canonicalPayload = JSON.stringify({
      decision: decision.trim(),
      model_id: model_id || null,
      context: context || null,
      predicate: predicateId,
      timestamp,
    });

    const decisionHash = await hashSHA256(canonicalPayload);
    const commitHash = await hashSHA256(`${decision.trim()}|${predicateId}|${timestamp}`);
    const merkleLeaf = await hashSHA256(`${receiptId}|${commitHash}`);

    // Compute real cumulative Merkle root from existing ledger leaves
    let merkleRoot: string;
    try {
      const { data: recentLeaves } = await supabase
        .from("gallows_ledger")
        .select("merkle_leaf_hash")
        .order("sequence_number", { ascending: false })
        .limit(255);

      // Chronological order (oldest first), new leaf appended last.
      const prior = (recentLeaves?.map(r => r.merkle_leaf_hash) || []).reverse();
      merkleRoot = await rfc6962Root([...prior, merkleLeaf]);
    } catch {
      merkleRoot = await rfc6962Root([merkleLeaf]);
    }

    const signature = await signEd25519(merkleLeaf, supabaseKey);
    // Stateless post-quantum signature (FIPS 204). Fails loudly: no receipt without it.
    const mldsa = await signMlDsa65Strict(merkleLeaf);

    // Post-quantum: LMS-W4-SHA256 over the same content hash.
    // The one-time leaf index comes from the count of PQ-sealed ledger rows,
    // so each leaf is used once and the key rotates every 32 signatures.
    let pqSignature: Record<string, unknown> | null = null;
    let pqPublicKey: string | null = null;
    try {
      const slot = await reserveLmsSlots(supabase, 1);
      const sig = await lmsSignInstitutional(new TextEncoder().encode(merkleLeaf), slot);
      pqSignature = sig as unknown as Record<string, unknown>;
      pqPublicKey = sig.public_key;
    } catch (e) {
      console.error("[Notary] LMS signing failed:", e);
    }

    // Store in gallows_ledger for Merkle tree integration
    const { error: insertError } = await supabase.from("gallows_ledger").insert({
      commit_id: receiptId,
      user_id: userId,
      // Fingerprint only, never raw text. Sole exception: Impact Wall testimony,
      // which the author submits explicitly for public display.
      action: decision.trim().startsWith("APEX_IMPACT_WALL|")
        ? `NOTARIZE: ${decision.trim().substring(0, 500)}`
        : `NOTARIZE: sha256:${decisionHash.slice(0, 16)}`,
      predicate_id: predicateId,
      phase: "VERIFIED",
      status: "APPROVED",
      commit_hash: commitHash,
      merkle_leaf_hash: merkleLeaf,
      proof_hash: decisionHash,
      ed25519_signature: signature,
      merkle_root: merkleRoot,
      pq_signature: pqSignature,
      pq_public_key: pqPublicKey,
      pq_algorithm: pqSignature ? LMS_ALGORITHM : null,
      mldsa65_signature: mldsa.sig,
    });


    if (insertError) {
      console.error("[Notary] Insert failed:", insertError);
      if (paid && x402Door.ok) {
        // Nothing was charged and nothing was minted, so the claim is released with
        // the verify-failed state that lets the payer retry the same authorization.
        await supabase.from("x402_payments")
          .update({ status: "verify_failed", reason: "apex_receipt_mint_failed" })
          .eq("nonce_key", paid.nonceKey);
      }
      return new Response(JSON.stringify({ error: "Failed to persist receipt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // x402 `authorization` flow: verify -> resource -> settle. The work ran, so the
    // money moves now. If it cannot move, the attempt is recorded, not discarded.
    let paymentResponseHeader: string | null = null;
    let paymentRecord: Record<string, unknown> | null = null;
    if (paid && x402Door.ok) {
      const settle = await callFacilitator(x402Door.config, "/settle", paid.payload, paid.requirements, fetch);
      paymentResponseHeader = settlementHeader(settle.result, x402Door.config, !settle.ok);
      paymentRecord = {
        protocol: "x402",
        version: 2,
        scheme: "exact",
        network: settle.result.network || x402Door.config.network,
        asset: x402Door.config.asset,
        payer: paid.payer,
        amount_atomic: x402Door.config.amountAtomic,
        pay_to: x402Door.config.payTo,
        transaction: settle.result.transaction || null,
        settled: settle.ok,
        ...(!settle.ok ? { settlement_error: settle.result.errorReason || "unexpected_settle_error" } : {}),
      };
      await supabase.from("x402_payments").update({
        status: settle.ok ? "settled" : "settle_failed",
        transaction: settle.result.transaction || null,
        reason: settle.ok ? null : (settle.result.errorReason || "unexpected_settle_error"),
        receipt_commit_id: receiptId,
        settled_at: new Date().toISOString(),
      }).eq("nonce_key", paid.nonceKey);
      if (!settle.ok) console.error("[Notary] Settle failed after execution:", settle.result.errorReason);
    }

    // Fire webhooks asynchronously (don't block response)
    const webhookPayload = {
      receipt_id: receiptId, timestamp, decision_hash: `sha256:${decisionHash}`,
      merkle_leaf: `sha256:${merkleLeaf}`, merkle_root: `sha256:${merkleRoot}`,
      predicate_applied: predicateId, receipt_version: "PSI-1.2",
    };

    if (userId) {
      // Non-blocking webhook delivery
      (async () => {
        try {
          const { data: webhooks } = await supabase
            .from("webhook_endpoints")
            .select("url, secret, events")
            .eq("user_id", userId)
            .eq("enabled", true);

          if (webhooks && webhooks.length > 0) {
            for (const wh of webhooks) {
              if (wh.events?.includes("notarization.created") || wh.events?.includes("verification.completed")) {
                try {
                  await fetch(wh.url, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Apex-Signature": `sha256=${await hmacSHA256(wh.secret, JSON.stringify(webhookPayload))}`,
                      "X-Apex-Event": "notarization.created",
                    },
                    body: JSON.stringify(webhookPayload),
                  });
                } catch (e) { console.error("[Webhook] Delivery failed:", e); }
              }
            }
          }
        } catch (e) { console.error("[Webhook] Query failed:", e); }
      })();
    }

    const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1] || "";

    const psiReceipt = {
      receipt_id: receiptId,
      timestamp,
      decision_hash: `sha256:${decisionHash}`,
      merkle_leaf: `sha256:${merkleLeaf}`,
      merkle_root: `sha256:${merkleRoot}`,
      merkle_profile: MERKLE_PROFILE,
      ed25519_signature: signature,
      pq_signature: pqSignature,
      pq_public_key: pqPublicKey,
      mldsa65_signature: mldsa.sig,
      mldsa65_public_key: mldsa.pk,
      post_quantum: true,
      algorithm: pqSignature ? "SHA-256 + Ed25519 + ML-DSA-65 + LMS-W4-SHA256" : "SHA-256 + Ed25519 + ML-DSA-65",
      proof_url: `https://${projectId}.supabase.co/functions/v1/merkle-proof?receipt_id=${receiptId}`,
      signed_payload: `sha256:${merkleLeaf}`,
      verify_url: `https://${projectId}.supabase.co/functions/v1/verify-hash`,
      pdf_url: `https://${projectId}.supabase.co/functions/v1/generate-receipt-pdf`,
      predicate_applied: predicateId,
      receipt_version: "PSI-1.2",
      tier,
      engine: "APEX NOTARY v1.0 — Signed",
      ...(paymentRecord ? { payment: paymentRecord } : {}),
    };

    // SCITT bridge (PSI-INTOP-SCITT-1): a JSON view of the same evidence shaped
    // like an RFC 9943 signed statement. It is NOT a COSE_Sign1 object and makes
    // no SCITT conformance claim; it lets SCITT tooling register the PSI digest.
    const scittStatement = {
      profile: "PSI-INTOP-SCITT-1/json",
      conformance: "informative bridge — not a COSE_Sign1 encoding; register via your SCITT transparency service",
      protected_header: {
        alg: "EdDSA",
        content_type: "application/vnd.apex.psi-receipt+json",
        issuer: "https://ai-governance-standard.com",
        subject: receiptId,
        iat: Math.floor(new Date(timestamp).getTime() / 1000),
      },
      payload_hash_alg: "SHA-256",
      payload: `sha256:${merkleLeaf}`,
      signature: signature,
      psi_claims: {
        decision_hash: `sha256:${decisionHash}`,
        merkle_root: `sha256:${merkleRoot}`,
        predicate: predicateId,
      },
    };

    const allowance: Allowance | null = usedToday === null || tier === "x402"
      ? null
      : buildAllowance({ tier, used: usedToday, dailyLimit, now: new Date(), site: Deno.env.get("SITE_URL") ?? undefined });

    const format = body.format === "scitt" || body.format === "both" ? body.format : "psi";
    const responseBody = format === "psi"
      ? psiReceipt
      : format === "scitt"
        ? { receipt_id: receiptId, format, scitt_statement: scittStatement }
        : { ...psiReceipt, format, scitt_statement: scittStatement };

    // The allowance meter sits beside the receipt, never inside the signed payload.
    return new Response(JSON.stringify(allowance ? { ...responseBody, allowance } : responseBody), {
      status: 201,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...(allowance
          ? { ...allowanceHeaders(allowance), "Access-Control-Expose-Headers": X402_EXPOSE_HEADERS }
          : {}),
        ...(paymentResponseHeader
          ? { "PAYMENT-RESPONSE": paymentResponseHeader, "Access-Control-Expose-Headers": X402_EXPOSE_HEADERS }
          : {}),
      }
    });
  } catch (err) {
    console.error("[Notary] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
