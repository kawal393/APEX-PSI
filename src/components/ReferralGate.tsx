import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Share2, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReferralGateProps {
  shareId: string;
  referralCount: number;
  requiredReferrals?: number;
  unlocked: boolean;
  children: React.ReactNode;
}

const ReferralGate = ({ shareId, referralCount, requiredReferrals = 2, unlocked, children }: ReferralGateProps) => {
  const referralUrl = `https://digital-gallows.apex-infrastructure.com/assess?ref=${shareId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied!");
  };

  if (unlocked || referralCount >= requiredReferrals) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-6 text-center">
      <Lock className="h-8 w-8 text-gold mx-auto mb-3" />
      <h3 className="text-lg font-bold text-foreground mb-2">Unlock Full Report</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Share with {requiredReferrals - referralCount} more colleague{requiredReferrals - referralCount !== 1 ? "s" : ""} to unlock your article-by-article breakdown.
      </p>

      <div className="flex items-center gap-2 max-w-md mx-auto mb-4">
        <div className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs text-muted-foreground truncate font-mono">
          {referralUrl}
        </div>
        <Button variant="heroOutline" size="sm" onClick={copyLink}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 mb-4">
        {Array.from({ length: requiredReferrals }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${i < referralCount ? "bg-compliant" : "bg-border"}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {referralCount}/{requiredReferrals} referrals
        </span>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="heroOutline"
          size="sm"
          onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`, "_blank")}
        >
          <Share2 className="h-3 w-3 mr-1" /> LinkedIn
        </Button>
        <Button
          variant="heroOutline"
          size="sm"
          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check your EU AI Act compliance score!")}&url=${encodeURIComponent(referralUrl)}`, "_blank")}
        >
          <Share2 className="h-3 w-3 mr-1" /> Post on X
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/50 mt-4">
        Or <Link to="/auth" className="text-gold hover:underline">sign up</Link> to unlock immediately.
      </p>
    </div>
  );
};

export default ReferralGate;
