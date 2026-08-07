import { Scale, GitBranch } from "lucide-react";
import { GITHUB_REPO } from "@/components/integrations/integrationsData";

/**
 * Small legal + source note required on every distribution-layer page.
 * States the Article 50 position honestly: technical evidence, not certification.
 */
const ProtocolNote = () => (
  <div className="container mx-auto max-w-5xl px-4 pb-12">
    <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <Scale className="h-4 w-4 text-gold shrink-0" />
      <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
        EU AI Act Article 50 applicable since 2 August 2026 — technical evidence, not legal certification.
      </p>
      <a
        href={GITHUB_REPO}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-gold hover:text-gold/80 transition-colors shrink-0"
      >
        <GitBranch className="h-3.5 w-3.5" /> Source on GitHub · MIT
      </a>
    </div>
  </div>
);

export default ProtocolNote;
