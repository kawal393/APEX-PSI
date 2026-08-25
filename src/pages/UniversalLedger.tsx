import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import {
  UNIVERSAL_LEDGER,
  DOMAIN_LABEL,
  FENCE,
  CURATION_RULE,
  readStoredReceipts,
  writeStoredReceipt,
  type StoredReceipt,
} from "@/data/universalLedger";

const NOTARIZE_URL =
  "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

const GENESIS_TOKEN = "APEX-GENESIS-2026";

type RowStatus = { id: string; state: "ok" | "failed"; detail?: string };

const UniversalLedger = () => {
  const [params] = useSearchParams();
  const genesisUnlocked = params.get("genesis") === GENESIS_TOKEN;

  const [receipts, setReceipts] = useState<Record<string, StoredReceipt>>({});
  const [ruleOpen, setRuleOpen] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rowStatus, setRowStatus] = useState<RowStatus[]>([]);
  const [halt, setHalt] = useState<string | null>(null);

  useEffect(() => {
    setReceipts(readStoredReceipts());
  }, []);

  const counts = useMemo(() => {
    const c = { history: 0, science: 0, spirituality: 0, philosophy: 0 };
    UNIVERSAL_LEDGER.forEach((r) => (c[r.domain] += 1));
    return c;
  }, []);

  const sealedCount = UNIVERSAL_LEDGER.filter(
    (r) => receipts[r.id]?.decision_digest,
  ).length;

  const runGenesis = async () => {
    setSealing(true);
    setHalt(null);
    setRowStatus([]);
    setProgress(0);
    for (let i = 0; i < UNIVERSAL_LEDGER.length; i++) {
      const row = UNIVERSAL_LEDGER[i];
      const payload = {
        id: row.id,
        title: row.title,
        era: row.era,
        domain: row.domain,
        source: row.source,
        kind: row.kind,
        text: row.text ?? "",
      };
      try {
        const res = await fetch(NOTARIZE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predicate_id: `UNIVERSAL_LEDGER_${row.id}`,
            predicate: `UNIVERSAL_LEDGER_${row.id}`,
            payload,
            decision: JSON.stringify(payload),
          }),
        });
        const bodyText = await res.text();
        if (res.status === 401 || res.status === 403) {
          setHalt(`HTTP ${res.status} — ${bodyText}`);
          setSealing(false);
          return;
        }
        if (!res.ok) {
          setRowStatus((s) => [
            ...s,
            { id: row.id, state: "failed", detail: `HTTP ${res.status} — ${bodyText}` },
          ]);
        } else {
          const json = JSON.parse(bodyText) as {
            receipt_id: string;
            decision_hash?: string;
            merkle_leaf?: string;
            timestamp?: string;
          };
          const digest = (json.decision_hash || json.merkle_leaf || "").replace(
            /^sha256:/,
            "",
          );
          const stored: StoredReceipt = {
            receipt_id: json.receipt_id,
            decision_digest: digest,
            sealed_at: json.timestamp || new Date().toISOString(),
          };
          writeStoredReceipt(row.id, stored);
          setReceipts((prev) => ({ ...prev, [row.id]: stored }));
          setRowStatus((s) => [...s, { id: row.id, state: "ok" }]);
        }
      } catch (e) {
        setRowStatus((s) => [
          ...s,
          {
            id: row.id,
            state: "failed",
            detail: e instanceof Error ? e.message : String(e),
          },
        ]);
      }
      setProgress(i + 1);
    }
    setSealing(false);
  };

  const downloadFilled = () => {
    const filled = UNIVERSAL_LEDGER.map((r) => ({
      ...r,
      receipt_id: receipts[r.id]?.receipt_id || "",
      decision_digest: receipts[r.id]?.decision_digest || "",
      sealed_at: receipts[r.id]?.sealed_at || "",
    }));
    const blob = new Blob([JSON.stringify(filled, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "universal-ledger.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Helmet>
        <title>The Universal Ledger — Apex PSI</title>
        <meta
          name="description"
          content="One hundred records of history, science, spirituality and philosophy, sealed as existence, integrity and timestamp. The ledger does not judge. It remembers."
        />
        <link rel="canonical" href={`${SITE_URL}/ledger`} />
        <meta property="og:title" content="The Universal Ledger — Apex PSI" />
        <meta
          property="og:description"
          content="Existence, integrity and timestamp for one hundred records. Inclusion follows a published curation rule."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-12">
          <h1 className="font-serif text-3xl font-bold uppercase tracking-tight sm:text-5xl">
            The Universal Ledger
          </h1>
          <p className="mt-3 font-serif text-lg text-gold">
            The ledger does not judge. It remembers.
          </p>

          {/* FENCE — above the fold, verbatim */}
          <div className="mt-6 rounded-md border border-primary/40 bg-card/50 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{FENCE}</p>
          </div>

          {/* CURATION RULE — collapsible, verbatim */}
          <div className="mt-4 rounded-md border border-border">
            <button
              onClick={() => setRuleOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary"
            >
              Curation rule
              {ruleOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {ruleOpen && (
              <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                {CURATION_RULE}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>{UNIVERSAL_LEDGER.length} records</span>
            <span>{counts.history} history</span>
            <span>{counts.science} science</span>
            <span>{counts.spirituality} spirituality</span>
            <span>{counts.philosophy} philosophy</span>
            <span className="text-primary">{sealedCount} sealed</span>
          </div>

          {/* Guarded genesis panel */}
          {genesisUnlocked && (
            <div className="mt-8 rounded-md border border-gold/50 bg-gold/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                Genesis seal — one-time
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sealing writes one receipt per record to the public notary. Nothing is
                sealed automatically; this runs only when the button is pressed.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={runGenesis}
                  disabled={sealing}
                  className="rounded border border-gold px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-gold hover:bg-gold/10 disabled:opacity-50"
                >
                  {sealing ? "Sealing…" : "Seal Genesis (one-time)"}
                </button>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {progress}/{UNIVERSAL_LEDGER.length}
                </span>
                {sealedCount === UNIVERSAL_LEDGER.length && (
                  <button
                    onClick={downloadFilled}
                    className="flex items-center gap-1 rounded border border-primary px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10"
                  >
                    <Download className="h-3 w-3" /> universal-ledger.json
                  </button>
                )}
              </div>
              {halt && (
                <pre className="mt-4 overflow-x-auto rounded border border-destructive/50 bg-background/80 p-3 font-mono text-[10px] text-destructive">
                  {halt}
                </pre>
              )}
              {rowStatus.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded border border-border bg-background/60 p-3 font-mono text-[10px]">
                  {rowStatus.map((r) => (
                    <div
                      key={r.id}
                      className={r.state === "ok" ? "text-primary" : "text-destructive"}
                    >
                      {r.id} · {r.state}
                      {r.detail ? ` · ${r.detail}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Records */}
          {UNIVERSAL_LEDGER.length === 0 ? (
            <p className="mt-12 font-mono text-sm text-muted-foreground">
              Absence is also a record.
            </p>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {UNIVERSAL_LEDGER.map((row) => {
                const rec = receipts[row.id];
                return (
                  <article
                    key={row.id}
                    className="flex flex-col rounded-md border border-border bg-card/40 p-4"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
                      <span className="text-primary">#{row.id}</span>
                      <span className="text-muted-foreground">
                        {DOMAIN_LABEL[row.domain]}
                      </span>
                    </div>
                    <h2 className="mt-2 text-sm font-bold uppercase tracking-tight">
                      {row.title}
                    </h2>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {row.era} · {row.source}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {row.kind === "EXCERPT" && row.text ? (
                        <span className="font-serif">“{row.text}”</span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                          Citation only
                        </span>
                      )}
                    </p>
                    <div className="mt-4 border-t border-border/60 pt-3 font-mono text-[10px]">
                      {rec?.decision_digest ? (
                        <>
                          <div className="text-muted-foreground">{rec.receipt_id}</div>
                          <div className="text-muted-foreground">
                            {rec.decision_digest.slice(0, 10)}
                          </div>
                          <Link
                            to={`/verify?hash=${rec.decision_digest}`}
                            className="mt-1 inline-block uppercase tracking-wider text-primary hover:underline"
                          >
                            Verify →
                          </Link>
                        </>
                      ) : (
                        <span className="inline-block rounded border border-border px-2 py-0.5 uppercase tracking-[0.2em] text-muted-foreground">
                          genesis pending
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-12 font-serif text-lg text-muted-foreground">
            The ledger does not judge. It remembers.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default UniversalLedger;
