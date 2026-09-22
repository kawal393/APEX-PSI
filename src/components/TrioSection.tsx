import { Code, Eye, Layers, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const pillars = [
  {
    icon: Code,
    title: "POLICY COMPILER",
    subtitle: "LDSL",
    headline: "Legal Domain-Specific Language",
    description:
      "Translates regulatory requirements into mathematically verifiable compliance rules. Legal text becomes executable code.",
    features: ["Mathematical Compliance Rules", "Regulatory Text → Executable Code", "Automated Policy Validation", "Article-Level Precision"],
  },
  {
    icon: Eye,
    title: "CONTEXT ORACLE",
    subtitle: "ZK-Oracle",
    headline: "Tamper-Evident Data Feeds",
    description:
      "Provides verified, tamper-evident contextual data to the compliance engine. Every input is cryptographically attested.",
    features: ["Cryptographic Attestation", "Tamper-Evident Data Feeds", "Real-Time Context Verification", "Zero-Knowledge Compatible"],
  },
  {
    icon: Layers,
    title: "COMMIT LAYER",
    subtitle: "State Engine",
    headline: "Verified State Mutations",
    description:
      "Every state change requires verified proof. The tamper-evident commit layer ensures no compliance state can be forged or altered.",
    features: ["Tamper-Evident State Transitions", "Proof-Required Mutations", "Hash-Chained Commits", "Audit-Ready History"],
  },
];

const TrioSection = () => {
  return (
    <section className="relative py-24 px-4 bg-dark-gradient overflow-hidden" id="pillars">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 85% 52% / 0.04) 0%, transparent 70%)" }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Architecture
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-chrome-gradient">Three Pillars.</span>{" "}
            <span className="text-gold-gradient">One Standard.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Policy Compiler. Context Oracle. Commit Layer.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative rounded-xl border border-border bg-card p-8 hover:border-gold/30 hover:shadow-gold transition-all duration-500"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-3 group-hover:bg-gold/15 transition-colors">
                  <pillar.icon className="h-6 w-6 text-gold glow-gold" />
                </div>
                <div>
                  <span className="text-xs font-semibold tracking-widest text-gold uppercase">
                    {pillar.subtitle}
                  </span>
                  <h3 className="text-xl font-bold text-chrome-gradient">{pillar.title}</h3>
                </div>
              </div>

              <p className="text-lg font-semibold text-foreground mb-2">{pillar.headline}</p>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {pillar.description}
              </p>

              <ul className="space-y-2">
                {pillar.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <ArrowRight className="h-3 w-3 text-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrioSection;
