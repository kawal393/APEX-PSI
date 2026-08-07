import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CopyBlock from "@/components/CopyBlock";

const PACKAGES = [
  { icon: "JS", name: "@apex/psi-hono", lang: "Node.js / TypeScript", cmd: "npm i @apex/psi-hono", docs: "/api" },
  { icon: "PY", name: "apex-psi", lang: "Python", cmd: "pip install apex-psi", docs: "/api" },
  { icon: "AI", name: "@apex/psi-openai", lang: "OpenAI", cmd: "npm i @apex/psi-openai", docs: "/integrations#openai-functions" },
  { icon: "▲", name: "@apex/psi-vercel-ai", lang: "Vercel AI", cmd: "npm i @apex/psi-vercel-ai", docs: "/integrations#vercel-ai" },
];

/** One-click install cards shown above the detailed SDK documentation. */
const OneClickInstall = () => (
  <div className="mb-10">
    <h2 className="text-xl font-black mb-1">One-Click Install</h2>
    <p className="text-xs text-gallows-muted mb-5">
      Four packages, one receipt format. Full docs for each below.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PACKAGES.map((p) => (
        <div key={p.name} className="rounded-xl border border-gallows-border bg-gallows-surface p-4 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-lg border border-gold/30 bg-gold/[0.06] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-gold">{p.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gallows-muted">{p.lang}</p>
              <p className="text-xs font-bold font-mono truncate">{p.name}</p>
            </div>
          </div>
          <CopyBlock code={p.cmd} className="mb-3" />
          <Link to={p.docs} className="mt-auto inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors">
            Docs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ))}
    </div>
  </div>
);

export default OneClickInstall;
