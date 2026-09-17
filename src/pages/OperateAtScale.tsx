import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import {
  ECONOMIC_LINE,
  POSITIONING_LINE,
  NO_CONTROL_LINE,
  COMMERCE_STATE_LINE,
  PSI_COMMONS,
  PSI_OPERATIONS,
} from "@/data/psiConstitution";

const OperateAtScale = () => (
  <>
    <Helmet>
      <title>Operating PSI at Scale — APEX Infrastructure</title>
      <meta
        name="description"
        content="The PSI protocol is free forever. APEX operates the industrial-grade implementation: managed issuance, redundancy, priority anchoring and evidence retention. No prices published; arranged by agreement."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/operate" />
      <meta property="og:title" content="Operating PSI at Scale — APEX Infrastructure" />
      <meta
        property="og:description"
        content="Free to verify. Free to create. Paid to operate at scale."
      />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <section className="px-4 pt-24 pb-12">
          <div className="container mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
              The operational layer
            </p>
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight">
              The protocol is free. Running it at institutional scale is the work.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold text-foreground">{ECONOMIC_LINE}</p>
            <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
              {POSITIONING_LINE}
            </p>
          </div>
        </section>

        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-5xl grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
                  Self-hosted — free forever
                </p>
                <StatusBadge status="PRODUCTION" />
              </div>
              <ul className="mt-5 space-y-2">
                {PSI_COMMONS.map((r) => (
                  <li key={r.what} className="text-sm text-muted-foreground">
                    {r.what}
                  </li>
                ))}
              </ul>
              <Link
                to="/hello-psi"
                className="mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400 underline underline-offset-4"
              >
                Start with zero dependencies →
              </Link>
            </div>

            <div className="rounded-lg border border-gold/40 bg-gold/[0.05] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                  Operated by APEX — by agreement
                </p>
                <StatusBadge status="REFERENCE" />
              </div>
              <ul className="mt-5 space-y-2">
                {PSI_OPERATIONS.map((r) => (
                  <li key={r.what} className="text-sm text-muted-foreground">
                    {r.what}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:apexinfrastructure369@gmail.com?subject=Operating%20PSI%20at%20scale"
                className="mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4"
              >
                Contact sales →
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto max-w-5xl space-y-5">
            <p className="rounded-lg border border-border bg-card/40 p-6 font-mono text-xs leading-relaxed text-muted-foreground">
              {COMMERCE_STATE_LINE}
            </p>
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              {NO_CONTROL_LINE}
            </p>
            <p className="text-sm font-semibold text-foreground">
              You can leave at any time. Your proofs remain valid whether or not any agreement with
              APEX exists — that is Law III, and it is not a courtesy.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/protocol#constitution"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4"
              >
                The Constitution
              </Link>
              <Link
                to="/license"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4"
              >
                Licence terms
              </Link>
              <Link
                to="/disclaimers"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4"
              >
                Disclaimers
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default OperateAtScale;
