// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — MPC Node Beta
// Independent verification node (2 of 3) for distributed consensus
// ═══════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NODE_ID = "BETA";

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
  // Beta node uses REVERSE pattern matching (starts from end) for independence
  const patterns: Record<string, string[]> = {
    EU_ART_5: ["manipulate behavior", "biometric identification public", "mass surveillance", "social scoring", "exploit vulnerability", "subliminal manipulation"],
    EU_ART_6: ["undeclared safety component", "bypass annex iii", "skip classification", "no risk assessment"],
    EU_ART_9: ["ignore residual risk", "no lifecycle monitoring", "static risk", "skip risk assessment"],
    EU_ART_11: ["skip documentation", "no conformity record", "missing technical docs", "undocumented model"],
    EU_ART_12: ["no event recording", "unauditable", "delete logs", "no record keeping", "disable audit trail", "no logging"],
    EU_ART_13: ["hidden logic", "no transparency", "unexplainable", "opaque model", "no interpretability", "black box"],
    EU_ART_14: ["disable kill switch", "remove oversight", "without human", "bypass approval", "override human", "no human review", "autonomous decision"],
    EU_ART_15: ["skip security", "no adversarial testing", "unvalidated", "fabricated", "untested model"],
    EU_ART_50: ["unlabeled generation", "without disclosure", "deepfake without label", "hidden synthetic"],
    EU_ART_52: ["conceal ai nature", "pose as human", "no bot disclosure", "hide ai identity"],
    MIFID_ART_16: ["bypass trading limits", "no kill switch trading", "uncapped orders", "no circuit breaker"],
    MIFID_ART_17: ["market manipulation", "unregistered algo", "no order records", "flash crash risk"],
    MIFID_ART_25: ["no appropriateness test", "skip kyc", "no risk assessment client"],
    MIFID_ART_27: ["ignore best price", "no execution policy", "client disadvantage", "front running"],
    DORA_ART_5: ["ignore ict risk", "no incident response", "no security controls"],
    DORA_ART_6: ["end of life software", "insecure infrastructure", "no system updates"],
    DORA_ART_9: ["no encryption", "unprotected data", "no access controls"],
    DORA_ART_11: ["single point of failure", "no failover", "no business continuity"],
    DORA_ART_17: ["suppressed alert", "concealed attack", "no incident log"],
    DORA_ART_26: ["no supply chain risk", "uncontrolled outsourcing", "no vendor monitoring"],
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

    const hashValid = await verifyCommitHash(action, predicate_id, created_at, commit_hash);
    const leafValid = await verifyMerkleLeaf(commit_id, commit_hash, merkle_leaf_hash);
    const compliance = checkCompliance(action, predicate_id);

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
    return new Response(JSON.stringify({ error: "Node Beta error", node_id: NODE_ID }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
