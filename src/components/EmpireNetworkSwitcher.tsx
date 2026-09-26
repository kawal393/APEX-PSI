import { useState, useRef, useEffect } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

type EmpireAsset = {
  name: string;
  url: string;
  descriptor: string;
  current?: boolean;
};

// Live public platforms only — nothing internal, unlaunched, or private.
const EMPIRE_ASSETS: EmpireAsset[] = [
  {
    name: "Apex PSI",
    url: "https://ai-governance-standard.com",
    descriptor: "Universal Verification Protocol",
    current: true,
  },
  {
    name: "Apex Infrastructure",
    url: "https://apex-infrastructure.com",
    descriptor: "Infrastructure & Operations",
  },
  {
    name: "Apex Global Consumer Shield",
    url: "https://global-shield.apex-infrastructure.com",
    descriptor: "Consumer Protection Engine",
  },
  {
    name: "Sovereign AI Services",
    url: "https://sovereign-ai.services",
    descriptor: "AI Governance Charters",
  },
  {
    name: "Apex Tatva",
    url: "https://www.apex-tat-va.store",
    descriptor: "Verified Botanical Medicine",
  },
];

const EmpireNetworkSwitcher = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full border-b border-border/60 bg-background">
      <div className="container mx-auto max-w-7xl px-4 h-8 flex items-center justify-between gap-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">
          ROCKYFILMS888 · Apex Intelligence Empire
        </span>

        <div ref={ref} className="relative shrink-0">
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Open Apex Empire Network"
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer py-1"
          >
            Apex Empire Network
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-[60] mt-1 w-[min(92vw,22rem)] rounded-lg border border-border bg-background shadow-xl p-2">
              <p className="px-3 pt-2 pb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
                Live Public Platforms
              </p>
              <ul className="divide-y divide-border/40">
                {EMPIRE_ASSETS.map((asset) => (
                  <li key={asset.url}>
                    <a
                      href={asset.url}
                      target={asset.current ? undefined : "_blank"}
                      rel={asset.current ? undefined : "noopener noreferrer"}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground group-hover:text-primary truncate">
                          {asset.name}
                          {asset.current && (
                            <span className="ml-2 font-mono text-[8px] uppercase tracking-widest text-primary/70">
                              You are here
                            </span>
                          )}
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                          {asset.descriptor}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-primary/80">
                          Live
                        </span>
                        {!asset.current && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpireNetworkSwitcher;
