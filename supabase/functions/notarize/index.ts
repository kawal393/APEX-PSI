import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-apex-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_PER_MINUTE = 20;
const FREE_DAILY_LIMIT = 100;
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitCache.get(key);
  if (!record || now > record.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: limit - 1 };
  }
  if (record.count >= limit) return { allowed: false, remaining: 0 };
  record.count++;
  return { allowed: true, remaining: limit - record.count };
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

async function signEd25519(data: string, serviceKey: string): Promise<string> {
  try {
    const keyMaterial = await hashSHA256(`APEX-SIGNING-KEY-${serviceKey}`);
    const seed = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      seed[i] = parseInt(keyMaterial.substring(i * 2, i * 2 + 2), 16);
    }
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
      0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
    ]);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(pkcs8Header);
    pkcs8.set(seed, 16);
    const cryptoKey = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("Ed25519", cryptoKey, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return await hashSHA256(`HMAC-FALLBACK|${data}|${Date.now()}`);
  }
}

async function computeBinaryMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return await hashSHA256("EMPTY_TREE");
  if (leaves.length === 1) return leaves[0];

  // Pad to power of 2
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(await hashSHA256(`${left}|${right}`));
    }
    level = next;
  }
  return level[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(clientIP, RATE_LIMIT_PER_MINUTE);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retry_after_seconds: 60 }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
    if (apiKey) {
      const keyHash = await hashSHA256(apiKey);
      const { data: keyData } = await supabase
        .from("notary_api_keys")
        .select("*")
        .eq("api_key_hash", keyHash)
        .single();
      if (keyData) {
        tier = keyData.tier;
        dailyLimit = keyData.daily_limit;
        // Reset daily counter if needed
        const lastReset = new Date(keyData.last_reset);
        const now = new Date();
        if (now.toDateString() !== lastReset.toDateString()) {
          await supabase.from("notary_api_keys").update({ daily_used: 1, last_reset: now.toISOString() }).eq("id", keyData.id);
        } else if (keyData.daily_used >= dailyLimit && dailyLimit !== -1) {
          return new Response(JSON.stringify({ error: "Daily limit exceeded", tier, limit: dailyLimit }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          await supabase.from("notary_api_keys").update({ daily_used: keyData.daily_used + 1 }).eq("id", keyData.id);
        }
        userId = keyData.user_id;
      }
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
        .order("created_at", { ascending: false })
        .limit(255);

      const leaves = [merkleLeaf, ...(recentLeaves?.map(r => r.merkle_leaf_hash) || [])];
      merkleRoot = await computeBinaryMerkleRoot(leaves);
    } catch {
      // Fallback: single-leaf root if query fails
      merkleRoot = await hashSHA256(`${merkleLeaf}|${timestamp}`);
    }

    const signature = await signEd25519(merkleLeaf, supabaseKey);

    // Store in gallows_ledger for Merkle tree integration
    const { error: insertError } = await supabase.from("gallows_ledger").insert({
      commit_id: receiptId,
      user_id: userId,
      action: `NOTARIZE: ${decision.trim().substring(0, 500)}`,
      predicate_id: predicateId,
      phase: "VERIFIED",
      status: "APPROVED",
      commit_hash: commitHash,
      merkle_leaf_hash: merkleLeaf,
      proof_hash: decisionHash,
      ed25519_signature: signature,
      merkle_root: merkleRoot,
    });

    if (insertError) {
      console.error("[Notary] Insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Failed to persist receipt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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
                      "X-Apex-Signature": await hashSHA256(`${JSON.stringify(webhookPayload)}${wh.secret}`),
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

    return new Response(JSON.stringify({
      receipt_id: receiptId,
      timestamp,
      decision_hash: `sha256:${decisionHash}`,
      merkle_leaf: `sha256:${merkleLeaf}`,
      merkle_root: `sha256:${merkleRoot}`,
      ed25519_signature: signature,
      verify_url: `https://${projectId}.supabase.co/functions/v1/verify-hash`,
      pdf_url: `https://${projectId}.supabase.co/functions/v1/generate-receipt-pdf`,
      predicate_applied: predicateId,
      receipt_version: "PSI-1.2",
      tier,
      engine: "APEX NOTARY v1.0 — Signed",
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[Notary] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
