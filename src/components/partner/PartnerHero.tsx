import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Rocket, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface Props {
  isPartner: boolean;
}

/**
 * Operator activation. This creates a reference under which your own seals are
 * attributed - it is not a commission account and pays nothing. Nobody earns a
 * share of anything here; the protocol is free to use and a paid key only
 * raises the daily cap. See /corrections for the withdrawn referral programme.
 */
const PartnerHero = ({ isPartner }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activating, setActivating] = useState(false);

  const activate = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isPartner) {
      navigate("/partner/dashboard");
      return;
    }
    setActivating(true);
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error } = await supabase.from("partners").insert({
      user_id: user.id,
      partner_code: code,
    } as any);
    setActivating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Operator reference created", description: "Your reference is active." });
      navigate("/partner/dashboard");
    }
  };

  return (
    <section className="pt-32 pb-20 px-4 text-center relative">
      <div className="container mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-6">
          <ShieldCheck className="h-4 w-4" />
          Run the protocol as an operator
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          <span className="text-gold-gradient">Publish receipts</span>
          <br />
          <span className="text-foreground">anyone can check</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Take an operator reference, embed the badge, and every record you seal gets a
          permanent public page that resolves without asking us.{" "}
          <span className="text-primary font-semibold">No commission, no rev-share, no exclusivity.</span>{" "}
          The protocol stays free; a paid key only raises your daily cap.
        </p>
        <Button size="lg" variant="hero" onClick={activate} disabled={activating} className="text-base px-8">
          <Rocket className="h-5 w-5 mr-2" />
          {isPartner ? "Go to Operator Console" : activating ? "Activating…" : "Take an operator reference"}
        </Button>
        <p className="mt-6 text-xs text-muted-foreground">
          Money buys process, never outcome. An operator reference carries no finding, no
          endorsement and no legal standing in either direction.
        </p>
      </div>
    </section>
  );
};

export default PartnerHero;
