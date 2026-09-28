import { Upload, Lock, Award, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Submit Model Hash",
    description: "Upload your AI model's inference hash. No weights or proprietary data revealed.",
  },
  {
    icon: Lock,
    step: "02",
    title: "Distributed Verification",
    description: "Our distributed network verifies compliance without seeing your model.",
  },
  {
    icon: Award,
    step: "03",
    title: "Get Certificate",
    description: "Receive your EU AI Act compliant certificate (Articles 12–15).",
  },
  {
    icon: Eye,
    step: "04",
    title: "Stay Compliant",
    description: "Continuous monitoring and automatic alerts for ongoing compliance.",
  },
];

const HowItWorks = () => {
  const { t } = useTranslation();
  return (
    <section className="relative py-24 px-4 overflow-hidden" id="how-it-works">
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            {t("howItWorks.badge")}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-chrome-gradient">{t("howItWorks.headline1")}</span>{" "}
            <span className="text-gold-gradient">{t("howItWorks.headline2")}</span>
          </h2>
          <p className="text-muted-foreground">{t("howItWorks.subtitle")}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center group"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 bg-gold/5 group-hover:border-gold/40 group-hover:shadow-gold transition-all duration-500">
                <s.icon className="h-7 w-7 text-gold" />
              </div>
              <span className="text-xs font-bold text-gold tracking-widest">{s.step}</span>
              <h3 className="text-lg font-bold text-foreground mt-1 mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
