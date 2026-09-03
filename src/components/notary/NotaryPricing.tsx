import { motion } from "framer-motion";
import { CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FREE_ACCESS_STATEMENT } from "@/lib/commerce";

const included = [
  "Full SHA-256 + Ed25519 signing",
  "Merkle tree anchoring",
  "Public verification via /verify-hash",
  "Batch notarization endpoint",
  "Receipt metadata search",
  "Webhook notifications",
];

const NotaryPricing = () => (
  <section className="px-4 py-16 sm:py-24" id="pricing">
    <div className="container mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black mb-3">
          <span className="text-chrome-gradient">Free</span>{" "}
          <span className="text-gold-gradient">Access</span>
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">{FREE_ACCESS_STATEMENT}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-xl border border-primary/30 bg-card p-7"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-widest text-primary uppercase">Notary</h3>
            <div>
              <span className="text-2xl font-black text-foreground">Free</span>
              <span className="text-muted-foreground text-sm ml-1">no account, no key</span>
            </div>
          </div>
        </div>
        <ul className="space-y-2.5 mb-8">
          {included.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mb-6">
          Hosted capacity limits exist to keep the service standing; they are not a paid tier. The
          verifier source is MIT in the repository, so anyone can run it without limit.
        </p>
        <Button variant="heroOutline" className="w-full" size="lg" asChild>
          <Link to="#demo">Try the notary</Link>
        </Button>
      </motion.div>
    </div>
  </section>
);

export default NotaryPricing;
