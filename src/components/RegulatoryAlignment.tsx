import { motion } from "framer-motion";
import { Shield, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const regulations = [
  {
    name: "EU AI Act",
    jurisdiction: "European Union",
    status: "tracking",
    date: "Aug 2, 2026",
    flag: "🇪🇺",
    detail: "Article 50 applies; other obligations follow the Act's phased timeline",
  },
  {
    name: "NIST AI RMF",
    jurisdiction: "United States",
    status: "tracking",
    date: "Active",
    flag: "🇺🇸",
    detail: "Risk management framework mapped",
  },
  {
    name: "Privacy Act Reform",
    jurisdiction: "Australia",
    status: "tracking",
    date: "2026",
    flag: "🇦🇺",
    detail: "AI-specific provisions in review",
  },
  {
    name: "DPDP Act",
    jurisdiction: "India",
    status: "tracking",
    date: "2026",
    flag: "🇮🇳",
    detail: "Digital personal data protection",
  },
  {
    name: "Federal AI policy",
    jurisdiction: "Canada",
    status: "tracking",
    date: "2026",
    flag: "🇨🇦",
    detail: "Policy landscape tracked; Bill C-27 did not become law",
  },
  {
    name: "AI regulation framework",
    jurisdiction: "United Kingdom",
    status: "tracking",
    date: "Active",
    flag: "🇬🇧",
    detail: "Sector-led framework and developing legislation",
  },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  enforcing: { color: "text-destructive", icon: AlertTriangle, label: "ENFORCING" },
  aligned: { color: "text-compliant", icon: CheckCircle, label: "ALIGNED" },
  tracking: { color: "text-gold", icon: Clock, label: "TRACKING" },
};

const RegulatoryAlignment = () => {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-gold" />
            <p className="text-gold font-semibold tracking-widest uppercase text-sm">
              Global Regulatory Alignment
            </p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            One Evidence Layer. Jurisdiction-Specific Assessment.
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Informational mappings only; they are not legal opinions or certifications
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regulations.map((reg, i) => {
            const cfg = statusConfig[reg.status];
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={reg.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card/80 border border-border rounded-lg p-4 hover:border-gold/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{reg.flag}</span>
                    <div>
                      <p className="text-foreground font-semibold text-sm">{reg.name}</p>
                      <p className="text-muted-foreground text-xs">{reg.jurisdiction}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${cfg.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-mono font-bold tracking-wider">
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">{reg.detail}</p>
                <p className="text-muted-foreground/60 text-[10px] font-mono mt-1">{reg.date}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RegulatoryAlignment;
