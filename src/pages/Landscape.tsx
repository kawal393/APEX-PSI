import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Check, Minus, CircleDot } from "lucide-react";

type Cell = "yes" | "no" | "partial";

const efforts = [
  { key: "apex", name: "APEX PSI", id: "draft-singh-psi" },
  { key: "zkmlops", name: "ZKMLOps", id: "arXiv:2510.26576v1" },
  { key: "scitt", name: "SCITT VCP", id: "draft-ietf-scitt-vcp" },
  { key: "longfellow", name: "Longfellow ZK", id: "ZKP / eIDAS" },
  { key: "daap", name: "DAAP v2", id: "draft-aylward-daap-v2-00" },
];

const matrix: { piece: string; cells: Record<string, Cell> }[] = [
  {
    piece: "Published protocol document (standards track)",
    cells: { apex: "yes", zkmlops: "no", scitt: "yes", longfellow: "no", daap: "yes" },
  },
  {
    piece: "Reference implementation available today",
    cells: { apex: "yes", zkmlops: "partial", scitt: "no", longfellow: "partial", daap: "no" },
  },
  {
    piece: "Sector deployment profile",
    cells: { apex: "yes", zkmlops: "no", scitt: "partial", longfellow: "partial", daap: "no" },
  },
  {
    piece: "Public, permissionless verification endpoint",
    cells: { apex: "yes", zkmlops: "no", scitt: "no", longfellow: "no", daap: "no" },
  },
  {
    piece: "Royalty-free patent pledge",
    cells: { apex: "yes", zkmlops: "no", scitt: "no", longfellow: "yes", daap: "no" },
  },
  {
    piece: "Multi-jurisdiction obligation mapping",
    cells: { apex: "yes", zkmlops: "no", scitt: "partial", longfellow: "partial", daap: "no" },
  },
];

const cards = [
  {
    name: "ZKMLOps",
    id: "arXiv:2510.26576v1",
    scope: "Research framework for zero-knowledge proofs across the MLOps lifecycle: proving properties of a model without disclosing it.",
    relation:
      "Cited upstream research. PSI implements a production profile of the same commit-prove-verify idea and can carry proofs produced under this framework.",
  },
  {
    name: "SCITT VCP",
    id: "draft-ietf-scitt-vcp",
    scope: "A SCITT profile for tamper-evident audit trails of AI trading decisions, using COSE receipts and referencing EU AI Act and GDPR obligations.",
    relation:
      "Interoperable. PSI receipts and SCITT/COSE receipts can reference one another; PSI can transport VCP receipts as evidence.",
  },
  {
    name: "Longfellow ZK",
    id: "ZKP libraries / eIDAS",
    scope: "Open-source zero-knowledge libraries used for attribute proofs such as age assurance, aligned to eIDAS.",
    relation:
      "Upstream library layer. Reusable inside a PSI deployment; PSI adds receipts, notarisation and public verification on top.",
  },
  {
    name: "DAAP v2",
    id: "draft-aylward-daap-v2-00",
    scope: "Accountability protocol covering cryptographic identity for AI systems, behavioural monitoring and remote control signals.",
    relation:
      "Adjacent control plane. PSI is the evidence plane; a deployment can run both, with PSI sealing what the control plane did.",
  },
];

const renderCell = (c: Cell) => {
  if (c === "yes") return <Check className="h-4 w-4 text-gold mx-auto" aria-label="In scope" />;
  if (c === "partial") return <CircleDot className="h-4 w-4 text-warning mx-auto" aria-label="Partial" />;
  return <Minus className="h-4 w-4 text-muted-foreground/50 mx-auto" aria-label="Not in scope" />;
};

const Landscape = () => (
  <>
    <Helmet>
      <title>Standards Landscape — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="How Apex PSI relates to adjacent standards work: ZKMLOps (arXiv:2510.26576v1), SCITT VCP (draft-ietf-scitt-vcp), Longfellow ZK, and DAAP (draft-aylward-daap-v2-00). Scope and interoperability, cited by document ID."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/landscape" />
    </Helmet>

    <Navbar />

    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-4">
      <article className="container mx-auto max-w-5xl">
        <header className="text-center mb-14">
          <p className="text-gold font-semibold tracking-widest uppercase text-xs mb-4">
            Standards Landscape
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5">
            <span className="text-chrome-gradient">Where Law, Cryptography</span>
            <br />
            <span className="text-gold-gradient">And Verification Meet</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Apex PSI is one layer in a wider body of standards work. This page records the published
            scope of adjacent efforts and how each relates to PSI, cited by document identifier.
            Scope statements are drawn from each project's own published material.
          </p>
        </header>

        {/* Scope table */}
        <section className="mb-16 rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="text-left px-4 py-4 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    Capability
                  </th>
                  {efforts.map((c) => (
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
                    {efforts.map((c) => (
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
            <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-gold" /> In published scope</span>
            <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-warning" /> Partial or adjacent</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="h-3 w-3 text-muted-foreground/60" /> Not in published scope</span>
          </div>
        </section>

        {/* Per-effort cards */}
        <section className="grid md:grid-cols-2 gap-5 mb-16">
          {cards.map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card/60 p-6 hover:border-gold/30 transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-black text-foreground leading-tight">{c.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-1 uppercase">{c.id}</p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gold/80 font-bold mb-1">Published scope</p>
                  <p className="text-foreground/85 leading-relaxed">{c.scope}</p>
                </div>
                <div className="pt-3 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Relationship to PSI</p>
                  <p className="text-foreground/85 leading-relaxed">{c.relation}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Closing band */}
        <section className="rounded-2xl border border-gold/30 bg-card/60 p-8 md:p-12 text-center">
          <p className="text-gold font-semibold tracking-widest uppercase text-xs mb-4">Position</p>
          <h2 className="text-2xl md:text-4xl font-black mb-5 leading-tight">
            <span className="text-chrome-gradient">Apex PSI does not replace this work.</span>{" "}
            <span className="text-gold-gradient">It carries it.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            PSI specifies one thing: a receipt for a machine decision that anyone can recompute.
            Where another specification already covers a layer, PSI references it rather than
            duplicating it. Corrections to anything on this page are welcome and are published with credit.
          </p>
        </section>
      </article>
    </main>
  </>
);

export default Landscape;
