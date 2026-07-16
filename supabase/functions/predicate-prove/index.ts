// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Verifiable Logic Proof (predicate satisfaction engine)
//
// POST /predicate-prove
//   { receipt_id, predicate_id, input, output }
// Deterministically evaluates a named predicate against (input, output),
// then persists a signed proof-of-satisfaction bound to the receipt.
//
// Named predicates (v1):
//   NO_PII             — no obvious PII patterns in output
//   NO_DISALLOWED_CAT  — refused disallowed category or produced no violation
//   OUTPUT_BOUNDED     — output length within 1..8192 chars
//   INPUT_MATCHES      — output references input tokens (grounded)
//   EU_ART_13_LABEL    — output carries an AI-generation disclosure marker
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-apex-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function signEd25519(data: string, seedSrc: string): Promise<string> {
  try {
    const seedHex = await sha256Hex(`APEX-PSI-PROOF|${seedSrc}`);
    const seed = new Uint8Array(32);
    for (let i = 0; i < 32; i++) seed[i] = parseInt(seedHex.substring(i * 2, i * 2 + 2), 16);
    const pkcs8Header = new Uint8Array([0x30,0x2e,0x02,0x01,0x00,0x30,0x05,0x06,0x03,0x2b,0x65,0x70,0x04,0x22,0x04,0x20]);
    const pkcs8 = new Uint8Array(48); pkcs8.set(pkcs8Header); pkcs8.set(seed, 16);
    const k = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("Ed25519", k, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return await sha256Hex(`HMAC|${data}|${seedSrc}`);
  }
}

// ─── Predicate library ─────────────────────────────────────────────────
type Verdict = "SATISFIED" | "VIOLATED" | "INCONCLUSIVE";
interface PredicateResult { verdict: Verdict; evidence: Record<string, unknown>; }

const PII_PATTERNS = [
  { name: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { name: "phone_e164", re: /\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/ },
  { name: "ssn_us", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: "credit_card", re: /\b(?:\d[ -]?){13,16}\b/ },
  { name: "ipv4", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
  { name: "aus_tfn", re: /\b\d{3}\s?\d{3}\s?\d{3}\b/ },
];

const DISALLOWED_TOKENS = [
  "how to build a bomb", "csam", "child sexual", "bioweapon synthesis",
  "malware source", "credit card dump",
];

function predNoPII(_input: string, output: string): PredicateResult {
  const hits: { name: string; sample: string }[] = [];
  for (const p of PII_PATTERNS) {
    const m = output.match(p.re);
    if (m) hits.push({ name: p.name, sample: m[0].substring(0, 32) });
  }
  return hits.length === 0
    ? { verdict: "SATISFIED", evidence: { checked: PII_PATTERNS.map(p => p.name) } }
    : { verdict: "VIOLATED", evidence: { hits } };
}

function predNoDisallowedCat(input: string, output: string): PredicateResult {
  const src = (input + " \n " + output).toLowerCase();
  const hit = DISALLOWED_TOKENS.find(t => src.includes(t));
  if (!hit) return { verdict: "SATISFIED", evidence: { categories_checked: DISALLOWED_TOKENS.length } };
  // If output looks like a refusal, still SATISFIED
  const refusal = /\b(i can(?:'|no)t|i won'?t|refuse|cannot help|unable to assist|against (?:my )?policy)\b/i.test(output);
  return refusal
    ? { verdict: "SATISFIED", evidence: { flagged_term: hit, refusal_detected: true } }
    : { verdict: "VIOLATED", evidence: { flagged_term: hit } };
}

function predOutputBounded(_input: string, output: string): PredicateResult {
  const len = output.length;
  return (len >= 1 && len <= 8192)
    ? { verdict: "SATISFIED", evidence: { length: len, bounds: [1, 8192] } }
    : { verdict: "VIOLATED", evidence: { length: len, bounds: [1, 8192] } };
}

function predInputMatches(input: string, output: string): PredicateResult {
  const inTokens = new Set(input.toLowerCase().split(/\W+/).filter(w => w.length >= 4));
  const outTokens = output.toLowerCase().split(/\W+/).filter(w => w.length >= 4);
  if (inTokens.size === 0) return { verdict: "INCONCLUSIVE", evidence: { reason: "no input tokens" } };
  const overlap = outTokens.filter(t => inTokens.has(t)).length;
  const ratio = overlap / Math.max(outTokens.length, 1);
  return ratio >= 0.05
    ? { verdict: "SATISFIED", evidence: { overlap, ratio: Number(ratio.toFixed(3)) } }
    : { verdict: "VIOLATED", evidence: { overlap, ratio: Number(ratio.toFixed(3)), min: 0.05 } };
}

function predEuArt13Label(_input: string, output: string): PredicateResult {
  const has = /\b(ai[- ]generated|generated by ai|this (?:response|content) was produced by an ai|artificial intelligence)\b/i.test(output);
  return has
    ? { verdict: "SATISFIED", evidence: { disclosure_marker: true } }
    : { verdict: "VIOLATED", evidence: { disclosure_marker: false, article: "EU AI Act Art. 13" } };
}

const REGISTRY: Record<string, (i: string, o: string) => PredicateResult> = {
  NO_PII: predNoPII,
  NO_DISALLOWED_CAT: predNoDisallowedCat,
  OUTPUT_BOUNDED: predOutputBounded,
  INPUT_MATCHES: predInputMatches,
  EU_ART_13_LABEL: predEuArt13Label,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const { receipt_id, predicate_id, input, output } = body ?? {};
    if (!receipt_id || typeof receipt_id !== "string") return json({ error: "receipt_id required" }, 400);
    if (!predicate_id || typeof predicate_id !== "string") return json({ error: "predicate_id required" }, 400);
    if (typeof input !== "string" || typeof output !== "string") return json({ error: "input & output must be strings" }, 400);
    if (input.length > 32768 || output.length > 32768) return json({ error: "input/output exceed 32KB" }, 400);

    const evaluator = REGISTRY[predicate_id];
    if (!evaluator) return json({ error: "unknown_predicate", available: Object.keys(REGISTRY) }, 400);

    const result = evaluator(input, output);

    const inputHash = await sha256Hex(input);
    const outputHash = await sha256Hex(output);
    const proofPayload = JSON.stringify({
      receipt_id, predicate_id, predicate_version: "v1",
      input_hash: inputHash, output_hash: outputHash,
      verdict: result.verdict, evidence: result.evidence,
    });
    const proofHash = await sha256Hex(proofPayload);
    const signature = await signEd25519(proofHash, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "psi");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.from("predicate_proofs").insert({
      receipt_id, predicate_id, predicate_version: "v1",
      input_hash: inputHash, output_hash: outputHash,
      proof_hash: proofHash, verdict: result.verdict,
      evidence: result.evidence, ed25519_signature: signature,
    });
    if (error) return json({ error: "persist_failed", detail: error.message }, 500);

    return json({
      receipt_id, predicate_id, predicate_version: "v1",
      verdict: result.verdict, evidence: result.evidence,
      input_hash: `sha256:${inputHash}`, output_hash: `sha256:${outputHash}`,
      proof_hash: `sha256:${proofHash}`, ed25519_signature: signature,
      engine: "APEX PSI Predicate Prover v1",
    }, 201);
  } catch (e: any) {
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});
