import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, Terminal } from "lucide-react";
import {
  HOSTED_COUNT,
  HOSTED_PATH,
  HOSTED_TOOLS,
  LOCAL_COMMAND,
  LOCAL_COUNT,
  LOCAL_TOOLS,
  SURFACE_SENTENCE,
} from "@/lib/mcp-surfaces";

// Door 2's address is the project's Supabase host, built exactly the way ConnectAI builds it.
// The site's own domain answers that path with the SPA shell, so printing
// www.ai-governance-standard.com/functions/v1/mcp here would hand an agent an HTML page and a
// confusing parse error instead of the JSON-RPC endpoint.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";
const HOSTED_URL = `https://${projectRef}.supabase.co${HOSTED_PATH}`;

const INSTALL = LOCAL_COMMAND;
const CLAUDE_CODE = "claude mcp add apex-psi -- npx -y apex-psi-mcp";
const MCPRUSH_URL = "https://mcprush.com/kawal393/apex-psi-mcp";
const CONFIG = `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "apex-psi-mcp"]
    }
  }
}`;

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-muted/80 border border-border rounded p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
    <code>{children}</code>
  </pre>
);

// Tool names and descriptions live in one module, src/lib/mcp-surfaces.ts, because APEX PSI
// ships TWO MCP servers and this page used to print them as if they were one: it advertised
// verify_hash / anchor_status / list_attestations / ledger_stats / protocol_info beside the
// npm install command, and those five are the hosted connector's names, not the package's.
// An agent that installed `apex-psi-mcp` and called them got "unknown tool" — and a directory
// scraped this page and published the same mix, with our version number attached to the wrong
// door. The guard scripts/tool-name-check.mjs now fails the build on a mix.
const LOCAL_LINKS: Record<string, { label: string; to: string }> = {
  seal: { label: "Read the protocol", to: "/protocol" },
  verify: { label: "Open verifier", to: "/verify" },
  anchor: { label: "Ledger explorer", to: "/explorer" },
  cite: { label: "Look a record up", to: "/verify" },
  verify_chain: { label: "Ledger explorer", to: "/explorer" },
};

const HOSTED_LINKS: Record<string, { label: string; to: string }> = {
  seal: { label: "Read the protocol", to: "/protocol" },
  verify_hash: { label: "Open verifier", to: "/verify" },
  anchor_status: { label: "Ledger explorer", to: "/explorer" },
  list_attestations: { label: "Ledger explorer", to: "/explorer" },
  ledger_stats: { label: "Ledger explorer", to: "/explorer" },
  protocol_info: { label: "Read the protocol", to: "/protocol" },
};

// Both counts are derived from the measured lists, never typed. The hand-typed "6" that used
// to sit here is what a third-party directory copied onto a listing we now manage.
const SIGNALS = [
  { value: "A", label: "mcprush grade" },
  { value: "100/100", label: "mcprush trust score" },
  { value: String(LOCAL_COUNT), label: "Tools in the npm package · no account" },
  { value: String(HOSTED_COUNT), label: "Tools on the hosted connector · sign-in" },
];

const DEEPER = [
  { label: "Full REST API docs", to: "/api" },
  { label: "Read the protocol", to: "/protocol" },
  { label: "Generate scoped API keys", to: "/dashboard" },
  { label: "Try to break APEX PSI", to: "/challenge" },
];

const MCP = () => {
  const { t } = useTranslation();
  return (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>Apex PSI MCP Server — Model Context Protocol integration — Apex PSI — Universal Verification Protocol</title>
      <meta
        name="description"
        content="Two APEX PSI MCP doors, one ledger: the npm package (stdio, 5 tools, no account) and the hosted connector (streamable-http, 6 tools, OAuth sign-in). Published on npm and the official MCP Registry."
      />
    </Helmet>
    <Navbar />

    <main className="pt-24 pb-24 max-w-5xl mx-auto px-4">
      <header className="mb-14 border-b border-border pb-10">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-primary font-mono">
          <Terminal className="w-4 h-4" /> APEX PSI · MCP
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          <span className="text-chrome-gradient">Cryptographic evidence</span>{" "}
          <span className="text-gold-gradient">for every AI agent.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mb-6">
          {t("mcp.description", "Connect an MCP-compatible agent to create receipts, look up hashes, and read anchoring status. The npm client and the hosted MCP server are separate integrations; publication does not imply endorsement by MCP or the IETF.")}
        </p>
        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href="https://www.npmjs.com/package/apex-psi-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded font-semibold"
          >
            Install via npm <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://modelcontextprotocol.io/registry?search=apex-psi-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded font-semibold"
          >
            Registry listing <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={MCPRUSH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-gold/50 text-gold px-5 py-3 rounded font-semibold"
          >
            mcprush · Grade A <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2 font-mono">
          {/* No version digit here on purpose: npm moves ahead of this page every patch, and a
              stale "v1.1.1" on our own site is how a directory ended up printing one. */}
          <Badge variant="outline">apex-psi-mcp · install from npm</Badge>
          <Badge variant="outline">io.github.kawal393/apex-psi-mcp — ACTIVE</Badge>
          <Badge variant="outline">Free tier: 20 seals/min · 100/day</Badge>
        </div>
      </header>

      <section className="mb-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden">
          {SIGNALS.map((s) => (
            <div key={s.label} className="bg-background p-5">
              <div className="text-3xl md:text-4xl font-black tracking-tight text-gold-gradient">{s.value}</div>
              <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-mono text-muted-foreground">
          The grade and trust score are{" "}
          <a href={MCPRUSH_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            mcprush
          </a>
          &apos;s own security scan of this published code (Security &amp; Testing category,
          scanned 22&nbsp;Oct&nbsp;2026). We claimed and manage that listing, so read it as a third
          party&apos;s measurement of our public source — not as an endorsement, a partnership, or a
          rating APEX PSI gives anything. APEX PSI issues no scores; a seal proves a record was made,
          never that it is true.
        </p>
      </section>

      <section className="mb-14">
        <h2 className="text-2xl font-bold mb-3">1 · Install — door 1, the npm package</h2>
        <p className="text-muted-foreground text-sm mb-3">
          stdio on your machine, {LOCAL_COUNT} tools, nothing to sign in to.
        </p>
        <Code>{INSTALL}</Code>
        <p className="text-muted-foreground text-sm mt-4 mb-3">Claude Code, one line:</p>
        <Code>{CLAUDE_CODE}</Code>
        <p className="text-muted-foreground text-sm mt-4 mb-3">
          Claude Desktop, Cursor, Windsurf or any MCP client config:
        </p>
        <Code>{CONFIG}</Code>
        <p className="text-muted-foreground text-sm mt-4 mb-3">
          Door 2 is the hosted connector, for clients that speak streamable-http and will do an
          OAuth sign-in. Its address is this project&apos;s Supabase host plus{" "}
          <code className="text-primary">{HOSTED_PATH}</code> — an anonymous call returns{" "}
          <code className="text-primary">401</code> with the OAuth metadata pointer, which is the
          protocol asking for a session:
        </p>
        <Code>{HOSTED_URL}</Code>
        <div className="mt-4 text-sm text-muted-foreground space-y-1">
          <p>
            Optional env vars: <code className="text-primary">APEX_API_BASE</code> (API override),{" "}
            <code className="text-primary">APEX_API_KEY</code> (secret, institutional access).
          </p>
          <p>
            Backend: the live APEX PSI ledger — the same notarize/verify system this site uses.
          </p>
          <p>
            Source:{" "}
            <a
              href="https://github.com/kawal393/apex-psi-mcp-server"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              github.com/kawal393/apex-psi-mcp-server <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-2xl font-bold mb-3">2 · The tools — two doors, one ledger</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
          {SURFACE_SENTENCE} Both write to the same append-only ledger, so a record sealed through
          either door is verifiable through both.{" "}
          <span className="font-mono text-[11px]">
            A seal proves a record was made, never that it is true.
          </span>
        </p>

        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gold mb-3">
          Door 1 · npm package — stdio, runs on your machine, no account ({LOCAL_COUNT} tools)
        </h3>
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {LOCAL_TOOLS.map((tool) => {
            const link = LOCAL_LINKS[tool.name] ?? { label: "Read the protocol", to: "/protocol" };
            return (
              <Card key={`local-${tool.name}`}>
                <CardContent className="p-5">
                  <div className="font-mono text-sm text-primary mb-2">
                    {tool.name}
                    {tool.write ? (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-gold">
                        writes
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{tool.desc}</p>
                  <Link
                    to={link.to}
                    className="text-sm font-semibold inline-flex items-center gap-1 hover:text-gold transition-colors"
                  >
                    {link.label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gold mb-3">
          Door 2 · hosted connector — streamable-http, OAuth sign-in ({HOSTED_COUNT} tools)
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
          The hosted server is a separate integration from the npm package and it keeps its own
          tool names. An unauthenticated caller gets{" "}
          <code className="text-primary">HTTP 401</code> with a{" "}
          <code className="text-primary">WWW-Authenticate</code> pointer to its OAuth metadata —
          that is the Model Context Protocol asking you to sign in, not a missing door. It is the
          same project Supabase serves, so the records are identical.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {HOSTED_TOOLS.map((tool) => {
            const link = HOSTED_LINKS[tool.name] ?? { label: "Read the protocol", to: "/protocol" };
            return (
              <Card key={`hosted-${tool.name}`}>
                <CardContent className="p-5">
                  <div className="font-mono text-sm text-primary mb-2">
                    {tool.name}
                    {tool.write ? (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-gold">
                        writes
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{tool.desc}</p>
                  <Link
                    to={link.to}
                    className="text-sm font-semibold inline-flex items-center gap-1 hover:text-gold transition-colors"
                  >
                    {link.label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-2xl font-bold mb-4">3 · Go deeper</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {DEEPER.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center justify-between border border-border rounded px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <ArrowRight className="w-4 h-4 text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-border pt-6 text-xs font-mono text-muted-foreground">
        {t("mcp.scope", "PSI drafts are individual proposals, not approved IETF standards. A receipt’s Merkle root does not itself prove Bitcoin anchoring; check the returned anchor status and proof.")}
      </p>
    </main>
    <Footer />
  </div>
);
};

export default MCP;
