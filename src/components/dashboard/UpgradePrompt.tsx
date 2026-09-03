import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  reason: "verification_limit" | "certificate_limit" | "mode_locked" | "monitoring" | "audit_export";
  currentUsage?: number;
  limit?: number;
}

const MESSAGES: Record<string, { title: string; description: string }> = {
  verification_limit: {
    title: "Verification Limit Reached",
    description:
      "This hosted account has used its verifications for this month. Nothing is sold: the verifier source is MIT in the repository, so you can run unlimited verifications locally.",
  },
  certificate_limit: {
    title: "Certificate Limit Reached",
    description:
      "This hosted account has used its certificates for this month. There is no paid tier; the limit is a capacity limit on the hosted service.",
  },
  mode_locked: {
    title: "Mode Not Available On This Account",
    description:
      "SHIELD mode is available here. SWORD and JUDGE modes are not enabled for this account. There is no purchase that changes this.",
  },
  monitoring: {
    title: "Continuous Monitoring — Not Enabled",
    description:
      "Automated daily compliance scans are not enabled for this account. This is a capacity setting, not a paid feature.",
  },
  audit_export: {
    title: "Signed Export — Not Enabled",
    description:
      "A complete audit package with Merkle proofs, timestamps and article-by-article evidence, in a form your own advisers can independently re-verify, is not enabled for this account. No regulator's or court's acceptance is promised or implied.",
  },
};

const UpgradePrompt = ({ reason, currentUsage, limit }: UpgradePromptProps) => {
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
          <p className="text-xs text-muted-foreground">{msg.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default UpgradePrompt;
