import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GenesisWall, { type WallMember } from "@/components/founding/GenesisWall";
import WitnessBox from "@/components/founding/WitnessBox";
import {
  ACKNOWLEDGEMENT_CANONICAL,
  ACKNOWLEDGEMENT_CLAUSES,
  CHARTER_LINES,
  DISCLAIMERS,
  FEE_FOOTNOTE,
  FEE_SCHEDULE,
  NO_FINDER_FEE_NOTICE,
  HOLDINGS,
  LAPSE_DAYS,
  ONCHAIN_NETWORK,
  ONCHAIN_STATUS,
  PUBLIC_PLAN,
  PUBLIC_PLAN as PLAN,
  STATUS_COPY,
  TOTAL_SEATS,
} from "@/config/founding";

const TITLE = "Founding Members — Apex PSI Registry";
const DESCRIPTION =
  "One hundred numbered seats in the Apex PSI registry. Free forever, never reissued, sealed in the public ledger and independently verifiable.";

const sha256Hex = async (text: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

type Application = {
  applicant_id: string;
  display_name: string;
  status: keyof typeof STATUS_COPY;
  seat_number: number | null;
  witness_line: string;
};

const Founding = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<WallMember[]>([]);
  const [reservedSeats, setReservedSeats] = useState<number[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [member, setMember] = useState<WallMember | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [witnessLine, setWitnessLine] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedId, setSubmittedId] = useState("");

  const loadWall = useCallback(async () => {
    const { data } = await supabase.functions.invoke("founding-registry", { body: { action: "wall" } });
    if (data) {
      setMembers(data.members ?? []);
      setReservedSeats(data.reserved_seats ?? []);
    }
    setLoaded(true);
  }, []);

  const loadStatus = useCallback(async () => {
    if (!user) {
      setApplication(null);
      setMember(null);
      return;
    }
    const { data } = await supabase.functions.invoke("founding-registry", { body: { action: "my-status" } });
    setApplication(data?.application ?? null);
    setMember(data?.member ?? null);
  }, [user]);

  useEffect(() => {
    loadWall();
  }, [loadWall]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const inscribedCount = members.length;
  const wallFull = inscribedCount >= TOTAL_SEATS;

  const submit = async () => {
    setSubmitting(true);
    setFormError("");
    try {
      const ackHash = await sha256Hex(ACKNOWLEDGEMENT_CANONICAL);
      const { data, error } = await supabase.functions.invoke("founding-registry", {
        body: {
          action: "apply",
          display_name: name.trim(),
          email: email.trim(),
          witness_line: witnessLine.trim(),
          ack_hash: ackHash,
          acknowledged: agreed,
        },
      });
      if (error || data?.error) {
        setFormError(data?.error ?? "Application could not be recorded.");
        return;
      }
      setSubmittedId(data.applicant_id);
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/founding` },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://ai-governance-standard.com/founding" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-governance-standard.com/founding" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        {/* §1 */}
        <section className="px-4 pt-14 pb-10 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
              Verification and settlement layer for the AI economy
            </p>
            <h1
              className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-5"
              style={{ fontFamily: "Georgia, serif" }}
            >
              THE FIRST 100 FOUNDING MEMBERS OF THE APEX PSI REGISTRY
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-4">
              One hundred seats in the record of the AI economy. Free forever. Never reissued. Earn what you
              bring. Carry the record, and the record carries you.
            </p>
            <p className="text-lg sm:text-xl text-gold max-w-3xl" style={{ fontFamily: "Georgia, serif" }}>
              A public tool is only as good as the people transparently running it.
            </p>

            {/* §8 above the fold */}
            <div className="mt-8 space-y-2 border-l-2 border-gold/40 pl-4">
              {DISCLAIMERS.map((d) => (
                <p key={d} className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  {d}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* §2 Genesis Wall */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Genesis wall · seats #001–#100
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {loaded ? `${inscribedCount}/${TOTAL_SEATS} inscribed` : "loading registry"}
              </span>
            </div>

            {wallFull && (
              <div className="border border-gold bg-gold/[0.06] p-5 mb-6">
                <p className="font-mono text-sm uppercase tracking-[0.25em] text-gold">THE WALL IS FULL</p>
                <p className="text-sm text-muted-foreground mt-2">The registry is closed forever.</p>
              </div>
            )}

            <GenesisWall members={members} reservedSeats={reservedSeats} />

            <p className="text-xs text-muted-foreground mt-5 max-w-3xl leading-relaxed">
              Numbers are assigned strictly in order and history is never edited. A lapsed seat renders
              unclaimed forever: it is never reassigned and never sold.
            </p>
          </div>
        </section>

        {/* §3 */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              What a founding member holds
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {HOLDINGS.map((h) => (
                <div key={h.title} className="border border-border p-4 bg-card/30">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold mb-1">{h.title}</p>
                  <p className="font-mono text-[9px] text-muted-foreground mb-3">{h.clause}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* §4 Fee schedule */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Fee schedule
            </h2>
            <div className="border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-left p-3 hidden sm:table-cell">Basis</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {FEE_SCHEDULE.map((row) => (
                    <tr key={row.item} className="border-b border-border/50 last:border-0">
                      <td className="p-3">{row.item}</td>
                      <td className="p-3 text-right text-gold">{row.price}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{row.note}</td>
                      <td className="p-3 text-muted-foreground">{row.status ?? "published"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4 max-w-3xl leading-relaxed">{FEE_FOOTNOTE}</p>
            <p className="text-xs text-muted-foreground mt-4 max-w-3xl leading-relaxed">
              {NO_FINDER_FEE_NOTICE}
            </p>
          </div>
        </section>

        {/* §7 On-chain honesty */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <div className="border border-border p-5 bg-card/30 max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-3">
                On-chain credential mirror
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                On-chain credential mirror: {ONCHAIN_STATUS} ({ONCHAIN_NETWORK}). We publish nothing until it
                deploys. Until then, credentials are sealed ledger receipts — Bitcoin-anchored and
                independently verifiable.
              </p>
            </div>
          </div>
        </section>

        {/* §5 Application / status */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-3xl">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Application and verification
            </h2>

            {application ? (
              <div className="border border-border p-5 bg-card/30 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                  {application.applicant_id} · {application.status}
                </p>
                <p className="text-sm">{STATUS_COPY[application.status]}</p>
                {application.seat_number && (
                  <p className="font-mono text-xs text-muted-foreground">
                    Seat #{String(application.seat_number).padStart(3, "0")}
                  </p>
                )}
                {application.status === "INSCRIBED" && member && (
                  <a
                    href={`/verify?hash=${member.leaf_hash}`}
                    className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:underline block"
                  >
                    Verify your seal
                  </a>
                )}
                {application.status === "RESERVED" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Seal a first witness within {LAPSE_DAYS} days of reservation. If nothing is sealed, the
                      seat retires empty and is never reissued.
                    </p>
                    <WitnessBox
                      onInscribed={() => {
                        loadStatus();
                        loadWall();
                      }}
                    />
                  </>
                )}
              </div>
            ) : wallFull ? (
              <p className="text-sm text-muted-foreground">
                Applications are closed. All one hundred seats are inscribed.
              </p>
            ) : submittedId ? (
              <div className="border border-border p-5 bg-card/30 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">{submittedId} · PENDING</p>
                <p className="text-sm">{STATUS_COPY.PENDING}</p>
                <p className="text-xs text-muted-foreground">
                  One click on the emailed link confirms your address. A confirmed email is the baseline
                  digital ID; unconfirmed rows are never shown to the operator.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name or agent name"
                    className="w-full bg-background border border-border p-3 text-sm"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="Email"
                    className="w-full bg-background border border-border p-3 text-sm"
                  />
                  <input
                    value={witnessLine}
                    onChange={(e) => setWitnessLine(e.target.value)}
                    placeholder="What I will witness first (one line)"
                    className="w-full bg-background border border-border p-3 text-sm"
                  />
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    Founding member acknowledgement
                  </p>
                  <ol className="border border-border bg-card/30 p-4 max-h-64 overflow-y-auto space-y-3 text-xs text-muted-foreground leading-relaxed list-decimal list-inside">
                    {ACKNOWLEDGEMENT_CLAUSES.map((clause) => (
                      <li key={clause}>{clause}</li>
                    ))}
                  </ol>
                </div>

                <label className="flex items-start gap-3 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree. I consent to the SHA-256 of this acknowledgement being sealed in the
                    public ledger.
                  </span>
                </label>

                <Button
                  onClick={submit}
                  disabled={!agreed || !name.trim() || !email.trim() || !witnessLine.trim() || submitting}
                  className="font-mono uppercase tracking-[0.2em]"
                >
                  {submitting ? "Recording" : "Apply"}
                </Button>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every application is reviewed personally by the operator. There is no automatic approval
                  path. Approval holds the lowest free seat number until a first witness is sealed.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* §9 Charter */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Protocol charter summary
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground max-w-3xl">
              {CHARTER_LINES.map((line) => (
                <li key={line} className="border-l border-gold/40 pl-4">
                  {line}
                </li>
              ))}
            </ul>
            <a
              href="/governance"
              className="inline-block mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:underline"
            >
              Sealed charter receipt
            </a>
          </div>
        </section>

        {/* §10 Public plan */}
        <section className="px-4 py-12 border-b border-border/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Public plan
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {PLAN.map((p) => (
                <div key={p.when} className="border border-border p-4 bg-card/30">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold mb-2">{p.when}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.line}</p>
                </div>
              ))}
            </div>
            <p className="sr-only">{PUBLIC_PLAN.length} stages published.</p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Founding;
