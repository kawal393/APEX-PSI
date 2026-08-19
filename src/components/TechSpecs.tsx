import { motion } from "framer-motion";
import { Link2, ClipboardList, FileText, ShieldCheck, BookOpen, ScanLine } from "lucide-react";

const specs = [
  { icon: Link2, title: "Tamper-Evident Ledger", desc: "SHA-256 hash chaining makes later modification detectable; it does not prevent deletion or source deception" },
  { icon: ClipboardList, title: "Risk-Screening Aid", desc: "Rule-based triage for selected regulatory frameworks; qualified review is still required" },
  { icon: FileText, title: "Control Mapping", desc: "Informational cross-references to NIST AI RMF and ISO/IEC 42001 controls, without certification claims" },
  { icon: ShieldCheck, title: "Experimental ZK Components", desc: "Groth16-compatible BN128 demonstrations; not presented as production compliance proofs" },
  { icon: ScanLine, title: "MIT Verifier v1.1.1 — TS + Python Parity", desc: "Both distributions share one schema digest and emit byte-identical rejection text with readable rule citations; verified, not asserted" },
  { icon: BookOpen, title: "Multi-Jurisdiction Research", desc: "Technical evidence patterns mapped to selected frameworks; not jurisdiction-specific legal advice" },
];

const TechSpecs = () => (
  <section className="relative py-24 px-4" id="tech">
    <div className="container mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">Technical Specifications</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Built for <span className="text-gold-gradient">Institutional Compliance</span>
        </h2>
      </motion.div>

      <div className="space-y-4">
        {specs.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-5 rounded-lg border border-border bg-card/40 px-6 py-4 hover:border-gold/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <s.icon className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TechSpecs;
