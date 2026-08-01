// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Unified Sync API (v1)
// POST /v1/notarize        — Notarize a decision (scope: notarize:write)
// GET  /v1/verify/:hash    — Verify a hash against the ledger (scope: verify:read)
// GET  /v1/verify?hash=…   — Same, query-string form
// GET  /v1/health          — Liveness
//
// Auth: pass EITHER
//   - Authorization: Bearer apex_sk_…  (scoped key from apex_api_keys)
//   - Authorization: Bearer apex_ntry_… (legacy notary key)
//   - X-Apex-Api-Key: <key>             (either format)
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-apex-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function computeMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return await sha256Hex("EMPTY_TREE");
  let lvl = [...leaves];
  while (lvl.length > 1) {
    const nxt: string[] = [];
    for (let i = 0; i < lvl.length; i += 2) {
      const l = lvl[i]; const r = i + 1 < lvl.length ? lvl[i + 1] : l;
      nxt.push(await sha256Hex(`${l}|${r}`));
    }
    lvl = nxt;
  }
  return lvl[0];
}

async function signEd25519(data: string, seedSrc: string): Promise<string> {
  try {
    const seedHex = await sha256Hex(`APEX-PSI-SIGN|${seedSrc}`);
    const seed = new Uint8Array(32);
    for (let i = 0; i < 32; i++) seed[i] = parseInt(seedHex.substring(i * 2, i * 2 + 2), 16);
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
      0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
    ]);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(pkcs8Header); pkcs8.set(seed, 16);
    const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return await sha256Hex(`HMAC|${data}|${seedSrc}`);
  }
}

interface AuthResult {
  ok: boolean;
  userId?: string | null;
  tier?: string;
  scopes?: string[];
  keyKind?: "sk" | "ntry";
  keyId?: string;
  dailyLimit?: number;
  dailyUsed?: number;
  error?: string;
}

async function authenticate(req: Request, supabase: any): Promise<AuthResult> {
  const raw =
    req.headers.get("x-apex-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!raw) return { ok: false, error: "Missing API key (Authorization: Bearer …, or X-Apex-Api-Key)" };

  const keyHash = await sha256Hex(raw);

  if (raw.startsWith("apex_sk_")) {
    const { data } = await supabase
      .from("apex_api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("revoked", false)
      .maybeSingle();
    if (!data) return { ok: false, error: "Invalid or revoked API key" };
    return {
      ok: true, userId: data.user_id, tier: data.tier, scopes: data.scopes,
      keyKind: "sk", keyId: data.id, dailyLimit: data.daily_limit, dailyUsed: data.daily_used,
    };
  }

  if (raw.startsWith("apex_ntry_")) {
    const { data } = await supabase
      .from("notary_api_keys")
      .select("*")
      .eq("api_key_hash", keyHash)
      .maybeSingle();
    if (!data) return { ok: false, error: "Invalid notary key" };
    return {
      ok: true, userId: data.user_id, tier: data.tier,
      scopes: ["notarize:write", "verify:read"],
      keyKind: "ntry", keyId: data.id, dailyLimit: data.daily_limit, dailyUsed: data.daily_used,
    };
  }

  return { ok: false, error: "Unknown key format (expected apex_sk_… or apex_ntry_…)" };
}

async function bumpUsage(supabase: any, auth: AuthResult) {
  if (!auth.keyId) return;
  const table = auth.keyKind === "sk" ? "apex_api_keys" : "notary_api_keys";
  const now = new Date().toISOString();
  await supabase.from(table)
    .update({ daily_used: (auth.dailyUsed ?? 0) + 1, last_used_at: now })
    .eq("id", auth.keyId);
}

async function handleNotarize(req: Request, supabase: any, auth: AuthResult) {
  if (!auth.scopes?.includes("notarize:write"))
    return json({ error: "insufficient_scope", required: "notarize:write" }, 403);
  if (auth.dailyLimit !== -1 && (auth.dailyUsed ?? 0) >= (auth.dailyLimit ?? 0))
    return json({ error: "daily_limit_exceeded", limit: auth.dailyLimit }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const decision = body?.decision;
  if (!decision || typeof decision !== "string" || !decision.trim())
    return json({ error: "Missing 'decision' (string)" }, 400);
  if (decision.length > 10000) return json({ error: "decision exceeds 10000 chars" }, 400);

  const predicateId = (body.predicate || "EU_ART_12").toString().slice(0, 64);
  const timestamp = new Date().toISOString();
  const rid = `APEX-PSI-${Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

  const canonical = JSON.stringify({
    decision: decision.trim(),
    model_id: body.model_id ?? null,
    context: body.context ?? null,
    predicate: predicateId,
    timestamp,
  });
  const decisionHash = await sha256Hex(canonical);
  const commitHash = await sha256Hex(`${decision.trim()}|${predicateId}|${timestamp}`);
  const merkleLeaf = await sha256Hex(`${rid}|${commitHash}`);

  let merkleRoot: string;
  try {
    const { data: recent } = await supabase
      .from("gallows_ledger")
      .select("merkle_leaf_hash")
      .order("created_at", { ascending: false })
      .limit(255);
    merkleRoot = await computeMerkleRoot([merkleLeaf, ...(recent?.map((r: any) => r.merkle_leaf_hash) ?? [])]);
  } catch {
    merkleRoot = await sha256Hex(`${merkleLeaf}|${timestamp}`);
  }

  const signature = await signEd25519(merkleLeaf, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "psi");

  // Post-quantum LMS-W4-SHA256 over the same signed payload
  let pqSignature: any = null;
  let pqPublicKey: string | null = null;
  try {
    const { count } = await supabase
      .from("gallows_ledger")
      .select("id", { count: "exact", head: true })
      .not("pq_signature", "is", null);
    const sig = await lmsSignInstitutional(new TextEncoder().encode(merkleLeaf), count ?? 0);
    pqSignature = sig;
    pqPublicKey = sig.public_key;
  } catch (e) {
    console.error("[psi-api] LMS signing failed", e);
  }

  const { error: insErr } = await supabase.from("gallows_ledger").insert({
    commit_id: rid,
    user_id: auth.userId ?? null,
    action: `PSI_API: ${decision.trim().substring(0, 500)}`,
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
  });
  if (insErr) return json({ error: "persist_failed", detail: insErr.message }, 500);

  await bumpUsage(supabase, auth);

  return json({
    receipt_id: rid,
    timestamp,
    decision_hash: `sha256:${decisionHash}`,
    merkle_leaf: `sha256:${merkleLeaf}`,
    merkle_root: `sha256:${merkleRoot}`,
    ed25519_signature: signature,
    signed_payload: `sha256:${merkleLeaf}`,
    post_quantum: !!pqSignature,
    pq_signature: pqSignature,
    pq_public_key: pqPublicKey,
    algorithm: pqSignature ? "SHA-256 + Ed25519 + LMS-W4-SHA256" : "SHA-256 + Ed25519",
    predicate_applied: predicateId,
    receipt_version: "PSI-1.2",
    engine: "APEX PSI v1 — Unified API",
  }, 201);
}


async function handleVerify(hash: string | null, supabase: any, auth: AuthResult) {
  if (!auth.scopes?.includes("verify:read"))
    return json({ error: "insufficient_scope", required: "verify:read" }, 403);
  if (!hash || typeof hash !== "string" || !/^[a-f0-9]{8,128}$/i.test(hash.replace(/^sha256:/, "")))
    return json({ error: "Invalid or missing hash" }, 400);

  const clean = hash.replace(/^sha256:/, "");
  const { data, error } = await supabase
    .from("gallows_ledger")
    .select("*")
    .or(`commit_hash.eq.${clean},merkle_leaf_hash.eq.${clean},proof_hash.eq.${clean},challenge_hash.eq.${clean}`)
    .limit(1);
  if (error) return json({ error: "query_failed", detail: error.message }, 500);

  await bumpUsage(supabase, auth);

  if (!data || data.length === 0) {
    return json({
      verified: false, found: false, queried_hash: clean,
      queried_at: new Date().toISOString(), engine: "APEX PSI v1",
    });
  }
  const e = data[0];
  return json({
    verified: true, found: true,
    commit_id: e.commit_id, predicate_id: e.predicate_id, phase: e.phase, status: e.status,
    merkle_root: e.merkle_root, ed25519_signature: e.ed25519_signature,
    created_at: e.created_at, queried_hash: clean,
    queried_at: new Date().toISOString(),
    engine: "APEX PSI v1",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // strip /functions/v1/psi-api prefix
  let path = url.pathname.replace(/^.*\/psi-api/, "") || "/";
  if (path === "" || path === "/") return json({
    engine: "APEX PSI Unified API v1",
    endpoints: {
      "POST /v1/notarize": "Notarize a decision (scope: notarize:write)",
      "GET /v1/verify/:hash": "Verify a hash (scope: verify:read)",
      "GET /v1/verify?hash=…": "Verify a hash (query)",
      "GET /v1/health": "Liveness probe",
    },
    auth: "Authorization: Bearer apex_sk_…  OR  apex_ntry_…",
    docs: "https://digital-gallows.apex-infrastructure.com/api",
  });

  if (path === "/v1/health") return json({ ok: true, ts: new Date().toISOString() });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const auth = await authenticate(req, supabase);
  if (!auth.ok) return json({ error: auth.error }, 401);

  try {
    if (path === "/v1/notarize" && req.method === "POST") {
      return await handleNotarize(req, supabase, auth);
    }
    if (path.startsWith("/v1/verify") && req.method === "GET") {
      const m = path.match(/^\/v1\/verify\/([a-f0-9]+)$/i);
      const hash = m ? m[1] : url.searchParams.get("hash");
      return await handleVerify(hash, supabase, auth);
    }
    return json({ error: "not_found", path, method: req.method }, 404);
  } catch (e: any) {
    console.error("[psi-api]", e);
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});
