import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GITHUB_REPO } from "@/components/integrations/integrationsData";

const PARTNERS = [
  { initials: "AN", name: "Anthropic", built: "MCP server — PSI tools available to any Claude or MCP-compatible agent.", to: "/mcp", external: false },
  { initials: "LC", name: "LangChain", built: "Official integration package that seals every chain and agent step.", to: "/integrations#langchain", external: false },
  { initials: "CO", name: "Composio", built: "Custom PSI tool published in the hosted action library.", to: "/integrations#composio", external: false },
  { initials: "MK", name: "Make.com", built: "Native app for sealing payloads inside the scenario builder.", to: "/integrations#make", external: false },
  { initials: "HF", name: "Hugging Face", built: "Public demo Space for in-browser hashing and receipt lookup.", to: "/integrations#huggingface", external: false },
  { initials: "ST", name: "Stripe", built: "Webhook receipts wired to the $29 Article 50 receipt tier.", to: "/products", external: false },
];

/** Verified implementers grid — integration surface, not an endorsement claim. */
const FeaturedPartners = () => (
  <section className="py-16 px-4">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center mb-10">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold mb-3">Verified Implementers</p>
        <h2 className="text-2xl md:text-3xl font-black">
          Featured <span className="text-gold-gradient">Partners</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
          Ecosystems where an APEX PSI integration exists or is in build. Listing describes the integration surface —
          it is not a claim of endorsement.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARTNERS.map((p) => (
          <Link
            key={p.name}
            to={p.to}
            className="rounded-xl border border-border bg-card/70 p-4 hover:border-gold/40 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg border border-gold/30 bg-gold/[0.06] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-gold">{p.initials}</span>
              </div>
              <h3 className="text-sm font-black text-foreground">{p.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.built}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold">
              View integration <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/integrations"
          className="inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-gold/80 transition-colors"
        >
          View all 12+ partners &amp; integrations <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors"
        >
          Build your own — MIT licensed <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  </section>
);

export default FeaturedPartners;
