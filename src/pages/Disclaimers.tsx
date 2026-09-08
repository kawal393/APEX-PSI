import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { OPERATOR_LINE } from "@/config/founding";

const PRINCIPLES = [
  {
    title: "We do not validate content.",
    body:
      "A seal proves that specific data existed at a specific time. It does not prove that data is true, legal, safe, or unmodified elsewhere.",
  },
  {
    title: "We are not a law firm.",
    body:
      "Nothing on this site constitutes legal advice. Consult qualified counsel for your specific jurisdiction.",
  },
  {
    title: "We are not a certification body.",
    body:
      "No claim, badge, or receipt implies endorsement, approval, or conformity assessment.",
  },
  {
    title: "Verify everything independently.",
    body:
      "The reference implementation is open-source. Recompute every receipt yourself. Trust math, not servers.",
  },
  {
    title: "We are stewards, not owners.",
    body:
      "The protocol belongs to the public. MIT-licensed verification. Forkable. Auditable. Independent.",
  },
];

const Disclaimers = () => (
  <>
    <Helmet>
      <title>Important Disclaimers — Apex PSI</title>
      <meta
        name="description"
        content="What an APEX PSI seal does and does not prove: existence and integrity at a point in time, no content validation, no legal advice, no certification."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/disclaimers" />
      <meta property="og:title" content="Important Disclaimers — Apex PSI" />
      <meta
        property="og:description"
        content="A seal proves existence and integrity at a point in time. It does not validate content."
      />
      <meta property="og:url" content="https://ai-governance-standard.com/disclaimers" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
            Important Disclaimers
          </p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-6">
            Core Principles
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-10">
            We do not validate content. We validate timestamp and existence. Verify the source
            yourself — math doesn&apos;t lie, but neither does it judge.
          </p>

          <ol className="space-y-6">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="rounded-lg border border-border bg-card/40 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="text-lg font-black tracking-tight mb-2">{p.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Link to="/hello-psi" className="hover:text-gold">Recompute a receipt →</Link>
            <Link to="/registry" className="hover:text-gold">Public registry →</Link>
            <Link to="/license" className="hover:text-gold">Licence terms →</Link>
            <Link to="/corrections" className="hover:text-gold">Corrections register →</Link>
          </div>

          <p className="mt-12 border-t border-border pt-6 text-[11px] leading-relaxed text-muted-foreground/80">
            {OPERATOR_LINE}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default Disclaimers;
