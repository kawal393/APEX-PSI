import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, XCircle, ExternalLink, RotateCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  PSI_SCHEMA_ID,
  PSI_SCHEMA_RULES,
  psiSchemaDigest,
  psiLeaf,
  psiMerkleRoot,
  verifySealConformance,
} from "@/lib/psi-schema";
import { jcsCanonicalize } from "@/lib/psi-canonicalize";
import { sha256Hex } from "@/lib/hello-psi";

// The vectors below are the committed golden outputs of the Python suite
// (psi-conformance/conformance.py + psi_jcs.py). GitHub is the single source of
// truth — this page holds no copy of them, so it cannot drift from the register.
// The math runs in the visitor's browser against the same TypeScript primitives
// that ship in the verifier. No key, no account, no server call.
const VEC_BASE = "https://raw.githubusercontent.com/kawal393/APEX-PSI/main/psi-conformance/vectors";
const VEC_FILES = ["sha256", "canonicalization", "leaf", "merkle", "negative"] as const;

type CheckResult = { label: string; expected: string; got: string; ok: boolean };
type Suite = { id: string; title: string; rule: string; results: CheckResult[] };

const short = (s: string) => (s.length > 48 ? `${s.slice(0, 24)}…${s.slice(-16)}` : s);

async function runSuites(vec: Record<string, any>): Promise<Suite[]> {
  const suites: Suite[] = [];

  const sha: CheckResult[] = [];
  for (const v of vec.sha256 as { input: string; sha256: string }[]) {
    const got = await sha256Hex(v.input);
    sha.push({ label: `SHA-256 ${JSON.stringify(short(v.input))}`, expected: v.sha256, got, ok: got === v.sha256 });
  }
  suites.push({ id: "sha256", title: "Digest over raw octets", rule: "R5", results: sha });

  const canon: CheckResult[] = [];
  for (const v of vec.canonicalization as { canonical: string; input: unknown }[]) {
    const got = jcsCanonicalize(v.input);
    canon.push({ label: `JCS ${short(v.canonical)}`, expected: v.canonical, got, ok: got === v.canonical });
  }
  suites.push({ id: "jcs", title: "RFC 8785 canonicalisation", rule: "R1", results: canon });

  const leaf: CheckResult[] = [];
  for (const v of vec.leaf as { hash: string; leaf: string }[]) {
    const got = await psiLeaf(v.hash);
    leaf.push({ label: `leaf of ${v.hash.slice(0, 16)}…`, expected: v.leaf, got, ok: got === v.leaf });
  }
  suites.push({ id: "leaf", title: "Domain-separated leaf", rule: "R9", results: leaf });

  const merkle: CheckResult[] = [];
  for (const v of vec.merkle as { leaves: string[]; root: string }[]) {
    const got = await psiMerkleRoot(v.leaves);
    merkle.push({ label: `root over ${v.leaves.length} leaf${v.leaves.length > 1 ? "s" : ""}`, expected: v.root, got, ok: got === v.root });
  }
  suites.push({ id: "merkle", title: "Merkle assembly, odd node promoted", rule: "R8", results: merkle });

  const neg = vec.negative as {
    leaf_differs_on_hash: { correct_leaf: string; wrong_leaf: string };
    merkle_differs_on_reorder: { ab: string; ba: string };
    sha_differs_on_input: { a: string; b: string };
  };
  const pair = (vec.merkle as { leaves: string[] }[])[1].leaves;
  const negResults: CheckResult[] = [];
  const ab = await psiMerkleRoot([pair[0], pair[1]]);
  negResults.push({ label: "leaves in order A,B", expected: neg.merkle_differs_on_reorder.ab, got: ab, ok: ab === neg.merkle_differs_on_reorder.ab });
  const ba = await psiMerkleRoot([pair[1], pair[0]]);
  negResults.push({ label: "same leaves reordered B,A", expected: neg.merkle_differs_on_reorder.ba, got: ba, ok: ba === neg.merkle_differs_on_reorder.ba });
  const leafRow = (vec.leaf as { hash: string; leaf: string }[]).find((l) => l.leaf === neg.leaf_differs_on_hash.correct_leaf);
  if (leafRow) {
    const got = await psiLeaf(leafRow.hash);
    negResults.push({
      label: "a wrong leaf must not verify",
      expected: neg.leaf_differs_on_hash.correct_leaf,
      got,
      ok: got === neg.leaf_differs_on_hash.correct_leaf && got !== neg.leaf_differs_on_hash.wrong_leaf,
    });
  }
  const shaRow = (vec.sha256 as { input: string; sha256: string }[]).find((s) => s.sha256 === neg.sha_differs_on_input.a);
  if (shaRow) {
    const got = await sha256Hex(shaRow.input);
    negResults.push({ label: "different inputs must not collide", expected: neg.sha_differs_on_input.a, got, ok: got === neg.sha_differs_on_input.a });
  }
  suites.push({ id: "negative", title: "Negative vectors — rejection still rejects", rule: "R5 / R8 / R9", results: negResults });

  return suites;
}

const Conformance = () => {
  const [suites, setSuites] = useState<Suite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState("");
  const [raw, setRaw] = useState("");
  const [verdict, setVerdict] = useState<Awaited<ReturnType<typeof verifySealConformance>> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const runAll = () => {
    setError(null);
    setSuites(null);
    Promise.all(
      VEC_FILES.map((f) =>
        fetch(`${VEC_BASE}/${f}.json`).then((r) => {
          if (!r.ok) throw new Error(`${f}.json unavailable (${r.status})`);
          return r.json();
        }),
      ),
    )
      .then((loaded) => runSuites(Object.fromEntries(VEC_FILES.map((f, i) => [f, loaded[i]]))))
      .then(setSuites)
      .catch((e) => setError(String(e?.message || e)));
  };

  useEffect(() => {
    runAll();
    psiSchemaDigest().then(setDigest).catch(() => setDigest(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = suites ? suites.reduce((n, s) => n + s.results.length, 0) : 0;
  const passed = suites ? suites.reduce((n, s) => n + s.results.filter((r) => r.ok).length, 0) : 0;
  const clean = suites !== null && error === null && total > 0 && passed === total;

  const checkEnvelope = () => {
    setParseError(null);
    setVerdict(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setParseError(`Not valid JSON: ${String((e as Error).message)}`);
      return;
    }
    verifySealConformance(parsed).then(setVerdict);
  };

  return (
    <>
      <Helmet>
        <title>Conformance — Run PSI-SEAL/1 Against Yourself — Apex PSI</title>
        <meta
          name="description"
          content="Run the APEX PSI conformance suite in your browser: RFC 8785 canonicalisation, SHA-256, domain-separated leaves and Merkle assembly checked against the committed golden vectors, plus a paste box that judges any seal envelope against rules R1 to R12."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/conformance" />
        <meta property="og:title" content="APEX PSI — Conformance Suite" />
        <meta property="og:description" content="No permission, no key, no server call. The vectors are public; the math runs on your machine." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <header className="border-b border-border pt-28 pb-14 px-4 grid-bg">
          <div className="container mx-auto max-w-5xl">
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-gold mb-4">
              Conformance · {PSI_SCHEMA_ID} · Runs in your browser
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.92] mb-6">
              <span className="text-chrome-gradient">Do not trust us.</span>
              <br />
              <span className="text-gold-gradient">Run the suite.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
              A partner listing is not granted by application and not bought with a fee. It is earned by producing a
              seal that recomputes byte for byte. This page runs the same golden vectors the Python suite publishes,
              against the TypeScript primitives inside the verifier, in front of you.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["R1–R12", "RFC 8785", "SHA-256", "Merkle R8", "Leaf R9", "No key required"].map((c) => (
                <span key={c} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-3 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-5xl px-4 py-16">
          {/* Live score */}
          <section className="mb-14 rounded-lg border border-border bg-card/40 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Suite result</p>
                <p className={`text-3xl font-black tracking-tight ${clean ? "text-gold-gradient" : "text-foreground"}`}>
                  {error ? "Vectors unavailable" : suites ? `${passed} / ${total}` : "Running…"}
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {error
                    ? "The golden vectors could not be fetched, so nothing is being asserted on this page right now."
                    : suites
                      ? clean
                        ? "Every digest computed here matches the committed Python vector, byte for byte."
                        : "Some checks did not match. The mismatches are shown below rather than hidden."
                      : "Fetching the committed vectors from GitHub."}
                </p>
              </div>
              <Button size="sm" variant="heroOutline" onClick={runAll} className="gap-2">
                <RotateCw className="h-4 w-4" /> Run again
              </Button>
            </div>
            {digest && (
              <p className="mt-5 pt-5 border-t border-border/50 font-mono text-[11px] text-muted-foreground break-all">
                schema_digest {digest} — SHA-256 of the rule set below, computed in this browser.
              </p>
            )}
          </section>

          {/* Per-suite results */}
          <section className="mb-16 space-y-8">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-chrome-gradient uppercase">
              Vector by vector
            </h2>
            {(suites ?? []).map((s) => {
              const ok = s.results.every((r) => r.ok);
              return (
                <div key={s.id} className="rounded-lg border border-border bg-card/20">
                  <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60">
                    <div className="flex items-center gap-3 min-w-0">
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      )}
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-gold shrink-0">{s.rule}</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                      {s.results.filter((r) => r.ok).length}/{s.results.length}
                    </span>
                  </div>
                  <div className="px-5 py-3 space-y-1.5">
                    {s.results.map((r, i) => (
                      <div key={i} className="font-mono text-[11px] leading-relaxed break-all">
                        <span className={r.ok ? "text-muted-foreground" : "text-red-400"}>{r.label}</span>
                        {!r.ok && (
                          <div className="ml-4 mt-0.5 text-red-400/80">
                            expected {r.expected}
                            <br />
                            got {r.got}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* The rules */}
          <section className="mb-16 rounded-lg border border-border bg-card/40 px-6 py-6">
            <h2 className="text-xl font-black tracking-tight uppercase text-chrome-gradient mb-4">
              The twelve rules
            </h2>
            <ol className="space-y-2">
              {PSI_SCHEMA_RULES.map((r) => (
                <li key={r} className="font-mono text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  {r}
                </li>
              ))}
            </ol>
            <p className="mt-5 pt-5 border-t border-border/50 text-xs text-muted-foreground">
              The canonical rule text, the golden vectors and this page all come from the same public repository:{" "}
              <a
                href="https://github.com/kawal393/APEX-PSI/tree/main/psi-conformance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline decoration-border underline-offset-4"
              >
                kawal393/APEX-PSI/psi-conformance <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </section>

          {/* Judge your own envelope */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-chrome-gradient uppercase mb-4">
              Judge your own seal
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
              Paste a seal envelope. The verifier checks it against {PSI_SCHEMA_ID} locally, in this page. Nothing is
              uploaded, and no finding changes — this reports format conformance only.
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              placeholder='{ "schema": "PSI-SEAL/1.0.0", "schema_digest": "…", … }'
              className="w-full h-48 rounded-lg border border-border bg-background/60 p-4 font-mono text-[11px] text-foreground focus:outline-none focus:border-gold/60"
            />
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <Button size="sm" variant="hero" onClick={checkEnvelope} disabled={!raw.trim()}>
                Check conformance
              </Button>
              {parseError && <p className="text-xs font-mono text-red-400">{parseError}</p>}
            </div>

            {verdict && (
              <div className={`mt-5 rounded-lg border px-5 py-4 ${verdict.conformant ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card/40"}`}>
                <p className={`text-lg font-black tracking-tight ${verdict.conformant ? "text-emerald-400" : "text-foreground"}`}>
                  {verdict.conformant ? "CONFORMANT" : "NOT CONFORMANT"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  schema {verdict.schema_id ?? "—"} · digest match {String(verdict.schema_digest_match)} · seal_hash
                  match {String(verdict.seal_hash_match)}
                </p>
                {verdict.failures.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {verdict.failures.map((f) => (
                      <li key={f} className="font-mono text-[11px] text-red-400/90 break-all">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {verdict.conformant && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Format conformance is the whole test. It says your seal recomputes — not that any claim inside it is
                    true. Use of the APEX name in commerce is licensed separately, in writing.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* What a pass is and is not */}
          <section className="mb-16 rounded-lg border border-border bg-card/40 px-6 py-6">
            <h2 className="text-xl font-black tracking-tight uppercase text-chrome-gradient mb-3">
              What passing does not mean
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>It does not certify that a claim inside your seal is true, fair, or accurate.</li>
              <li>It does not buy a favourable finding, a listing, or a quiet outcome. Money buys process, never outcome.</li>
              <li>It does not transfer any right to alter a receipt. White-labelling breaks what the receipt is for.</li>
              <li>It does exist as evidence that your artefact recomputes the same way ours does, on a dated public record.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="sm" variant="heroOutline" asChild>
                <a href="/specs">Read the specification</a>
              </Button>
              <Button size="sm" variant="heroOutline" asChild>
                <a href="/license">Licence the name</a>
              </Button>
              <Button size="sm" variant="heroOutline" asChild>
                <a href="/partners">Become an operator</a>
              </Button>
              <Button size="sm" variant="heroOutline" asChild>
                <a href="/verify">Verify a receipt</a>
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Conformance;
