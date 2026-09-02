import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe2,
  Share2,
  ShieldCheck,
  Link2,
  Loader2,
  Eye,
  Landmark,
  Anchor,
  Clock,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════════
// THE LIVING IMPACT WALL
// The world speaks. The ledger remembers.
//
// Every testimony is sealed through the public notary (POST /notarize):
// SHA-256 + Ed25519 + LMS-W4-SHA256 (post-quantum), Merkle-rooted into
// the live APEX ledger, and readable by anyone through the public view.
// The seal certifies the WORDS and the TIME - never the claims inside
// them, and never a market number. Modelled figures live in their own
// panel, labelled, with sources linked. Nothing on this page wears a
// costume.
// ═══════════════════════════════════════════════════════════════════

const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";
const STATS_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/ledger-stats";
const PREDICATE = "APEX_IMPACT_WALL";
const MAX_STATEMENT = 450; // keeps the ledger action column lossless (500-char cap)

const ROLES = [
  "Enterprise",
  "Government",
  "Legal Firm",
  "Researcher",
  "SME",
  "AI Developer",
  "Citizen",
  "Individual",
] as const;

type LedgerStats = {
  total_receipts: number;
  confirmed_anchors: number;
  pending_anchors: number;
  latest_block_height: number | null;
  latest_anchor_txid: string | null;
  founded_at: string;
};

type WallEntry = {
  commit_id: string;
  action: string;
  created_at: string;
  merkle_leaf_hash: string | null;
};

type Receipt = {
  receipt_id: string;
  timestamp: string;
  decision_hash: string;
  merkle_leaf: string;
  merkle_root: string;
  post_quantum: boolean;
  algorithm: string;
};

// The notary stores: "NOTARIZE: APEX_IMPACT_WALL|<role>|<statement>"
function parseAction(action: string): { role: string; statement: string } | null {
  const body = action.replace(/^NOTARIZE:\s*/, "");
  const parts = body.split("|");
  if (parts.length < 3 || parts[0] !== PREDICATE) return null;
  return { role: parts[1], statement: parts.slice(2).join("|") };
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function ImpactWall() {
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [wallCount, setWallCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("Citizen");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [statsRes, feedRes, countRes] = await Promise.all([
        fetch(STATS_URL, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }),
        supabase
          .from("gallows_public_ledger")
          .select("commit_id, action, created_at, merkle_leaf_hash")
          .eq("predicate_id", PREDICATE)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("gallows_public_ledger")
          .select("commit_id", { count: "exact", head: true })
          .eq("predicate_id", PREDICATE),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (!feedRes.error && feedRes.data) setEntries(feedRes.data as WallEntry[]);
      if (!countRes.error && countRes.count !== null) setWallCount(countRes.count);
    } catch {
      /* the wall stays honest even when the network does not */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const speak = async () => {
    const text = statement.trim();
    if (text.length < 10) return toast.error("Say something worth keeping. At least 10 characters.");
    if (text.length > MAX_STATEMENT) return toast.error(`Too long. ${MAX_STATEMENT} characters maximum.`);
    setBusy(true);
    setReceipt(null);
    try {
      const decision = `${PREDICATE}|${role}|${text}`;
      const res = await fetch(NOTARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          model_id: "apex.impact.wall",
          context: { role, words: text.split(/\s+/).length },
          predicate: PREDICATE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sealing failed");
      setReceipt(data as Receipt);
      setStatement("");
      toast.success("Sealed. Your testimony is now part of the permanent public record.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not seal your testimony");
    } finally {
      setBusy(false);
    }
  };

  const share = async (commitId: string, text: string) => {
    const url = `https://ai-governance-standard.com/r/${commitId}`;
    const body = `I WITNESS THIS - ${text}\nSealed on the APEX public ledger: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "Living Impact Wall", text: body, url });
      else {
        await navigator.clipboard.writeText(body);
        toast.success("Copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <Helmet>
        <title>Living Impact Wall - Apex PSI - The world speaks. The ledger remembers.</title>
        <meta
          name="description"
          content="A live public wall of testimony about verifiable truth in the economy. Every statement is cryptographically sealed - SHA-256, Ed25519, post-quantum LMS - into the APEX public ledger. No edits. No deletions. No censorship."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/impact" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-16">
          {/* ── Hero ── */}
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Globe2 className="h-3 w-3 mr-1" /> Public ledger - live - permissionless
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">The world speaks.</span>{" "}
              <span className="text-chrome-gradient">The ledger remembers.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Say how verifiable truth touches your work, your industry, your economy - in your own
              words. Your testimony is sealed into the live APEX ledger: hashed, signed,
              post-quantum, Merkle-rooted, readable by anyone, deletable by no one - not even us.
            </p>
          </div>

          {/* ── LIVE counters - every number pulled from the ledger right now ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Card className="p-4 text-center">
              <Hash className="h-4 w-4 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-black tabular-nums">
                {stats ? stats.total_receipts.toLocaleString() : "--"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                sealed receipts
              </div>
            </Card>
            <Card className="p-4 text-center">
              <Anchor className="h-4 w-4 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-black tabular-nums">
                {stats ? stats.confirmed_anchors : "--"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                bitcoin anchors
              </div>
            </Card>
            <Card className="p-4 text-center">
              <Eye className="h-4 w-4 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-black tabular-nums">
                {wallCount !== null ? wallCount.toLocaleString() : "--"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                wall testimonies
              </div>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="h-4 w-4 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-black tabular-nums">
                {stats ? daysSince(stats.founded_at) : "--"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                days in operation
              </div>
            </Card>
          </div>
          {stats?.latest_block_height && (
            <p className="text-center text-[11px] text-muted-foreground mb-10">
              Latest confirmed Bitcoin anchor: block #{stats.latest_block_height.toLocaleString()}{" "}
              {stats.latest_anchor_txid && (
                <a
                  href={`https://mempool.space/tx/${stats.latest_anchor_txid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {stats.latest_anchor_txid.slice(0, 16)}...
                </a>
              )}{" "}
              - independently checkable by any stranger, any time.
            </p>
          )}

          {/* ── The standing bet ── */}
          <Card className="p-6 mb-8 border-gold/40 bg-gold/5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-3">
              The standing bet
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              <strong>Target — the founder's words, posted 2 Sep 2026:</strong> economic impact,
              $1 TRILLION+.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground mt-2">
              <strong className="text-foreground">Instrument —</strong> this ledger. Not a press
              release. Not a projection. Today's measurement:{" "}
              {stats
                ? `${stats.total_receipts.toLocaleString()} sealed receipts, ${stats.confirmed_anchors} Bitcoin anchors, ${daysSince(stats.founded_at)} days of continuous operation.`
                : "loading…"}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground mt-2">
              <strong className="text-foreground">Rule —</strong> the ledger reports; the founder
              does not. If the measurement ever reaches the target, the receipt prints here first.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              Status: measuring
            </p>
          </Card>

          {/* ── The honesty strip ── */}
          <Card className="p-5 mb-10 border-warning/40 bg-warning/5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-warning mb-2">
              What the seal certifies - and what it never does
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The seal certifies your <strong className="text-foreground">words</strong> and their{" "}
              <strong className="text-foreground">time</strong>: that this statement existed,
              exactly like this, at this moment. It does not certify the claims inside it - the
              ledger does not judge. No censorship, no deletion, dissenting views welcome: if you
              disagree with a testimony above, speak below and the ledger holds both. We publish no
              market-size figures on this wall: a number we cannot source is a number we do not
              print.
            </p>
          </Card>

          {/* ── Speak ── */}
          <Card id="speak" className="p-6 mb-10 border-primary/20">
            <h2 className="text-lg font-bold mb-4">Speak. It becomes permanent.</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {ROLES.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={role === r ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => setRole(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="How does verifiable truth change your work, your industry, your economy? Your words, sealed forever."
              value={statement}
              maxLength={MAX_STATEMENT}
              rows={4}
              onChange={(e) => setStatement(e.target.value)}
              className="mb-2 text-sm"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-muted-foreground">
                I am a/an <strong>{role}</strong>. Sealed as:{" "}
                <code className="font-mono text-[10px]">
                  {PREDICATE}|{role}|&lt;your words&gt;
                </code>
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {statement.length}/{MAX_STATEMENT}
              </span>
            </div>
            <Button onClick={speak} disabled={busy} className="w-full">
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Seal &amp; publish my testimony
            </Button>

            {receipt && (
              <Card className="mt-4 p-4 border-primary/40 bg-primary/5">
                <p className="text-xs font-bold mb-2 text-primary">
                  Sealed. Truth anchored to the APEX ledger.
                </p>
                <dl className="grid grid-cols-1 gap-1 text-[11px] font-mono break-all">
                  <div>
                    <dt className="inline text-muted-foreground">receipt: </dt>
                    <dd className="inline">
                      <a href={`/r/${receipt.receipt_id}`} className="underline">
                        {receipt.receipt_id}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">timestamp: </dt>
                    <dd className="inline">{receipt.timestamp}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">decision hash: </dt>
                    <dd className="inline">{receipt.decision_hash}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">algorithm: </dt>
                    <dd className="inline">
                      {receipt.algorithm}
                      {receipt.post_quantum && " (post-quantum)"}
                    </dd>
                  </div>
                </dl>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => share(receipt.receipt_id, statement || "my testimony")}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/r/${receipt.receipt_id}`}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Open receipt
                    </a>
                  </Button>
                </div>
              </Card>
            )}
          </Card>

          {/* ── The Wall ── */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" /> The Wall
            </h2>
            <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
              <Loader2 className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="space-y-3 mb-12">
            {entries.length === 0 && !loading && (
              <Card className="p-8 text-center text-muted-foreground">
                No testimonies yet. The wall is waiting for its first voice.
              </Card>
            )}
            {entries.map((e) => {
              const parsed = parseAction(e.action);
              if (!parsed) return null;
              return (
                <Card key={e.commit_id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">
                      {parsed.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => share(e.commit_id, parsed.statement)}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/r/${e.commit_id}`}>
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{parsed.statement}</p>
                  <p className="text-[10px] font-mono text-muted-foreground break-all">
                    sealed: {e.commit_id}
                    {e.merkle_leaf_hash && ` - leaf ${e.merkle_leaf_hash.slice(0, 16)}...`}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* ── Modelled context - labelled, sourced, never dressed as live ── */}
          <Card className="p-6 border-border">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Context - modelled and sourced, not measured by us
            </p>
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">EU AI Act, Article 50</strong> transparency
                obligations apply since 2 August 2026. Enforcement actions are already public -
                tracked on our{" "}
                <a href="/enforcement-watch" className="text-primary underline underline-offset-2">
                  Enforcement Watch
                </a>{" "}
                with sources linked per entry.
              </li>
              <li>
                <strong className="text-foreground">The protocol</strong>: IETF individual
                submission draft-singh-psi (rev 01), filed 29 August 2026. Read it on the{" "}
                <a href="/draft" className="text-primary underline underline-offset-2">
                  manuscript page
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">The economics</strong>: our fee schedule and
                projection formula are published in full - every projection is labelled modelled
                with its formula printed. We do not publish market-size claims, because a number
                without a source is marketing, and this wall is not marketing.
              </li>
              <li>
                <strong className="text-foreground">Independence check</strong>: the counters above
                are fetched live from the public ledger and the Bitcoin anchor is linked to
                mempool.space - any stranger can verify them without trusting us.
              </li>
            </ul>
          </Card>

          {/* ── The conclusion ── */}
          <Card className="p-6 md:p-10 mt-10 border-primary/20">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">
              <span className="text-gold-gradient">The conclusion</span> — three facts and one door
            </h2>
            <ol className="space-y-4 text-sm leading-relaxed text-muted-foreground list-decimal list-inside">
              <li>
                Every record that moves money, law, or AI output can today be altered without a
                trace. Paper evaporates. Databases edit. Memories disagree.
              </li>
              <li>
                The law has already chosen the other side: EU AI Act Article 50 transparency
                obligations apply since 2 August 2026, and the first enforcement actions are
                public. Verifiable records are no longer a virtue — they are a duty.
              </li>
              <li>
                Verification that depends on trusting the party being verified is not
                verification. It is testimony without a witness.
              </li>
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-foreground/90">
              Therefore: the economy needs neutral ground where any record can be recomputed by
              anyone — free, open, anchored to something no ministry and no market controls. That
              ground is live. It has been measuring since 22 August 2026. The question is no longer{" "}
              <em>should it exist</em> — it is <strong>who seals first</strong>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="lg">
                <a href="#speak">Speak on the Wall</a>
              </Button>
              <Button asChild variant="heroOutline" size="lg">
                <a href="/verify-any">Read any seal — including ours</a>
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}
