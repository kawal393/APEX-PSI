import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";
import { WM2_METHOD } from "@/lib/psi-watermark-dct";
import { HYBRID_SUITE } from "@/lib/psi-pqc";
import { ExternalLink } from "lucide-react";

type Row = {
  measure: string;
  status: "mandatory" | "optional";
  requirement: string;
  mechanism: string;
  artifacts: Array<{ label: string; to?: string; href?: string }>;
};

const ROWS: Row[] = [
  {
    measure: "In-band signed metadata",
    status: "mandatory",
    requirement:
      "Machine-readable marking attached to the content itself, signed and tamper-evident, so a downstream party can detect that the asset was produced or modified by an AI system.",
    mechanism:
      `A JUMBF-framed manifest is written inside the file bytes (JPEG APP11, PNG ancillary chunk, MP4 uuid box, WAV chunk, PDF object). The claim is canonicalised with RFC 8785 and signed with ${HYBRID_SUITE}; a hard-binding SHA-256 over the pre-embed bytes makes any later edit detectable.`,
    artifacts: [
      { label: "Specification and live sealer", to: "/inband" },
      { label: "Full protocol specification", to: "/spec" },
      { label: "Trust anchor (public keys)", href: "/.well-known/apex-psi-trust-anchor.json" },
    ],
  },
  {
    measure: "Watermarking",
    status: "mandatory",
    requirement:
      "A watermark indicating that content is AI-generated, effective, interoperable, robust and reliable as far as technically feasible.",
    mechanism:
      `Transform-domain mark ${WM2_METHOD}: 8×8 block DCT with quantization index modulation on mid-band luminance coefficients, 160-bit tile repeated across the raster, soft-confidence majority vote with grid-offset, tile-shift and rescale search on recovery.`,
    artifacts: [
      { label: "Reproducible robustness benchmark", to: "/robustness" },
      { label: "Method source (MIT)", href: "https://github.com/kawal393/apex-psi-mcp-server" },
    ],
  },
  {
    measure: "Detection",
    status: "mandatory",
    requirement: "Means for third parties to detect and read the marking, including markings produced by other systems.",
    mechanism:
      "The detector reads PSI in-band manifests and recovers the transform-domain watermark client-side, and exposes a keyless public verification endpoint for hash lookups. Interoperability testing against third-party C2PA validators is in progress and results will be published here verbatim, pass or fail.",
    artifacts: [
      { label: "Detector (browser, no upload)", to: "/inband" },
      { label: "Public verification portal", to: "/verify" },
      { label: "Keyless verification API", to: "/api" },
    ],
  },
  {
    measure: "Provenance metadata and logging",
    status: "optional",
    requirement: "Rich provenance metadata, fingerprinting and logging measures.",
    mechanism:
      "Append-only ledger with monotonic sequence numbers, Merkle batching, OpenTimestamps submission, and a Compliance-Receipt HTTP header for runtime disclosure.",
    artifacts: [
      { label: "Live ledger", to: "/stream" },
      { label: "Compliance-Receipt header", to: "/standard" },
      { label: "IETF drafts", to: "/portfolio" },
    ],
  },
];

const Badge = ({ status }: { status: Row["status"] }) => (
  <span
    className={`text-[10px] font-mono uppercase tracking-widest rounded px-2 py-0.5 border ${
      status === "mandatory" ? "border-gold/50 text-gold" : "border-border text-muted-foreground"
    }`}
  >
    {status}
  </span>
);

const EUCode = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>EU Code of Practice Section 1 — Requirement Mapping | APEX PSI</title>
      <meta
        name="description"
        content="Requirement-by-requirement mapping of the EU Code of Practice on Transparency of AI-Generated Content, Section 1: in-band signed metadata, watermarking and detection, each linked to a publicly verifiable artifact."
      />
      <link rel="canonical" href={`${SITE_URL}/eu-code`} />
      <meta property="og:title" content="EU Code of Practice Section 1 — Requirement Mapping | APEX PSI" />
      <meta
        property="og:description"
        content="Every Section 1 measure mapped to a mechanism and a public URL a hostile third party can check."
      />
      <meta property="og:url" content={`${SITE_URL}/eu-code`} />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <Navbar />
    <main className="pt-28 pb-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
          Code of Practice · Transparency of AI-generated content · Section 1
        </p>
        <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4">Requirement → mechanism → artifact</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-3">
          This page exists so no reviewer has to take our word for anything. Each Section 1 measure is stated, the
          mechanism that implements it is named, and every claim points to a URL that can be opened and tested
          independently — including the benchmark that would expose us if the mark were weak.
        </p>
        <p className="text-xs text-muted-foreground max-w-3xl mb-10">
          APEX PSI provides technical means. Nothing on this page is legal advice, a conformity assessment, or a
          presumption of compliance with Regulation (EU) 2024/1689. Signatory status of any code of practice is
          determined solely by the relevant authority.
        </p>

        <div className="space-y-4 mb-12">
          {ROWS.map((r) => (
            <section key={r.measure} className="rounded-xl border border-border bg-card/40 p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-base sm:text-lg font-black text-foreground">{r.measure}</h2>
                <Badge status={r.status} />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Requirement</p>
              <p className="text-xs text-foreground/80 mb-3">{r.requirement}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Our mechanism</p>
              <p className="text-xs text-foreground/80 mb-3">{r.mechanism}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Verifiable artifacts</p>
              <div className="flex flex-wrap gap-2">
                {r.artifacts.map((a) =>
                  a.to ? (
                    <Link
                      key={a.label}
                      to={a.to}
                      className="rounded-md border border-border px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-gold/40 transition-colors"
                    >
                      {a.label}
                    </Link>
                  ) : (
                    <a
                      key={a.label}
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-gold/40 transition-colors"
                    >
                      {a.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card/40 p-5 mb-12">
          <h2 className="text-lg font-black uppercase tracking-widest mb-3">
            <span className="text-gold-gradient">Open evaluation record</span>
          </h2>
          <ul className="space-y-2 text-xs text-foreground/75">
            <li>• Earlier submissions to the AI Office were not accepted. The stated gaps were watermark robustness and the strength of the in-band signed metadata evidence.</li>
            <li>• The LSB watermark cited in that assessment has been withdrawn and replaced by the transform-domain mark benchmarked at <Link to="/robustness" className="text-gold hover:underline">/robustness</Link>.</li>
            <li>• The phrase &quot;C2PA-compatible&quot; has been removed from the product. The container is described exactly as what it is — a JUMBF-framed PSI manifest — until third-party validator results are published here.</li>
            <li>• Any future assessment outcome will be published on this page, whatever it says.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/robustness" className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors">
            Run the robustness benchmark
          </Link>
          <Link to="/eu-ai-act" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            Article 50 mapping
          </Link>
          <Link to="/challenge" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            Try to break it
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default EUCode;
