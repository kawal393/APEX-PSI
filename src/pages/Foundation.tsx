import { motion } from "framer-motion";
import { Shield, Users, FileText, Server, Scale, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
own attestations under their own keys, all listed at /.well-known/compliance-receipt.`;

const Foundation = () => {
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

export default Foundation;
