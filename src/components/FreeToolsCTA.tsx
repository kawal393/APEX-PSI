import { motion } from "framer-motion";
import { Shield, Globe, Hash, Award, BookOpen, Database, Stamp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tools = [
  {
    icon: Hash,
    title: "Verify Any Hash",
    desc: "Independently verify any SHA-256 hash against our immutable ledger. No account needed.",
    cta: "Verify Now",
    href: "/verify",
  },
  {
    icon: Shield,
    title: "Free Compliance Score",
    desc: "Check your AI compliance in 2 minutes. No signup required — get your score instantly.",
    cta: "Take Assessment",
    href: "/assess",
  },
  {
    icon: Globe,
    title: "Regulation Tracker",
    desc: "Track AI regulation status across 25+ countries. Filter by region, status, and enforcement dates.",
    cta: "View Map",
    href: "/regulations",
  },
  {
    icon: Award,
    title: "Trust Badge",
    desc: "Display a PSI Verified badge on your website. Customizable theme, size, and embed code.",
    cta: "Get Badge",
    href: "/badge",
  },
  {
    icon: BookOpen,
    title: "Standards Mapping",
    desc: "Interactive cross-walk between EU AI Act, NIST AI RMF, ISO 42001 and PSI predicates.",
    cta: "Explore Mapping",
    href: "/standards",
  },
  {
    icon: Database,
    title: "Verified Registry",
    desc: "Public registry of organizations with cryptographically verified AI compliance status.",
    cta: "Browse Registry",
    href: "/registry",
  },
  {
    icon: Stamp,
    title: "APEX Notary",
    desc: "Notarize any AI decision with Ed25519 signatures. Free — no account, no key.",
    cta: "Start Notarizing",
    href: "/notary",
  },
  {
    icon: Search,
    title: "Ledger Explorer",
    desc: "Browse the live append-only ledger of every commit, proof, and Merkle root in real time.",
    cta: "Open Explorer",
    href: "/explorer",
  },
];

const FreeToolsCTA = () => (
  <section className="relative py-20 px-4">
    <div className="container mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">The Public Instruments</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          <span className="text-gold-gradient">Open Access</span>{" "}
          <span className="text-chrome-gradient">Verification Surface</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          The instruments are public. The ledger is permissionless. No account required.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card/60 p-5 hover:border-gold/30 transition-colors flex flex-col"
          >
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-3">
              <tool.icon className="h-5 w-5 text-gold" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">{tool.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{tool.desc}</p>
            <Button variant="heroOutline" size="sm" className="w-full" asChild>
              <Link to={tool.href}>{tool.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FreeToolsCTA;
