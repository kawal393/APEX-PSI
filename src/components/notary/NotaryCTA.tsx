import { motion } from "framer-motion";
import { ArrowRight, Shield, Hash, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotaryCTA = () => (
  <section className="relative py-20 px-4 overflow-hidden">
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
      style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.06) 0%, transparent 60%)" }}
    />
    <div className="container mx-auto max-w-4xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-8 sm:p-12 text-center"
      >
        <p className="text-primary font-semibold tracking-widest uppercase text-xs mb-4">
          APEX NOTARY API
        </p>
        <h2 className="text-3xl sm:text-4xl font-black mb-4">
          <span className="text-chrome-gradient">Notarize Every AI Decision.</span>
          <br />
          <span className="text-gold-gradient">One API Call.</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm">
          SHA-256 hashed. Ed25519 signed. Merkle-anchored. Get a tamper-evident receipt
          for every AI decision — satisfying EU AI Act record-keeping requirements.
          Free tier: 100 receipts/day.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {[
            { icon: Hash, label: "SHA-256 Hashed" },
            { icon: Key, label: "Ed25519 Signed" },
            { icon: Shield, label: "Merkle Anchored" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-foreground/70">
              <item.icon className="h-4 w-4 text-primary" />
              {item.label}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="lg" asChild>
            <Link to="/notary">
              Try Live Demo <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link to="/notary#docs">
              API Documentation
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default NotaryCTA;
