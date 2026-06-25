import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, FileText, Server, Scale, ExternalLink, Activity, GitBranch, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;
const AUDIT_MIRROR_URL = `${FN_BASE}/audit-mirror`;
const HEARTBEAT_URL = `${FN_BASE}/lattice-heartbeat`;

const CHARTER = `APEX PSI FOUNDATION — FOUNDING CHARTER (v0.1 — in formation)

ARTICLE 1 — MISSION
The Foundation stewards the Proof of Stateful Integrity (PSI) Protocol and the
Compliance-Receipt HTTP header standard (draft-singh-psi-http-01) as public-good
infrastructure for verifiable AI governance. The Foundation does not own any
implementation; it owns the specification, the public verification keys, and the
registry of conformant implementers.

ARTICLE 2 — STRUCTURE
The Foundation is being formed as a non-profit (Swiss Verein or Estonian
non-profit, final venue subject to legal review). It operates under a five-seat
Board with public meeting minutes and an annual transparency report.

ARTICLE 3 — INDEPENDENCE
No single commercial entity, including Apex Intelligence Empire, may hold a
controlling vote on the Board. The Founder Chair seat is permanent and
non-transferable but holds a single vote equal to other seats. Predicate
registry changes require a 4-of-5 Board majority.

ARTICLE 4 — OPENNESS
The PSI Protocol specification and the Compliance-Receipt header standard are
maintained under MIT and CC-BY-4.0 respectively. Any party may implement,
fork, distribute, or commercialize implementations. Patent AMCZ-2615560564 is
licensed royalty-free to any implementation of draft-singh-psi-http-01.

ARTICLE 5 — VERIFIER NETWORK
The Foundation operates the canonical issuer key (apex-psi-2026) and publishes
the procedure for additional independent verifier nodes to join the lattice
under a t-of-n threshold signing arrangement. Independent operators sign their
own attestations under their own keys, all listed at /.well-known/compliance-receipt.

ARTICLE 6 — HUMAN WITNESS GATEWAY
Governance actions affecting the canonical issuer key, the Board roster, the
predicate registry, or the patent pledge require a hardware-backed WebAuthn
witness signature from a sitting Board member, anchored to the public ledger
before the action takes effect.`;

type Heartbeat = {
  status: string;
  last_beat_seconds: number | null;
  latest_sequence: number | null;
  totals: { entries: number; committed: number; challenged: number; violations: number };
  anomaly_score: number;
  generated_at: string;
};

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const Foundation = () => {
  const [hb, setHb] = useState<Heartbeat | null>(null);
  const [witnessing, setWitnessing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(HEARTBEAT_URL);
        const j = await r.json();
        if (mounted) setHb(j);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleWitness = async () => {
    setWitnessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Sign in required to record a witness attestation.");
        return;
      }

      if (!("credentials" in navigator) || !window.PublicKeyCredential) {
        toast.error("This browser does not support WebAuthn / hardware keys.");
        return;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(session.session.user.id);

      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "APEX PSI Foundation", id: window.location.hostname },
          user: {
            id: userIdBytes,
            name: session.session.user.email ?? "witness",
            displayName: session.session.user.email ?? "Witness",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            userVerification: "preferred",
            residentKey: "preferred",
          },
          timeout: 60_000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;

      if (!cred) {
        toast.error("Witness ceremony cancelled.");
        return;
      }

      const att = cred.response as AuthenticatorAttestationResponse;
      const payload = {
        action_type: "foundation.witness.register",
        target_ref: `charter:v0.1:${new Date().toISOString().slice(0, 10)}`,
        credential_id: cred.id,
        public_key: b64url(att.getPublicKey?.() ?? new ArrayBuffer(0)),
        signature: b64url(att.attestationObject),
        client_data_json: b64url(att.clientDataJSON),
        notes: "WebAuthn registration ceremony — Foundation Witness Gateway",
      };

      const res = await fetch(`${FN_BASE}/register-witness`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "register failed");
      toast.success("Witness attestation anchored to the public ledger.");
    } catch (e) {
      toast.error((e as Error).message ?? "Witness ceremony failed.");
    } finally {
      setWitnessing(false);
    }
  };

  const statusColor =
    hb?.status === "live" ? "text-emerald-400 border-emerald-500/40"
    : hb?.status === "warm" ? "text-amber-400 border-amber-500/40"
    : "text-rose-400 border-rose-500/40";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 mb-4 tracking-widest">
                IN FORMATION · GOVERNANCE
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                <span className="text-chrome-gradient">The APEX PSI Foundation</span>
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                A non-profit steward for the PSI Protocol and the Compliance-Receipt header standard.
                No single company owns the spec. No regulator depends on a single vendor. Verification
                becomes infrastructure.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl grid md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Spec stewardship", body: "Maintains draft-singh-psi-http-01 and the PSI Protocol v1.2 under MIT / CC-BY-4.0." },
              { icon: Server, title: "Verifier lattice", body: "Coordinates independent verifier nodes under a t-of-n threshold signing arrangement." },
              { icon: Scale, title: "Patent pledge v2", body: "Patent AMCZ-2615560564 licensed royalty-free to every conformant implementation." },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-card/80 p-5">
                <c.icon className="h-5 w-5 text-primary mb-3" />
                <div className="text-sm font-bold text-foreground mb-1">{c.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{c.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* === HEARTBEAT === */}
        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Lattice heartbeat · rolling 24h
                  </span>
                </div>
                {hb && (
                  <Badge variant="outline" className={statusColor + " uppercase tracking-widest text-[10px]"}>
                    {hb.status}
                  </Badge>
                )}
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Entries (24h)" value={hb?.totals.entries ?? "—"} />
                <Stat label="Committed" value={hb?.totals.committed ?? "—"} />
                <Stat label="Challenged" value={hb?.totals.challenged ?? "—"} />
                <Stat label="Anomaly score" value={hb ? hb.anomaly_score.toFixed(3) : "—"} accent={hb && hb.anomaly_score > 0.2} />
              </div>
              <div className="px-6 pb-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground font-mono">
                <span>latest_sequence: {hb?.latest_sequence ?? "—"}</span>
                <a href={HEARTBEAT_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  /lattice-heartbeat <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* === AUDIT MIRROR === */}
        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Audit-Mirror · public cold-storage feed
                </span>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm text-foreground/80">
                  Any third party — regulator, academic, journalist — can tail the signed ledger feed
                  and independently re-anchor it. There is no proprietary mirror. Trust is replaceable.
                </p>
                <pre className="rounded-lg border border-border bg-muted/40 p-4 text-[11px] sm:text-xs font-mono overflow-x-auto">
{`# Tail the public mirror (JSON Lines, sha256 header on every response)
curl -sN "${AUDIT_MIRROR_URL}?limit=500" | head

# Verify the manifest
curl -s "${AUDIT_MIRROR_URL}?manifest=1"`}
                </pre>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="heroOutline" size="sm" asChild>
                    <a href={`${AUDIT_MIRROR_URL}?manifest=1`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />View manifest
                    </a>
                  </Button>
                  <Button variant="heroOutline" size="sm" asChild>
                    <a href={AUDIT_MIRROR_URL} target="_blank" rel="noreferrer">
                      Stream JSONL
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === WITNESS GATEWAY === */}
        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Human-witness gateway · WebAuthn
                </span>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm text-foreground/80">
                  Governance actions affecting the issuer key, the Board, the predicate registry, or
                  the patent pledge are gated by a hardware-backed WebAuthn signature from a sitting
                  Board member. The attestation is recorded in the public ledger before the action
                  takes effect — no Board action can occur in silence.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />Yubikey, Touch ID, Windows Hello, or platform passkey accepted.</div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />Credential ID + public key published to <code className="text-primary">foundation_witness_attestations</code>.</div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />Private key never leaves the witness hardware.</div>
                  <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />Open to all signed-in users during charter v0.1; Board-only at v1.0.</div>
                </div>
                <div className="pt-2">
                  <Button onClick={handleWitness} disabled={witnessing} size="sm">
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    {witnessing ? "Awaiting witness…" : "Register a witness attestation"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Board seats
                </span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { role: "Chair", name: "Kawaljeet Singh", status: "Permanent · non-transferable", taken: true },
                  { role: "Protocol Editor", name: "Open", status: "Apply: foundation@apex-infrastructure.com", taken: false },
                  { role: "Independent Cryptographer", name: "Open", status: "Academic affiliation required", taken: false },
                  { role: "Regulator Liaison", name: "Open", status: "Public-sector or NGO background preferred", taken: false },
                  { role: "Community Operator", name: "Open", status: "Verifier-node operator, ≥6 months uptime", taken: false },
                ].map((s) => (
                  <div key={s.role} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-foreground">{s.role}</div>
                      <div className="text-xs text-muted-foreground">{s.status}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={s.taken ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}
                    >
                      {s.taken ? s.name : "OPEN"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Founding charter (v0.1)
                </span>
              </div>
              <pre className="p-6 text-[11px] sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">
{CHARTER}
              </pre>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="text-base font-bold text-foreground mb-2">Run a verifier node</h3>
              <p className="text-sm text-foreground/80 mb-3">
                Universities, NGOs, and accredited compliance bodies can operate an independent verifier
                node. Each operator signs their own attestations under their own Ed25519 key. The
                Foundation publishes operator keys at <code className="text-primary">/.well-known/compliance-receipt</code>.
              </p>
              <ul className="text-sm text-foreground/80 space-y-1 list-disc list-inside mb-4">
                <li>Eligibility: incorporated entity, public point of contact, transparency report annually.</li>
                <li>Hardware: one server, &lt;1 vCPU, &lt;512MB RAM; reference implementation in TypeScript.</li>
                <li>Signing key: generated locally; private key never leaves operator infrastructure.</li>
                <li>Commitment: monthly signed uptime attestation, 30-day disclosure for downtime.</li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="/standard"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Header standard</a>
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="/pledge">Patent pledge v2</a>
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="/paper">Peer-review paper</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
    <div className={`text-2xl font-black font-mono ${accent ? "text-amber-400" : "text-foreground"}`}>{value}</div>
  </div>
);

export default Foundation;
