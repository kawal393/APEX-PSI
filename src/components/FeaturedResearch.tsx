import { motion } from "framer-motion";
import { ExternalLink, FileText, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const ARTICLE_URL = "https://medium.com/@veritaschain/seven-things-happened-this-week-that-prove-nobody-can-verify-what-ai-refuses-to-generate-e23ba194fcd6";

const FeaturedResearch = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-4 w-4 text-gold" />
            <span className="text-gold font-semibold tracking-widest uppercase text-xs">
              Featured Research
            </span>
          </div>

          {/* Card */}
          <div className="relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-primary/60 to-gold/40" />

            <div className="p-8 md:p-12">
              {/* Headline */}
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-6 max-w-3xl">
                Seven Developments, Four Continents, One Empty Column: The Global Verification Gap in AI Content Accountability
              </h3>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mb-8">
                {[
                  { icon: Globe, label: "4 continents analyzed" },
                  { icon: AlertTriangle, label: "20+ regulatory efforts" },
                  { icon: FileText, label: "7 developments fact-checked" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-muted/30 text-xs text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary/70" />
                    {label}
                  </div>
                ))}
              </div>

              {/* Key quote */}
              <blockquote className="relative pl-6 border-l-2 border-gold/50 mb-8">
                <p className="text-muted-foreground text-base md:text-lg italic leading-relaxed">
                  "Every regulatory effort, every platform policy, every enforcement action addresses what AI systems produce.
                  None of them can verify what AI systems <span className="text-foreground font-medium">refuse</span> to produce.
                  And until that changes, every safety claim will rest on the same three words: <span className="text-gold font-semibold">'Trust us.'</span>"
                </p>
              </blockquote>

              {/* Summary line */}
              <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
                A primary-source investigation across India's binding SGI mandate, the EU AI Act's Article 50 deadline,
                20+ US state bills, and the TAKE IT DOWN Act's 72-day countdown — revealing the structural absence
                that every framework shares.
              </p>

              {/* CTA */}
              <a href={ARTICLE_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="group border-gold/30 hover:border-gold/60 hover:bg-gold/5">
                  <span>Read the Full Analysis</span>
                  <ExternalLink className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedResearch;
