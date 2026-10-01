import { motion } from "framer-motion";
import { Shield, Eye, Scale, Lock, Globe } from "lucide-react";

const indicators = [
  { icon: Shield, label: "Hash-Sealed" },
  { icon: Eye, label: "Publicly Verifiable" },
  { icon: Scale, label: "EU AI Act Mapping" },
  { icon: Lock, label: "Ed25519 Signed" },
  { icon: Globe, label: "Jurisdiction-Agnostic" },
];

const TrustSection = () => {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Built For The AI Industry
          </p>
          <p className="text-muted-foreground text-sm mb-10">
            A tamper-evident record for AI decisions, checkable by anyone with no account
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8">
            {indicators.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 rounded-lg border border-border bg-card/50 text-chrome text-xs sm:text-sm font-semibold tracking-wider uppercase opacity-70 hover:opacity-100 hover:border-gold/20 hover:shadow-gold transition-all duration-500"
              >
                <Icon className="h-4 w-4 text-gold" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
