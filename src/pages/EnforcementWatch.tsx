import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ENFORCEABLE_FROM = Date.UTC(2026, 7, 2, 0, 0, 0);

const SUBLINE =
  "Transparency obligations became enforceable 2 August 2026. Every enforcement signal, anywhere on Earth, is sealed here the moment it lands — timestamped, signed, post-quantum. Nobody owns the first fine. This ledger records it.";

interface Entry {
  n: number;
  tag?: string;
  title: string;
  receipt: string;
  hash: string;
  timestamp: string;
  text?: string;
  bullets?: string[];
  note?: string;
}

const ENTRIES: Entry[] = [
  {
    n: 2,
    title: "Dutch AP v Uber — €825M · Architectural Equivalence Note",
    receipt: "APEX-NTR-D6B08044149ADE0D",
    hash: "a884b187ee345206aeb2d2923a6655246f2713965e772fc899bcc2a27c2913c6",
    timestamp: "2026-08-22T10:43:12Z",
    bullets: [
      "Automated decisions affecting livelihood",
      "No meaningful explanation provided to the affected person",
      "No human review of the automated outcome",
      "No effective route of appeal",
    ],
    note:
      "Deployments of the same system in other jurisdictions are reported to contain the identical four elements.",
  },
  {
    n: 1,
    tag: "FOUNDING",
    title: "Founding Record",
    receipt: "APEX-NTR-7F4E5CC21099A0E1",
    hash: "36bcebd3109ada79ba1e2fb08e9d939d3693e8bf1ef5053c8a3b3e62aeba0b9b",
    timestamp: "2026-08-22T10:43:09Z",
    text:
      "The Act is live. Zero enforcement actions recorded as of this seal. We are watching.",
  },
];

const EnforcementWatch = () => {
  const [days, setDays] = useState(0);

  useEffect(() => {
    const tick = () =>
      setDays(Math.max(0, Math.floor((Date.now() - ENFORCEABLE_FROM) / 86400000)));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Helmet>
        <title>Article 50 Enforcement Watch — APEX PSI</title>
        <meta name="description" content={SUBLINE} />
        <link rel="canonical" href="https://ai-governance-standard.com/enforcement-watch" />
        <meta property="og:title" content="Article 50 Enforcement Watch — APEX PSI" />
        <meta property="og:description" content={SUBLINE} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-governance-standard.com/enforcement-watch" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />

        <section className="px-4 pt-14 pb-10 border-b border-border/50">
          <div className="container mx-auto max-w-5xl">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3 inline-flex items-center gap-2">
              <Scale className="h-3.5 w-3.5" /> Sealed public timeline · EU AI Act
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95] mb-5">
              Article 50 Enforcement Watch
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {SUBLINE}
            </p>
          </div>
        </section>

        <section className="px-4 py-8 border-b border-border/50">
          <div className="container mx-auto max-w-5xl grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card/40 p-5">
              <p className="text-3xl font-black font-mono text-gold">{days}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Days enforceable
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-5">
              <p className="text-3xl font-black font-mono text-foreground">0</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Enforcement actions recorded
              </p>
            </div>
            <div className="rounded-lg border border-gold/40 bg-gold/[0.05] p-5">
              <p className="text-2xl font-black font-mono text-foreground">€825M</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Largest algorithmic-decision penalty to date
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Dutch AP v Uber, 21 Aug 2026
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Sealed entries · newest first
            </h2>

            <div className="space-y-5">
              {ENTRIES.map((e) => (
                <article
                  key={e.hash}
                  className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      Entry #{e.n}
                    </span>
                    {e.tag && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold border border-gold/40 rounded px-2 py-0.5">
                        {e.tag}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      {e.timestamp}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-foreground mb-3 leading-snug">
                    {e.title}
                  </h3>

                  {e.text && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{e.text}</p>
                  )}

                  {e.bullets && (
                    <ol className="space-y-1.5 mb-4">
                      {e.bullets.map((b, i) => (
                        <li key={b} className="text-sm text-muted-foreground flex gap-2">
                          <span className="font-mono text-gold shrink-0">({i + 1})</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {e.note && (
                    <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4 border-l-2 border-gold/40 pl-3">
                      {e.note}
                    </p>
                  )}

                  <dl className="grid gap-2 sm:grid-cols-2 mb-5">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Receipt
                      </dt>
                      <dd className="text-xs font-mono text-foreground break-all">{e.receipt}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        SHA-256
                      </dt>
                      <dd className="text-xs font-mono text-foreground break-all">{e.hash}</dd>
                    </div>
                  </dl>

                  <Link
                    to={`/verify?hash=${e.hash}`}
                    className="inline-flex items-center gap-2 rounded-md border border-gold/50 text-gold text-xs font-bold h-9 px-4 hover:bg-gold/10 transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Verify this record
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground/70 mt-8 max-w-3xl">
              Each entry attests to its own existence and timestamp. Legal character of any
              enforcement action belongs to the issuing authority.
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default EnforcementWatch;
