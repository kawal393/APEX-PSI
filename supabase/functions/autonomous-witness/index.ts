// autonomous-witness — observes a small, bounded set of open public feeds
// (npm, PyPI release metadata; ClinicalTrials.gov study updates) and records a
// SHA-256 fingerprint of each canonicalised record. Public, non-personal data
// only. It records that a record looked a certain way at a time — never that
// it is true. Single-flight lock, bounded batch, dedup by unique key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import canonicalize from "npm:canonicalize@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_PER_RUN = 25;
const UA = "APEX-PSI-PublicWitness/1.0 (+https://ai-governance-standard.com/witness)";
const NPM = ["react", "typescript", "openai", "@anthropic-ai/sdk", "langchain", "ai", "zod", "vite"];
const PYPI = ["requests", "numpy", "torch", "transformers", "langchain", "openai", "fastapi"];

type Rec = { source: string; source_id: string; title: string; source_url: string; data: unknown };

const sha = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

async function getJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) { await r.body?.cancel(); throw new Error(`${url} ${r.status}`); }
  return r.json();
}

async function collect(): Promise<Rec[]> {
  const out: Rec[] = [];
  await Promise.allSettled(NPM.map(async (p) => {
    const j = await getJson(`https://registry.npmjs.org/${p.replace("/", "%2F")}/latest`);
    out.push({ source: "npm", source_id: `${p}@${j.version}`, title: `${p} ${j.version}`,
      source_url: `https://www.npmjs.com/package/${p}/v/${j.version}`,
      data: { name: j.name, version: j.version, integrity: j.dist?.integrity ?? null, shasum: j.dist?.shasum ?? null } });
  }));
  await Promise.allSettled(PYPI.map(async (p) => {
    const j = await getJson(`https://pypi.org/pypi/${p}/json`);
    const v = j.info?.version;
    const files = (j.urls ?? []).map((u: { filename: string; digests: { sha256: string } }) => ({ f: u.filename, sha256: u.digests?.sha256 }));
    out.push({ source: "pypi", source_id: `${p}==${v}`, title: `${p} ${v}`,
      source_url: `https://pypi.org/project/${p}/${v}/`, data: { name: p, version: v, files } });
  }));
  try {
    const j = await getJson("https://clinicaltrials.gov/api/v2/studies?pageSize=10&sort=LastUpdatePostDate:desc&fields=NCTId,BriefTitle,OverallStatus,LastUpdatePostDate,PrimaryOutcome");
    for (const s of j.studies ?? []) {
      const id = s.protocolSection?.identificationModule?.nctId;
      if (!id) continue;
      out.push({ source: "clinicaltrials", source_id: id,
        title: String(s.protocolSection?.identificationModule?.briefTitle ?? id).slice(0, 200),
        source_url: `https://clinicaltrials.gov/study/${id}`, data: s.protocolSection });
    }
  } catch (e) { console.error("[witness] ctgov", e); }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: locked } = await db.rpc("acquire_witness_lock", { p_seconds: 120 });
  if (!locked) return json({ skipped: "already running or paused" });

  let inserted = 0, seen = 0;
  try {
    const recs = await collect();
    const rows = [];
    for (const r of recs) {
      const c = canonicalize(r.data);
      if (!c) continue;
      rows.push({ source: r.source, source_id: r.source_id, title: r.title, source_url: r.source_url, content_hash: await sha(c) });
    }
    seen = rows.length;
    const batch = rows.slice(0, MAX_PER_RUN * 2);
    const { data, error } = await db.from("public_witness_records")
      .upsert(batch, { onConflict: "source,source_id,content_hash", ignoreDuplicates: true }).select("id");
    if (error) throw error;
    inserted = Math.min(data?.length ?? 0, MAX_PER_RUN * 2);

    // Change records: a new fingerprint for an already-seen record keeps both.
    let changes = 0;
    const newIds = new Set((data ?? []).map((d: { id: string }) => d.id));
    if (newIds.size) {
      const { data: fresh } = await db.from("public_witness_records").select("*").in("id", [...newIds]);
      for (const f of fresh ?? []) {
        const { data: prior } = await db.from("public_witness_records").select("content_hash,observed_at")
          .eq("source", f.source).eq("source_id", f.source_id).neq("content_hash", f.content_hash)
          .lt("observed_at", f.observed_at).order("observed_at", { ascending: false }).limit(1);
        const p = prior?.[0];
        if (!p) continue;
        const contradiction_hash = await sha(canonicalize({ source: f.source, source_id: f.source_id, earlier: p.content_hash, later: f.content_hash })!);
        const { error: ce } = await db.from("witness_contradictions").upsert({
          source: f.source, source_id: f.source_id, earlier_hash: p.content_hash, later_hash: f.content_hash,
          earlier_observed_at: p.observed_at, later_observed_at: f.observed_at, contradiction_hash,
        }, { onConflict: "contradiction_hash", ignoreDuplicates: true });
        if (!ce) changes++;
      }
    }
    const result = { seen, inserted, changes };
    await db.from("witness_job_state").update({ locked_until: null, last_run_at: new Date().toISOString(), last_result: result }).eq("id", "autonomous-witness");
    return json(result);
  } catch (e) {
    await db.from("witness_job_state").update({ locked_until: null, last_result: { error: String(e) } }).eq("id", "autonomous-witness");
    return json({ error: "witness run failed" }, 500);
  }
});
