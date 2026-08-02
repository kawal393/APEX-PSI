import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";

const EUCodeBanner = () => (
  <Link
    to="/eu-ai-act"
    className="block border-b border-gold/30 bg-gold/[0.07] hover:bg-gold/[0.12] transition-colors"
  >
    <div className="container mx-auto max-w-7xl px-4 py-2.5 flex items-start sm:items-center justify-center gap-2 text-center">
      <ShieldCheck className="h-4 w-4 text-gold shrink-0 mt-0.5 sm:mt-0" />
      <p className="text-[11px] sm:text-xs text-foreground/90 leading-relaxed">
        <span className="font-black text-gold uppercase tracking-widest">EU AI Act Article 50 is now in force — APEX PSI is ready today.</span>{" "}
        In-band signed tamperproof metadata for AI-generated content, verifiable offline.{" "}
        <span className="font-semibold text-gold inline-flex items-center gap-1">
          View technical documentation <ArrowRight className="h-3 w-3" />
        </span>
      </p>
    </div>
  </Link>
);

export default EUCodeBanner;
