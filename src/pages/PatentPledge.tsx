import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { ShieldCheck, FileText, Scale, GitBranch } from "lucide-react";

const PatentPledge = () => (
  <>
    <Helmet>
      <title>Patent Non-Assertion Pledge — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="APEX PSI Patent Non-Assertion Pledge — royalty-free commitment for conformant implementations of the PSI Protocol (draft-singh-psi)."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/pledge" />
    </Helmet>

    <Navbar />

    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-4">
      <article className="container mx-auto max-w-3xl">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 mb-5">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] font-semibold text-gold tracking-widest uppercase">
              Legal Instrument · Version 1.0
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
            <span className="text-chrome-gradient">APEX PSI</span>
            <br />
            <span className="text-gold-gradient">Patent Non-Assertion Pledge</span>
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            Effective 23 April 2026 · Australian Innovation Patent AMCZ-2615560564
          </p>
        </header>

        {/* Plain-English summary */}
        <section className="rounded-2xl border border-gold/20 bg-card/60 p-6 md:p-8 mb-12">
          <h2 className="text-xs font-bold tracking-widest text-gold uppercase mb-4">
            Plain-English Summary
          </h2>
          <ul className="space-y-3 text-sm md:text-base text-foreground/85">
            <li className="flex gap-3">
              <span className="text-gold font-black">·</span>
              <span>
                Anyone may build a conformant implementation of the PSI Protocol without paying APEX a patent royalty.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold font-black">·</span>
              <span>
                The patent guards the operational managed service (notary infrastructure, MPC mesh, anchoring rails) — never the open standard.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold font-black">·</span>
              <span>
                This pledge is irrevocable for conformant implementations and binds APEX, its successors, and its assigns.
              </span>
            </li>
          </ul>
        </section>

        {/* Formal sections */}
        <section className="space-y-10 mb-12">
          <div>
            <h2 className="text-lg md:text-xl font-black mb-3 text-chrome-gradient">
              1. Scope
            </h2>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
              This Pledge applies to all claims of Australian Innovation Patent
              AMCZ-2615560564 and any continuations, divisionals, foreign
              counterparts, or reissues thereof (the <span className="font-semibold text-foreground">"PSI Patent"</span>),
              insofar as those claims are necessarily infringed by a Conformant
              Implementation of the PSI Protocol as published in IETF
              Internet-Draft <span className="font-mono text-primary">draft-singh-psi</span> and successor revisions.
            </p>
          </div>

          <div>
            <h2 className="text-lg md:text-xl font-black mb-3 text-chrome-gradient">
              2. Conformant Implementation
            </h2>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
              A <span className="font-semibold text-foreground">"Conformant Implementation"</span> is any software,
              hardware, or service that implements the normative requirements of
              the PSI Protocol — including RFC 8785 (JCS) canonicalization,
              Ed25519 signature semantics, monotonic sequencing, and the
              predicate evaluation model — without modification of those
              normative requirements in a way that breaks interoperability with
              other Conformant Implementations.
            </p>
          </div>

          <div>
            <h2 className="text-lg md:text-xl font-black mb-3 text-chrome-gradient">
              3. Non-Assertion Commitment
            </h2>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
              APEX Intelligence Empire (ABN 71 672 237 795) irrevocably commits
              not to assert any claim of the PSI Patent against any party for
              the making, using, selling, offering for sale, importing, or
              distributing of a Conformant Implementation. This commitment
              includes derivative works, forks, reference SDKs, and independent
              re-implementations distributed under any license including but
              not limited to MIT, Apache-2.0, BSD, GPL, and proprietary terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg md:text-xl font-black mb-3 text-chrome-gradient">
              4. Reservations
            </h2>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed mb-3">
              The Pledge does <span className="font-semibold text-foreground">not</span> extend to:
            </p>
            <ul className="space-y-2 text-sm md:text-base text-foreground/80 pl-5 list-disc">
              <li>
                Use of the registered marks <span className="font-semibold text-foreground">APEX</span>, <span className="font-semibold text-foreground">APEX PSI</span>, <span className="font-semibold text-foreground">Proof of Stateful Integrity</span>, or APEX-issued certification seals.
              </li>
              <li>
                Operation of the APEX-managed Notary, MPC consensus mesh, Bitcoin/Polygon anchoring service, or APEX Lattice infrastructure.
              </li>
              <li>
                Implementations that materially deviate from the normative protocol such that they break interoperability with other Conformant Implementations.
              </li>
              <li>
                Defensive termination: APEX reserves the right to terminate this Pledge with respect to any party that initiates patent litigation against APEX or any other Conformant Implementer concerning the PSI Protocol.
              </li>
            </ul>
          </div>
        </section>

        {/* What this means table */}
        <section className="rounded-2xl border border-border bg-card/40 p-6 md:p-8 mb-12">
          <h2 className="text-xs font-bold tracking-widest text-gold uppercase mb-6">
            What This Means For You
          </h2>
          <div className="space-y-5">
            {[
              {
                icon: FileText,
                who: "IETF Working Groups",
                what: "The PSI Protocol may be standardized without IPR encumbrance. Disclosure filed per RFC 8179.",
              },
              {
                icon: GitBranch,
                who: "Open Source Implementers",
                what: "Fork, modify, distribute. No royalty. No license fee. No notice required.",
              },
              {
                icon: Scale,
                who: "Commercial Users of the Hosted Service",
                what: "Standard commercial terms apply for the APEX-managed Notary and MPC mesh. The protocol itself remains free.",
              },
              {
                icon: ShieldCheck,
                who: "Forks & Independent Networks",
                what: "Run your own MPC mesh, your own notary, your own ledger. The protocol travels with you.",
              },
            ].map((row) => (
              <div key={row.who} className="flex gap-4">
                <div className="rounded-md border border-gold/20 bg-gold/5 p-2 h-9 w-9 shrink-0 flex items-center justify-center">
                  <row.icon className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-0.5">{row.who}</p>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{row.what}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            Legal correspondence: <a href="mailto:apexinfrastructure369@gmail.com" className="text-gold hover:underline">apexinfrastructure369@gmail.com</a>
          </p>
          <p className="text-[11px] text-muted-foreground">
            APEX Intelligence Empire · Victoria, Australia · ABN 71 672 237 795
          </p>
        </footer>
      </article>
    </main>
  </>
);

export default PatentPledge;
