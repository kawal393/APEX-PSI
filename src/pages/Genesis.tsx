import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
            <h3 className="font-serif text-2xl font-bold">{DECLARATION_TITLE}</h3>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-gold">
              {DECLARATION_ALIAS}
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {DECLARATION_ISSUE}
            </p>

            <p className="mt-6 font-serif text-lg text-foreground/90 leading-relaxed">
              {DECLARATION_OPENING}
            </p>

            <dl className="mt-6 space-y-4">
              {DECLARATION_CLAUSES.map((c) => (
                <div key={c.n} className="border-t border-border/40 pt-4">
                  <dt className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
                    {c.n} — {c.title}
                  </dt>
                  <dd className="mt-2 font-serif text-lg text-foreground/90">{c.body}</dd>
                </div>
              ))}
            </dl>

            {DECLARATION_CLOSING.map((line) => (
              <p key={line} className="mt-6 font-serif text-lg text-foreground/90 leading-relaxed">
                {line}
              </p>
            ))}

            <p className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-gold">
              {DECLARATION_SEAL_LINE}
            </p>

            <div className="mt-6 flex flex-wrap gap-6">
              <Link
                to="/declaration"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
              >
                Read the charter
              </Link>
              <a
                href={GENESIS_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
              >
                View the sealed bytes on GitHub
              </a>
            </div>
          </section>

          <section className="mb-12">
            <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
              <a
                href={siteVerifyUrlFor(DECISION_HASH)}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gold/50 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
              >
                Verify on this site
              </a>
              <a
                href={GENESIS_VERIFY_URL}
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
