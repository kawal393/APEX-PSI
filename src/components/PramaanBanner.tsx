import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Shield } from "lucide-react";
import { useEffect, useState } from "react";

const WITNESS_COUNT_KEY = "praman.witness.count";

const PramaanBanner = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        setCount(parseInt(localStorage.getItem(WITNESS_COUNT_KEY) || "0", 10) || 0);
      } catch { /* noop */ }
    };
    read();
    const onWitness = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setCount(detail);
      else read();
    };
    window.addEventListener("praman:witness", onWitness);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("praman:witness", onWitness);
      window.removeEventListener("storage", read);
    };
  }, []);

  return (
    <section className="relative border-y border-emerald-400/30 bg-gradient-to-r from-background via-emerald-950/20 to-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(160_80%_40%/0.1),transparent_70%)]" />
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14 relative">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-emerald-400 border border-emerald-400/40 rounded-full px-3 py-1 mb-4">
              <Sparkles className="h-3 w-3" /> Chapter II · The Final Chapter
            </div>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">
              Introducing <span className="text-gold-gradient">APEX PRAMAAN</span>
              <span className="block text-base md:text-lg font-mono text-emerald-400/90 mt-1">
                प्रमाण · The Truth Protocol
              </span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Apex PSI proves what AI <em>did</em>. <span className="text-foreground font-semibold">Apex Pramaan proves what is real.</span> A 2 KB cryptographic receipt that anchors any photo, video, or file to Bitcoin. Verifiable on any phone, in 30 seconds, with zero accounts. The oil-in-water mechanism for the AI flood.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs md:text-sm font-mono text-gold border border-gold/40 bg-gold/5 rounded-full px-3 py-1">
              ▲ <span className="font-bold tabular-nums">{count.toLocaleString()}</span>
              <span className="text-gold/80">files sealed</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 md:w-56 shrink-0">
            <Link to="/pramaan">
              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-5 py-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm">
                <Shield className="h-4 w-4" /> Enter Pramaan <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link to="/pramaan#spec">
              <button className="w-full border border-emerald-400/40 hover:border-emerald-400 text-emerald-400 px-5 py-2.5 rounded-md transition-colors text-xs font-mono">
                READ .praman SPEC
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PramaanBanner;
