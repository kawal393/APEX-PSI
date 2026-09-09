import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import ConstitutionLaws from "@/components/ConstitutionLaws";
import { NO_CONTROL_LINE } from "@/data/psiConstitution";

const SECTIONS: {
  title: string;
  intro: string;
  empty: string;
  status: "PRODUCTION" | "REFERENCE" | "PROPOSED" | "PLANNED";
}[] = [
  {
    title: "Independent implementations",
    intro:
      "Verifiers, SDKs and tools written by anyone other than APEX. No permission is required to build one.",
    empty: "No independent implementation has been reported yet. Be the first.",
    status: "PROPOSED",
  },
  {
    title: "Node operators",
    intro: "Organisations running their own PSI issuance or verification node.",
    empty: "No third-party node operator has been reported yet.",
    status: "PROPOSED",
  },
  {
    title: "Adopters",
    intro: "Organisations using PSI receipts in production, listed only with written permission.",
    empty: "No adopter has authorised a public listing yet.",
    status: "PROPOSED",
  },
  {
    title: "Conformance listing",
    intro:
      "A published review of an implementation against the specification and the public test vectors.",
    empty: "The review programme is being defined. No listing has been issued.",
    status: "PLANNED",
  },
];

const Ecosystem = () => (
  <>
    <Helmet>
      <title>PSI Ecosystem — Independent Implementations & Node Operators</title>
      <meta
        name="description"
        content="Independent PSI implementations, node operators, adopters and conformance listings. Anyone can implement PSI. No permission required."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/ecosystem" />
      <meta property="og:title" content="PSI Ecosystem — Independent Implementations" />
      <meta
        property="og:description"
        content="Anyone can implement PSI. No permission required. The ecosystem register."
      />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <section className="px-4 pt-24 pb-12">
          <div className="container mx-auto max-w-6xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
              The ecosystem
            </p>
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight">
              Anyone can implement PSI. No permission required.
            </h1>
            <p className="mt-6 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
              {NO_CONTROL_LINE}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:apexinfrastructure369@gmail.com?subject=PSI%20implementation%20listing"
                className="border border-gold/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
              >
                Tell us what you built — we will list it
              </a>
              <Link
                to="/hello-psi"
                className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] hover:border-gold/40 transition-colors"
              >
                Specification and test vectors
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="container mx-auto max-w-6xl grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s) => (
              <div key={s.title} className="rounded-lg border border-border bg-card/40 p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight">{s.title}</h2>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.intro}</p>
                <p className="mt-5 rounded border border-border/60 bg-background/60 p-4 font-mono text-xs text-muted-foreground">
                  {s.empty}
                </p>
              </div>
            ))}
          </div>
        </section>

        <ConstitutionLaws compact />
      </main>
      <Footer />
    </div>
  </>
);

export default Ecosystem;
