import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DRAFT_ID = "draft-singh-psi-agent-02";
const DRAFT_PATH = `/ietf/${DRAFT_ID}.txt`;
// The digest published on 6 November 2026. The page recomputes the served
// file's digest in the visitor's browser and shows that, not this constant.
const PUBLISHED_HASH = "2592edc5dd4634d2ba6ee1c459d45d7372e0c6be358c2d3afe8e6353c43b68a1";
/** The stem the .ots file is served under; the text file must carry the same name. */
const PROOF_STEM = PUBLISHED_HASH.slice(0, 16);
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface AnchorRow {
  status: string;
  bitcoin_block_height: number | null;
  bitcoin_txid: string | null;
  confirmations: number | null;
  calendar_url: string | null;
  created_at: string;
}

type Fingerprint =
  | { state: "computing" }
  | { state: "ok"; digest: string }
  | { state: "mismatch"; digest: string }
  | { state: "unavailable"; reason: string };

async function computeFingerprint(): Promise<Fingerprint> {
  try {
    const res = await fetch(`${DRAFT_PATH}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return { state: "unavailable", reason: `HTTP ${res.status}` };
    const bytes = await res.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === PUBLISHED_HASH ? { state: "ok", digest: hex } : { state: "mismatch", digest: hex };
  } catch (e) {
    return { state: "unavailable", reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * PRIORITY ANCHOR — the public timestamp record for draft-singh-psi-agent-02.
 * Rendered only from the live ots_proofs row. If the Bitcoin block has not
 * confirmed yet, the plaque says so. Absence and pending states are stated,
 * never hidden.
 */
const AgentSpecAnchor = () => {
  const [anchor, setAnchor] = useState<AnchorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState<Fingerprint>({ state: "computing" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("ots_proofs")
        .select("status, bitcoin_block_height, bitcoin_txid, confirmations, calendar_url, created_at")
        .eq("commit_id", DRAFT_ID)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setAnchor((data as AnchorRow) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    computeFingerprint().then((f) => {
      if (alive) setFingerprint(f);
    });
    return () => {
      alive = false;
    };
  }, []);

  const confirmed = anchor?.status === "confirmed" && anchor.bitcoin_block_height != null;

  return (
    <section
      id="agent-02-priority"
      aria-label="Priority anchor for the agent settlement specification"
      className="border-b border-gold/20 px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
          Priority of record
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight md:text-5xl">
          The first specification to test a settlement
          <span className="block bg-gradient-to-b from-gold via-gold/90 to-gold/50 bg-clip-text text-transparent">
            against the limit a signed mandate declared
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base">
          <span className="text-foreground">draft-singh-psi-agent-02</span> seals a mandate, a
          proposal, a policy decision and a settlement under one run identifier, then tests the
          settled amount against the limit the mandate declared and the acting key against the
          deciding key. The text was published on 6 November 2026 in this repository and at this
          URL, and the fingerprint below is recomputed in your browser from the file this page
          serves — so the date does not rest on our say-so.
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          A working draft. Not filed with the IETF, and adopted by no one.
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground/80">
          First, and dated. As at 7 November 2026 we know of no other published specification —
          among Google AP2 signed mandates (donated to the FIDO Alliance, April 2026), Mastercard
          Verifiable Intent (March 2026), Visa Trusted Agent Protocol (October 2025), C2PA 2.5,
          RFC 6962 certificate transparency, Sigsum and draft-ietf-wimse-aims — that tests a
          settlement against the limit declared in a separately signed mandate, bound to the same
          run as a hash-chained record of the actions taken. Those rails authorise a payment; none
          of them hands a stranger the ordered record behind it. Publish one and this sentence is
          wrong — that is the price of putting our date on it, and we pay it gladly.
        </p>

        <dl className="mx-auto mt-10 max-w-3xl space-y-4 rounded-lg border border-border bg-card/40 p-6 font-mono text-sm md:p-8">
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">Specification</dt>
            <dd className="text-foreground">{DRAFT_ID} — Binding Decisions and Settlements to Agent Action Records</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">SHA-256 fingerprint</dt>
            <dd className="break-all text-foreground">
              {fingerprint.state === "computing" && "Recomputing from the served file…"}
              {fingerprint.state === "ok" && fingerprint.digest}
              {fingerprint.state === "mismatch" && (
                <>
                  <span className="text-gold">{fingerprint.digest}</span>
                  <span className="mt-1 block text-xs text-gold/90">
                    This does not match the digest published on 6 November 2026. Treat the served
                    file as drifted.
                  </span>
                </>
              )}
              {fingerprint.state === "unavailable" && (
                <>
                  <span className="text-muted-foreground">
                    Not recomputable in this browser ({fingerprint.reason}). The digest published on
                    6 November 2026 is {PUBLISHED_HASH}.
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">Bitcoin anchor</dt>
            <dd className="text-foreground">
              {loading && "Reading the ledger…"}
              {!loading && !anchor && "No anchor recorded. Absence is also a record."}
              {!loading && anchor && confirmed && (
                <>
                  Confirmed in block #{anchor.bitcoin_block_height!.toLocaleString("en-US")}
                  {anchor.confirmations ? ` — ${anchor.confirmations.toLocaleString("en-US")} confirmations` : ""}
                </>
              )}
              {!loading && anchor && !confirmed && (
                <>
                  Pending — the anchor ledger holds an OpenTimestamps proof dated{" "}
                  {new Date(anchor.created_at).toISOString().slice(0, 10)} and names no Bitcoin
                  block, because no transaction carrying this fingerprint has been located in one.
                  This line reads the anchor ledger on each visit and never names a block the chain
                  has not shown it.
                </>
              )}
            </dd>
          </div>
          {!loading && anchor?.bitcoin_txid && (
            <div className="grid gap-1 md:grid-cols-[240px_1fr]">
              <dt className="text-muted-foreground">Attesting transaction</dt>
              <dd className="break-all text-foreground">
                <a
                  href={`https://mempool.space/tx/${anchor.bitcoin_txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                >
                  {anchor.bitcoin_txid}
                </a>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={DRAFT_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gold bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition-colors hover:bg-transparent hover:text-gold"
          >
            Read the specification
          </a>
          <a
            href={`${FN_BASE}/ots-proof?hash=${PUBLISHED_HASH}`}
            className="border border-gold/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
          >
            Download the .ots proof
          </a>
          <Link
            to="/drafts"
            className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/90 transition-colors hover:border-gold/40"
          >
            All drafts
          </Link>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
          Verify without trusting this website: save the specification as{" "}
          <span className="text-foreground">apex-{PROOF_STEM}.txt</span> and the downloaded proof as{" "}
          <span className="text-foreground">apex-{PROOF_STEM}.ots</span> in the same folder, then
          run <span className="text-foreground">ots verify apex-{PROOF_STEM}.ots</span> from the
          OpenTimestamps reference client. The fingerprint above is recomputed in your browser from
          the served file and compared with the digest published on 6 November 2026.
        </p>
      </div>
    </section>
  );
};

export default AgentSpecAnchor;
