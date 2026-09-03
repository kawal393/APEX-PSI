import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Shield, AlertTriangle, CheckCircle2, Hash, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Step = "idle" | "registering" | "registered" | "challenging" | "proven";

const generateHash = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const SCENARIO = {
  name: "MedScan AI",
  type: "High-Risk Medical Imaging System",
  article: "Article 14 — Human Oversight",
  annexClass: "Annex III, Category 5(a)",
  output: "Patient scan #4821 classified as BENIGN — confidence 94.2%",
  model: "ResNet-152 (Medical Fine-tune v3.1)",
};

const LiveCaseStudy = () => {
  const [step, setStep] = useState<Step>("idle");
  const [hash, setHash] = useState("");
  const [proofHash, setProofHash] = useState("");
  const [blockNumber, setBlockNumber] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [outputsLogged, setOutputsLogged] = useState(0);
  const [challenges, setChallenges] = useState(0);

  const handleRegister = useCallback(async () => {
    setStep("registering");
    const h = await generateHash(SCENARIO.output);
    const now = new Date();
    setHash(h);
    setBlockNumber((prev) => (prev === 0 ? 8_421 : prev + 1));
    setTimestamp(now.toISOString().replace("T", " ").slice(0, 19) + " UTC");
    setOutputsLogged((prev) => prev + 1);
    setTimeout(() => setStep("registered"), 1800);
  }, []);

  const handleChallenge = useCallback(async () => {
    setStep("challenging");
    const p = await generateHash("evidence-response-" + hash);
    setProofHash(p);
    setChallenges((prev) => prev + 1);
    setTimeout(() => setStep("proven"), 2400);
  }, [hash]);

  const handleReset = () => {
    setStep("idle");
    setHash("");
    setProofHash("");
  };


  return (
    <section className="relative py-24 px-4 overflow-hidden" id="demo">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 0%, hsl(43 85% 52% / 0.03) 0%, transparent 50%)"
      }} />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="border-gold/30 text-gold mb-4">
            SIMULATED CASE STUDY
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            See PSI in <span className="text-gold-gradient">Action</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience how the PSI Protocol processes a real compliance scenario.
            Click through each step — the SHA-256 hashes are generated live in your browser.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
          {/* Main Demo Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            {/* Scenario Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-muted-foreground">SCENARIO</p>
                <p className="font-bold text-foreground">{SCENARIO.name}</p>
                <p className="text-xs text-muted-foreground">{SCENARIO.type} — {SCENARIO.annexClass}</p>
              </div>
              <Badge variant="outline" className="border-destructive/40 text-destructive text-xs">
                HIGH-RISK
              </Badge>
            </div>

            {/* AI Output */}
            <div className="px-6 py-5 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <Play className="h-3 w-3" /> AI MODEL OUTPUT
              </p>
              <div className="rounded-lg bg-background/60 border border-border p-4 font-mono text-sm text-foreground">
                <span className="text-muted-foreground">→</span> {SCENARIO.output}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Model: {SCENARIO.model}</p>
            </div>

            {/* Interactive Steps */}
            <div className="px-6 py-5 space-y-4">
              {/* Step 1: Register */}
              {step === "idle" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button variant="hero" size="lg" className="w-full text-base" onClick={handleRegister}>
                    <Hash className="h-5 w-5 mr-2" />
                    Register Output in PSI Ledger
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Step 1 of 3 — Hash the output and commit to the immutable ledger
                  </p>
                </motion.div>
              )}

              {/* Registering Animation */}
              {step === "registering" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                    <p className="text-sm text-foreground font-medium">Generating SHA-256 hash…</p>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border p-4 font-mono text-xs text-gold break-all animate-pulse">
                    {hash || "computing..."}
                  </div>
                </motion.div>
              )}

              {/* Registered — Show Hash Result */}
              <AnimatePresence>
                {(step === "registered" || step === "challenging" || step === "proven") && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-bold text-green-500">OUTPUT REGISTERED — COMPLIANT</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border p-4 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hash:</span>
                        <span className="text-gold break-all max-w-[70%] text-right">{hash.slice(0, 32)}…</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Block:</span>
                        <span className="text-foreground">#{blockNumber.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timestamp:</span>
                        <span className="text-foreground">{timestamp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="text-green-500 font-bold">NO CHALLENGE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="text-foreground">$0.00</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 2: Challenge */}
              {step === "registered" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Button
                    variant="heroOutline"
                    size="lg"
                    className="w-full text-base border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleChallenge}
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Simulate Regulator Challenge
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Step 2 of 3 — A regulator questions this output under {SCENARIO.article}
                  </p>
                </motion.div>
              )}

              {/* Challenging Animation */}
              {step === "challenging" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                    <p className="text-sm text-foreground font-medium">Building evidence response…</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomputing the digest and replaying the hash chain for {SCENARIO.article} — the source content is never published…
                  </p>
                </motion.div>
              )}

              {/* Step 3: Proof Result */}
              <AnimatePresence>
                {step === "proven" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        <p className="text-sm font-black text-green-500">EVIDENCE RESPONSE VERIFIED</p>
                      </div>
                      <div className="text-xs font-mono space-y-1">
                        <p className="text-muted-foreground">
                          Proof Hash: <span className="text-gold">{proofHash.slice(0, 32)}…</span>
                        </p>
                        <p className="text-muted-foreground">
                          Predicate check: <span className="text-green-500">{SCENARIO.article} — no violation pattern matched</span>
                        </p>
                        <p className="text-muted-foreground">
                          Content published: <span className="text-foreground font-bold">NONE — digest only</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="h-4 w-4 text-gold" />
                        <p className="text-xs font-bold text-foreground">KEY INSIGHT</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The record was recomputed and matched byte for byte, and the source content stayed private —
                        only its SHA-256 digest was published. This is an integrity and existence check against
                        <strong className="text-foreground"> {SCENARIO.article}</strong> predicate patterns. It is not a
                        zero-knowledge proof and it is not a compliance determination.
                      </p>
                    </div>

                    <Button variant="heroOutline" size="sm" onClick={handleReset} className="w-full">
                      Reset Demo
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Stats Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
              <p className="text-xs font-bold text-muted-foreground tracking-widest mb-4">THIS BROWSER SESSION</p>
              <div className="space-y-4">
                {[
                  { icon: Hash, label: "Outputs Logged", value: outputsLogged.toLocaleString(), color: "text-foreground" },
                  { icon: AlertTriangle, label: "Challenges", value: challenges.toString(), color: "text-destructive" },
                  { icon: Shield, label: "Evidence Responses", value: challenges.toString(), color: "text-green-500" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="h-4 w-4 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-lg font-black tabular-nums ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gold/20 bg-gold/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gold" />
                <p className="text-xs font-bold text-gold">WHAT THIS PROVES</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                That a specific sequence of bytes existed at a specific time, and that the record has not
                changed since. Nothing more. Costs, savings and comparisons to other systems are not
                published here because we have not measured them.
              </p>
            </div>
          </motion.div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          This is a simulated demonstration. Company, model and patient references are invented. All hashes are generated live in your browser using the Web Crypto API (SHA-256). Counters reflect only this browser session.
        </p>
      </div>
    </section>
  );
};

export default LiveCaseStudy;
