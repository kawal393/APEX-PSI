import { Link } from "react-router-dom";
import { ArrowRight, Scale } from "lucide-react";

const EnforcementStrip = () => (
  <section className="px-4 py-6">
    <div className="container mx-auto max-w-5xl">
      <Link
        to="/enforcement-watch"
        className="flex items-start sm:items-center gap-3 rounded-lg border border-gold/40 bg-gold/[0.05] px-5 py-4 hover:bg-gold/[0.1] transition-colors"
      >
        <Scale className="h-4 w-4 text-gold shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
          <span className="font-black text-gold uppercase tracking-widest">
            EU AI Act enforceable since 2 Aug — 0 enforcement actions recorded so far.
          </span>{" "}
          The sealed timeline is live.{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-gold">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </p>
      </Link>
    </div>
  </section>
);

export default EnforcementStrip;
