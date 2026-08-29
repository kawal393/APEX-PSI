import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Rosette from "@/components/Rosette";
import { REFERENCE_CASES, CASE_001_RECORDS, FENCE_LINE, GENESIS_PROOF } from "@/data/referenceData";

const GENESIS_DECISION_HASH =
  GENESIS_PROOF.find((p) => p.label === "Sealed decision hash")?.value ?? "";

const Reference = () => {
  return (
    <>
      <Helmet>
        <title>APEX PSI — The Reference</title>
        <meta
          name="description"
          content="The world's first public reference for machine-governance records. Free, open, recomputable by anyone."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/reference" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-24">
          <header className="mb-20">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight">
              APEX PSI — THE REFERENCE
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl">
              The world's first public reference for machine-governance records. Free, open,
              recomputable by anyone.
            </p>
          </header>

          <section className="mb-16 border border-border/50 rounded-lg p-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-4">WHAT IT IS</h2>
            <p className="text-muted-foreground leading-relaxed">
              Any record of any machine's decision can be sealed: SHA-256 digest, public
              notarization, post-quantum signatures, public receipt. Anyone can recompute it. No one
              can edit it.
            </p>
          </section>

          <section className="mb-16 border border-border/50 rounded-lg p-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-4">THE COVENANT</h2>
            <p className="text-muted-foreground leading-relaxed">
              Free and open forever. Corrections are public and credited. Money buys process, never
              outcome.
            </p>
          </section>

          <section className="mb-20">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-8">THE PROOFS</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {REFERENCE_CASES.map((c) => {
                const sealedHash =
                  c.id === "case-001" ? CASE_001_RECORDS[0].hash ?? undefined : undefined;
                return (
                  <Link
                    key={c.id}
                    to={c.path}
                    className="border border-border/40 p-6 hover:border-gold/40 transition-colors group flex flex-col items-start gap-5"
                  >
                    <Rosette
                      hash={sealedHash}
                      size={80}
                      state={sealedHash ? "sealed" : "pending"}
                    />
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                      {c.status === "live" ? "live" : "reserved"}
                    </p>
                    <h3 className="font-serif text-xl font-bold text-white group-hover:text-gold transition-colors">
                      {c.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.cardText}</p>
                  </Link>
                );
              })}
              <Link
                to="/genesis"
                className="border border-border/40 p-6 hover:border-gold/40 transition-colors group flex flex-col items-start gap-5"
              >
                <Rosette hash={GENESIS_DECISION_HASH} size={80} />
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">live</p>
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-gold transition-colors">
                  Genesis Zero
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reference Implementation v1.0, sealed and recomputable.
                </p>
              </Link>
            </div>
          </section>

          <section className="mb-20 border border-border/40 p-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-4">
              THE DECLARATION
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Seal. Open. Bend or break. One public test, stated as a charter.
            </p>
            <Link
              to="/declaration"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
            >
              Read the Recomputation Declaration
            </Link>
          </section>

          <footer className="border-t border-border/40 pt-8 space-y-4">
            <p className="font-mono text-sm text-muted-foreground">
              The data is free. The math is public. The seal is Pramaan.
            </p>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">{FENCE_LINE}</p>
          </footer>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Reference;
