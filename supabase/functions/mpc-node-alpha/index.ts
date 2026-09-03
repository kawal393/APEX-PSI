// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — MPC Node Alpha
// Independent verification node (1 of 3) for distributed consensus
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NODE_ID = "ALPHA";

async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyCommitHash(action: string, predicateId: string, timestamp: string, expectedHash: string): Promise<boolean> {
  const computed = await hashSHA256(`${action}|${predicateId}|${timestamp}`);
  return computed === expectedHash;
}

async function verifyMerkleLeaf(commitId: string, commitHash: string, expectedLeaf: string): Promise<boolean> {
  const computed = await hashSHA256(`${commitId}|${commitHash}`);
  return computed === expectedLeaf;
}

function checkCompliance(action: string, predicateId: string): { compliant: boolean; violationFound?: string } {
  const patterns: Record<string, string[]> = {
    EU_ART_5: ["subliminal manipulation", "exploit vulnerability", "social scoring", "mass surveillance", "biometric identification public", "manipulate behavior"],
    EU_ART_6: ["unclassified high risk", "no risk assessment", "skip classification"],
    EU_ART_9: ["no risk management", "skip risk assessment", "static risk"],
    EU_ART_11: ["no documentation", "undocumented model", "missing technical docs"],
    EU_ART_12: ["no logging", "disable audit trail", "no record keeping", "delete logs"],
    EU_ART_13: ["black box", "no interpretability", "opaque model", "unexplainable"],
    EU_ART_14: ["autonomous decision", "no human review", "override human", "bypass approval", "without human"],
    EU_ART_15: ["unverified data", "no validation", "untested model", "fabricated"],
    EU_ART_50: ["undisclosed ai", "no attribution", "hidden synthetic", "deepfake without label"],
    EU_ART_52: ["impersonate human", "pretend to be person", "hide ai identity"],
    MIFID_ART_16: ["no algo controls", "unmonitored trading", "no circuit breaker"],
    MIFID_ART_17: ["untested algorithm", "no market abuse check", "flash crash risk", "market manipulation"],
    MIFID_ART_25: ["no suitability check", "unsuitable advice", "ignore client profile"],
    MIFID_ART_27: ["worst execution", "no best execution", "front running"],
    DORA_ART_5: ["no ict governance", "no risk framework", "unmanaged cyber risk"],
    DORA_ART_6: ["outdated systems", "unpatched software", "legacy vulnerability"],
    DORA_ART_9: ["no monitoring", "no threat detection", "disabled security"],
    DORA_ART_11: ["no backup", "no disaster recovery", "untested recovery"],
    DORA_ART_17: ["unreported incident", "delayed reporting", "hidden breach"],
    DORA_ART_26: ["no vendor assessment", "unvetted third party", "no exit strategy"],
  };

  const pats = patterns[predicateId];
  if (!pats) return { compliant: true };
  const lower = action.toLowerCase();
  for (const p of pats) {
    if (lower.includes(p)) return { compliant: false, violationFound: p };
  }
  return { compliant: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();

  try {
    const { commit_id, action, predicate_id, commit_hash, merkle_leaf_hash, created_at } = await req.json();

    // Independent verification
    const hashValid = await verifyCommitHash(action, predicate_id, created_at, commit_hash);
    const leafValid = await verifyMerkleLeaf(commit_id, commit_hash, merkle_leaf_hash);
    const compliance = checkCompliance(action, predicate_id);

    // Generate node signature
    const nodeSignature = await hashSHA256(
      `${NODE_ID}|${commit_id}|${hashValid}|${leafValid}|${compliance.compliant}|${Date.now()}`
    );

    const verificationTimeMs = Math.round((performance.now() - t0) * 100) / 100;

    return new Response(JSON.stringify({
      node_id: NODE_ID,
      commit_id,
      hash_valid: hashValid,
      leaf_valid: leafValid,
      compliant: compliance.compliant,
      violation_found: compliance.violationFound ?? null,
      node_signature: nodeSignature,
      verification_time_ms: verificationTimeMs,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Node Alpha error", node_id: NODE_ID }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
