import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, FileText } from "lucide-react";

const PartnerCTA = () => (
  <section className="py-16 px-4">
    <div className="container mx-auto max-w-4xl">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-8 md:p-12 text-center">
        <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Apply for <span className="text-gold-gradient">Apex Institutional Certification</span>
        </h2>
        <p className="text-muted-foreground mb-2 max-w-md mx-auto">
          The protocol is free. Certification and insurance underwriting fees apply for commercial regulatory filings.
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
          Independently verifiable · Regulator-ready · Publicly anchored
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/#contact">
            <FileText className="h-4 w-4 mr-1" />
            Apply for Certification
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default PartnerCTA;
