import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Shield, Gavel, FileCheck2, Activity } from "lucide-react";

interface PredicateProof {
  id: string;
  receipt_id: string;
  predicate_id: string;
  verdict: "SATISFIED" | "VIOLATED" | "INCONCLUSIVE";
  proof_hash: string;
  created_at: string;
}
interface QuarantineEvent {
  id: string;
  model_id: string;
  action: string;
  reason: string;
  quorum_reached: boolean;
  threshold_required: number;
  created_at: string;
}
interface Challenge {
  challenge_id: string;
  receipt_id: string;
  status: string;
  claim: string;
  bond_amount_wei: string;
  window_expires_at: string;
  created_at: string;
}

const Hardening = () => {
  const [proofs, setProofs] = useState<PredicateProof[]>([]);
  const [quarantines, setQuarantines] = useState<QuarantineEvent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, q, c] = await Promise.all([
        supabase.from("predicate_proofs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("quarantine_events").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("psi_challenges").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setProofs((p.data ?? []) as PredicateProof[]);
      setQuarantines((q.data ?? []) as QuarantineEvent[]);
      setChallenges((c.data ?? []) as Challenge[]);
      setLoading(false);
    })();
  }, []);

  const verdictColor = (v: string) =>
    v === "SATISFIED" ? "text-emerald-500" : v === "VIOLATED" ? "text-red-500" : "text-amber-500";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>APEX PSI v3 — Hardening Layer (Predicate Proofs, Quarantine, Challenges)</title>
        <meta name="description" content="Live public ledger of verifiable logic proofs, decentralized model quarantines under t-of-n lattice consensus, and open challenges against notarized AI decisions." />
      </Helmet>
      <Navbar />
      <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
        <div className="mb-16 border-b border-border pb-8">
          <div className="text-xs tracking-[0.3em] text-muted-foreground mb-3">APEX PSI v3 · HARDENING LAYER</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Trust reduced to math.</h1>
          <p className="mt-6 max-w-3xl text-muted-foreground text-lg leading-relaxed">
            Three cryptographic upgrades transform the ledger from a notary into an auditor.
            Every claim below is signed, hashed, and publicly verifiable — no coordination required.
          </p>
        </div>

        {/* Three primitives */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <a href="#proofs" className="border border-border p-6 hover:border-primary transition-colors">
            <FileCheck2 className="w-6 h-6 text-primary mb-4" />
            <div className="text-xs tracking-widest text-muted-foreground mb-2">PRIMITIVE 01</div>
            <div className="text-xl font-semibold mb-2">Verifiable Logic Proofs</div>
            <div className="text-sm text-muted-foreground">Deterministic predicate evaluation: <code className="text-foreground">NO_PII</code>, <code className="text-foreground">EU_ART_13_LABEL</code>, and 3 more. Signed proof bound to each receipt.</div>
          </a>
          <a href="#quarantine" className="border border-border p-6 hover:border-primary transition-colors">
            <Shield className="w-6 h-6 text-primary mb-4" />
            <div className="text-xs tracking-widest text-muted-foreground mb-2">PRIMITIVE 02</div>
            <div className="text-xl font-semibold mb-2">Decentralized Quarantine</div>
            <div className="text-sm text-muted-foreground">t-of-n Ed25519 consensus across the α/β/γ lattice. No kill switch. No single point of failure.</div>
          </a>
          <a href="#challenges" className="border border-border p-6 hover:border-primary transition-colors">
            <Gavel className="w-6 h-6 text-primary mb-4" />
            <div className="text-xs tracking-widest text-muted-foreground mb-2">PRIMITIVE 03</div>
            <div className="text-xl font-semibold mb-2">Challenge & Bond</div>
            <div className="text-sm text-muted-foreground">Any actor may challenge a receipt within a bonded window. On-chain settlement via bond-hash reveal.</div>
          </a>
        </div>

        {/* Predicate proofs */}
        <section id="proofs" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <FileCheck2 className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Predicate Proofs</h2>
            <span className="text-xs text-muted-foreground ml-auto">POST /functions/v1/predicate-prove</span>
          </div>
          <div className="border border-border">
            <div className="grid grid-cols-12 text-xs tracking-widest text-muted-foreground bg-muted/30 px-4 py-3">
              <div className="col-span-3">RECEIPT</div>
              <div className="col-span-3">PREDICATE</div>
              <div className="col-span-2">VERDICT</div>
              <div className="col-span-4">PROOF HASH</div>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading ledger…</div>
            ) : proofs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No predicate proofs recorded yet. Call the endpoint to seed the ledger.</div>
            ) : proofs.map((p) => (
              <div key={p.id} className="grid grid-cols-12 items-center px-4 py-3 border-t border-border text-sm font-mono">
                <div className="col-span-3 truncate">{p.receipt_id}</div>
                <div className="col-span-3">{p.predicate_id}</div>
                <div className={`col-span-2 font-semibold ${verdictColor(p.verdict)}`}>{p.verdict}</div>
                <div className="col-span-4 text-xs truncate text-muted-foreground">{p.proof_hash}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quarantine */}
        <section id="quarantine" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Decentralized Quarantine (t-of-n)</h2>
            <span className="text-xs text-muted-foreground ml-auto">GET/POST /functions/v1/quarantine-action</span>
          </div>
          <div className="border border-border">
            <div className="grid grid-cols-12 text-xs tracking-widest text-muted-foreground bg-muted/30 px-4 py-3">
              <div className="col-span-3">MODEL</div>
              <div className="col-span-2">ACTION</div>
              <div className="col-span-2">QUORUM</div>
              <div className="col-span-5">REASON</div>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading ledger…</div>
            ) : quarantines.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No quarantine events. The lattice is silent — no model has tripped consensus.</div>
            ) : quarantines.map((q) => (
              <div key={q.id} className="grid grid-cols-12 items-center px-4 py-3 border-t border-border text-sm font-mono">
                <div className="col-span-3 truncate">{q.model_id}</div>
                <div className="col-span-2 font-semibold">{q.action}</div>
                <div className={`col-span-2 ${q.quorum_reached ? "text-emerald-500" : "text-amber-500"}`}>
                  {q.quorum_reached ? `✓ ≥${q.threshold_required}/3` : "PENDING"}
                </div>
                <div className="col-span-5 text-xs text-muted-foreground truncate">{q.reason}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Challenges */}
        <section id="challenges" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Gavel className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Open Challenges</h2>
            <span className="text-xs text-muted-foreground ml-auto">POST /functions/v1/psi-challenge</span>
          </div>
          <div className="border border-border">
            <div className="grid grid-cols-12 text-xs tracking-widest text-muted-foreground bg-muted/30 px-4 py-3">
              <div className="col-span-3">CHALLENGE</div>
              <div className="col-span-3">RECEIPT</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2">BOND (wei)</div>
              <div className="col-span-2">EXPIRES</div>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading ledger…</div>
            ) : challenges.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No open challenges. The receipts stand unrefuted.</div>
            ) : challenges.map((c) => (
              <div key={c.challenge_id} className="grid grid-cols-12 items-center px-4 py-3 border-t border-border text-sm font-mono">
                <div className="col-span-3 truncate">{c.challenge_id}</div>
                <div className="col-span-3 truncate">{c.receipt_id}</div>
                <div className="col-span-2 font-semibold">{c.status}</div>
                <div className="col-span-2 text-xs">{c.bond_amount_wei}</div>
                <div className="col-span-2 text-xs text-muted-foreground">{new Date(c.window_expires_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Spec block */}
        <section className="border border-border p-8 bg-muted/20">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <div className="text-xs tracking-[0.3em] text-muted-foreground">PSI-HARDENING-v1 · SPECIFICATION</div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-mono leading-relaxed">
            <div>
              <div className="text-primary font-semibold mb-2">PROOF FORMAT</div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{`{
  receipt_id: string,
  predicate_id: "NO_PII" | "NO_DISALLOWED_CAT"
              | "OUTPUT_BOUNDED" | "INPUT_MATCHES"
              | "EU_ART_13_LABEL",
  verdict: "SATISFIED" | "VIOLATED" | "INCONCLUSIVE",
  input_hash: "sha256:...",
  output_hash: "sha256:...",
  proof_hash: "sha256:...",
  ed25519_signature: hex,
  evidence: object
}`}</pre>
            </div>
            <div>
              <div className="text-primary font-semibold mb-2">QUARANTINE QUORUM</div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{`threshold = 2 of 3
nodes     = [alpha, beta, gamma]
message   = model_id | action | reason | ts_hour
signature = Ed25519(node_seed, message)
quorum    = count(verified_signatures) ≥ threshold
status    = QUARANTINED | CLEAR | PENDING_QUORUM`}</pre>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Hardening;
