import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FREE_ACCESS_STATEMENT } from "@/lib/commerce";

const included = [
  "Client-side SHA-256 sealing of any file (/seal, /pramaan)",
  "Public hash verification portal and REST API",
  "Verifier source — MIT, TypeScript and Python, in the repository",
  "Compliance-Receipt HTTP header (draft-singh-psi-http-01)",
  "Vendor transparency console (/registry/check)",
  "Public receipt pages at /r/<hash>",
];

const Pricing = () => {
  return (
    <section className="relative py-24 px-4" id="pricing">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Access to the standard
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            The Standard is <span className="text-gold-gradient">Free</span>. Forever.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {FREE_ACCESS_STATEMENT}
          </p>
        </motion.div>

        <div className="rounded-xl border border-border bg-card/60 p-8">
          <ul className="space-y-2.5">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to="/seal">Seal a file</Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link to="/verify">Verify a hash</Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
          The PSI Protocol is a public-good standard. The MIT licence covers the verifier and the
          recomputation engine source — not the hosted platform, and not the findings ledger. The
          specification (<span className="font-mono">draft-singh-psi (rev 01)</span>) is an
          individual submission to the IETF.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
