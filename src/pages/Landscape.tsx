import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Check, Minus, CircleDot } from "lucide-react";

type Cell = "yes" | "no" | "partial";

const competitors = [
  { key: "apex", name: "APEX PSI", id: "draft-singh-psi" },
  { key: "zkmlops", name: "ZKMLOps", id: "arXiv:2510.26576v1" },
  { key: "scitt", name: "SCITT VeritasChain", id: "draft-ietf-scitt-vcp" },
  { key: "longfellow", name: "Google Longfellow", id: "ZKP / eIDAS" },
  { key: "daap", name: "DAAP v2", id: "draft-aylward-daap-v2-00" },
];

const matrix: { piece: string; cells: Record<string, Cell> }[] = [
  {
    piece: "Protocol Layer (IETF-Track Spec)",
    cells: { apex: "yes", zkmlops: "no", scitt: "yes", longfellow: "no", daap: "yes" },
  },
  {
    piece: "Cryptographic Engine (ZK + MPC + Notary)",
    cells: { apex: "yes", zkmlops: "partial", scitt: "no", longfellow: "partial", daap: "no" },
  },
  {
    piece: "Sector Foothold (Vertical Deployment Path)",
    cells: { apex: "yes", zkmlops: "no", scitt: "partial", longfellow: "partial", daap: "no" },
  },
  {
    piece: "Public Verification Layer (Citizen Auditor)",
    cells: { apex: "yes", zkmlops: "no", scitt: "no", longfellow: "no", daap: "no" },
  },
  {
    piece: "Royalty-Free Patent Pledge",
    cells: { apex: "yes", zkmlops: "no", scitt: "no", longfellow: "yes", daap: "no" },
  },
  {
    piece: "Multi-Jurisdiction Mapping",
    cells: { apex: "yes", zkmlops: "no", scitt: "partial", longfellow: "partial", daap: "no" },
  },
];

const cards = [
  {
    name: "ZKMLOps",
    id: "arXiv:2510.26576v1",
    has: "Research framework for ZK proofs across the MLOps lifecycle. Proves models are compliant without revealing them.",
    lacks: "No IETF draft. No live service. No MPC mesh. No jurisdiction mapping. No notary. It is a paper.",
    diff: "APEX PSI is the production version of their thesis — protocol, infrastructure, and sector deployment shipped.",
    verdict: "Academic predecessor. Cite, don't compete.",
  },
  {
    name: "SCITT VeritasChain (VCP)",
    id: "draft-ietf-scitt-vcp",
    has: "SCITT profile for tamper-evident audit trails of AI trading decisions. Uses COSE receipts. References EU AI Act and GDPR.",
    lacks: "Financial-trading scope only. No ZK proofs. No consumer verification layer. No multi-vertical mapping.",
    diff: "PSI is the general compliance proof layer; VCP is one vertical's audit trail. PSI can carry VCP receipts.",
    verdict: "Interoperable. Potential downstream consumer.",
  },
  {
    name: "Google Longfellow",
    id: "ZKP libraries / eIDAS",
    has: "Open-source ZKP libraries, EU eIDAS compliant, for proving age without revealing date of birth.",
    lacks: "Age assurance only. No MPC mesh. No IETF standard. No liability mapping. No audit receipts. No notary.",
    diff: "Longfellow is the bricks. APEX PSI is the courthouse built from them.",
    verdict: "Upstream library. Reusable. Not a competitor.",
  },
  {
    name: "DAAP v2",
    id: "draft-aylward-daap-v2-00",
    has: "Distributed AI Accountability Protocol. Cryptographic identity, remote shutdown, behavioural monitoring.",
    lacks: "No ZK proofs. No notary receipts. No vertical deployment. No public verification.",
    diff: "DAAP wants to shut AI off after the fact. PSI proves AI is safe while running.",
    verdict: "Adjacent control plane. PSI is the proof plane. Interoperable.",
  },
];

const renderCell = (c: Cell) => {
  if (c === "yes")
    return <Check className="h-4 w-4 text-gold mx-auto" aria-label="Yes" />;
  if (c === "partial")
    return <CircleDot className="h-4 w-4 text-warning mx-auto" aria-label="Partial" />;
  return <Minus className="h-4 w-4 text-muted-foreground/50 mx-auto" aria-label="No" />;
};

const Landscape = () => (
  <>
    <Helmet>
      <title>Competitive Landscape — PSI vs SCITT, DAAP, ZKMLOps, Longfellow | APEX PSI</title>
      <meta
        name="description"
        content="The toll booth where law, cryptography, and compliance meet. APEX PSI versus ZKMLOps, SCITT VeritasChain (draft-ietf-scitt-vcp), Google Longfellow, and DAAP (draft-aylward-daap-v2-00)."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/landscape" />
    </Helmet>

    <Navbar />

    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-4">
      <article className="container mx-auto max-w-5xl">
        <header className="text-center mb-14">
          <p className="text-gold font-semibold tracking-widest uppercase text-xs mb-4">
            Competitive Landscape · April 2026
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5">
            <span className="text-chrome-gradient">The Toll Booth Where</span>
            <br />
            <span className="text-gold-gradient">Law, Crypto & Compliance Meet</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Four pieces nobody else has glued together: the IETF-track Protocol, the cryptographic Engine,
            the Sector foothold, and the public Verification layer. Below is how every adjacent effort
            stacks up — cited by draft ID, not vibes.
          </p>
        </header>

        {/* Comparison table */}
        <section className="mb-16 rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="text-left px-4 py-4 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    Capability
                  </th>
                  {competitors.map((c) => (
                    <th key={c.key} className="px-3 py-4 text-center min-w-[110px]">
                      <p className={`text-xs font-bold ${c.key === "apex" ? "text-gold" : "text-foreground"}`}>
                        {c.name}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{c.id}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={row.piece} className={i % 2 === 0 ? "bg-background/40" : ""}>
                    <td className="px-4 py-3 font-semibold text-foreground/90">{row.piece}</td>
                    {competitors.map((c) => (
                      <td key={c.key} className="px-3 py-3 text-center">
                        {renderCell(row.cells[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-card/30 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-gold" /> Shipped</span>
            <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-warning" /> Partial / Adjacent</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="h-3 w-3 text-muted-foreground/60" /> Not in scope</span>
          </div>
        </section>

        {/* Per-competitor cards */}
        <section className="grid md:grid-cols-2 gap-5 mb-16">
          {cards.map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card/60 p-6 hover:border-gold/30 transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-black text-foreground leading-tight">{c.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-1 uppercase">{c.id}</p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gold/80 font-bold mb-1">Has</p>
                  <p className="text-foreground/85 leading-relaxed">{c.has}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-destructive/80 font-bold mb-1">Lacks</p>
                  <p className="text-foreground/80 leading-relaxed">{c.lacks}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold mb-1">Differentiator</p>
                  <p className="text-foreground/85 leading-relaxed">{c.diff}</p>
                </div>
                <div className="pt-3 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Verdict</p>
                  <p className="text-foreground font-semibold leading-relaxed">{c.verdict}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Closing band */}
        <section className="rounded-2xl border border-gold/30 bg-card/60 p-8 md:p-12 text-center">
          <p className="text-gold font-semibold tracking-widest uppercase text-xs mb-4">Net Position</p>
          <h2 className="text-2xl md:text-4xl font-black mb-5 leading-tight">
            <span className="text-chrome-gradient">We didn't invent ZKPs.</span>{" "}
            <span className="text-gold-gradient">We built the toll booth.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            No public record shows another entity with all four pieces live: IETF-track draft,
            multi-jurisdiction MPC notary, sector-deployable engine, and consumer verification.
            APEX PSI is the only deployed answer to the August 2026 EU AI Act enforcement curve.
          </p>
        </section>
      </article>
    </main>
  </>
);

export default Landscape;
