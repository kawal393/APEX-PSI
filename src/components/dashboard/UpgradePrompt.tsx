import { ShieldAlert, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  reason: "verification_limit" | "certificate_limit" | "mode_locked" | "monitoring" | "audit_export";
  currentUsage?: number;
  limit?: number;
}

const MESSAGES: Record<string, { title: string; description: string; cta: string }> = {
  verification_limit: {
    title: "Verification Limit Reached",
    description: "You've used all 3 free verifications this month. Upgrade to STARTUP for 100/month or GROWTH for unlimited.",
    cta: "Unlock More Verifications",
  },
  certificate_limit: {
    title: "Certificate Limit Reached",
    description: "Free accounts get 1 certificate per month. Upgrade for unlimited signed, verifiable certificates with full Merkle audit trails.",
    cta: "Get Unlimited Certificates",
  },
  mode_locked: {
    title: "SWORD & JUDGE Modes Locked",
    description: "Free accounts have SHIELD mode only. Upgrade to GROWTH for SWORD (public audit trail) or ENTERPRISE for JUDGE (canonical standard).",
    cta: "Unlock All Modes",
  },
  monitoring: {
    title: "Continuous Monitoring — Paid Feature",
    description: "Automated daily compliance scans that alert you before issues arise. Available on GROWTH plans and above.",
    cta: "Enable Continuous Monitoring",
  },
  audit_export: {
    title: "Signed Export — Paid Feature",
    description: "Download a complete audit package with Merkle proofs, timestamps, and article-by-article evidence, in a form your own advisers can independently re-verify. No regulator's or court's acceptance is promised or implied.",
    cta: "Get Audit Export",
  },
};

const UpgradePrompt = ({ reason, currentUsage, limit }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const msg = MESSAGES[reason];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-warning/30 bg-warning/5 p-6"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground mb-1">{msg.title}</h3>
          {currentUsage !== undefined && limit !== undefined && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-warning">{currentUsage}/{limit}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-4">{msg.description}</p>

          <div className="flex items-center gap-3">
            <Button
              variant="hero"
              size="sm"
              onClick={() => navigate("/#pricing")}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              {msg.cta}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <span className="text-[10px] text-muted-foreground">
              €35M max fine for non-compliance
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UpgradePrompt;
