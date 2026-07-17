import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const rows = [
  {
    approach: "Full ZKML",
    cost: "$1,000+",
    feasibility: "Research Stage",
    feasibilityIcon: "bad",
    acceptance: "High (if achievable)",
    acceptanceIcon: "mid",
    ipProtection: "Full",
    highlight: false,
  },
  {
    approach: "Apex PSI (Optimistic ZKML)",
    cost: "<$0.01",
    feasibility: "Deployable Today",
    feasibilityIcon: "good",
    acceptance: "High",
    acceptanceIcon: "good",
    ipProtection: "100%",
    highlight: true,
  },
  {
    approach: "Manual Documentation",
    cost: "$0",
    feasibility: "Easy",
    feasibilityIcon: "mid",
    acceptance: "Low — may not satisfy Art. 12–15",
    acceptanceIcon: "bad",
    ipProtection: "None (full disclosure)",
    highlight: false,
  },
  {
    approach: "Third-Party Audit",
    cost: "$50K–$500K",
    feasibility: "Periodic, Not Continuous",
    feasibilityIcon: "mid",
    acceptance: "Medium",
    acceptanceIcon: "mid",
    ipProtection: "Low (auditor sees everything)",
    highlight: false,
  },
];

const StatusIcon = ({ type }: { type: string }) => {
  if (type === "good") return <Check className="h-4 w-4 text-compliant inline" />;
  if (type === "bad") return <X className="h-4 w-4 text-destructive inline" />;
  return <Minus className="h-4 w-4 text-warning inline" />;
};

const ComparisonTable = () => (
  <section className="relative py-24 px-4" id="comparison">
    <div className="container mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">The Only Verifiable Choice</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          <span className="text-gold-gradient">99.9% Cost Reduction.</span>{" "}
          <span className="text-chrome-gradient">Deployable Today.</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
          EU AI Act compliance market projected at{" "}
          <span className="text-foreground font-semibold">€7–17 billion</span>. Every alternative fails on cost, feasibility, or IP protection. There is no second option.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-x-auto"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Approach</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Cost per Output</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Feasibility</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Regulator Acceptance</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">IP Protection</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.approach}
                className={`border-b border-border/50 transition-colors ${
                  r.highlight ? "bg-gold/5 border-gold/20 hover:bg-gold/10" : "hover:bg-card/60"
                }`}
              >
                <td className={`py-4 px-4 font-bold ${r.highlight ? "text-gold" : "text-foreground"}`}>
                  {r.approach}
                  {r.highlight && (
                    <span className="ml-2 text-[10px] font-black tracking-widest uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                      IETF DRAFT FILED
                    </span>
                  )}
                </td>
                <td className={`py-4 px-4 font-mono ${r.highlight ? "text-gold font-bold" : "text-foreground"}`}>
                  {r.cost}
                </td>
                <td className="py-4 px-4 text-muted-foreground">
                  <StatusIcon type={r.feasibilityIcon} /> <span className="ml-1">{r.feasibility}</span>
                </td>
                <td className="py-4 px-4 text-muted-foreground">
                  <StatusIcon type={r.acceptanceIcon} /> <span className="ml-1">{r.acceptance}</span>
                </td>
                <td className="py-4 px-4 text-muted-foreground">{r.ipProtection}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-xs text-muted-foreground/50 mt-4 text-center italic"
      >
        ZKML cost estimates based on published research from ezkl, Modulus Labs, and Giza. Market data: CEPS, European Commission.
      </motion.p>
    </div>
  </section>
);

export default ComparisonTable;
