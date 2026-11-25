// A breach pack is the gate's own answer, re-presented: verdict, refusal reason,
// every check the gate ran, and a SHA-256 over the canonical JSON. It is an
// unsigned summary of a signed check — never a legal finding.
export interface GateCheck { status: string; reason?: string; detail?: string }
export interface GateAnswer {
  ok: boolean;
  refused: boolean;
  reason?: string;
  mode?: string;
  permit?: Record<string, string>;
  report: { ok: boolean; checks: Record<string, GateCheck>; actions: unknown[] };
}
export interface BreachPack {
  kind: "APEX-PSI-BREACH-PACK/1";
  verdict: "PERMITTED" | "REFUSED";
  reason: string | null;
  mode: string | null;
  failed_checks: string[];
  checks: Record<string, GateCheck>;
  permit: Record<string, string> | null;
  actions_recorded: number;
  boundary: string;
}

export const BOUNDARY = "Unsigned summary of a PSI-ACT/1 gate answer. It shows which signed records were present and which rule refused the action. It does not prove the action was right, lawful or true.";
const BAD = new Set(["invalid", "algorithm_unavailable", "key_unresolved"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function parseGateAnswer(text: string): GateAnswer {
  let v: unknown;
  try { v = JSON.parse(text); } catch { throw new Error("invalid_json"); }
  if (!isObj(v) || typeof v.ok !== "boolean" || !isObj(v.report) || !isObj(v.report.checks)) throw new Error("not_gate_answer");
  const checks: Record<string, GateCheck> = {};
  for (const [k, c] of Object.entries(v.report.checks)) {
    if (!isObj(c) || typeof c.status !== "string") throw new Error("not_gate_answer");
    checks[k] = { status: c.status, ...(typeof c.reason === "string" ? { reason: c.reason } : {}), ...(typeof c.detail === "string" ? { detail: c.detail } : {}) };
  }
  return {
    ok: v.ok, refused: v.refused === true || !v.ok,
    reason: typeof v.reason === "string" ? v.reason : undefined,
    mode: typeof v.mode === "string" ? v.mode : undefined,
    permit: isObj(v.permit) ? Object.fromEntries(Object.entries(v.permit).map(([k, x]) => [k, String(x)])) : undefined,
    report: { ok: v.report.ok === true, checks, actions: Array.isArray(v.report.actions) ? v.report.actions : [] },
  };
}

export function buildBreachPack(a: GateAnswer): BreachPack {
  return {
    kind: "APEX-PSI-BREACH-PACK/1",
    verdict: a.ok && !a.refused ? "PERMITTED" : "REFUSED",
    reason: a.reason ?? null,
    mode: a.mode ?? null,
    failed_checks: Object.entries(a.report.checks).filter(([, c]) => BAD.has(c.status)).map(([k]) => k),
    checks: a.report.checks,
    permit: a.permit ?? null,
    actions_recorded: a.report.actions.length,
    boundary: BOUNDARY,
  };
}

// Deterministic JSON (sorted keys) so the same answer always yields the same fingerprint.
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

export async function packFingerprint(pack: BreachPack): Promise<{ json: string; sha256: string }> {
  const json = canonical(pack);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return { json, sha256: [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("") };
}
