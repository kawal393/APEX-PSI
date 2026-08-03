import { motion } from "framer-motion";
import { ArrowRight, Bitcoin, FileCheck, Stamp } from "lucide-react";
import { CHECKOUT } from "@/lib/commerce";

interface CountersignUpsellProps {
  /** Optional hash or receipt id this upsell is attached to. */
  reference?: string;
  className?: string;
}

/**
 * Sealing is free and always will be. What is paid is the countersignature:
 * the same proof, additionally signed by the APEX PSI institutional trust anchor,
 * anchored to Bitcoin and issued as a regulator-ready PDF.
 */
const CountersignUpsell = ({ reference, className = "" }: CountersignUpsellProps) => {
  const href = reference
    ? `${CHECKOUT.conformityReceipt.url}?client_reference_id=${encodeURIComponent(reference.slice(0, 200))}`
    : CHECKOUT.conformityReceipt.url;

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
            Countersign this proof
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sealing stays free. The institutional countersignature is the paid artefact.
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm text-foreground/80 mb-5">
        <li className="flex items-start gap-2">
          <FileCheck className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          Signed by the APEX PSI trust anchor (Ed25519 + LMS-W4-SHA256 post-quantum)
        </li>
        <li className="flex items-start gap-2">
          <Bitcoin className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          Bitcoin-anchored via OpenTimestamps, with the .ots proof included
        </li>
        <li className="flex items-start gap-2">
          <FileCheck className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
          Regulator-ready PDF referencing EU AI Act Article 50 transparency duties
        </li>
      </ul>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold text-background font-bold text-sm h-11 px-6 hover:bg-gold/90 transition-colors"
      >
        Get the receipt — {CHECKOUT.conformityReceipt.price} {CHECKOUT.conformityReceipt.cadence}
        <ArrowRight className="h-4 w-4" />
      </a>
      <p className="text-[11px] text-muted-foreground mt-3">
        Issued against the exact hash above. No subscription required.
      </p>
    </motion.aside>
  );
};

export default CountersignUpsell;
