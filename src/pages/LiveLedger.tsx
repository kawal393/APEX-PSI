import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Link2, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

interface VisitEntry {
  sequence_number: number;
  page_path: string;
  visitor_hash: string;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}

interface Head {
  total_visits: number;
  head_hash: string | null;
  head_sequence: number | null;
  first_entry_at: string | null;
}

const GENESIS = "0".repeat(64);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mirrors the server-side chain construction exactly:
// sha256(seq | prev_hash | page_path | visitor_hash | ISO-8601 ms UTC)
function isoMs(ts: string): string {
  const d = new Date(ts);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.` +
    `${p(d.getUTCMilliseconds(), 3)}Z`
  );
}

export default function LiveLedger() {
  const [entries, setEntries] = useState<VisitEntry[]>([]);
  const [head, setHead] = useState<Head | null>(null);
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<{ checked: number; broken: number[] } | null>(null);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: rows }, { data: headRows }] = await Promise.all([
      (supabase.from("visit_ledger" as any) as any)
        .select("sequence_number,page_path,visitor_hash,prev_hash,entry_hash,created_at")
        .order("sequence_number", { ascending: false })
        .limit(60),
      (supabase.rpc as any)("visit_ledger_head"),
    ]);
    setEntries((rows ?? []) as VisitEntry[]);
    setHead(Array.isArray(headRows) ? (headRows[0] as Head) : (headRows as Head));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("visit_ledger_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visit_ledger" },
        (payload) => {
          const entry = payload.new as unknown as VisitEntry;
          setEntries((prev) => [entry, ...prev].slice(0, 60));
          setHead((prev) =>
            prev
              ? {
                  ...prev,
                  total_visits: prev.total_visits + 1,
                  head_hash: entry.entry_hash,
                  head_sequence: entry.sequence_number,
                }
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Recompute every loaded entry hash in the browser. Nothing is trusted.
  const runAudit = async () => {
    setAuditing(true);
    const broken: number[] = [];
    const asc = [...entries].sort((a, b) => a.sequence_number - b.sequence_number);
    for (let i = 0; i < asc.length; i++) {
      const e = asc[i];
      const expected = await sha256Hex(
        `${e.sequence_number}|${e.prev_hash}|${e.page_path}|${e.visitor_hash}|${isoMs(e.created_at)}`,
      );
      const linkOk = i === 0 || asc[i - 1].entry_hash === e.prev_hash;
      if (expected !== e.entry_hash || !linkOk) broken.push(e.sequence_number);
    }
    setAudit({ checked: asc.length, broken });
    setAuditing(false);
  };

  return (
    <>
      <Helmet>
        <title>Live Visit Ledger — Every Visit Cryptographically Witnessed | APEX PSI</title>
        <meta
          name="description"
          content="Every page view on the AI governance standard is appended to a public SHA-256 hash chain. Recompute the entire chain in your browser — no trust required."
        />
        <link rel="canonical" href={`${SITE_URL}/live`} />
        <meta property="og:url" content={`${SITE_URL}/live`} />
        <meta property="og:title" content="Live Visit Ledger — APEX PSI" />
        <meta
          property="og:description"
          content="A public, tamper-evident hash chain of every visit to the AI governance standard."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "APEX PSI Live Visit Ledger",
            description:
              "Public SHA-256 hash chain recording every page view on ai-governance-standard.com. Each entry commits to the previous entry hash, making retroactive edits detectable.",
            url: `${SITE_URL}/live`,
            license: "https://opensource.org/licenses/MIT",
            creator: { "@type": "Organization", name: "APEX PSI", url: SITE_URL },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-7xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Activity className="h-3 w-3 mr-1" /> Append-only · Live
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-4">
              <span className="text-gold-gradient">Live Visit</span> Ledger
            </h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Every page view on this domain is appended to a public SHA-256 hash chain. Each entry commits to the
              hash of the entry before it, so no visit can be inserted, removed or rewritten without breaking every
              hash that follows. Visitor identifiers are stored only as an irreversible hash — the ledger records
              that a visit existed, never who made it.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Witnessed visits</div>
              <div className="text-3xl font-black tabular-nums">
                {loading ? "—" : (head?.total_visits ?? 0).toLocaleString()}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Chain head</div>
              <div className="font-mono text-xs break-all">{head?.head_hash ?? GENESIS}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Chain opened</div>
              <div className="text-sm">
                {head?.first_entry_at ? new Date(head.first_entry_at).toLocaleString() : "awaiting first visit"}
              </div>
            </Card>
          </div>

          <Card className="p-5 mb-8 flex flex-wrap items-center gap-4">
            <Button onClick={runAudit} disabled={auditing || entries.length === 0}>
              {auditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Recompute chain in my browser
            </Button>
            {audit && (
              <div className="text-sm flex items-center gap-2">
                {audit.broken.length === 0 ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>
                      {audit.checked} entries recomputed. Every hash and every link matches. Verified locally — no
                      server response was trusted.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>
                      Chain break detected at sequence {audit.broken.join(", ")}. That is exactly what this ledger
                      exists to expose.
                    </span>
                  </>
                )}
              </div>
            )}
          </Card>

          <div className="space-y-2">
            {loading && <Card className="p-8 text-center text-muted-foreground">Loading chain…</Card>}
            {!loading && entries.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                The chain is empty. The next page view opens it.
              </Card>
            )}
            {entries.map((e) => (
              <Card key={e.entry_hash} className="p-4 hover:border-primary/40 transition-colors">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <Badge variant="outline" className="font-mono">
                    #{e.sequence_number}
                  </Badge>
                  <span className="font-mono text-sm">{e.page_path}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                  <div className="break-all">
                    <span className="text-foreground/70">entry</span> {e.entry_hash}
                  </div>
                  <div className="break-all flex items-start gap-1">
                    <Link2 className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      <span className="text-foreground/70">prev</span> {e.prev_hash}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
