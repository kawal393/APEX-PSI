import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Rosette from "@/components/Rosette";
import RowVerifier from "@/components/RowVerifier";
import {
  CASE_001_RECORDS,
  CASE_001_RESERVED_SLOTS,
  FENCE_LINE,
  TWO_DOORS_LINE,
  siteVerifyUrlFor,
  verifyUrlFor,
  type CaseRecord,
} from "@/data/referenceData";

const RowBadge = ({ row }: { row: CaseRecord }) => {
  if (row.hash) {
    return (
      <a
        href={verifyUrlFor(row.hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
      >
        SEALED
      </a>
    );
  }
  return (
    <span className="inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      SEAL PENDING
    </span>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1 sm:grid-cols-[190px_1fr]">
    <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-0.5">
      {label}
    </dt>
    <dd className="font-mono text-xs text-foreground/90 break-all">{value}</dd>
  </div>
);

const Case001 = () => {
  return (
    <>
      <Helmet>
        <title>CASE 001 — The Worker | APEX PSI Reference</title>
        <meta
          name="description"
          content="The first sealed worker record. Facts only. No verdicts. Every sealed row is recomputable in your own browser."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/case-001" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-24">
          <header className="mb-16">
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight">
              CASE 001 — THE WORKER
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl">
              The first sealed worker record. The creator of the reference submits first. Facts
              only. No verdicts.
            </p>
          </header>

          <section className="mb-12 space-y-6">
            {CASE_001_RECORDS.map((row, i) => (
              <article key={i} className="border border-border/40 p-6 md:p-8">
                <div className="grid gap-8 md:grid-cols-[128px_1fr]">
                  <div className="flex justify-center md:justify-start">
                    <Rosette
                      hash={row.hash}
                      size={112}
                      state={row.hash ? "sealed" : "pending"}
                      animate={Boolean(row.hash)}
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">
                        {i + 1} — {row.date}
                      </p>
                      <RowBadge row={row} />
                    </div>

                    <p className="text-foreground/90 leading-relaxed">{row.fact}</p>

                    <dl className="mt-6 space-y-2">
                      <Field label="Document SHA-256" value={row.documentHash ?? "—"} />
                      <Field label="Decision hash" value={row.hash ?? "—"} />
                      <Field label="Receipt" value={row.receipt ?? "—"} />
                    </dl>

                    {row.hash && (
                      <>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <a
                            href={siteVerifyUrlFor(row.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-gold/50 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
                          >
                            Verify on this site
                          </a>
                          <a
                            href={verifyUrlFor(row.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-border px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/90 hover:border-gold/40 transition-colors"
                          >
                            Full receipt on Apex Infrastructure
                          </a>
                        </div>
                        <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                          {TWO_DOORS_LINE}
                        </p>
                        {row.artifactUrl && (
                          <a
                            href={row.artifactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
                          >
                            View the sealed artifact
                          </a>
                        )}
                      </>
                    )}

                    {row.rawUrl && row.documentHash && (
                      <RowVerifier rawUrl={row.rawUrl} expectedHash={row.documentHash} />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <p className="mb-16 font-mono text-sm text-muted-foreground">
            Each row = one fact + one document hash + one timestamp + one public seal. Anyone can
            recompute any row.
          </p>

          <section className="mb-16">
            <h2 className="font-serif text-2xl font-bold mb-4">Concern slots</h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              This record can hold any concern or query a worker ever raises. Each slot opens only
              when its evidence is sealed. Empty slots are not missing — they are reserved. Absence
              is also a record.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: CASE_001_RESERVED_SLOTS }, (_, i) => (
                <div
                  key={i}
                  className="border border-dashed border-border/50 p-6 flex flex-col items-center gap-4"
                >
                  <Rosette state="pending" size={72} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
                    RESERVED — evidence not yet sealed
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground">
              This record grows every time evidence lands.
            </p>
          </section>

          <footer className="border-t border-border/40 pt-8">
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">{FENCE_LINE}</p>
          </footer>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Case001;
