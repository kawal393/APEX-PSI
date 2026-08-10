import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExternalLink } from "lucide-react";
import { useProtocolRegistry, draftFor } from "@/lib/protocol-registry";
import { SITE_URL } from "@/lib/site";

const COMPLIANCE = [
  { label: "EU AI Act — Article 50 (transparency of AI content)", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
  { label: "EU AI Act — Articles 11-15 (documentation, logging, accuracy)", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
  { label: "C2PA 2.1 Content Credentials specification", url: "https://c2pa.org/specifications/specifications/2.1/index.html" },
  { label: "NIST SP 800-208 — Stateful Hash-Based Signatures", url: "https://csrc.nist.gov/pubs/sp/800/208/final" },
  { label: "NIST FIPS 204 — ML-DSA", url: "https://csrc.nist.gov/pubs/fips/204/final" },
  { label: "RFC 8785 — JSON Canonicalization Scheme", url: "https://www.rfc-editor.org/rfc/rfc8785" },
];

export default function StandardsPortfolio() {
  const { registry, error, loading } = useProtocolRegistry();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Standards Portfolio — PSI 00-09 | APEX PSI</title>
        <meta
          name="description"
          content="The full APEX PSI standards portfolio: filed IETF Internet-Drafts with datatracker status, drafts ready to file, jurisdictions and scope."
        />
        <link rel="canonical" href={`${SITE_URL}/portfolio`} />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-20 space-y-10">
        <header>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Standards Command Center</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-chrome-gradient">Standards Portfolio</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            Rendered directly from the published protocol registry at{" "}
            <a className="text-gold hover:underline" href="/.well-known/apex-protocol.json">
              /.well-known/apex-protocol.json
            </a>
            . When a new draft is filed, that file changes and this page follows — no manual edits.
          </p>
        </header>

        {loading && <p className="text-xs font-mono text-muted-foreground">Loading registry…</p>}
        {error && <p className="text-xs font-mono text-destructive">Registry unavailable: {error}</p>}

        {registry && (
          <>
            <section className="space-y-3">
              {registry.standards.map((s) => {
                const draft = draftFor(registry, s.draft);
                const filed = s.status === "filed";
                return (
                  <div
                    key={s.id}
                    className="grid md:grid-cols-[auto_1fr_auto] gap-3 md:gap-6 items-start border border-border rounded-lg bg-card/40 p-4"
                  >
                    <div className="font-mono text-xs text-gold uppercase">{s.id}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                      <div className="text-[10px] font-mono text-muted-foreground mt-2">{s.jurisdiction}</div>
                      {s.id === "psi-05" && (
                        <Link to="/standards/psi-05" className="text-[11px] text-gold hover:underline mt-2 inline-block">
                          Read the PSI-05 specification →
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-1.5 text-[10px] font-mono">
                      <span
                        className={
                          filed
                            ? "border border-gold/40 text-gold rounded px-2 py-0.5"
                            : "border border-border/60 text-muted-foreground rounded px-2 py-0.5"
                        }
                      >
                        {filed ? "FILED — IETF" : "TO BE FILED"}
                      </span>
                      {draft && (
                        <a
                          href={draft.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-gold inline-flex items-center gap-1"
                        >
                          {draft.name} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="border border-border rounded-lg bg-card/40 p-6">
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
                IETF Watcher — filed drafts
              </h2>
              <div className="space-y-2">
                {registry.ietf_drafts.map((d) => (
                  <div
                    key={d.name}
                    className="flex flex-wrap items-center justify-between gap-2 border border-border/60 rounded-md p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-foreground">{d.name}</div>
                      <div className="text-[11px] text-muted-foreground">{d.title}</div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-muted-foreground">expires {d.expires}</span>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline inline-flex items-center gap-1"
                      >
                        datatracker <ExternalLink className="h-3 w-3" />
                      </a>
                      {d.text_url && (
                        <a
                          href={d.text_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-gold"
                        >
                          .txt
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">Compliance ready</h2>
          <ul className="space-y-2">
            {COMPLIANCE.map((c) => (
              <li key={c.label}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-gold inline-flex items-center gap-1"
                >
                  {c.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-4">
            Official specification links only. APEX PSI maps evidence to these requirements; it does not claim
            certification by any body.
          </p>
        </section>

        <section className="border border-gold/30 rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Open standard, open ledger
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a
              className="text-gold hover:underline"
              href="https://github.com/kawal393/digital-gallowsapex-infrastructurecom"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository (MIT)
            </a>
            <a className="text-gold hover:underline" href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer">
              MIT license
            </a>
            <a className="text-gold hover:underline" href="/.well-known/security.txt">
              security.txt
            </a>
            <a className="text-gold hover:underline" href="/.well-known/apex-psi-trust-anchor.json">
              trust anchor
            </a>
            <a className="text-gold hover:underline" href="/llms.txt">
              llms.txt
            </a>
            <Link className="text-gold hover:underline" to="/stream">
              live ledger
            </Link>
          </div>
          <div className="mt-5 grid sm:grid-cols-3 gap-3 text-xs">
            <a
              href="https://apex-infrastructure.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border/60 rounded-md p-3 hover:border-gold/40"
            >
              <div className="font-mono text-gold">apex-infrastructure.com</div>
              <div className="text-muted-foreground mt-1">The business layer</div>
            </a>
            <a
              href="https://apex-tat-va.store"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border/60 rounded-md p-3 hover:border-gold/40"
            >
              <div className="font-mono text-gold">apex-tat-va.store</div>
              <div className="text-muted-foreground mt-1">Proof-of-life surface</div>
            </a>
            <Link to="/connect" className="border border-border/60 rounded-md p-3 hover:border-gold/40">
              <div className="font-mono text-gold">MCP connection layer</div>
              <div className="text-muted-foreground mt-1">Connect any AI</div>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
