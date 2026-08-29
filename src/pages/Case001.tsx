import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  CASE_001_RECORDS,
  CASE_001_RESERVED_SLOTS,
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
        className="inline-block rounded border border-primary bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-primary/20 transition-colors"
      >
        SEALED
      </a>
    );
  }
  return (
    <span className="inline-block rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      SEAL PENDING
    </span>
  );
};

const Case001 = () => {
  return (
    <>
      <Helmet>
        <title>CASE 001 — The Worker | APEX PSI Reference</title>
        <meta
          name="description"
          content="The first sealed worker record. Facts only. No verdicts."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/case-001" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-24">
          <header className="mb-16">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight">
              CASE 001 — THE WORKER
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl">
              The first sealed worker record. The creator of the reference submits first. Facts
              only. No verdicts.
            </p>
          </header>

          <section className="mb-12 space-y-4">
            {CASE_001_RECORDS.map((row, i) => (
              <article key={i} className="border border-border/50 rounded-lg p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="font-mono text-xs uppercase tracking-[0.15em] text-primary">
                    {i + 1} — {row.date}
                  </p>
                  <RowBadge row={row} />
                </div>
                <p className="text-foreground/90 leading-relaxed">{row.fact}</p>
                <p className="mt-4 font-mono text-xs text-muted-foreground break-all">
                  Hash: {row.hash ?? "—"}
                </p>
              </article>
            ))}
          </section>

          <p className="mb-16 font-mono text-sm text-muted-foreground">
            Each row = one fact + one document hash + one timestamp + one public seal. Anyone can
            recompute any row.
          </p>

          <section className="mb-16">
            <h2 className="font-serif text-2xl font-bold text-white mb-4">Allegation slots</h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              This record can hold any claim a worker ever makes. Each claim slot opens only when
              its evidence is sealed. Empty slots are not missing — they are reserved. Absence is
              also a record.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: CASE_001_RESERVED_SLOTS }, (_, i) => (
                <div
                  key={i}
                  className="border border-dashed border-border/60 rounded-lg p-6 text-center"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    RESERVED — evidence not yet sealed
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground">
              This record grows every time evidence lands.
            </p>
          </section>

          <section className="mb-16 border border-border/50 rounded-lg p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This record certifies existence, timestamp and integrity — not the truth of any claim.
              No verdict is rendered.
            </p>
          </section>

          <footer className="border-t border-border/50 pt-8">
            <p className="font-mono text-sm text-muted-foreground">
              The ledger does not judge. It remembers.
            </p>
          </footer>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Case001;
