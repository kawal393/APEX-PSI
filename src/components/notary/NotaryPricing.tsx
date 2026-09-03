import { motion } from "framer-motion";
import { CheckCircle2, Zap, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Globe,
    color: "border-primary/30",
    features: [
      "100 receipts / day",
      "Full SHA-256 + Ed25519 signing",
      "Merkle tree anchoring",
      "Public verification via /verify-hash",
      "Community support",
    ],
    cta: "Start Free",
    ctaVariant: "heroOutline" as const,
    href: "#demo",
  },
  {
    name: "Pro",
    price: "$499",
    period: "/ month",
    icon: Zap,
    color: "border-gold/40",
    highlight: true,
    features: [
      "10,000 receipts / day",
      "API key authentication",
      "Batch notarization endpoint",
      "Receipt metadata search",
      "Priority email support",
      "Webhook notifications",
    ],
    cta: "Get API Key",
    ctaVariant: "hero" as const,
    href: "/dashboard?tab=notary",
  },
  {
    name: "Enterprise",
    price: "From $2,000",
    period: "/ month",
    icon: Shield,
    color: "border-primary/40",
    features: [
      "Unlimited receipts",
      "Institutional Anchor Panel ratification",
      "Dedicated MPC node",
      "SLA-backed 99.9% uptime",
      "Compliance record generation",
      "Custom predicate development",
      "White-label deployment",
    ],
    cta: "Book a Demo",
    ctaVariant: "heroOutline" as const,
    href: "/#contact",
  },
];

const NotaryPricing = () => (
  <section className="px-4 py-16 sm:py-24" id="pricing">
    <div className="container mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black mb-3">
          <span className="text-chrome-gradient">Simple</span>{" "}
          <span className="text-gold-gradient">Pricing</span>
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          The math is free. The trusted signature scales with your volume.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-xl border bg-card p-7 flex flex-col relative ${tier.color} ${tier.highlight ? "ring-1 ring-gold/20" : ""}`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gold text-background text-[10px] font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <tier.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-primary uppercase">{tier.name}</h3>
                <div>
                  <span className="text-2xl font-black text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">{tier.period}</span>
                </div>
              </div>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant={tier.ctaVariant} className="w-full" size="lg" asChild>
              <Link to={tier.href}>{tier.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default NotaryPricing;
