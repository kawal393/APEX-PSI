import { motion } from "framer-motion";
import { ExternalLink, GitBranch, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/kawal393/APEX-PSI";

const OpenSourceGateway = () => {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(var(--primary) / 0.05) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary tracking-widest uppercase">
                Open Source Protocol
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black mb-4">
              <span className="text-chrome-gradient">Inspect the</span>{" "}
              <span className="text-gold-gradient">Protocol</span>
            </h2>

            <p className="text-muted-foreground max-w-2xl mx-auto mb-3 text-sm sm:text-base">
              Trust is not earned; it is verified.
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-xs sm:text-sm">
              The verifier and the recomputation engine are MIT-licensed, so anyone can audit
              the mathematical foundation. Every hash function, every Merkle construction,
              every signature scheme — publicly inspectable in the repository.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="hero" size="lg" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <GitBranch className="h-4 w-4 mr-2" />
                  View on GitHub
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <a href="/verify">
                  <Shield className="h-4 w-4 mr-2" />
                  Verify a Proof
                </a>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[10px] text-muted-foreground">
              <span>Python · TypeScript</span>
              <span className="text-border">|</span>
              <span>MIT License</span>
              <span className="text-border">|</span>
              <span>RFC 8785 · Ed25519 · SHA-256</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OpenSourceGateway;
