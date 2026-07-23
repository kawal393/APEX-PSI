import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Globe, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import apexLogo from "@/assets/apex-logo.png";
import { useVisitorLocation, useLiveClock } from "@/hooks/use-visitor-info";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();
  const location = useVisitorLocation();
  const time = useLiveClock();

  const formattedTime = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formattedDate = time.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const cityDisplay = [location.city, location.country].filter(Boolean).join(", ");

  return (
    <section className="relative min-h-[calc(100vh-4rem)] md:min-h-screen flex items-center justify-center px-4 pt-20 pb-12 grid-bg overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.08) 0%, hsl(35 80% 45% / 0.04) 40%, transparent 70%)" }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[720px] lg:h-[720px] logo-emerge overflow-hidden rounded-full animate-breathe">
          <img src={apexLogo} alt="" className="w-full h-full object-contain" style={{ opacity: 1, filter: "blur(0.5px)", transform: "scale(1.1)" }} />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 sm:px-4 py-1.5 mb-3 sm:mb-4 border-glow">
            <Shield className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] sm:text-xs font-semibold text-gold tracking-widest uppercase">
              Reference Implementation of draft-singh-psi-00
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 sm:px-4 py-1 mb-6 sm:mb-8">
            <span className="text-[9px] sm:text-[10px] font-bold text-primary tracking-widest uppercase">
              Open Evidence Protocol — Permissionless Verification · Live Now
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5 sm:mb-6"
          >
            <p className="text-sm sm:text-base md:text-lg font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary">
              APEX PSI · APEX PRAMAAN
            </p>
            <p className="mt-1 text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-gold">
              World's First Cryptographic Truth Protocol
            </p>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-3 sm:mb-4 tracking-tight leading-[0.95]">
            <span className="text-chrome-gradient">{t("hero.headline1")}</span>
            <br />
            <span className="text-gold-gradient">{t("hero.headline2")}</span>
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="rounded-lg border border-primary/20 bg-primary/5 px-4 sm:px-6 py-3 mb-5 sm:mb-6 max-w-2xl mx-auto"
          >
            <p className="text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-primary leading-relaxed">
              Mathematically Verified · IETF Internet-Drafts Filed
              <br />
              <span className="text-gold">Zero-Knowledge · Non-Repudiable · Open Source</span>
            </p>
          </motion.div>

          <p className="text-xs sm:text-sm font-mono text-primary/80 tracking-widest uppercase mb-4 sm:mb-5">
            Prescriptive Enforcement · Not Descriptive Governance
          </p>

          <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-3 sm:mb-4">
            <span className="text-foreground font-semibold">{t("hero.subtitle1")}</span>
          </p>
          <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-5 sm:mb-6">
            <span className="text-muted-foreground">through</span>{" "}
            <span className="text-gold-gradient font-bold">Zero-Knowledge Proofs</span>
            <span className="text-muted-foreground">,</span>{" "}
            <span className="text-gold-gradient font-bold">MPC Consensus</span>
            <span className="text-muted-foreground"> & </span>
            <span className="text-gold-gradient font-bold">Public Attestation</span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 max-w-xl mx-auto">
            RFC 8785 (JCS) · Ed25519 Signatures · Monotonic Sequencing · EU AI Act Articles 12, 14, 15
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mb-8 sm:mb-10">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary/70" />
              {cityDisplay}
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary/70" />
              <span className="tabular-nums">{formattedTime}</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="hidden sm:inline">{formattedDate}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <Button variant="hero" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto" asChild>
              <Link to="/seal">Seal Any File <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button variant="heroOutline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto" asChild>
              <Link to="/standard"><Shield className="mr-1 h-4 w-4" /> Adopt the Header</Link>
            </Button>
            <Button variant="heroOutline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto" asChild>
              <Link to="/protocol">Read the Protocol</Link>
            </Button>
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              to="/#pricing"
              className="inline-flex items-center gap-2 rounded-full border-2 border-gold bg-gold/5 px-5 py-2.5 text-xs sm:text-sm font-bold text-gold hover:bg-gold/10 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Seal Your Content — From $0.006/verification
            </Link>
          </div>
          <p className="mt-6 text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground/70">
            We do not solicit adoption. The standard exists.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
