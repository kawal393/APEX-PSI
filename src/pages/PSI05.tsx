import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExternalLink } from "lucide-react";
import { SITE_URL } from "@/lib/site";

const DATATRACKER = "https://datatracker.ietf.org/doc/draft-singh-apex-psi-05/";
const TEXT = "https://www.ietf.org/archive/id/draft-singh-apex-psi-05-02.txt";

const ENDPOINTS = [
  { method: "POST", path: "/v1/notarize", body: "Seal a disclosure recomputation and receive a dual-signed receipt." },
  { method: "GET", path: "/v1/verify?hash=…", body: "Verify a receipt hash and return both signatures plus anchor state." },
  { method: "GET", path: "/functions/v1/verify-hash?hash=…", body: "Public, keyless ledger lookup for regulators and agents." },
  { method: "MCP", path: "verify_hash", body: "Agent-native verification through the MCP server." },
];

const TIERS = [
  { tier: "Reference", terms: "Royalty-free for verification, research and regulatory review. MIT-licensed implementation." },
  { tier: "Issuer", terms: "Free for organisations issuing disclosure integrity receipts, at any scale. No per-receipt charge." },
  { tier: "Registry", terms: "Free for exchanges, registries and data vendors republishing recomputation status. No annual charge." },
];

export default function PSI05() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>PSI-05 — Financial Disclosure Integrity — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="draft-singh-apex-psi-05: Financial Disclosure Integrity. Hybrid dual-signature framework, ledger structure, API endpoints and terms of use. Free for all use."
        />
        <link rel="canonical" href={`${SITE_URL}/standards/psi-05`} />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pt-28 pb-20 space-y-10">
        <header>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono mb-4">
            <span className="border border-gold/40 text-gold rounded px-2 py-0.5">FILED — IETF</span>
            <span className="border border-border/60 text-muted-foreground rounded px-2 py-0.5">
              draft-singh-apex-psi-05
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-chrome-gradient">Financial Disclosure Integrity</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            PSI-05 applies Proof of Stateful Integrity to financial disclosure: every recomputation of a filed
            figure is canonicalised, dual-signed and appended to an append-only ledger, so a third party can
            replay both the arithmetic and the signatures years later.
          </p>
          <div className="flex flex-wrap gap-4 mt-5 text-xs font-mono">
            <a href={DATATRACKER} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">
              datatracker record <ExternalLink className="h-3 w-3" />
            </a>
            <a href={TEXT} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">
              draft text (-05-02) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </header>

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Hybrid dual-signature framework
          </h2>
          <p className="text-sm text-muted-foreground">
            Each receipt carries independent signatures over the same RFC 8785 canonical payload:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-mono text-gold">Ed25519</span> — fast classical verification, usable in
              browsers and constrained runtimes today.
            </li>
            <li>
              <span className="font-mono text-gold">ML-DSA-65 (NIST FIPS 204)</span> — lattice signature for
              post-quantum durability of long-lived filings.
            </li>
            <li>
              <span className="font-mono text-gold">LMS-W4-SHA256 (NIST SP 800-208)</span> — stateful hash-based
              signature used for ledger-level attestations.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            A verifier that trusts only one suite still obtains a complete proof; a verifier in 2045 can fall
            back to the quantum-resistant suite.
          </p>
        </section>

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Ledger structure</h2>
          <pre className="text-[11px] font-mono overflow-auto rounded-md border border-border/60 bg-background/60 p-4">{`entry {
  sequence_number   monotonic, gap-free
  commit_id         stable receipt identifier
  input_hash        SHA-256 of canonical source disclosure
  output_hash       SHA-256 of canonical recomputation
  predicate_id      rule applied (e.g. FIN_RECOMPUTE)
  verdict           MATCH | VARIANCE | INCOMPLETE
  ed25519_signature classical signature
  pq_signature      ML-DSA-65 / LMS-W4-SHA256
  merkle_leaf_hash  leaf in the periodic batch
  merkle_root       batch root
  anchor            OpenTimestamps proof -> Bitcoin txid
}`}</pre>
          <p className="text-xs text-muted-foreground mt-3">
            Leaves are batched into a Merkle tree; roots are submitted to OpenTimestamps calendars and are
            reported as <span className="font-mono">pending</span> until a real Bitcoin block includes them.
          </p>
        </section>

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">API endpoints</h2>
          <div className="space-y-2">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="border border-border/60 rounded-md p-3">
                <div className="font-mono text-xs text-gold">
                  {e.method} <span className="text-foreground">{e.path}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{e.body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <Link to="/api" className="text-gold hover:underline">Full API reference</Link>
            <Link to="/connect" className="text-gold hover:underline">Connect an AI agent</Link>
            <Link to="/stream" className="text-gold hover:underline">Live ledger</Link>
          </div>
        </section>

        <section className="border border-border rounded-lg bg-card/40 p-6">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Terms of use</h2>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <div key={t.tier} className="border border-border/60 rounded-md p-3">
                <div className="font-mono text-xs text-gold">{t.tier}</div>
                <p className="text-xs text-muted-foreground mt-1">{t.terms}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Verification and issuance are free, at any scale. The royalty tiers formerly published
            here were withdrawn on 4 September 2026; no charge was ever made under them. The APEX marks
            remain reserved.
          </p>
        </section>

        <div className="text-xs">
          <Link to="/portfolio" className="text-gold hover:underline">← Back to the standards portfolio</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
