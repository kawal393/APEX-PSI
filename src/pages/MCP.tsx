import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, Terminal } from "lucide-react";

const INSTALL = "npx -y apex-psi-mcp";
const CONFIG = `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "apex-psi-mcp"]
    }
  }
}`;

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-black/80 border border-border rounded p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
    <code>{children}</code>
  </pre>
);

const TOOLS = [
  {
    name: "seal",
    desc: "SHA-256 + Ed25519 + post-quantum LMS receipt for any content.",
    linkLabel: "Verify receipts",
    to: "/verify",
  },
  {
    name: "verify",
    desc: "Check any hash against the immutable ledger.",
    linkLabel: "Open verifier",
    to: "/verify",
  },
  {
    name: "anchor",
    desc: "Bitcoin anchoring via OpenTimestamps.",
    linkLabel: "Read the protocol",
    to: "/protocol",
  },
  {
    name: "cite",
    desc: "APA / MLA / BibTeX citation of a receipt.",
    linkLabel: "Citation formats",
    to: "/cite",
  },
  {
    name: "audit",
    desc: "Verify a batch of receipts and report chain integrity.",
    linkLabel: "Ledger explorer",
    to: "/explorer",
  },
];

const DEEPER = [
  { label: "Full REST API docs", to: "/api" },
  { label: "Read the protocol", to: "/protocol" },
  { label: "Generate scoped API keys", to: "/dashboard" },
  { label: "Try to break APEX PSI", to: "/challenge" },
];

const MCP = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>APEX PSI MCP Server — Official Model Context Protocol integration — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Install APEX PSI as an MCP server: seal, verify, anchor, cite, audit. Published on npm and the official MCP Registry."
      />
    </Helmet>
    <Navbar />

    <main className="pt-24 pb-24 max-w-5xl mx-auto px-4">
      <header className="mb-14 border-b border-border pb-10">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-primary font-mono">
          <Terminal className="w-4 h-4" /> APEX PSI · MCP · v1.0.1
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          <span className="text-chrome-gradient">Cryptographic truth</span>{" "}
          <span className="text-gold-gradient">for every AI agent.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mb-6">
          APEX PSI is now an official MCP server. Any MCP-compatible agent — Claude, Cursor, Cline, or
          your own — can seal, verify, anchor, cite, and audit against our live ledger.
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
        </div>
        <div className="flex flex-wrap gap-2 font-mono">
          <Badge variant="outline">apex-psi-mcp v1.0.1 · npm</Badge>
          <Badge variant="outline">io.github.kawal393/apex-psi-mcp — ACTIVE</Badge>
          <Badge variant="outline">Free: 20 seals/min · 100/day · no account</Badge>
        </div>
      </header>

      <section className="mb-14">
        <h2 className="text-2xl font-bold mb-3">1 · Install</h2>
        <Code>{INSTALL}</Code>
        <p className="text-muted-foreground text-sm mt-4 mb-3">
          Then add it to your Claude Desktop / MCP client config:
        </p>
        <Code>{CONFIG}</Code>
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
        <h2 className="text-2xl font-bold mb-4">2 · The five tools</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Card key={tool.name + tool.to}>
              <CardContent className="p-5">
                <div className="font-mono text-sm text-primary mb-2">{tool.name}</div>
                <p className="text-sm text-muted-foreground mb-4">{tool.desc}</p>
                <Link
                  to={tool.to}
                  className="text-sm font-semibold inline-flex items-center gap-1 hover:text-gold transition-colors"
                >
                  {tool.linkLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
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
        Conforms to IETF draft-singh-psi. Seals are anchored to Bitcoin via OpenTimestamps.
      </p>
    </main>
    <Footer />
  </div>
);

export default MCP;
