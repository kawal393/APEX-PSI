import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Copy, ArrowRight } from "lucide-react";

const BADGE_SNIPPET =
  '<script src="https://ai-governance-standard.com/badge.js" data-name="Your Company" data-hash="YOUR_RECORD_HASH" async></script>';

const MCP_SNIPPET = "npx -y apex-psi-mcp";

const MCP_CONFIG = `{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "apex-psi-mcp"]
    }
  }
}`;

const SDK_SNIPPET =
  "git clone https://github.com/kawal393/APEX-PSI && cd APEX-PSI/packages";

const STATS_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/ledger-stats";

type LedgerStats = {
  total_receipts: number;
  confirmed_anchors: number;
  pending_anchors: number;
  latest_block_height: number | null;
};

// The wall is a list, not a promise. An entry appears only once its author holds
// a published receipt that recomputes, and every row deep-links to /r/<hash> so
// a visitor can check the listing against the ledger. An empty wall is the
// honest state until the first conformant operator exists.
type Operator = { name: string; hash: string; since: string };
const OPERATORS: Operator[] = [];

const CopyBox = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      {label && (
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      )}
      <pre className="overflow-x-auto rounded border border-border bg-background/80 p-3 font-mono text-[11px] text-muted-foreground">
        {code}
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="mt-2 flex items-center gap-1 rounded border border-primary/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const FREE_VS_PAID = [
  {
    head: "Free forever",
    lines: [
      "Checking any hash or receipt — no account, no key, no fee",
      "100 seals per day on the public commons",
      "The verifier, the schema and the specification",
      "Reading, copying and building on the protocol",
    ],
  },
  {
    head: "Paid (volume only)",
    lines: [
      "Builder — $11/mo, 2,000 seals per day",
      "Scale — $55/mo, 20,000 seals per day",
      "A paid key raises the daily cap and nothing else",
      "Government & enterprise by direct agreement",
    ],
  },
  {
    head: "Never sold",
    lines: [
      "A finding, a removal or a quiet outcome",
      "Exclusivity, or a claim of legal affiliation",
      "The free verifier, in any form, at any price",
    ],
  },
];

const Partners = () => {
  const [stats, setStats] = useState<LedgerStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(STATS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stats unavailable"))))
      .then((d) => {
        if (alive) setStats(d as LedgerStats);
      })
      .catch(() => {
        if (alive) setStats(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
  <>
    <Helmet>
      <title>Partners — Verified, Integrated and Powered by Apex PSI — Apex PSI — Universal Verification Protocol</title>
      <meta
        name="description"
        content="Four ways to work with APEX PSI: publish a verification badge, install the MCP server, build the reference client, or list an interop note. Checking stays free forever."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/partners" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Partners</p>
        <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Four ways to stand next to the protocol
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Listings describe technical use of an open protocol. They are not endorsements,
          certifications, or claims of legal affiliation in either direction.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/upgrade"
            className="inline-flex items-center gap-2 rounded border border-primary/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
          >
            API access &amp; caps <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/partner"
            className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            Take an operator reference
          </Link>
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {FREE_VS_PAID.map((col) => (
            <div key={col.head} className="rounded-md border border-border bg-card/40 p-5">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                {col.head}
              </h2>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                {col.lines.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">1 · Verified by Apex</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Publish a badge that resolves to a public verification record for a hash you control.
            Every record has a permanent, openly checkable receipt page.
          </p>
          <div className="mt-4 inline-flex items-center rounded border border-primary/40 bg-background/60 px-4 py-3">
            <div className="text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Verified by Apex</p>
              <p className="mt-1 text-sm font-semibold">Your Company</p>
              <p className="font-mono text-[9px] text-muted-foreground">YOUR_RECORD_HASH</p>
            </div>
          </div>
          <CopyBox code={BADGE_SNIPPET} label="One line · no build step" />
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">2 · Integrated via MCP</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The published MCP server gives any AI client five verbs — seal, verify, anchor status,
            ledger stats and protocol info. One command, no account needed to start checking.
          </p>
          <CopyBox code={MCP_SNIPPET} label="Install (npm, published)" />
          <CopyBox code={MCP_CONFIG} label="Client config" />
          <Link
            to="/mcp"
            className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
          >
            MCP tool reference <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">3 · Built on the reference client</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Language clients (TypeScript and Python) build from the repository and emit signed
            receipts from your own stack. Licensing terms are stated on the licence page; read that
            page before redistributing.
          </p>
          <CopyBox code={SDK_SNIPPET} label="Build from source" />
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://github.com/kawal393/APEX-PSI"
              className="inline-flex items-center gap-2 rounded border border-primary/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
            >
              ★ Source on GitHub
            </a>
            <Link
              to="/license"
              className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              Licence terms
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">4 · Listed in an interop note</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If your standard, marketplace or tool can be read by the cross-standard verifier, we
            publish a one-page interop note describing exactly how the two formats relate — dated,
            public, and stating facts only. Notes never claim that a format is part of another
            body's standard.
          </p>
          <Link
            to="/specs"
            className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
          >
            Spec shelf &amp; interop notes <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Operators on the wall</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Listings are earned by a published, checkable receipt — not by application and not by
            payment. Run the protocol, pass the conformance check, and the record stands on its own.
            Slots below are added with a date and a hash anyone can recompute.
          </p>
          <div className="mt-6">
            {OPERATORS.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded border border-dashed border-border px-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                No listing yet — the first conformant operator appears here with a date and a hash
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {OPERATORS.map((o) => (
                  <a
                    key={o.hash}
                    href={`https://ai-governance-standard.com/r/${o.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-border bg-background/60 px-4 py-3 hover:border-primary/50"
                  >
                    <p className="truncate text-sm font-semibold">{o.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">since {o.since}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-primary">{o.hash.slice(0, 20)}…</p>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { k: "Public receipts", v: stats ? String(stats.total_receipts) : "unavailable" },
              { k: "Confirmed anchors", v: stats ? String(stats.confirmed_anchors) : "unavailable" },
              { k: "Ledger block", v: stats?.latest_block_height ? String(stats.latest_block_height) : "unavailable" },
            ].map((s) => (
              <div key={s.k} className="rounded border border-border/60 px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{s.k}</p>
                <p className="mt-1 font-mono text-sm text-foreground">{s.v}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Counters read the public ledger directly. These are measurements of this infrastructure, not a
            projection of anyone's revenue.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/partner"
              className="inline-block rounded border border-primary/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
            >
              Take an operator reference →
            </Link>
            <Link
              to="/conformance"
              className="inline-block rounded border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              Run the conformance check
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            An operator reference carries no revenue share, no exclusivity and no endorsement. It
            attributes your own seals to you.
          </p>
        </section>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Money buys process, never outcome. Verification of any published receipt stays free for
          anyone, forever, without an account — that is the part of this system that is not for sale.
        </p>
      </main>
      <Footer />
    </div>
  </>
  );
};

export default Partners;
