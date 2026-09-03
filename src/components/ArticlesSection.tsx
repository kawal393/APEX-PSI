import { FileText, Search, Users, Target, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const articles = [
  {
    icon: BookOpen,
    article: "Article 11",
    title: "Technical Documentation",
    tech: "Automated Policy Generator",
    description: "Complete Annex IV documentation generated automatically. Risk assessments, system architecture, and training methodology — audit-ready from day one.",
    reference: "\"Technical documentation shall be drawn up before that system is placed on the market...\"",
  },
  {
    icon: FileText,
    article: "Article 12",
    title: "Record-Keeping",
    tech: "SHA-256 Hash Chain Ledger",
    description: "Every AI decision logged cryptographically. Immutable, tamper-proof audit trail that satisfies record-keeping requirements without exposing model internals.",
    reference: "\"High-risk AI systems shall technically allow for the automatic recording of events...\"",
  },
  {
    icon: Search,
    article: "Article 13",
    title: "Transparency",
    tech: "Commit-and-challenge evidence engine",
    description: "Prove model behaviour and compliance without disclosing proprietary weights. Transparency without IP surrender.",
    reference: "\"High-risk AI systems shall be designed and developed in such a way to ensure...sufficient transparency...\"",
  },
  {
    icon: Users,
    article: "Article 14",
    title: "Human Oversight",
    tech: "Protocol Pause — Protocol Intervention Layer (PIL)",
    description: "Full human override mechanism for all automated decisions. Real-time intervention capability with complete audit logging.",
    reference: "\"High-risk AI systems shall be designed and developed in such a way...that they can be effectively overseen by natural persons...\"",
  },
  {
    icon: Target,
    article: "Article 15",
    title: "Accuracy & Robustness",
    tech: "Continuous Benchmark Verification",
    description: "Ongoing accuracy and robustness validation through privacy-preserving testing protocols. Drift detection and performance monitoring.",
    reference: "\"High-risk AI systems shall be designed and developed in such a way that they achieve...an appropriate level of accuracy, robustness and cybersecurity...\"",
  },
];

const ArticlesSection = () => {
  return (
    <section className="relative py-24 px-4 bg-dark-gradient" id="articles">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Full Regulatory Coverage
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Articles <span className="text-gold-gradient">11 — 15</span> Compliance
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Complete coverage of every high-risk AI system obligation under the EU AI Act.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((a, i) => (
            <motion.div
              key={a.article}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border border-border bg-card/60 p-6 hover:border-gold/30 transition-colors ${
                i === articles.length - 1 && articles.length % 3 === 2 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 rounded-lg bg-gold/10 p-2.5">
                  <a.icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <span className="text-xs font-black text-gold tracking-widest">{a.article}</span>
                  <h3 className="text-base font-bold text-foreground">{a.title}</h3>
                </div>
              </div>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-gold/70 bg-gold/5 px-2 py-0.5 rounded mb-3">
                {a.tech}
              </span>
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">{a.description}</p>
              <p className="text-xs text-muted-foreground/50 italic font-mono leading-relaxed">{a.reference}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticlesSection;
