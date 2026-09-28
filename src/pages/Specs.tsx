import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExternalLink } from "lucide-react";

// Canonical location of the dated prior-art shelf. The site does NOT copy the
// document bodies — GitHub is the single source of truth, so nothing here can
// drift out of sync with the register. This page is an honest index + a live
// read of the ledger.
const GITHUB_BASE = "https://github.com/kawal393/APEX-PSI/tree/main/specs";
const STATS_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/ledger-stats";

const DOC = (file: string, title: string, desc: string) => ({ file, title, desc });
const DOCS = [
  DOC("psi-seal-1.md", "PSI-SEAL/1.0.0", "The seal schema — canonical rules R1–R12, the five verbs, and the digest coupling."),
  DOC("article50-profile-v2.md", "EU AI Act Article 50 profile (PSI-EUA50-2)", "Conformance mapping of Article 50 transparency duties to verifiable PSI artefacts."),
  DOC("interop-scitt.md", "SCITT interop note", "How a SCITT / COSE receipt maps into a PSI seal — we sit underneath."),
  DOC("interop-c2pa.md", "C2PA interop note", "How a PSI seal rides inside a C2PA assertion — we sit within."),
  DOC("agent-envelope-v1.md", "Agent envelope v1", "The machine-to-machine envelope for autonomous agents and settlement rails."),
  DOC("discrepancy-score-v1.md", "Discrepancy score v1", "Spec for the claim-versus-recomputed-truth score."),
  DOC("evidence-package-v1.md", "Evidence package v1", "Structured, independently verifiable evidence bundle format."),
  DOC("truth-commons-charter-v1.md", "Truth Commons Charter v1", "Procedural rules for versioned, public predicate governance."),
  DOC("anchored-releases.md", "Anchored release register", "Every shelf document with its SHA-256 digest, publication date, and anchor status."),
  DOC("README.md", "Shelf index", "What this shelf is, how it is dated, and the licence note."),
];

type LedgerStats = {
  total_receipts: number;
  confirmed_anchors: number;
  pending_anchors: number;
  latest_block_height: number | null;
  latest_anchor_txid: string | null;
  founded_at: string;
};

const Stat = ({ k, v }: { k: string; v: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-2.5 border-b border-border/50 last:border-0">
    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{k}</div>
    <div className="text-sm text-foreground/90 font-mono break-all">{v}</div>
  </div>
);

const Specs = () => {
  const [stats, setStats] = useState<LedgerStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(STATS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stats unavailable"))))
      .then((d) => { if (alive) setStats(d as LedgerStats); })
      .catch(() => { if (alive) setStats(null); });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <Helmet>
        <title>Apex PSI Specification Shelf — Dated Public Prior Art — Universal Verification Protocol</title>
        <meta
          name="description"
          content="The dated, versioned public prior-art shelf for the APEX PSI protocol: the PSI-SEAL/1.0.0 schema, the EU AI Act Article 50 conformance profile, interop notes for SCITT and C2PA, agent envelope, discrepancy score, evidence package, Truth Commons Charter, and the anchored release register."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/specs" />
        <meta property="og:title" content="APEX PSI — Specification Shelf" />
        <meta property="og:description" content="Every APEX PSI specification, published with a date and a cryptographic digest, before anyone else needed one." />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <header className="border-b border-border pt-28 pb-14 px-4 grid-bg">
          <div className="container mx-auto max-w-5xl">
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-gold mb-4">
              Specification Shelf · Public · Prior Art
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.92] mb-6">
              <span className="text-chrome-gradient">The public record.</span>
              <br />
              <span className="text-gold-gradient">Dated. Versioned.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
              Every APEX PSI specification is published here first, with a date and a cryptographic digest, so
              anyone can verify what existed and when. The canonical files live in this repository under{" "}
              <code className="font-mono text-foreground/90">/specs</code>; this page indexes them and reads the
              live ledger. Nothing is paraphrased — open the source.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["PSI-SEAL/1.0.0", "IETF draft-singh-psi (rev 01)", "EU AI Act Article 50", "RFC 8785 (JCS)", "Free to verify"].map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-3 py-1"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-5xl px-4 py-16">
          {/* Document list */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-chrome-gradient uppercase mb-6">
              On the shelf
            </h2>
            <div className="space-y-3">
              {DOCS.map((d) => (
                <a
                  key={d.file}
                  href={`${GITHUB_BASE}/${d.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-4 rounded-lg border border-border bg-card/40 px-5 py-4 hover:border-gold/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gold mb-1">{d.file}</p>
                    <p className="text-base font-semibold text-foreground">{d.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{d.desc}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 mt-1 shrink-0 text-muted-foreground group-hover:text-gold transition-colors" />
                </a>
              ))}
            </div>
          </section>

          {/* Reproduce digests */}
          <section className="mb-16 rounded-lg border border-border bg-card/40 px-5 py-5">
            <h2 className="text-lg font-black tracking-tight uppercase mb-3">Reproduce the digests yourself</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The release register lists SHA-256 digests of the canonical committed (LF) blobs. Do not trust the
              table — recompute it. A <code className="font-mono text-foreground/90">.gitattributes</code> pins{" "}
              <code className="font-mono text-foreground/90">specs/*.md text eol=lf</code>, so these match on every
              platform:
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-background/60 px-4 py-3 text-[12px] font-mono text-foreground/90 leading-relaxed">
{`git cat-file blob HEAD:specs/<file> | sha256sum
python -c "import hashlib;print(hashlib.sha256(open('specs/<file>','rb').read().replace(b'\\r\\n',b'\\n')).hexdigest())"`}
            </pre>
            <p className="text-sm text-muted-foreground mt-4">
              See <code className="font-mono text-foreground/90">anchored-releases.md</code> for the full register and
              the Bitcoin-anchoring status of each entry.
            </p>
          </section>

          {/* Live ledger */}
          <section className="mb-16">
            <h2 className="text-lg font-black tracking-tight uppercase mb-3">The live ledger</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Read directly from the public keyless endpoint — no key, no account, no fee. Figures are as the
              server returns them; if the read fails nothing is invented.
            </p>
            <div className="rounded-lg border border-border bg-card/40 px-5 py-2">
              {stats ? (
                <>
                  <Stat k="Total receipts" v={stats.total_receipts.toLocaleString()} />
                  <Stat k="Confirmed anchors" v={String(stats.confirmed_anchors)} />
                  <Stat k="Pending anchors" v={String(stats.pending_anchors)} />
                  <Stat k="Latest block height" v={stats.latest_block_height != null ? stats.latest_block_height.toLocaleString() : "—"} />
                  <Stat k="Latest anchor txid" v={stats.latest_anchor_txid ?? "—"} />
                  <Stat k="Ledger founded" v={stats.founded_at} />
                </>
              ) : (
                <div className="py-6 text-center font-mono text-xs uppercase tracking-widest text-gold">
                  SIGNAL PENDING
                </div>
              )}
            </div>
          </section>

          {/* Claims fence */}
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground border-t border-border pt-6 leading-relaxed">
            APEX PSI publishes integrity and existence proofs. It does not adjudicate truth, liability, or legal
            outcome, and conformance to any specification here is not a claim that any court, regulator, or party
            must accept anything. A receipt proves the bytes and the time — no more.
          </p>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Specs;
