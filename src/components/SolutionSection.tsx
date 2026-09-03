import { motion } from "framer-motion";
import { ShieldCheck, Gavel, Link2, FileText, ClipboardList, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";

const features = [
  {
    icon: ShieldCheck,
    title: "Optimistic Compliance",
    desc: "Assume compliant until challenged. Like optimistic rollups in blockchain — your AI outputs are 'innocent until proven guilty.'",
  },
  {
    icon: Gavel,
    title: "Fraud Proofs on Demand",
    desc: "Only generate expensive ZK proofs when an output is specifically challenged. Most outputs never need one.",
  },
  {
    icon: Link2,
    title: "Immutable Audit Trail",
    desc: "Every AI decision logged cryptographically with SHA-256 hash chains. Tamper-proof, regulator-readable, IP-preserving.",
  },
  {
    icon: ClipboardList,
    title: "Risk Classification Engine",
    desc: "Automated EU AI Act Annex III categorization. Instantly classify your AI systems by risk tier with regulatory precision.",
  },
  {
    icon: FileText,
    title: "Policy Generation",
    desc: "Automated Article 11 technical documentation. Generate compliant policies, risk assessments, and audit-ready reports.",
  },
  {
    icon: Cpu,
    title: "ZK-Ready Architecture",
    desc: "Designed for future Zero-Knowledge integration. As ZK technology matures, PSI seamlessly upgrades from optimistic to full ZK verification.",
  },
];

const SolutionSection = () => {
  const { t } = useTranslation();
  return (
  <section className="relative py-24 px-4" id="solution">
    <div className="container mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">{t("solution.badge")}</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          <span className="text-gold-gradient">{t("solution.headline")}</span> {t("solution.headlineSuffix")}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          An Optimistic ZKML architecture that keeps verification cheap by proving only what is challenged. It supports a provider’s own compliance work; it does not satisfy any requirement on its own.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card/60 p-6 hover:border-gold/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <f.icon className="h-6 w-6 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
  );
};

export default SolutionSection;
