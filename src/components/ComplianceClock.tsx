import { useState, useEffect } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const DEADLINE = new Date("2026-08-02T00:00:00Z").getTime();

const ComplianceClock = () => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, DEADLINE - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const totalSeconds = Math.floor(diff / 1000);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="relative overflow-hidden border-y border-destructive/30"
      style={{
        background: "linear-gradient(90deg, hsl(0 84% 60% / 0.08), hsl(38 92% 50% / 0.06), hsl(0 84% 60% / 0.08))",
      }}
    >
      <div className="container mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-destructive text-center">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse shrink-0" />
            <span>EU AI Act Full Enforcement — Compliance Clock</span>
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse shrink-0" />
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
            {[
              { val: days, label: "Days" },
              { val: hours, label: "Hours" },
              { val: minutes, label: "Min" },
              { val: seconds, label: "Sec" },
            ].map((t) => (
              <div key={t.label} className="text-center">
                <div className="rounded-lg border border-border bg-card/80 px-2.5 sm:px-3 py-1.5 sm:py-2 min-w-[48px] sm:min-w-[56px]">
                  <p className="text-xl sm:text-2xl md:text-4xl font-black text-foreground tabular-nums">
                    {String(t.val).padStart(2, "0")}
                  </p>
                </div>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Total seconds remaining */}
          <p className="font-mono text-xs sm:text-sm text-destructive/80 tabular-nums">
            {totalSeconds.toLocaleString()} seconds remaining
          </p>

          <div className="text-center space-y-1">
            <p className="text-xs sm:text-sm text-foreground font-semibold">
              August 2, 2026 — Article 50 — Transparency obligations for synthetic content
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Maximum penalties: <span className="text-destructive font-bold">€35,000,000</span> or{" "}
              <span className="text-destructive font-bold">7% of global annual turnover</span>
              <span className="text-muted-foreground/60"> — EU AI Act Art. 99</span>
            </p>
            <p className="text-[10px] sm:text-xs text-foreground/70 max-w-2xl mx-auto pt-2">
              APEX PSI is compliant with Section 1 of the EU Code of Practice on Transparency of AI-Generated Content.
              In-band signed metadata via C2PA Content Credentials.{" "}
              <Link to="/eu-ai-act" className="text-gold hover:underline font-semibold">See /eu-ai-act for technical proof.</Link>
            </p>
          </div>

          <Button variant="hero" size="sm" asChild>
            <a href="#contact" className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Start Your Compliance Assessment
            </a>
          </Button>
        </div>
      </div>
    </motion.section>
  );
};

export default ComplianceClock;
