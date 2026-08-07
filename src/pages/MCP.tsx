import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Bot, GitBranch, Globe, Terminal } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtocolNote from "@/components/ProtocolNote";
import CopyBlock from "@/components/CopyBlock";
import InstallCounter from "@/components/integrations/InstallCounter";
import { GITHUB_REPO } from "@/components/integrations/integrationsData";
import { SITE_URL } from "@/lib/site";

const CLIENTS = [
  {
    id: "claude",
    label: "Claude Desktop",
    path: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json · Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "@apex/psi-mcp"],
      "env": {
        "APEX_PSI_API_URL": "https://ai-governance-standard.com"
      }
    }
  }
}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    path: "Project: .cursor/mcp.json · Global: ~/.cursor/mcp.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "@apex/psi-mcp"],
      "env": {
        "APEX_PSI_API_URL": "https://ai-governance-standard.com"
      }
    }
  }
}`,
  },
  {
    id: "continue",
    label: "Continue.dev",
    path: "~/.continue/config.yaml",
    lang: "yaml",
    config: `mcpServers:
  - name: apex-psi
    command: npx
    args:
      - "-y"
      - "@apex/psi-mcp"
    env:
      APEX_PSI_API_URL: https://ai-governance-standard.com`,
  },
  {
    id: "goose",
    label: "Goose",
    path: "~/.config/goose/config.yaml",
    lang: "yaml",
    config: `extensions:
  apex-psi:
    enabled: true
    type: stdio
    cmd: npx
    args:
      - "-y"
      - "@apex/psi-mcp"
    envs:
      APEX_PSI_API_URL: https://ai-governance-standard.com`,
  },
  {
    id: "cline",
    label: "Cline",
    path: "VS Code: ~/.../globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "@apex/psi-mcp"],
      "disabled": false,
      "autoApprove": ["verify", "cite"],
      "env": {
        "APEX_PSI_API_URL": "https://ai-governance-standard.com"
      }
    }
  }
}`,
  },
];

const TOOLS = [
  {
    name: "seal",
    what: "Signs a piece of content or an AI decision and writes it to the evidence ledger.",
    params: "The content or decision text, an optional model identifier, and an optional predicate such as an EU AI Act article.",
    returns: "A receipt ID, the SHA-256 content hash, the Ed25519 and post-quantum signatures, and a public verify URL.",
    example: `seal({
  content: "Model approved loan application #4521",
  predicate: "EU_ART_12"
})`,
  },
  {
    name: "verify",
    what: "Checks whether a hash exists in the ledger and whether its signatures still validate.",
    params: "A SHA-256 hash or a receipt ID.",
    returns: "Found or not found, the original timestamp, signature validity, and any anchor status.",
    example: `verify({
  hash: "4606e9ee…0e3ca7f"
})`,
  },
  {
    name: "anchor",
    what: "Submits a receipt's Merkle root to Bitcoin via OpenTimestamps for third-party timestamping.",
    params: "A receipt ID or Merkle root to anchor.",
    returns: "The submitted root, the OpenTimestamps proof reference, and pending or confirmed status.",
    example: `anchor({
  receipt_id: "APEX-NTR-A1B2C3D4"
})`,
  },
  {
    name: "cite",
    what: "Returns a regulator-ready citation block for a receipt, with the algorithms and standards used.",
    params: "A receipt ID or hash, plus an optional framework such as EU AI Act Article 50.",
    returns: "A formatted citation, the verification URL, and the mapped technical requirements.",
    example: `cite({
  hash: "4606e9ee…0e3ca7f",
  framework: "eu-ai-act/art-50"
})`,
  },
  {
    name: "audit",
    what: "Returns every seal recorded for an entity so an agent can produce a full evidence trail.",
    params: "An entity identifier or domain, and an optional date range.",
    returns: "A list of receipts with hashes, timestamps, predicates and verification links.",
    example: `audit({
  entity: "example.com",
  since: "2026-08-01"
})`,
  },
];

const MCP = () => {
  const [client, setClient] = useState(CLIENTS[0].id);
  const active = CLIENTS.find((c) => c.id === client) ?? CLIENTS[0];

  return (
    <>
      <Helmet>
        <title>APEX PSI MCP Server — Evidence for Every AI Agent</title>
        <meta
          name="description"
          content="Install the APEX PSI MCP server in 60 seconds. Works with Claude Desktop, Cursor, Continue.dev, Goose and Cline. Cryptographic receipts for every AI decision."
        />
        <link rel="canonical" href={`${SITE_URL}/mcp`} />
        <meta property="og:title" content="APEX PSI MCP Server — Evidence for Every AI Agent" />
        <meta
          property="og:description"
          content="One MCP server. Every Claude, Cursor, Goose, Cline and custom agent. Cryptographic evidence for every AI decision."
        />
        <meta property="og:url" content={`${SITE_URL}/mcp`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        {/* Hero */}
        <section className="px-4 pt-12 pb-8">
          <div className="container mx-auto max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold mb-4 inline-flex items-center gap-2">
                <Bot className="h-3.5 w-3.5" /> Model Context Protocol
              </p>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[0.95] mb-5">
                <span className="text-chrome-gradient">Plug APEX PSI into every</span>{" "}
                <span className="text-gold-gradient">AI agent in 60 seconds</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-8">
                One MCP server. Every Claude, Cursor, Goose, Cline, Continue and custom agent. Cryptographic evidence
                for every AI decision, automatically.
              </p>
              <InstallCounter title="MCP network" />
            </motion.div>
          </div>
        </section>

        {/* Install steps */}
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl space-y-4">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-card/70 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-7 w-7 rounded-full border border-gold/40 bg-gold/10 text-gold text-xs font-black flex items-center justify-center">1</span>
                <h2 className="text-base font-black">Run the installer</h2>
              </div>
              <CopyBlock code="npx -y @apex/psi-mcp install" />
              <p className="mt-3 text-xs text-muted-foreground">
                Installs the stdio MCP server and prints the config block for any detected client.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-card/70 p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-7 w-7 rounded-full border border-gold/40 bg-gold/10 text-gold text-xs font-black flex items-center justify-center">2</span>
                <h2 className="text-base font-black">Add to your MCP config</h2>
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
                {CLIENTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClient(c.id)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-widest transition-colors ${
                      client === c.id
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-border bg-background/60 text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-mono text-muted-foreground mb-2 break-all">{active.path}</p>
              <CopyBlock code={active.config} multiline label={`${active.label} · ${active.lang}`} />
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border bg-card/70 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-7 w-7 rounded-full border border-gold/40 bg-gold/10 text-gold text-xs font-black flex items-center justify-center">3</span>
                <h2 className="text-base font-black">Restart your agent and start signing</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-gold">•</span> Every AI decision now gets a PSI receipt.</li>
                <li className="flex gap-2">
                  <span className="text-gold">•</span> Verify any receipt at the{" "}
                  <Link to="/verify" className="text-gold hover:underline">/verify page</Link>.
                </li>
                <li className="flex gap-2"><span className="text-gold">•</span> Zero code changes to existing prompts.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gold" /> The five tools this server exposes
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              Plain-English contracts — an agent can call these without any APEX-specific knowledge.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {TOOLS.map((t) => (
                <div key={t.name} className="rounded-xl border border-border bg-card/70 p-5">
                  <p className="font-mono text-sm font-black text-gold mb-3">{t.name}</p>
                  <dl className="space-y-2.5 text-xs mb-4">
                    <div>
                      <dt className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">Does</dt>
                      <dd className="text-foreground/90">{t.what}</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">Parameters</dt>
                      <dd className="text-foreground/90">{t.params}</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">Returns</dt>
                      <dd className="text-foreground/90">{t.returns}</dd>
                    </div>
                  </dl>
                  <CopyBlock code={t.example} multiline label="Example agent call" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reach */}
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-5">
              <p className="text-sm font-black text-foreground mb-1 inline-flex items-center gap-2">
                <Globe className="h-4 w-4 text-gold" /> X total installs · Y this week · Z countries
              </p>
              <p className="text-[11px] text-muted-foreground mb-4">
                Install telemetry is opt-in and not yet published, so these remain placeholders (updated weekly).
                Regions below are the reachable protocol surface, not a claim of adoption.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Australia", "European Union", "United States", "India", "United Kingdom", "Canada", "Japan", "Brazil", "Singapore"].map((c) => (
                  <span key={c} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-3 py-1 bg-background/60">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/integrations"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gold text-background font-bold text-sm h-11 px-6 hover:bg-gold/90 transition-colors"
                >
                  All integrations <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border h-11 px-6 text-sm font-semibold hover:border-gold/50 transition-colors"
                >
                  <GitBranch className="h-4 w-4" /> Source on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        <ProtocolNote />
        <Footer />
      </div>
    </>
  );
};

export default MCP;
