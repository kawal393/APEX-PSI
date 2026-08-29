import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { REFERENCE_CASES } from "@/data/referenceData";

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
              {REFERENCE_CASES.map((c) => (
                <Link
                  key={c.id}
                  to={c.path}
                  className="border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors group"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">
                    {c.status === "live" ? "live" : "reserved"}
                  </p>
                  <h3 className="font-serif text-xl font-bold text-white group-hover:text-primary transition-colors">
                    {c.label}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.cardText}</p>
                </Link>
              ))}
            </div>
          </section>

          <footer className="border-t border-border/50 pt-8">
            <p className="font-mono text-sm text-muted-foreground">
              The data is free. The math is public. The seal is Apex Infrastructure.
            </p>
          </footer>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Reference;
