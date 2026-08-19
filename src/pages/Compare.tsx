import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Minus, Shield, ArrowRight, Zap, Globe, Lock, Network, FileCode, Bot, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const features = [
  {
    category: "What APEX PSI Actually Ships Today",
    items: [
      { name: "SHA-256 Commit Hashing (crypto.subtle)", apex: true, guardian: true, attested: true, microsoft: true, taskhawk: true },
      { name: "Ed25519 Signature Verification", apex: true, guardian: "partial" as const, attested: false, microsoft: "partial" as const, taskhawk: "partial" as const },
      { name: "Live Merkle Tree Visualization", apex: true, guardian: false, attested: false, microsoft: false, taskhawk: false },
      { name: "IETF Internet Draft Filed (draft-singh-psi)", apex: true, guardian: false, attested: false, microsoft: false, taskhawk: false },
      { name: "Fully Open Source (MIT)", apex: true, guardian: false, attested: "partial" as const, microsoft: true, taskhawk: false },
      { name: "Client-Side Pramaan Seals (browser-native)", apex: true, guardian: false, attested: false, microsoft: false, taskhawk: false },
    ],
  },
];


const CellIcon = ({ value }: { value: boolean | "partial" }) => {
  if (value === true) return <Check className="h-5 w-5 text-gallows-approved" />;
  if (value === "partial") return <Minus className="h-5 w-5 text-amber-400" />;
  return <X className="h-5 w-5 text-muted-foreground/30" />;
};

const pillars = [
  { icon: Lock, title: "SHA-256 Hashing", desc: "Every artifact hashed client-side via the browser's native crypto.subtle. No server trust required." },
  { icon: FileCode, title: "Ed25519 Signatures", desc: "Signed receipts a third party can verify with the public key alone. No secret handshake." },
  { icon: Network, title: "Merkle Aggregation", desc: "Per-commit hashes fold into a Merkle root. Inclusion proofs are small, portable, and offline-verifiable." },
  { icon: Scale, title: "IETF Draft Filed", desc: "draft-singh-psi submitted to the Internet Engineering Task Force. The standards process decides — not us." },
  { icon: Globe, title: "MIT Open Source", desc: "Full source, MIT licensed. Fork it, audit it, replace us. That is the point." },
  { icon: Shield, title: "Client-Side Pramaan Seals", desc: "Users seal their own files in-browser. We never see the content — only the hash." },
];


const Compare = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Apex PSI vs. Alternatives — Feature Comparison — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="How APEX PSI compares to policy-only, self-attested, and closed compliance platforms. Verifiability, openness, and cost." />
        <link rel="canonical" href="https://ai-governance-standard.com/compare" />
        <meta property="og:title" content="APEX PSI vs. Alternatives — Feature Comparison" />
        <meta property="og:description" content="How APEX PSI compares to policy-only, self-attested, and closed compliance platforms. Verifiability, openness, and cost." />
        <meta property="og:url" content="https://ai-governance-standard.com/compare" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-black text-xl tracking-tight bg-transparent border-none cursor-pointer">
            <span className="text-gold-gradient">APEX</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/gallows")} className="font-mono text-xs">
              Live Demo
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/standards")} className="font-mono text-xs">
              Standards
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/sdk")} className="font-mono text-xs">
              SDK Docs
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16 space-y-20">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
            COMPETITIVE ANALYSIS — 5 PLATFORMS COMPARED
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="text-gold-gradient">Neutral Standard</span>{" "}
            <span className="text-foreground">vs.</span>
            <br />
            <span className="text-foreground">Vendor Toolkits</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            An IETF-submitted, vendor-neutral, open-source cryptographic governance protocol.
            Compare against GuardianChain, Attested Intelligence, TaskHawk (Kevros), and Microsoft's Agent Governance Toolkit.
          </p>
        </motion.section>

        {/* Pillar Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="bg-card border-border hover:border-primary/30 transition-colors h-full">
                <CardContent className="pt-6 space-y-3">
                  <p.icon className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* Positioning Note */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8"
        >
          <h3 className="font-bold text-lg mb-3">Why "Neutral Standard" Matters</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Microsoft's Agent Governance Toolkit and TaskHawk (Kevros) are strong vendor products — but they are <strong className="text-foreground">vendor products</strong>.
            Every enterprise that competes with Microsoft's other services faces a conflict of interest adopting their governance standard.
            TaskHawk has Microsoft Marketplace distribution but no IETF draft, no ZK proofs, no cross-jurisdictional coverage.
            GuardianChain is proprietary. Attested Intelligence has a patent pending.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            APEX PSI is the only protocol with an <strong className="text-foreground">IETF Internet Draft</strong> (draft-singh-psi),
            full MIT open-source code, and zero vendor lock-in. Standards bodies reference protocols, not products.
            <strong className="text-foreground"> Products get replaced. Standards get built upon.</strong>
          </p>
        </motion.section>

        {/* Feature Matrix */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-8 text-center">Feature Comparison Matrix</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-3 text-sm font-mono text-muted-foreground w-[28%]">FEATURE</th>
                  <th className="text-center py-4 px-2 w-[14%]">
                    <span className="text-gold-gradient font-black text-base">APEX PSI</span>
                    <br />
                    <span className="text-[9px] text-primary font-mono">IETF DRAFT</span>
                  </th>
                  <th className="text-center py-4 px-2 text-xs font-mono text-muted-foreground w-[14%]">
                    GuardianChain
                    <br />
                    <span className="text-[9px]">Proprietary</span>
                  </th>
                  <th className="text-center py-4 px-2 text-xs font-mono text-muted-foreground w-[14%]">
                    Attested Intel
                    <br />
                    <span className="text-[9px]">Patent Pending</span>
                  </th>
                  <th className="text-center py-4 px-2 text-xs font-mono text-muted-foreground w-[14%]">
                    TaskHawk
                    <br />
                    <span className="text-[9px]">MS Marketplace</span>
                  </th>
                  <th className="text-center py-4 px-2 text-xs font-mono text-muted-foreground w-[14%]">
                    Microsoft AGT
                    <br />
                    <span className="text-[9px]">Vendor Toolkit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr>
                      <td colSpan={6} className="pt-6 pb-2 px-3">
                        <span className="text-xs font-mono text-primary tracking-widest uppercase">
                          {category.category}
                        </span>
                      </td>
                    </tr>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-sm">{item.name}</td>
                        <td className="py-3 px-2 text-center"><CellIcon value={item.apex} /></td>
                        <td className="py-3 px-2 text-center"><CellIcon value={item.guardian} /></td>
                        <td className="py-3 px-2 text-center"><CellIcon value={item.attested} /></td>
                        <td className="py-3 px-2 text-center"><CellIcon value={item.taskhawk} /></td>
                        <td className="py-3 px-2 text-center"><CellIcon value={item.microsoft} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* CTA */}
        <section className="text-center py-12 space-y-6">
          <h2 className="text-3xl font-black">
            <span className="text-gold-gradient">Ready to verify?</span>
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button onClick={() => navigate("/gallows")} className="bg-primary text-primary-foreground font-mono gap-2">
              Try APEX PSI <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/standards")} className="font-mono gap-2">
              <Scale className="h-4 w-4" /> Standards Mapping
            </Button>
            <Button variant="outline" onClick={() => navigate("/#contact")} className="font-mono gap-2">
              Request Consultation
            </Button>
          </div>
        </section>
      </main>
    </div>
  </>
  );
};

export default Compare;
