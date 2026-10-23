import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AutoVerifier from "@/components/protocol/AutoVerifier";
import { SITE_URL } from "@/lib/site";
import { HOSTED_COUNT, HOSTED_TOOLS, LOCAL_COMMAND } from "@/lib/mcp-surfaces";

const MCP_ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;
const SERVER_JSON = `${SITE_URL}/.well-known/mcp/server.json`;

// One-line argument shapes for the hosted tools. The names themselves come from
// src/lib/mcp-surfaces.ts, which the guard checks against .lovable/mcp/manifest.json — the file
// the MCP SDK generates from src/lib/mcp/tools. This page used to show four of the six hosted
// tools and call the list "the four tools", which under-claimed our own connector.
const EXAMPLES: Record<string, string> = {
  seal: `{ "decision": "approved refund #4411", "model_id": "claude-sonnet" }`,
  verify_hash: `{ "hash": "4606e9eee90b...e3ca7f" }`,
  anchor_status: `{ "hash": "4606e9eee90b...e3ca7f" }`,
  list_attestations: `{ "limit": 10 }`,
  ledger_stats: `{}`,
  protocol_info: `{}`,
};

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
        <title>Connect Your AI to Apex PSI — MCP Server — Apex PSI — Universal Verification Protocol</title>
        <meta
          name="description"
          content={`One-click MCP connection for ChatGPT, Claude and Cursor. The hosted connector exposes ${HOSTED_COUNT} OAuth-protected tools, including seal; the npm package is a separate, key-free door with five tools over stdio.`}
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
          <p className="text-xs text-muted-foreground">
            Door 1 · the npm package: stdio on your machine, five tools, no sign-in.
          </p>
          <CopyLine value={LOCAL_COMMAND} />
          <p className="text-xs text-muted-foreground pt-2">
            Door 2 · the hosted connector on this page: streamable-http, {HOSTED_COUNT} tools, your
            APEX sign-in. An anonymous call returns HTTP 401 with an OAuth metadata pointer — the
            protocol asking for a session, not a missing server.
          </p>
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
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
            2 — The {HOSTED_COUNT} hosted tools
          </h2>
          <p className="text-xs text-muted-foreground">
            Names exactly as the deployed connector answers them.{" "}
            <code className="font-mono">seal</code> is the one write tool; the other five are
            read-only. These are the hosted names — the npm package answers with a different,
            overlapping set (seal, verify, anchor, cite, verify_chain).
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {HOSTED_TOOLS.map((t) => (
              <div key={t.name} className="border border-border rounded-lg bg-card/40 p-4">
                <div className="font-mono text-sm text-gold">
                  {t.name}
                  {t.write ? (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      writes
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{t.desc}</p>
                <pre className="mt-3 text-[10px] font-mono bg-background/60 border border-border/60 rounded p-2 overflow-auto">
                  {EXAMPLES[t.name] ?? "{}"}
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
