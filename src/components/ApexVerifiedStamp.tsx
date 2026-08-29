import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface ApexVerifiedStampProps {
  hash?: string;
  btcBlock?: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * APEX VERIFIED — seal stamp.
 * Visually tethers any artifact to a SHA-256 hash + Bitcoin block anchor.
 * Drop on any compliance report, evidence file, or receipt.
 */
const ApexVerifiedStamp = ({
  hash = "0000000000000000000000000000000000000000000000000000000000000000",
  btcBlock = "PENDING",
  size = "md",
  className = "",
}: ApexVerifiedStampProps) => {
  const short = hash.slice(0, 10) + "…" + hash.slice(-6);
  const dim =
    size === "sm" ? "w-28 h-28 text-[8px]" : size === "lg" ? "w-48 h-48 text-[11px]" : "w-36 h-36 text-[9px]";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className={`relative ${dim} ${className} select-none`}
      aria-label="APEX VERIFIED seal"
    >
      <div
        className="absolute inset-0 rounded-full border-2 border-gold/70 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(43 85% 52% / 0.18), hsl(43 85% 52% / 0.04) 60%, transparent 75%)",
          boxShadow: "0 0 24px hsl(43 85% 52% / 0.25), inset 0 0 18px hsl(43 85% 52% / 0.15)",
        }}
      >
        <div className="absolute inset-1.5 rounded-full border border-gold/30 border-dashed" />
        <div className="flex flex-col items-center justify-center text-center px-2 leading-tight">
          <ShieldCheck className="text-gold mb-1" style={{ width: "22%", height: "22%" }} />
          <p className="font-black tracking-[0.18em] text-gold uppercase">APEX</p>
          <p className="font-black tracking-[0.22em] text-gold uppercase">VERIFIED™</p>
          <p className="font-mono text-foreground/80 mt-1">{short}</p>
          <p className="font-mono text-emerald-400/90 mt-0.5">BTC#{btcBlock}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ApexVerifiedStamp;
