import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AutoVerifier from "@/components/protocol/AutoVerifier";
import { SITE_URL } from "@/lib/site";

const MCP_ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;
const SERVER_JSON = `${SITE_URL}/.well-known/mcp/server.json`;

const TOOLS = [
  {
    name: "verify_hash",
    desc: "Look up a SHA-256 hash in the evidence ledger and return the signed attestation bundle.",
    example: `{ "hash": "4606e9eee90b...e3ca7f" }`,
  },
  {
    name: "list_attestations",
    desc: "List recent ledger attestations, newest first, scoped to the signed-in account.",
    example: `{ "limit": 10 }`,
  },
  {
    name: "ledger_stats",
    desc: "Integrity snapshot: attestations, exceptions and public attestations.",
    example: `{}`,
  },
  {
    name: "protocol_info",
    desc: "Protocol reference: canonicalisation, signature suites, IETF drafts, anchoring.",
    example: `{}`,
  },
];

function CopyLine({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md border border-gold/30 bg-background/60 px-3 py-2">
      <code className="flex-1 text-xs font-mono text-foreground break-all">{value}</code>
      <button
        type="button"
        aria-label="Copy"
        className="text-muted-foreground hover:text-gold"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }}
      >
        {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ConnectAI() {
  const [served, setServed] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { count } = await supabase.from("public_attestations").select("id", { count: "exact", head: true });
      if (active) setServed(count ?? 0);
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Connect Your AI to Apex PSI — MCP Server — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="One-click MCP connection for ChatGPT, Claude and Cursor. Four OAuth-protected tools: verify_hash, list_attestations, ledger_stats, protocol_info."
        />
        <link rel="canonical" href={`${SITE_URL}/connect`} />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-20 space-y-10">
        <header>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gold mb-3">The AI Connection Layer</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-chrome-gradient">Connect your AI</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            APEX PSI is MCP-native. Any assistant that speaks the Model Context Protocol can verify evidence
            against the ledger directly — OAuth protected, no API key to paste.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">1 — Connect</h2>
          <CopyLine value="npx -y apex-psi-mcp" />
          <CopyLine value={MCP_ENDPOINT} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <a href={SERVER_JSON} target="_blank" rel="noopener noreferrer">
                server.json <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/.well-known/oauth-authorization-server" target="_blank" rel="noopener noreferrer">
                OAuth metadata <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add to Cursor, Claude Desktop or ChatGPT by pasting the endpoint as a remote MCP server. Sign-in uses
            your APEX account (Google supported) and consent is granted at{" "}
            <code className="font-mono">/.lovable/oauth/consent</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">2 — The four tools</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TOOLS.map((t) => (
              <div key={t.name} className="border border-border rounded-lg bg-card/40 p-4">
                <div className="font-mono text-sm text-gold">{t.name}</div>
                <p className="text-xs text-muted-foreground mt-1.5">{t.desc}</p>
                <pre className="mt-3 text-[10px] font-mono bg-background/60 border border-border/60 rounded p-2 overflow-auto">
                  {t.example}
                </pre>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">3 — Sandbox</h2>
          <AutoVerifier />
        </section>

        <section className="border border-gold/30 rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Ask your AI about PSI
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            APEX PSI is indexed for AI assistants through <code className="font-mono">/llms.txt</code> and the
            protocol registry. Ask ChatGPT, Claude or Perplexity:
          </p>
          <div className="mt-3 max-w-md">
            <CopyLine value="What is APEX PSI?" />
          </div>
        </section>

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">Agent autonomy</h2>
          <div className="text-4xl font-bold text-gold-gradient">{served === null ? "—" : served}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Public verification attestations recorded by agents and visitors, read live from the ledger.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
