import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Brain, RotateCcw, ShieldCheck, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SUBLINE =
  "AI agents now remember — and memory poisoning is a live enterprise threat. A sealed memory state makes tampering mathematically visible in seconds.";

const ORIGINAL_MEMORY = `{
  "agent": "apex-ops-01",
  "mandate": "settle invoices under 5000 AUD",
  "last_decision": "approved INV-4471",
  "escalation_contact": "compliance@apex-infrastructure.com"
}`;

const TAMPERED_MEMORY = ORIGINAL_MEMORY.replace(
  '"settle invoices under 5000 AUD"',
  '"settle invoices under 5000000 AUD"',
);

const STATS = [
  { text: "Memory poisoning: live enterprise threat — June 2026 incident wave", source: "SOURCE: reported June 2026 incident wave" },
  { text: "Prompt injection +340% YoY", source: "SOURCE: 2026 industry reports" },
  { text: "Agent incidents logged", source: "SOURCE: OWASP GenAI Q1 2026" },
];

const sha256Hex = async (text: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const SealedMemory = () => {
  const [memory, setMemory] = useState(ORIGINAL_MEMORY);
  const [hash, setHash] = useState("");
  const tampered = memory !== ORIGINAL_MEMORY;

  const recompute = useCallback(async (value: string) => setHash(await sha256Hex(value)), []);

  useEffect(() => {
    recompute(memory);
  }, [memory, recompute]);

  return (
    <>
      <Helmet>
        <title>Sealed AI Memory — APEX PSI</title>
        <meta name="description" content={SUBLINE} />
        <link rel="canonical" href="https://ai-governance-standard.com/sealed-memory" />
        <meta property="og:title" content="Sealed AI Memory — APEX PSI" />
        <meta property="og:description" content={SUBLINE} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-governance-standard.com/sealed-memory" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />

        <section className="px-4 pt-14 pb-10 border-b border-border/50">
          <div className="container mx-auto max-w-5xl">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3 inline-flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" /> New vertical
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95] mb-4">
              Sealed AI Memory
            </h1>
            <p className="text-lg sm:text-2xl font-black text-chrome-gradient mb-5">
              Never starts from zero. Never inherits a lie.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {SUBLINE}
            </p>
          </div>
        </section>

        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-5">
              Interactive live demo · runs entirely in your browser
            </h2>

            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              spellCheck={false}
              rows={7}
              className="w-full rounded-lg border border-border bg-card/60 p-4 font-mono text-xs text-foreground resize-y focus:outline-none focus:border-gold/60"
            />

            <div
              className={`mt-4 rounded-lg border p-4 ${
                tampered ? "border-destructive/50 bg-destructive/[0.06]" : "border-gold/40 bg-gold/[0.05]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Sealed state
              </p>
              <p
                className={`font-mono text-xs break-all ${
                  tampered ? "text-destructive" : "text-gold"
                }`}
              >
                {hash || "computing…"}
              </p>
              <p
                className={`text-xs font-bold mt-2 ${
                  tampered ? "text-destructive" : "text-gold"
                }`}
              >
                {tampered ? "SEAL BROKEN — alteration visible" : "SEAL INTACT"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => setMemory(TAMPERED_MEMORY)}
                className="inline-flex items-center gap-2 rounded-md border border-destructive/50 text-destructive text-xs font-bold h-9 px-4 hover:bg-destructive/10 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" /> Tamper one line
              </button>
              <button
                onClick={() => setMemory(ORIGINAL_MEMORY)}
                className="inline-flex items-center gap-2 rounded-md border border-gold/50 text-gold text-xs font-bold h-9 px-4 hover:bg-gold/10 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-5">
              Same hash = untouched. Different hash = tampered. That is the whole protocol.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-gold/40 bg-gold/[0.04] p-5 sm:p-6">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-3">
                Founding record
              </p>
              <dl className="grid gap-3 sm:grid-cols-3 mb-5">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Receipt</dt>
                  <dd className="text-xs font-mono text-foreground break-all">
                    APEX-NTR-F77F6C2198938410
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Timestamp</dt>
                  <dd className="text-xs font-mono text-foreground">2026-08-22T10:43:14Z</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">SHA-256</dt>
                  <dd className="text-xs font-mono text-foreground break-all">
                    2300fb5b6e08c480ec067b3c97fa7c55db0251afca753644a00a2d558894a3ff
                  </dd>
                </div>
              </dl>
              <Link
                to="/verify?hash=2300fb5b6e08c480ec067b3c97fa7c55db0251afca753644a00a2d558894a3ff"
                className="inline-flex items-center gap-2 rounded-md bg-gold text-background text-xs font-bold h-9 px-4 hover:bg-gold/90 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verify this record
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.text} className="rounded-lg border border-border bg-card/40 p-4">
                <p className="text-sm font-bold text-foreground leading-snug">{s.text}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-2">
                  {s.source}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default SealedMemory;
