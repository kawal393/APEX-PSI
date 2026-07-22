import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Camera, ArrowRight, Cpu, Eye, FileCheck, Fingerprint, Lock, Globe } from "lucide-react";

const TwoPillars = () => {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden border-y border-border/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_70%)]" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[10px] sm:text-xs font-black tracking-[0.35em] uppercase text-gold mb-3">
            The Two Pillars
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[0.95]">
            <span className="text-chrome-gradient">One Protocol.</span>{" "}
            <span className="text-gold-gradient">Every Truth.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Choose your side of the truth machine. Or use both — they share the same cryptographic root.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 relative">
          {/* Divider (desktop only) */}
          <div className="hidden md:block absolute top-8 bottom-8 left-1/2 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent -translate-x-1/2 pointer-events-none" />

          {/* LEFT — APEX PSI */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-900/60 via-background to-background p-6 sm:p-8 md:p-10 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/80">Pillar I · For AI Systems</p>
                <h3 className="text-2xl sm:text-3xl font-black text-chrome-gradient">APEX PSI</h3>
              </div>
            </div>

            <p className="text-lg sm:text-xl font-bold text-foreground mb-2">Prove what AI did.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Cryptographic evidence for every model decision. IETF draft-singh-psi-00. EU AI Act Articles 12, 14, 15.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: Cpu, text: "SHA-256 + Ed25519 + ML-DSA-65 hybrid signatures" },
                { icon: Lock, text: "Merkle-anchored, monotonic sequence counter" },
                { icon: Globe, text: "Compliance-Receipt HTTP header (draft-singh-psi-http-01)" },
                { icon: FileCheck, text: "MPC lattice attestation, permissionless verification" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Mini how-to */}
            <div className="rounded-lg border border-border/60 bg-background/60 p-4 mb-6">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-3">How to use — 3 steps</p>
              <ol className="space-y-2 text-sm">
                <li><span className="font-mono text-primary">01</span> · Install an SDK or add the <code className="text-xs bg-primary/10 px-1 rounded">Compliance-Receipt</code> header.</li>
                <li><span className="font-mono text-primary">02</span> · Sign every AI decision with your keypair.</li>
                <li><span className="font-mono text-primary">03</span> · Publish the receipt. Anyone can verify.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/standard" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-md text-sm transition-colors">
                Read the Standard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/header" className="inline-flex items-center gap-2 border border-primary/40 hover:border-primary text-primary px-5 py-2.5 rounded-md text-sm font-mono">
                Adopt the Header
              </Link>
              <Link to="/sdk" className="inline-flex items-center gap-2 text-primary/80 hover:text-primary px-3 py-2.5 rounded-md text-xs font-mono">
                SDK docs →
              </Link>
            </div>
          </motion.div>

          {/* RIGHT — APEX PRAMAAN */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/40 via-background to-background p-6 sm:p-8 md:p-10 hover:border-emerald-400/60 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl border border-emerald-400/40 bg-emerald-400/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400/90">Pillar II · For Humans</p>
                <h3 className="text-2xl sm:text-3xl font-black text-gold-gradient">APEX PRAMAAN</h3>
              </div>
            </div>

            <p className="text-lg sm:text-xl font-bold text-foreground mb-2">Prove what you saw.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Seal any photo, video, audio, or document. Client-side SHA-256. A 2 KB receipt that outlives every deepfake.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: Fingerprint, text: "Client-side SHA-256 — file never leaves your device" },
                { icon: FileCheck, text: ".praman receipt (2 KB) — Ed25519 signed, portable forever" },
                { icon: Lock, text: "Optional Bitcoin anchor via OpenTimestamps" },
                { icon: Eye, text: "Verify on any phone in 30 seconds — zero accounts" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-emerald-400/20 bg-background/60 p-4 mb-6">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400 mb-3">How to use — 3 steps</p>
              <ol className="space-y-2 text-sm">
                <li><span className="font-mono text-emerald-400">01</span> · Open <code className="text-xs bg-emerald-400/10 px-1 rounded">/pramaan</code> on any device.</li>
                <li><span className="font-mono text-emerald-400">02</span> · Drop your photo, video, or file.</li>
                <li><span className="font-mono text-emerald-400">03</span> · Download the <code className="text-xs bg-emerald-400/10 px-1 rounded">.praman</code> receipt. Share it forever.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/pramaan" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-5 py-2.5 rounded-md text-sm transition-colors">
                Seal Your Content <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/verify" className="inline-flex items-center gap-2 border border-emerald-400/40 hover:border-emerald-400 text-emerald-400 px-5 py-2.5 rounded-md text-sm font-mono">
                Verify a Receipt
              </Link>
              <Link to="/seal" className="inline-flex items-center gap-2 text-emerald-400/80 hover:text-emerald-400 px-3 py-2.5 rounded-md text-xs font-mono">
                Universal Seal →
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Shared root line */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground/80">
            Both pillars share one cryptographic root · Ed25519 · SHA-256 · IETF draft-singh-psi-00
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TwoPillars;
