import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Shield, Globe, Users, Zap, CheckCircle2, Scale, FileText, Activity, ArrowRight, Lock, Hash, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const layers = [
  {
    number: "01",
    title: "Machine Consensus",
    subtitle: "MPC — 3-Node Automated Verification",
    icon: Zap,
    color: "text-primary",
    borderColor: "border-primary/30",
    bgColor: "bg-primary/5",
    points: [
      "3-node Multi-Party Computation cluster",
      "2-of-3 consensus threshold — no single point of failure",
      "SHA-256 hash chaining with monotonic sequence counters",
      "Ed25519 root signatures for non-repudiation",
      "Sub-second verification latency",
    ],
    status: "OPERATIONAL",
  },
  {
    number: "02",
    title: "Open Public Verification",
    subtitle: "The Open Evidence Protocol — Permissionless",
    icon: Globe,
    color: "text-gold",
    borderColor: "border-gold/30",
    bgColor: "bg-gold/5",
    points: [
      "Anyone, anywhere can independently verify any proof",
      "No login required — the math is the credential",
      "Public attestations anchored to the immutable ledger",
      "Consensus emerges from volume, not authority",
      "Every attestation is itself hashed and immutable",
    ],
    status: "LIVE",
  },
  {
    number: "03",
    title: "Institutional Anchors",
    subtitle: "High-Stakes Enterprise Ratification",
    icon: Shield,
    color: "text-compliant",
    borderColor: "border-compliant/30",
    bgColor: "bg-compliant/5",
    points: [
      "5 credentialed professionals for enterprise-grade ratification",
      "3-of-5 quorum with Ed25519-signed verdicts",
      "48-hour SLA — machine verdict auto-ratifies on timeout",
      "Optional layer — the protocol functions without them",
      "Institutional Anchors validate, they do not gatekeep",
    ],
    status: "ENTERPRISE",
  },
];

const Governance = () => {
  const [totalProofs, setTotalProofs] = useState(0);
  const [totalAttestations, setTotalAttestations] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const [ledgerRes, attestRes] = await Promise.all([
        supabase.from("gallows_public_ledger").select("*", { count: "exact", head: true }),
        supabase.from("public_attestations").select("*", { count: "exact", head: true }),
      ]);
      if (ledgerRes.count !== null) setTotalProofs(ledgerRes.count);
      if (attestRes.count !== null) setTotalAttestations(attestRes.count);
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Open Evidence Protocol — Decentralized Compliance Verification</title>
        <meta name="description" content="The APEX Open Evidence Protocol replaces human bottlenecks with mathematical consensus. Anyone can verify. The math is the authority." />
      </Helmet>
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Hero — The Indictment */}
        <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.06) 0%, transparent 60%)" }}
          />
          <div className="container mx-auto max-w-4xl relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-block text-[10px] sm:text-xs font-bold text-primary tracking-[0.3em] uppercase border-b border-primary/30 pb-1 mb-8">
                THE OPEN EVIDENCE PROTOCOL
              </span>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[0.95] tracking-tight">
                <span className="block text-chrome-gradient">CENTRALIZED COMPLIANCE</span>
                <span className="block text-chrome-gradient">DOES NOT SCALE.</span>
                <span className="block text-gold-gradient mt-2">MATHEMATICS DOES.</span>
              </h1>

              <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base mb-10 leading-relaxed">
                The ACCC processes 12,000 complaints per year. 400 million contracts are signed annually in Australia alone.
                The bottleneck is not technology. It is <span className="text-foreground font-semibold">institutional permission</span>.
              </p>

              {/* Live Stats */}
              <div className="flex flex-wrap justify-center gap-10 mb-12">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-3xl sm:text-4xl font-black text-foreground tabular-nums">{totalProofs.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Proofs Anchored</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-gold animate-pulse" />
                    <span className="text-3xl sm:text-4xl font-black text-foreground tabular-nums">{totalAttestations.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Public Attestations</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="lg" onClick={() => navigate("/verify")}>
                  <Hash className="h-4 w-4 mr-2" />
                  Verify a Proof
                </Button>
                <Button variant="heroOutline" size="lg" onClick={() => navigate("/explorer")}>
                  <Globe className="h-4 w-4 mr-2" />
                  View Public Ledger
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Manifesto */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-xl border border-gold/20 bg-gold/5 p-8 sm:p-10 text-center">
              <Scale className="h-8 w-8 text-gold mx-auto mb-5" />
              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-5">
                True fairness cannot be centralized in a boardroom. It must be mathematically proven and publicly verifiable.
                The protocol is open. The math is public. The ledger is immutable.
              </p>
              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-6">
                When 100,000 citizens verify a contract with mathematics, no regulator can dispute the result —
                they can only adopt the protocol.
              </p>
              <p className="text-gold font-black text-base sm:text-lg tracking-[0.15em]">
                THE PROTOCOL IS THE REGULATOR.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Three-Layer Architecture */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3">
                <span className="text-chrome-gradient">Three-Layer</span>{" "}
                <span className="text-gold-gradient">Architecture</span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                From machine consensus to public verification to institutional ratification.
              </p>
            </motion.div>

            <div className="space-y-5">
              {layers.map((layer, idx) => (
                <motion.div
                  key={layer.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-xl border ${layer.borderColor} ${layer.bgColor} p-6 sm:p-8`}
                >
                  <div className="flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl ${layer.bgColor} border ${layer.borderColor} flex items-center justify-center shrink-0`}>
                      <layer.icon className={`h-5 w-5 ${layer.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black ${layer.color} tracking-[0.2em]`}>LAYER {layer.number}</span>
                        <Badge variant="outline" className={`text-[9px] ${layer.borderColor} ${layer.color}`}>
                          {layer.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground mb-1">{layer.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{layer.subtitle}</p>
                      <ul className="space-y-2">
                        {layer.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className={`h-4 w-4 ${layer.color} shrink-0 mt-0.5`} />
                            <span className="text-foreground/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Flow Diagram */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mt-8 rounded-xl border border-border bg-card/60 p-6">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 text-center tracking-[0.15em] uppercase">Verification Flow</h3>
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                {[
                  { label: "MPC (3 nodes)", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
                  { label: "→", color: "text-muted-foreground", bg: "" },
                  { label: "Public Attestation", color: "text-gold", bg: "bg-gold/10 border-gold/30" },
                  { label: "→", color: "text-muted-foreground", bg: "" },
                  { label: "Institutional Seal", color: "text-compliant", bg: "bg-compliant/10 border-compliant/30" },
                ].map((item, i) => (
                  item.bg ? (
                    <span key={i} className={`px-3 py-1.5 rounded-lg border ${item.bg} text-xs font-bold ${item.color}`}>
                      {item.label}
                    </span>
                  ) : (
                    <ArrowRight key={i} className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Institutional Seal is optional — reserved for high-value enterprise commits
              </p>
            </motion.div>
          </div>
        </section>

        {/* The Challenge */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Lock className="h-10 w-10 text-gold mx-auto mb-5" />
              <h2 className="text-2xl sm:text-3xl font-black mb-5">
                <span className="text-gold-gradient">The Challenge</span>
              </h2>
              <p className="text-foreground/80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-8">
                The protocol is open source. The cryptographic proofs are publicly verifiable.
                The ledger is immutable and append-only. The attestations are permissionless.
              </p>
              <div className="rounded-xl border border-gold/20 bg-gold/5 p-8 max-w-lg mx-auto">
                <p className="text-gold font-black text-xl sm:text-2xl tracking-wide leading-snug">
                  Open. Verifiable. Permissionless.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Mathematics does not require permission. Every hash is independently verifiable. Every Merkle root persists in the public record.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* EU AI Act Article 14 Compliance */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="rounded-xl border border-primary/20 bg-card/80 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  EU AI Act Article 14 — Human Oversight
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Article 14 requires that high-risk AI systems "shall be designed and developed in such a way
                  [...] that they can be effectively overseen by natural persons." The Open Evidence Protocol satisfies
                  this through:
                </p>
                <div className="space-y-2.5">
                  {[
                    "Human-in-the-loop: The public IS the human oversight layer — unlimited, permissionless, global",
                    "Diversity: Not 5 experts from one boardroom, but thousands of independent verifiers across jurisdictions",
                    "Non-repudiation: Every attestation is hashed and immutable — verifiers cannot deny their results",
                    "Accountability: Attestation volume creates mathematical consensus, not opinion-based governance",
                    "Timeliness: Verification is instantaneous — no 48-hour wait, no bureaucratic bottleneck",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-compliant shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl sm:text-3xl font-black mb-5">
                <span className="text-chrome-gradient">Join the</span>{" "}
                <span className="text-gold-gradient">Protocol</span>
              </h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
                No credentials required. No application process. Verify a proof. Submit your attestation.
                The math is the only credential that matters.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="lg" onClick={() => navigate("/verify")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Verifying
                </Button>
                <Button variant="heroOutline" size="lg" onClick={() => navigate("/explorer")}>
                  <Activity className="h-4 w-4 mr-2" />
                  Explore the Ledger
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Governance;
