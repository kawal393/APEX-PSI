import { motion } from "framer-motion";
import { Bitcoin, FileCheck, Stamp } from "lucide-react";
import { FREE_ACCESS_STATEMENT } from "@/lib/commerce";

interface CountersignUpsellProps {
  /** Optional hash or receipt id this panel is attached to. */
  reference?: string;
  className?: string;
}

/**
 * Sealing and verification are free, with no account and no key. Nothing here
 * is sold; this panel simply describes what a sealed proof contains.
 */
const CountersignUpsell = ({ reference, className = "" }: CountersignUpsellProps) => {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-xl border border-gold/30 bg-gold/[0.04] p-6 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
          <Stamp className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-widest text-gold uppercase">
            What a sealed proof contains
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {FREE_ACCESS_STATEMENT}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm text-foreground/80">
        <li className="flex items-start gap-2">
          <FileCheck className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          Signed by the APEX PSI trust anchor (Ed25519 + LMS-W4-SHA256 post-quantum)
        </li>
        <li className="flex items-start gap-2">
          <Bitcoin className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          submitted to OpenTimestamps for Bitcoin timestamping, with the .ots proof included
        </li>
        <li className="flex items-start gap-2">
          <FileCheck className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          Receipt referencing EU AI Act Article 50 transparency duties
        </li>
      </ul>

      <p className="text-[11px] text-muted-foreground mt-4">
        {reference ? `Proof ${reference.slice(0, 12)}…. ` : ""}No payment, no plan, no key.
      </p>
    </motion.aside>
  );
};

export default CountersignUpsell;
