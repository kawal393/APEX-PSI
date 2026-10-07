import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TITLE = "Commercial Framework — Apex PSI";
const DESC =
  "How APEX works with partners: the open protocol, the Founding Partner referral track, and regional operating licences. Published terms for reference.";

const Section = ({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) => (
  <section className="border border-border bg-card/40 p-6 md:p-8">
    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-2">{tag}</p>
    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground mb-4">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-1 md:gap-4 border-t border-border/60 pt-3">
    <span className="font-mono text-[11px] uppercase tracking-wider text-gold">{k}</span>
    <span>{v}</span>
  </div>
);

const Licensing = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESC} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESC} />
    </Helmet>
    <Navbar />
    <main className="max-w-7xl mx-auto px-4 pt-28 pb-20 space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">Published framework · v1.0 · 7 October 2026</p>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mt-3">Commercial Framework</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          One rule sits above everything here: the protocol stays open, the commercial service is licensed. This page is the
          public reference for how APEX works with partners. Signed agreements govern; this page describes their shape.
        </p>
      </header>

      <Section tag="Layer 0 · always free" title="The open standard">
        <p>The PSI specification, the canonicalization rules (RFC 8785) and the offline verifiers are MIT-licensed and free forever. Anyone, anywhere, may verify receipts, build on PSI or self-host without asking APEX. No partner agreement can ever close this.</p>
        <p>The core protocol, code, keys, brand and registry remain owned by APEX. Partners receive commercial rights, never ownership of the protocol.</p>
      </Section>

      <Section tag="Track 1 · individuals and operators" title="Founding Partner">
        <Row k="Seats" v="Ten, numbered #001–#010, invitation only. Free to hold." />
        <Row k="Year one" v="50% of net revenue APEX actually receives from customers the member directly refers, for each customer's first 12 months." />
        <Row k="Annual review" v="At 12 months, a member who meets the published benchmark moves to a 5-year term at 50%. A member below it keeps the seat and registry listing permanently; the fee on newly referred customers becomes 20%." />
        <Row k="Settlement" v="Recorded automatically when a referred invoice is paid; settled monthly." />
        <Row k="Never" v="No joining fee, no payment for recruiting members, no equity, no tokens, no transferable payout rights. Members are independent and cannot bind APEX." />
        <p className="pt-2"><Link to="/founding" className="text-gold hover:underline">See the Founding registry →</Link></p>
      </Section>

      <Section tag="Track 2 · funds, integrators, consortia" title="Regional operating licence">
        <Row k="What it is" v="A licence for a separately funded local company to sell and operate APEX hosted services in a defined region." />
        <Row k="Economics" v="Upfront licence fee plus an ongoing royalty on regional billings. Quoted on request." />
        <Row k="Exclusivity" v="Only for a fixed term and only while agreed performance milestones are met. Missed milestones make the licence non-exclusive." />
        <Row k="Retained by APEX" v="All IP, the protocol, global accounts, conformance and future products. The open standard stays open in every region." />
        <Row k="Process" v="Term sheet, then a diligence deposit, then a full agreement. A local entity is formed only once the licence is funded." />
        <p className="pt-2"><Link to="/#explore" className="text-gold hover:underline">Contact APEX →</Link></p>
      </Section>

      <Section tag="Track 3 · single institutions" title="Dedicated deployment">
        <p>A private APEX notary instance for one organisation, with its own keys and integrations. No exclusivity and no protocol rights. Quoted on request.</p>
      </Section>

      <p className="text-xs text-muted-foreground">Nothing on this page is an offer of securities, an investment or a promise of income. Fees are paid only on revenue APEX actually receives.</p>
    </main>
    <Footer />
  </div>
);

export default Licensing;
