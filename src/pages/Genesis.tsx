import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Rosette from "@/components/Rosette";
import {
  GENESIS_PROOF,
  GENESIS_SOURCE_URL,
  GENESIS_VERIFY_URL,
  FENCE_LINE,
  TWO_DOORS_LINE,
  siteVerifyUrlFor,
} from "@/data/referenceData";
import {
  DECLARATION_TITLE,
  DECLARATION_ALIAS,
  DECLARATION_ISSUE,
  DECLARATION_OPENING,
  DECLARATION_CLAUSES,
  DECLARATION_CLOSING,
  DECLARATION_SEAL_LINE,
} from "@/data/declarationText";

const DECISION_HASH =
  GENESIS_PROOF.find((p) => p.label === "Sealed decision hash")?.value ?? "";

const Genesis = () => {


  return (
    <>
      <Helmet>
        <title>GENESIS ZERO — APEX PSI Reference Implementation v1.0</title>
        <meta
          name="description"
          content="GENESIS ZERO — APEX PSI Reference Implementation v1.0. Sealed 29 August 2026. Recomputable by anyone, editable by no one."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/genesis" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-24">
          <header className="mb-16">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight">
              GENESIS ZERO
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl">
              APEX PSI — Reference Implementation v1.0. Sealed 29 August 2026. Recomputable by
              anyone, editable by no one.
            </p>
          </header>

          <section className="mb-12 border border-border/50 rounded-lg p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-primary mb-6">
              The Proof Block
            </h2>
            <div className="grid gap-10 md:grid-cols-[176px_1fr]">
              <div className="flex justify-center md:justify-start">
                <Rosette hash={DECISION_HASH} size={144} animate />
              </div>
              <dl className="space-y-4 font-mono text-sm">
                {GENESIS_PROOF.map((row) => (
                  <div key={row.label} className="grid gap-1 md:grid-cols-[220px_1fr]">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="text-foreground break-all">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="mb-12 border border-border/50 rounded-lg p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-primary mb-6">
              The Declaration
            </h2>
            {declaration === null && !loadError && (
              <p className="font-mono text-sm text-muted-foreground">Loading sealed declaration…</p>
            )}
            {loadError && (
              <p className="font-mono text-sm text-muted-foreground">
                Declaration unavailable from source. View it directly on GitHub below.
              </p>
            )}
            {declaration !== null && (
              <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/90 leading-relaxed">
                {declaration}
              </pre>
            )}
            <a
              href={GENESIS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block font-mono text-sm text-primary hover:underline"
            >
              View the sealed bytes on GitHub
            </a>
          </section>

          <section className="mb-12">
            <a href={GENESIS_VERIFY_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="hero" size="lg">Verify this receipt yourself</Button>
            </a>
          </section>

          <div className="border-t border-border/50 pt-8 space-y-4">
            <p className="font-mono text-sm text-muted-foreground">
              If the math breaks, the correction is public and the challenger is credited. Challenge
              it.
            </p>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">{FENCE_LINE}</p>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Genesis;
