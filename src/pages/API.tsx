import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, KeyRound, ShieldCheck } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "your-project";
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/psi-api`;

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-black/80 border border-border rounded p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
    <code>{children}</code>
  </pre>
);

const API = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>APEX PSI Unified API — Sync any system to the ledger</title>
      <meta name="description" content="Connect any app to APEX PSI via a single /v1 REST API. Notarize decisions and verify hashes with scoped apex_sk_ keys." />
    </Helmet>
    <Navbar />

    <main className="pt-24 pb-24 max-w-5xl mx-auto px-4">
      <header className="mb-12 border-b border-border pb-8">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-primary">
          <Terminal className="w-4 h-4" /> APEX PSI · Unified API · v1
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          One API. Every system. <span className="text-primary">Cryptographically synced.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Connect any external app, agent, or backend to the APEX PSI ledger. Notarize decisions, verify hashes,
          and stream proof — all through a single REST surface authenticated by scoped <code className="text-primary">apex_sk_*</code> keys.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-12">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground mb-1">Base URL</div>
          <code className="text-xs break-all">{BASE}</code>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground mb-1">Auth header</div>
          <code className="text-xs">Authorization: Bearer apex_sk_…</code>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground mb-1">Content type</div>
          <code className="text-xs">application/json</code>
        </CardContent></Card>
      </section>

      <div className="mb-12 border border-primary/40 rounded p-5 bg-primary/5">
        <p className="text-sm">
          Prefer agent-native integration? Use our MCP server{" "}
          <Link to="/mcp" className="text-primary underline font-semibold">→ /mcp</Link>
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" /> 1 · Generate a sync key
        </h2>
        <p className="text-muted-foreground mb-4">
          Go to <Link to="/dashboard" className="text-primary underline">Dashboard → Sync API keys</Link>, pick the scopes
          you need (<code>notarize:write</code>, <code>verify:read</code>), and copy the generated <code>apex_sk_…</code> token.
          It is shown once.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">Scope: notarize:write</Badge>
          <Badge variant="outline">Scope: verify:read</Badge>
          <Badge variant="outline">Legacy: apex_ntry_… also accepted</Badge>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3">2 · POST /v1/notarize</h2>
        <p className="text-muted-foreground mb-3">
          Submit an AI decision. Returns a signed PSI receipt with the Merkle leaf, the current root, and an Ed25519 signature.
        </p>
        <Code>{`curl -X POST ${BASE}/v1/notarize \\
  -H "Authorization: Bearer apex_sk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "decision": "Loan #4711 approved — credit score 742",
    "model_id": "internal-credit-v3",
    "predicate": "EU_ART_12",
    "context": {"applicant_id": "A-12345"}
  }'`}</Code>
        <Code>{`{
  "receipt_id": "APEX-PSI-7F2A…",
  "timestamp": "2026-05-26T05:04:12.913Z",
  "decision_hash": "sha256:…",
  "merkle_leaf":   "sha256:…",
  "merkle_root":   "sha256:…",
  "ed25519_signature": "…",
  "predicate_applied": "EU_ART_12",
  "receipt_version": "PSI-1.2",
  "engine": "APEX PSI v1 — Unified API"
}`}</Code>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3">3 · GET /v1/verify/:hash</h2>
        <p className="text-muted-foreground mb-3">
          Look up any commit, leaf, proof, or challenge hash. Returns the full ledger entry — or <code>verified: false</code> if it isn't anchored.
        </p>
        <Code>{`curl -H "Authorization: Bearer apex_sk_YOUR_KEY" \\
  ${BASE}/v1/verify/4d3b9af2c1e0...`}</Code>
        <Code>{`{
  "verified": true,
  "found": true,
  "commit_id": "APEX-PSI-7F2A…",
  "predicate_id": "EU_ART_12",
  "phase": "VERIFIED",
  "status": "APPROVED",
  "merkle_root": "sha256:…",
  "ed25519_signature": "…",
  "created_at": "2026-05-26T05:04:12.913Z"
}`}</Code>
        <p className="text-muted-foreground text-sm mt-3">
          Also accepts <code>?hash=…</code> as a query parameter.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3">4 · GET /v1/health</h2>
        <Code>{`curl ${BASE}/v1/health
# => { "ok": true, "ts": "…" }`}</Code>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3">Errors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2 pr-4">Code</th><th>Meaning</th></tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-t border-border"><td className="py-2 pr-4">400</td><td>Invalid body / missing field / bad hash format</td></tr>
              <tr className="border-t border-border"><td className="py-2 pr-4">401</td><td>Missing or invalid API key</td></tr>
              <tr className="border-t border-border"><td className="py-2 pr-4">403</td><td><code>insufficient_scope</code> — key lacks the required scope</td></tr>
              <tr className="border-t border-border"><td className="py-2 pr-4">404</td><td>Unknown endpoint</td></tr>
              <tr className="border-t border-border"><td className="py-2 pr-4">429</td><td><code>daily_limit_exceeded</code></td></tr>
              <tr className="border-t border-border"><td className="py-2 pr-4">500</td><td>Internal error — safe to retry</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Cryptographic guarantees
        </h2>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>SHA-256 over RFC 8785 (JCS) canonical JSON for every decision.</li>
          <li>Ed25519 signature over every Merkle leaf.</li>
          <li>Binary Merkle root recomputed from the latest 255 ledger leaves on every commit.</li>
          <li>Receipts conform to IETF <code>draft-singh-psi-00</code>.</li>
          <li>Root anchoring to Bitcoin (via OpenTimestamps) and Polygon — see <Link to="/protocol" className="text-primary underline">/protocol</Link>.</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
        <Link to="/dashboard" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded font-semibold">
          Get a sync key <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/protocol" className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded font-semibold">
          Read the protocol
        </Link>
        <Link to="/sdk" className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded font-semibold">
          SDK + CI/CD recipes
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default API;
