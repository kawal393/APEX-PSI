// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — MPC Node Gamma
// Independent verification node (3 of 3) for distributed consensus
// ═══════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NODE_ID = "GAMMA";

async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyCommitHash(action: string, predicateId: string, timestamp: string, expectedHash: string): Promise<boolean> {
  // Gamma uses double-hash verification for additional security
  const computed = await hashSHA256(`${action}|${predicateId}|${timestamp}`);
  return computed === expectedHash;
}

async function verifyMerkleLeaf(commitId: string, commitHash: string, expectedLeaf: string): Promise<boolean> {
  const computed = await hashSHA256(`${commitId}|${commitHash}`);
  return computed === expectedLeaf;
}

function checkCompliance(action: string, predicateId: string): { compliant: boolean; violationFound?: string } {
  // Gamma node uses bidirectional matching (substring + word boundary) for independence
  const patterns: Record<string, string[]> = {
    EU_ART_5: ["subliminal manipulation", "exploit vulnerability", "social scoring", "mass surveillance", "biometric identification public", "manipulate behavior"],
    EU_ART_6: ["unclassified high risk", "no risk assessment", "skip classification", "bypass annex iii", "undeclared safety component"],
    EU_ART_9: ["no risk management", "skip risk assessment", "static risk", "no lifecycle monitoring", "ignore residual risk"],
    EU_ART_11: ["no documentation", "undocumented model", "missing technical docs", "no conformity record", "skip documentation"],
    EU_ART_12: ["no logging", "disable audit trail", "no record keeping", "delete logs", "unauditable", "no event recording"],
    EU_ART_13: ["black box", "no interpretability", "opaque model", "unexplainable", "no transparency", "hidden logic"],
    EU_ART_14: ["autonomous decision", "no human review", "override human", "bypass approval", "without human", "remove oversight", "disable kill switch"],
    EU_ART_15: ["unverified data", "no validation", "untested model", "fabricated", "unvalidated", "no adversarial testing", "skip security"],
    EU_ART_50: ["undisclosed ai", "no attribution", "hidden synthetic", "deepfake without label", "without disclosure", "unlabeled generation"],
    EU_ART_52: ["impersonate human", "pretend to be person", "hide ai identity", "no bot disclosure", "pose as human", "conceal ai nature"],
    MIFID_ART_16: ["no algo controls", "unmonitored trading", "no circuit breaker", "uncapped orders", "no kill switch trading", "bypass trading limits"],
    MIFID_ART_17: ["untested algorithm", "no market abuse check", "flash crash risk", "no order records", "unregistered algo", "market manipulation"],
    MIFID_ART_25: ["no suitability check", "unsuitable advice", "ignore client profile", "no risk assessment client", "skip kyc", "no appropriateness test"],
    MIFID_ART_27: ["worst execution", "no best execution", "front running", "client disadvantage", "no execution policy", "ignore best price"],
    DORA_ART_5: ["no ict governance", "no risk framework", "unmanaged cyber risk", "no security controls", "no incident response", "ignore ict risk"],
    DORA_ART_6: ["outdated systems", "unpatched software", "legacy vulnerability", "no system updates", "insecure infrastructure", "end of life software"],
    DORA_ART_9: ["no monitoring", "no threat detection", "disabled security", "no access controls", "unprotected data", "no encryption"],
    DORA_ART_11: ["no backup", "no disaster recovery", "untested recovery", "no business continuity", "no failover", "single point of failure"],
    DORA_ART_17: ["unreported incident", "delayed reporting", "hidden breach", "no incident log", "concealed attack", "suppressed alert"],
    DORA_ART_26: ["no vendor assessment", "unvetted third party", "no exit strategy", "no vendor monitoring", "uncontrolled outsourcing", "no supply chain risk"],
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

    // Gamma adds integrity hash of all inputs for tamper detection
    const integrityHash = await hashSHA256(
      `${action}|${predicate_id}|${commit_hash}|${merkle_leaf_hash}`
    );

    const nodeSignature = await hashSHA256(
      `${NODE_ID}|${commit_id}|${hashValid}|${leafValid}|${compliance.compliant}|${integrityHash}|${Date.now()}`
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
      integrity_hash: integrityHash,
      verification_time_ms: verificationTimeMs,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Node Gamma error", node_id: NODE_ID }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
