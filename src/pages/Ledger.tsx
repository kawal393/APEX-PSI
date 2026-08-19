import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Copy } from "lucide-react";

type Company = {
  slug: string;
  name: string;
  ticker: string;
  exchange: string;
  last_filing: string;
  status: "RECOMPUTED" | "PENDING" | "EXCEPTION";
  source: string;
  hash: string;
};

// Placeholder index. Replace with a Supabase query against the reconciliation
// index when the dataset is loaded.
const COMPANIES: Company[] = [];

const EmbedBlock = ({ company }: { company: Company }) => {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://ai-governance-standard.com/badge.js" data-name="${company.name}" data-hash="${company.hash}" async></script>`;
  return (
    <div className="mt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        Verified by Apex — embed code
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-border bg-background/80 p-3 font-mono text-[10px] text-muted-foreground">
        {snippet}
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet);
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

const Ledger = () => {
  const { slug } = useParams();
  const company = slug ? COMPANIES.find((c) => c.slug === slug) : undefined;

  return (
    <>
      <Helmet>
        <title>{company ? `${company.name} — Apex Ledger` : "Apex Ledger — Company Recomputation Index"}</title>
        <meta
          name="description"
          content="Public recomputation ledger: filing-derived figures independently recomputed and hash-anchored, with source citations."
        />
        <link rel="canonical" href={`https://ai-governance-standard.com/ledger${slug ? `/${slug}` : ""}`} />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-16">
          {!slug && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Apex Ledger</p>
              <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                Company recomputation index
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                Every entry records that a filing-derived figure was recomputed and hash-anchored at a
                point in time. It does not opine on the accuracy of the underlying filing.
              </p>

              <div className="mt-10 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-card/50">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-4 py-3">Exchange</th>
                      <th className="px-4 py-3">Last filing</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPANIES.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                          Loading 1,199 companies…
                        </td>
                      </tr>
                    ) : (
                      COMPANIES.map((c) => (
                        <tr key={c.slug} className="border-b border-border/60">
                          <td className="px-4 py-3">
                            <Link to={`/ledger/${c.slug}`} className="text-primary hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{c.ticker}</td>
                          <td className="px-4 py-3 font-mono text-xs">{c.exchange}</td>
                          <td className="px-4 py-3 font-mono text-xs">{c.last_filing}</td>
                          <td className="px-4 py-3 font-mono text-xs text-primary">{c.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {slug && (
            <>
              <Link to="/ledger" className="font-mono text-[10px] uppercase tracking-wider text-primary">
                ← Back to ledger
              </Link>
              {!company ? (
                <div className="mt-6 rounded-md border border-border p-8">
                  <h1 className="text-2xl font-bold uppercase">Entry unavailable</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No recomputation record exists for “{slug}”. Nothing is pending — nothing was submitted.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-md border border-border p-8">
                  <h1 className="text-2xl font-bold uppercase tracking-tight">{company.name}</h1>
                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    {[
                      ["Ticker", company.ticker],
                      ["Exchange", company.exchange],
                      ["Last filing date", company.last_filing],
                      ["Recomputation status", company.status],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</dt>
                        <dd className="mt-1 font-mono text-sm">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <a
                    href={company.source}
                    className="mt-6 inline-block font-mono text-[10px] uppercase tracking-wider text-primary underline underline-offset-2"
                  >
                    Source citation →
                  </a>
                  <EmbedBlock company={company} />
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Ledger;
