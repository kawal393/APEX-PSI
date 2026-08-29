import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const pills = [
  "IRAP-Aligned",
  "ISM-Mapped",
  "NDIS-Ready (76 days)",
  "Privacy Act 2026",
];

const AustraliaPositioningBand = () => {
  return (
    <section className="px-4 pt-2 pb-10 sm:pt-10 sm:pb-14">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm p-6 sm:p-8 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.06) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-3">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary tracking-widest uppercase">
                  Built in Melbourne · Deployed Globally
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black mb-2 leading-tight">
                <span className="text-chrome-gradient">The Cryptographic Evolution of</span>{" "}
                <span className="text-gold-gradient">IRAP — for AI</span>
              </h2>

              <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
                While the world debates frameworks, Australia ships them. APEX PSI extends the
                operational rigour of ISM/IRAP into runtime AI verification.
              </p>

              <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {pills.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background/50 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-foreground/90"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center shrink-0">
              <div className="text-center">
                <div className="text-4xl leading-none" aria-hidden>
                  🇦🇺 <span className="text-muted-foreground mx-1">→</span> 🌏
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Australian · Exported
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AustraliaPositioningBand;
