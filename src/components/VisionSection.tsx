import { motion } from "framer-motion";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const useProtocolMetrics = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count: ledgerCount } = await supabase
          .from("gallows_ledger")
          .select("*", { count: "exact", head: true });
        setCount(ledgerCount ?? 0);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
  }, []);

  return count;
};

const AnimatedCounter = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

const VisionSection = () => {
  const artifactCount = useProtocolMetrics();

  const stats = [
    { label: "Predicates", value: "55+" },
    { label: "Jurisdictions", value: "12" },
    { label: "MPC Nodes", value: "3" },
    { label: "Artifacts Sealed", value: artifactCount !== null ? artifactCount : "—" },
  ];

  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden" id="vision">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(43 85% 52% / 0.05) 0%, transparent 55%)",
        }}
      />

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* ── Strike-through headline ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <span className="relative inline-block">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.35em] text-chrome/60">
              The Vision
            </span>
            <span
              className="absolute left-[-12%] right-[-12%] top-1/2 h-[2px] -translate-y-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(43 85% 52% / 0.8), transparent)",
              }}
            />
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-center text-5xl md:text-7xl lg:text-8xl font-black text-gold-gradient leading-[1.05] mb-8"
        >
          Built in the Open.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-base sm:text-lg md:text-xl italic text-muted-foreground max-w-3xl mx-auto mb-14 md:mb-20 leading-relaxed"
        >
          While the world was debating whether AI could be trusted,&nbsp;
          <span className="text-foreground font-medium not-italic">
            we're building the protocol to prove it.
          </span>
        </motion.p>

        {/* ── Two-column diptych ── */}
        <div className="grid md:grid-cols-2 gap-5 md:gap-6 mb-14 md:mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-xl border border-destructive/30 bg-card/50 p-6 md:p-8 hover:border-destructive/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center mb-5">
              <ShieldOff className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive mb-3">
              The World Was Stuck
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Governments demanded transparency. AI companies refused to open up.
              Regulators wrote laws no one could follow.{" "}
              <span className="text-foreground font-semibold">
                The industry froze.
              </span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-xl border border-gold/30 bg-card/50 p-6 md:p-8 hover:border-gold/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-lg bg-gold/10 flex items-center justify-center mb-5">
              <ShieldCheck className="h-5 w-5 text-gold" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold mb-3">
              We Already Fixed It
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              We open-sourced the math. Built cryptographic verification. Made
              compliance provable without disclosure.{" "}
              <span className="text-gold font-semibold">
                No committee. No permission. Just code.
              </span>
            </p>
          </motion.div>
        </div>

        {/* ── Stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8"
        >
          {stats.map((s, i) => (
            <span key={s.label} className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-foreground">
                {typeof s.value === "number" ? <AnimatedCounter value={s.value} /> : s.value}
              </span>
              <span className="text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
              {i < stats.length - 1 && (
                <span className="text-border ml-3 hidden sm:inline">·</span>
              )}
            </span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-xs sm:text-sm text-muted-foreground/70 italic"
        >
          We don't talk about becoming the standard.{" "}
          <span className="text-chrome font-medium">We maintain it.</span>
        </motion.p>
      </div>
    </section>
  );
};

export default VisionSection;
