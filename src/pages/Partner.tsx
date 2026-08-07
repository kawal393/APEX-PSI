import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ParticlesBackground from "@/components/ParticlesBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerHero from "@/components/partner/PartnerHero";
import PartnerHowItWorks from "@/components/partner/PartnerHowItWorks";

const Partner = () => {
  const { user } = useAuth();
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("partners" as any)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPartner(!!data));
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <ParticlesBackground />
      <Navbar />
      <PartnerHero isPartner={isPartner} />
      <PartnerHowItWorks />
      <Footer />
    </div>
  );
};

export default Partner;
