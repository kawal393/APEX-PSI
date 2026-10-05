import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradeCTAProps {
  hash?: string;
  className?: string;
}

/**
 * UpgradeCTA — Shown after a successful verification on the /verify page.
 * Routes to /upgrade with context: ?intent=seal&from=verify&hash=<encoded-hash>
 * The /upgrade page uses this to suggest which tier the user needs based on their use case.
 */
export const UpgradeCTA = ({ hash, className = "" }: UpgradeCTAProps) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    const params = new URLSearchParams({
      intent: "seal",
      from: "verify",
      ...(hash && { hash }),
    });
    navigate(`/upgrade?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-gold/20 bg-gold/5 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-gold/10 p-3 shrink-0">
          <Zap className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm mb-1">
            Ready to Seal at Scale?
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Free verification is unlimited. Paid sealing starts at 2,000 per day. Upgrade to unlock more.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpgradeClick}
            className="border-gold/30 text-gold hover:bg-gold/10"
          >
            View Pricing
            <ArrowRight className="h-3 w-3 ml-1.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default UpgradeCTA;
