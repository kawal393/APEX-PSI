import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ExternalLink, Shield, Scale, Globe, Gavel } from "lucide-react";
import { useState } from "react";

const critiques = [
  {
    id: "oracle",
    icon: AlertTriangle,
    critiqueTitle: "\"A hash cannot prove truth\"",
    critique:
      "SHA-256 proves a record has not changed. It cannot prove the record was true when it was written. A false input gets sealed just as faithfully as a true one.",
    responseTitle: "Correct — and that is the design",
    response:
      "PSI proves existence, integrity and order: what was recorded, when, and that it was never altered. It does not judge content. A false attestation, once sealed, becomes permanent evidence against whoever made it. The ledger does not judge. It remembers.",
    sources: [
      { label: "PSI Spec — Scope", url: "https://ai-governance-standard.com/spec" },
      { label: "IETF draft-singh-psi", url: "https://datatracker.ietf.org/doc/draft-singh-psi/" },
    ],
  },
  {
    id: "zkp",
    icon: Shield,
    critiqueTitle: "\"The ZK / MPC claims outrun the code\"",
    critique:
      "Zero-knowledge and multi-party signing are described, but a reviewer cannot find them as production primitives. Claims ahead of code are a liability.",
    responseTitle: "V1 is live. ZK / MPC is a labelled research track",
    response:
      "Production today: RFC 8785 canonical JSON, SHA-256, Ed25519 signatures, Merkle roots and Bitcoin anchoring via OpenTimestamps — all reproducible with the MIT verifier. Zero-knowledge and MPC are an experimental V2 research track and are marked as such. Nothing experimental is required to verify a receipt.",
    sources: [
      { label: "Conformance vectors", url: "https://ai-governance-standard.com/conformance" },
      { label: "MIT verifier", url: "https://github.com/kawal393/apex-psi-verify" },
    ],
  },
  {
    id: "trust",
    icon: Globe,
    critiqueTitle: "\"You are a single operator — why trust you?\"",
    critique:
      "One company runs the hosted notary and holds the signing key. If it disappears or misbehaves, what happens to the evidence?",
    responseTitle: "You never have to trust us",
    response:
      "Every receipt verifies offline with the MIT verifier, without contacting APEX. The public key is published, Merkle roots are anchored to Bitcoin, and anyone can self-host. If APEX vanished tomorrow, every receipt ever issued would still verify. The math must survive its maker.",
    sources: [
      { label: "Trust anchor", url: "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json" },
      { label: "Verify a receipt", url: "https://ai-governance-standard.com/verify" },
    ],
  },
  {
    id: "liability",
    icon: Gavel,
    critiqueTitle: "\"This is not legal compliance\"",
    critique:
      "Laws like the EU AI Act place duties on providers and deployers. A cryptographic receipt does not make anyone compliant.",
    responseTitle: "Evidence, not certification",
    response:
      "Agreed. PSI is not a conformity assessment, certification or legal advice. The duty stays with the provider. PSI gives that provider tamper-evident records of what their system did and when — the evidence that human oversight and record-keeping obligations ask for. The APEX PSI Foundation is in formation and is not yet a legal entity.",
    sources: [
      { label: "EU AI Act Article 12", url: "https://artificialintelligenceact.eu/article/12/" },
      { label: "EU AI Act Article 14", url: "https://artificialintelligenceact.eu/article/14/" },
    ],
  },
];

const AdversarialReview = () => {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="relative py-24 px-4" id="adversarial-review">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Adversarial Review
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            We Address the{" "}
            <span className="text-gold-gradient">Hard Questions</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Every serious architecture faces serious critiques. We don't hide
            from them — we publish them, cite them, and show exactly how the PSI
            Protocol handles each one.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {critiques.map((c, i) => {
            const isFlipped = flipped[c.id];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => toggle(c.id)}
                className="cursor-pointer group"
              >
                <div
                  className={`rounded-xl border p-6 transition-all duration-500 min-h-[280px] flex flex-col ${
                    isFlipped
                      ? "border-gold/40 bg-gold/5"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    {isFlipped ? (
                      <CheckCircle2 className="h-5 w-5 text-gold shrink-0" />
                    ) : (
                      <c.icon className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <h3
                      className={`text-sm font-black tracking-wider uppercase ${
                        isFlipped ? "text-gold" : "text-destructive"
                      }`}
                    >
                      {isFlipped ? c.responseTitle : c.critiqueTitle}
                    </h3>
                  </div>

                  {/* Body */}
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {isFlipped ? c.response : c.critique}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {c.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-gold transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {s.label}
                        </a>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 italic">
                      {isFlipped ? "tap for critique" : "tap for response"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground/50 mt-8"
        >
          All critique sources are independently cited. Tap each card to see
          how the PSI Protocol responds.
        </motion.p>
      </div>
    </section>
  );
};

export default AdversarialReview;
