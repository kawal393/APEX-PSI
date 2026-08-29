import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface SovereignShieldProps {
  allPassed: boolean;
  passCount: number;
  totalCount: number;
}

const SovereignShield = ({ allPassed, passCount, totalCount }: SovereignShieldProps) => {
  if (!allPassed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="mt-6 rounded-xl border-2 border-compliant/40 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(142 76% 36% / 0.08), hsl(142 76% 36% / 0.02), hsl(43 85% 52% / 0.04))",
      }}
    >
      {/* Shield Header */}
      <div className="px-6 py-5 flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full blur-xl opacity-30 bg-compliant" />
          <div className="relative w-16 h-16 rounded-full border-2 border-compliant/60 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(142 76% 36% / 0.15), hsl(142 76% 36% / 0.05))" }}>
            <ShieldCheck className="h-8 w-8 text-compliant" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl font-black tracking-wider text-compliant"
          >
            INTEGRITY CONFIRMED
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-mono text-xs sm:text-sm text-compliant/80 tracking-wide"
          >
            MATHEMATICAL INTEGRITY CONFIRMED: NON-REPUDIATION GUARANTEED
          </motion.p>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4 mt-2"
        >
          <div className="text-center">
            <p className="text-2xl font-black text-compliant">{passCount}/{totalCount}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Checks Passed</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-black text-compliant">100%</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Integrity Score</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs font-bold text-compliant font-mono">CLIENT-SIDE</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Verification</p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-compliant/20 px-6 py-2.5 text-center"
        style={{ background: "hsl(142 76% 36% / 0.03)" }}>
        <p className="text-[9px] font-mono text-muted-foreground">
          APEX PSI Protocol v1.1 — All verification performed locally. Zero server dependency. EU AI Act Art. 15 compliant.
        </p>
      </div>
    </motion.div>
  );
};

export default SovereignShield;
