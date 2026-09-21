import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ExternalLink, Shield, Scale, Globe, Gavel } from "lucide-react";
import { useState } from "react";

const critiques = [
  {
    id: "oracle",
    icon: AlertTriangle,
    critiqueTitle: "The Oracle Problem",
    critique:
      "SHA-256 hashing provides data integrity — proof a file hasn't changed — but it cannot provide data veracity. If a provider inputs a fake report, the math will perfectly notarize that lie.",
    responseTitle: "We Notarize Attestations, Not Truth",
    response:
      "Exactly like a legal notary. A notary doesn't verify the truthfulness of a document — they verify who signed it, when, and that it hasn't been altered. APEX's PSI Protocol does the same thing cryptographically: it creates a tamper-evident, timestamped, signed record of what was attested. If the attestation is later proven fraudulent, the notarized record becomes evidence against the attester — not a shield for them. The ledger is the courtroom exhibit.",
    sources: [
      { label: "Oracle Problem in Hashing", url: "http://psasir.upm.edu.my/id/eprint/118206/1/118206.pdf" },
      { label: "Data Integrity vs Veracity", url: "http://www.jatit.org/volumes/Vol103No2/1Vol103No2.pdf" },
    ],
  },
  {
    id: "zkp",
    icon: Shield,
    critiqueTitle: "ZKP vs. Article 14 Transparency",
    critique:
      "Zero-Knowledge Proofs create technical complexity. A ZKP 'pass/fail' receipt may satisfy a technical check but doesn't provide the traceability and interpretability that lawyers and regulators need under Article 14 (Human Oversight).",
    responseTitle: "ZKPs Protect Weights — The Ledger Is Fully Transparent",
    response:
      "The ZKP layer protects only proprietary model weights during verification — it proves compliance properties without exposing trade secrets. The compliance ledger itself is fully transparent: every commit hash, Merkle root, challenge, and proof is publicly auditable. Article 14 requires human oversight of the AI system's behavior — our ledger provides exactly that. The ZKP proves the math checked out; the ledger shows what was checked and when.",
    sources: [
      { label: "EU AI Act Article 14", url: "https://artificialintelligenceact.eu/article/14/" },
      { label: "ZKP Policy Impact Analysis", url: "https://policyreview.info/articles/analysis/impact-zero-knowledge-proofs" },
    ],
  },
  {
    id: "standard",
    icon: Globe,
    critiqueTitle: "The Standardization Deadlock",
    critique:
      "Submitting to the IETF is standard practice, but if the European Commission issues its own standardization requests (Art. 40) that differ from PSI, the protocol could become a 'Legacy Island.' Being first isn't the same as being mandated.",
    responseTitle: "First-Mover + MIT License = Anti-Fragile",
    response:
      "The PSI Protocol is MIT-licensed. If the EU mandates a different standard, PSI adapts — the math is portable. But being the first formally submitted cryptographic compliance protocol to IETF creates gravitational pull: standards committees reference existing work. The protocol's canonical JSON (RFC 8785), Ed25519 signatures, and Merkle trees use zero proprietary primitives. Any future EU standard will use the same building blocks — because there are no others.",
    sources: [
      { label: "IETF PSI Protocol Draft", url: "https://datatracker.ietf.org/doc/draft-singh-psi/" },
      { label: "AI Act Art. 11 & 12 Standards", url: "https://link.springer.com/chapter/10.1007/978-3-031-94924-1_6" },
    ],
  },
  {
    id: "liability",
    icon: Gavel,
    critiqueTitle: "The Liability Trap of Decentralization",
    critique:
      "The EU AI Act places compliance burdens on specific 'AI providers' and 'importers.' Decentralized entities lack direct, legally-binding ways to handle impact assessments. If the protocol fails, there's no 'High-Risk Provider' to sue.",
    responseTitle: "ASF Is the Legal Entity — The Protocol Is the Evidence",
    response:
      "The APEX Standards Foundation (ASF) serves as the legal entity under Article 3(3) — a registered, accountable provider. The Open Evidence Protocol doesn't replace legal liability; it adds a public verification layer on top of it. Think of it as an evidence system: the institution (ASF) holds liability, the protocol provides independent, mathematically verifiable evidence. If a verdict is wrong, the institution is still accountable. Decentralization of evidence ≠ decentralization of liability.",
    sources: [
      { label: "EU AI Act Risk Framework", url: "https://artificialintelligenceact.eu/high-level-summary/" },
      { label: "AI Liability & Accountability", url: "https://www.tandfonline.com/doi/full/10.1080/19460171.2025.2496193" },
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
