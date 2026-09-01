import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Globe, Clock, Zap, Camera, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import apexLogo from "@/assets/apex-logo.png";
import PWAInstallButton from "@/components/PWAInstallButton";

const Hero = () => {
  return (
    <section className="relative flex items-center justify-center px-4 pt-16 pb-12 grid-bg overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.10) 0%, hsl(35 80% 45% / 0.05) 40%, transparent 70%)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[420px] h-[420px] md:w-[680px] md:h-[680px] lg:w-[820px] lg:h-[820px] logo-emerge overflow-hidden rounded-full animate-breathe">
          <img src={apexLogo} alt="" className="w-full h-full object-contain" style={{ opacity: 0.95, filter: "blur(0.5px)", transform: "scale(1.1)" }} />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 mb-4 border-glow">
            <Shield className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] sm:text-xs font-black text-gold tracking-[0.25em] uppercase">
              Post-Quantum Provenance · IETF draft-singh-psi-00
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-5 tracking-tight leading-[0.9]">
            <span className="text-gold-gradient">APEX PSI</span>
            <br />
            <span className="text-chrome-gradient">The Universal Verification Layer</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-foreground/90 max-w-3xl mx-auto mb-4 font-semibold">
            Anyone, anywhere, verifies any AI output for free — forever. No permission. No account.
            The math is open. The issuance is ours.
          </p>
          <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Not a product. A missing layer of the digital world.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-10">
            APEX PSI records declared <span className="text-chrome-gradient font-bold">AI</span> actions.
            APEX PRAMAAN records what <span className="text-gold-gradient font-bold">humans</span> report witnessing.{" "}
            <Link
              to="/verify?hash=4606e9eee90b89d2fcf9d47c21fb00e558f60bb3c6ddf5955c2d005ae0e3ca7f"
              className="font-bold text-foreground underline decoration-gold/60 decoration-2 underline-offset-4 hover:text-gold transition-colors"
            >
              Mathematically
            </Link>
            {" "}— see a sealed record verify live. The seal proves integrity, not the truth of its claims.
          </p>


          {/* Status chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
            {[
              "IETF draft-singh-psi-00",
              "NIST FIPS 204 (ML-DSA-65)",
              "Ed25519 · SHA-256",
              "MIT Open Source",
            ].map((chip) => (
              <span key={chip} className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-3 py-1 bg-background/60 backdrop-blur">
                {chip}
              </span>
            ))}
          </div>

          {/* Prove-it-yourself entry point */}
          <Link
            to="/hello-psi"
            className="group block max-w-2xl mx-auto mb-4 rounded-lg border border-border hover:border-gold/60 bg-card/40 hover:bg-card/70 transition-all px-5 py-4 text-left"
          >
            <div className="flex items-center gap-4">
              <Zap className="h-5 w-5 text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-1">
                  Hello PSI — prove it in 60 seconds
                </p>
                <p className="text-sm text-foreground/90 leading-snug">
                  Seal any bytes in your browser, then recompute the identical digest with the
                  zero-dependency Python or Node reference implementation.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gold shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Regulator entry point — full technical specification */}
          <Link
            to="/spec"
            className="group block max-w-2xl mx-auto mb-10 rounded-lg border border-gold/40 bg-gold/[0.06] hover:bg-gold/[0.12] hover:border-gold/70 transition-all px-5 py-4 text-left"
          >
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-1">
                  Full Technical Specification
                </p>
                <p className="text-sm text-foreground/90 leading-snug">
                  Every algorithm, endpoint, and{" "}
                  <span className="font-bold text-foreground">stated limitation</span> — with a direct
                  EU AI Act Article 50 mapping.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gold shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Dual CTA — one per pillar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
            <Button variant="hero" size="lg" className="text-sm sm:text-base px-8 w-full sm:w-auto" asChild>
              <Link to="/standard">
                <Shield className="mr-2 h-4 w-4" /> Adopt the Standard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero" size="lg" className="text-sm sm:text-base px-8 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950" asChild>
              <Link to="/pramaan">
                <Camera className="mr-2 h-4 w-4" /> Seal Your Content <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
            <Button size="lg" className="bg-gold hover:bg-gold/90 text-background font-black tracking-[0.15em] px-8 border border-gold shadow-lg shadow-gold/30" asChild>
              <Link to="/pramaan">🧿 I WITNESS THIS <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <PWAInstallButton />
            <Button variant="heroOutline" size="sm" asChild>
              <Link to="/verify"><Zap className="mr-1 h-3.5 w-3.5" /> Verify a Receipt</Link>
            </Button>
          </div>

          <p className="mt-8 text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground/70">
            The standard exists. The receipts are permanent.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
