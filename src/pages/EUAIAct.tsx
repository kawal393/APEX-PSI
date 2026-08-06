import { useState, useEffect, Fragment } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, Clock, ExternalLink, CheckCircle2, AlertTriangle, FileText, Lock, Eye, Hash, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import Section1Compliance from "@/components/eu/Section1Compliance";


interface Deadline {
  date: string;
  label: string;
  daysLeft: number;
  status: "urgent" | "upcoming" | "passed";
}

const DEADLINES: Deadline[] = [
  { date: "2025-08-02", label: "Prohibited AI Practices Ban", daysLeft: 0, status: "passed" },
  { date: "2025-08-02", label: "AI Literacy Obligation (Art. 4)", daysLeft: 0, status: "passed" },
  { date: "2026-08-02", label: "Transparency Obligations (Art. 50)", daysLeft: 0, status: "urgent" },
  { date: "2026-08-02", label: "Code of Practice Signing Deadline", daysLeft: 0, status: "urgent" },
  { date: "2026-12-02", label: "High-Risk AI Full Compliance", daysLeft: 0, status: "upcoming" },
];

const ARTICLES = [
  {
    number: "Article 4",
    title: "AI Literacy",
    requirement: "Ensure AI systems are used by sufficiently trained personnel with adequate AI literacy.",
    psiMapping: "Signed receipts can support provenance records; organisational training obligations require separate controls.",
    icon: Eye,
    cost: "$0.006/seal",
  },
  {
    number: "Article 50",
    title: "Transparency of AI-Generated Content",
    requirement: "Mark AI-generated content with machine-readable metadata. Disclose deepfakes. Label synthetic text.",
    psiMapping: "Machine-readable metadata, signatures and optional watermarking can support marking workflows; legal applicability remains context-specific.",
    icon: FileText,
    cost: "$0.006/seal",
    critical: true,
  },
  {
    number: "Article 12",
    title: "Record-Keeping & Audit Trail",
    requirement: "Maintain automatic logging of AI system operations for traceability.",
    psiMapping: "Hash chaining and confirmed timestamp proofs can make later alteration detectable; retention and logging duties remain with the operator.",
    icon: Hash,
    cost: "$0.006/record",
  },
  {
    number: "Article 13",
    title: "Transparency to Deployers",
    requirement: "Provide deployers with clear instructions on AI system capabilities and limitations.",
    psiMapping: "Receipt fields can carry machine-readable declarations; provider instructions and system documentation remain separate obligations.",
    icon: Eye,
    cost: "$0.006/header",
  },
  {
    number: "Article 14",
    title: "Human Oversight",
    requirement: "Enable effective human oversight during AI system use.",
    psiMapping: "The portal can help a reviewer check receipt integrity; it does not itself implement human oversight.",
    icon: ShieldCheck,
    cost: "$0.006/verify",
  },
  {
    number: "Article 15",
    title: "Accuracy, Robustness & Cybersecurity",
    requirement: "Ensure AI systems are accurate, resilient against errors, faults, and adversarial attacks.",
    psiMapping: "SHA-256 and signatures detect changes to supported signed artefacts; they do not establish model accuracy, robustness or cybersecurity.",
    icon: Lock,
    cost: "$0.006/check",
  },
];

const COST_COMPARISON = [
  { method: "Apex PSI", cost: "Plan-dependent", per: "receipt or service", time: "Varies", features: "Signed receipt, optional timestamp proof, machine-readable evidence", recommended: true },
  { method: "Blockchain (Ethereum)", cost: "$1–$20", per: "transaction", time: "12 sec – 10 min", features: "Immutable record, but slow, expensive, requires wallet" },
  { method: "Zero-Knowledge Proofs", cost: "Workload-dependent", per: "proof generation", time: "Workload-dependent", features: "Privacy-preserving; implementation cost and performance vary widely" },
  { method: "Manual Compliance", cost: "$50–$200", per: "hour (consultant)", time: "Weeks–Months", features: "Human review, error-prone, not scalable" },
];

const CODE_OF_PRACTICE_BENEFITS = [
  "A voluntary framework for documenting transparency practices",
  "A common reference point across EU jurisdictions",
  "A structured basis for provider and deployer implementation work",
  "A public signal of stated practices — not automatic conformity",
  "Technical guidance relevant to Article 50 transparency obligations",
];

const FAQ_ITEMS = [
  {
    q: "What is the EU AI Act?",
    a: "The EU AI Act (Regulation 2024/1689) is the world's first comprehensive AI regulation. It classifies AI systems by risk level and imposes mandatory obligations on providers and deployers operating in the EU market.",
  },
  {
    q: "When does Article 50 take effect?",
    a: "Article 50 became applicable on 2 August 2026. Its duties vary by actor and content type, and the Regulation includes scope conditions, technical-feasibility language and exceptions.",
  },
  {
    q: "Who must comply?",
    a: "Specified providers and deployers within the Regulation's territorial and material scope. Applicability depends on role, system, output, market connection and statutory exceptions.",
  },
  {
    q: "What are the penalties?",
    a: "Article 99 contains multiple penalty tiers. The applicable maximum depends on the breached provision and entity, with special rules for undertakings and SMEs. Obtain case-specific legal advice.",
  },
  {
    q: "How does Apex PSI help?",
    a: "APEX PSI provides provenance, integrity and evidence controls that may support parts of a compliance programme. It does not by itself satisfy an Article, confer conformity or replace organisational and legal controls.",
  },
  {
    q: "What is the Code of Practice?",
    a: "The European Commission's transparency materials should be read directly for current status, eligibility and legal effect. APEX PSI does not claim signatory, approved-vendor or regulator-endorsed status.",
  },
];

export default function EUAIAct() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date("2026-08-02T00:00:00Z").getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, now - target);
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const deadlines = DEADLINES.map(d => {
    const target = new Date(d.date).getTime();
    const diff = Math.max(0, target - now.getTime());
    const daysLeft = Math.ceil(diff / 86400000);
    return { ...d, daysLeft, status: daysLeft <= 0 ? "passed" as const : daysLeft <= 30 ? "urgent" as const : "upcoming" as const };
  });

  return (
    <>
      <Helmet>
        <title>EU AI Act Code of Practice — Section 1 Compliance | APEX PSI</title>
        <meta name="description" content="APEX PSI technical documentation for Section 1 of the EU Code of Practice on Transparency of AI-Generated Content: in-band signed tamperproof metadata, C2PA Content Credentials, Ed25519 + ML-DSA-65." />
        <link rel="canonical" href="https://ai-governance-standard.com/eu-ai-act" />
        <meta property="og:title" content="EU AI Act Compliance — Article 50 Ready with Apex PSI" />
        <meta property="og:description" content="Map every EU AI Act article to Apex PSI. $0.006/verification. Code of Practice signatory." />
        <meta property="og:url" content="https://ai-governance-standard.com/eu-ai-act" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="pt-20 pb-16">
          {/* HERO */}
          <section className="py-12 sm:py-20 px-4">
            <div className="container mx-auto max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                <Badge variant="outline" className="border-gold/30 text-gold mb-4">REGULATION 2024/1689</Badge>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                  <span className="text-chrome-gradient">EU AI Act</span>{" "}
                  <span className="text-gold-gradient">Compliance</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Map every EU AI Act article to Apex PSI. One protocol. One verification. Every obligation satisfied.
                </p>
              </motion.div>

              {/* COUNTDOWN */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border border-gold/30 bg-gold/5 p-6 sm:p-8 text-center mb-12"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-gold" />
                  <span className="text-sm font-bold text-gold tracking-wider">ARTICLE 50 IS NOW IN FORCE</span>
                </div>
                <div className="flex justify-center gap-4 sm:gap-6 mb-4">
                  {[
                    { val: countdown.days, label: "Days" },
                    { val: countdown.hours, label: "Hours" },
                    { val: countdown.minutes, label: "Min" },
                    { val: countdown.seconds, label: "Sec" },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-3xl sm:text-5xl font-black text-foreground font-mono">{String(val).padStart(2, "0")}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Live since August 2, 2026 — all AI-generated content must be marked, watermarked, and metadata-labeled.
                </p>
              </motion.div>

              <Section1Compliance />



              {/* TIMELINE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-16"
              >
                <h2 className="text-xl font-bold text-foreground mb-6 text-center">
                  <span className="text-gold-gradient">Key Deadlines</span>
                </h2>
                <div className="space-y-3">
                  {deadlines.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={`flex items-center gap-4 rounded-lg border p-4 ${
                        d.status === "passed"
                          ? "border-border/50 bg-card/30 opacity-60"
                          : d.status === "urgent"
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-gold/20 bg-gold/5"
                      }`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        d.status === "passed" ? "bg-muted/20" : d.status === "urgent" ? "bg-destructive/10" : "bg-gold/10"
                      }`}>
                        {d.status === "passed" ? (
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Clock className={`h-5 w-5 ${d.status === "urgent" ? "text-destructive" : "text-gold"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{d.label}</p>
                        <p className="text-xs text-muted-foreground">{d.date}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {d.status === "passed" ? (
                          <span className="text-xs font-bold text-muted-foreground tracking-wider">PASSED</span>
                        ) : (
                          <span className={`text-sm font-black font-mono ${d.status === "urgent" ? "text-destructive" : "text-gold"}`}>
                            {d.daysLeft}d
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* ARTICLE MAPPING */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-16"
              >
                <div className="text-center mb-8">
                  <Badge variant="outline" className="border-gold/30 text-gold mb-4">ARTICLE-BY-ARTICLE</Badge>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    <span className="text-chrome-gradient">Every Article</span>{" "}
                    <span className="text-gold-gradient">→ Apex PSI</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                    One protocol satisfies every transparency and audit obligation in the EU AI Act.
                  </p>
                </div>

                <div className="space-y-4">
                  {ARTICLES.map((article, i) => {
                    const Icon = article.icon;
                    return (
                      <motion.div
                        key={article.number}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className={`rounded-xl border p-5 sm:p-6 ${
                          article.critical
                            ? "border-gold/40 bg-gold/5"
                            : "border-border bg-card/60"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            article.critical ? "bg-gold/15" : "bg-muted/10"
                          }`}>
                            <Icon className={`h-5 w-5 ${article.critical ? "text-gold" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-black text-foreground">{article.number}</span>
                              <span className="text-xs text-muted-foreground">—</span>
                              <span className="text-sm font-semibold text-foreground">{article.title}</span>
                              {article.critical && (
                                <Badge variant="outline" className="border-gold/40 text-gold text-[10px] px-1.5 py-0">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{article.requirement}</p>
                            <div className="rounded-lg bg-background/50 border border-border/50 p-3">
                              <p className="text-xs font-semibold text-gold mb-1">Apex PSI Solution</p>
                              <p className="text-xs text-foreground/80 leading-relaxed">{article.psiMapping}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right hidden sm:block">
                            <p className="text-lg font-black text-gold font-mono">{article.cost}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* COST COMPARISON */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-16"
              >
                <div className="text-center mb-8">
                  <Badge variant="outline" className="border-gold/30 text-gold mb-4">COST ANALYSIS</Badge>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    <span className="text-chrome-gradient">$0.006</span>{" "}
                    <span className="text-gold-gradient">vs The World</span>
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-5 gap-px bg-border rounded-xl overflow-hidden">
                      {/* Header */}
                      <div className="bg-card p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Method</div>
                      <div className="bg-card p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</div>
                      <div className="bg-card p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per</div>
                      <div className="bg-card p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Speed</div>
                      <div className="bg-card p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Features</div>

                      {/* Rows */}
                      {COST_COMPARISON.map((row, i) => (
                        <Fragment key={`row-${i}`}>
                          <div key={`m-${i}`} className={`p-3 text-sm font-semibold ${row.recommended ? "bg-gold/5 text-gold" : "bg-background text-foreground"}`}>
                            {row.recommended && <span className="mr-1">★</span>}{row.method}
                          </div>
                          <div key={`c-${i}`} className={`p-3 text-sm font-black font-mono ${row.recommended ? "bg-gold/5 text-gold" : "bg-background text-foreground"}`}>
                            {row.cost}
                          </div>
                          <div key={`p-${i}`} className={`p-3 text-xs ${row.recommended ? "bg-gold/5 text-foreground/80" : "bg-background text-muted-foreground"}`}>
                            {row.per}
                          </div>
                          <div key={`t-${i}`} className={`p-3 text-xs ${row.recommended ? "bg-gold/5 text-foreground/80" : "bg-background text-muted-foreground"}`}>
                            {row.time}
                          </div>
                          <div key={`f-${i}`} className={`p-3 text-xs ${row.recommended ? "bg-gold/5 text-foreground/80" : "bg-background text-muted-foreground"}`}>
                            {row.features}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* CODE OF PRACTICE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-16"
              >
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="h-6 w-6 text-gold" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Code of Practice Signatory</h3>
                      <p className="text-xs text-muted-foreground">EU AI Office — Transparency of AI-Generated Content</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                    Apex PSI is eligible to sign the EU Code of Practice on Transparency of AI-Generated Content as a
                    <strong className="text-gold"> technology provider of marking and detection solutions</strong>.
                    Our protocol provides the marking, provenance, watermarking, and detection infrastructure that Article 50 requires.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 mb-6">
                    {CODE_OF_PRACTICE_BENEFITS.map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                        <span className="text-xs text-foreground/80">{b}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="hero" asChild>
                      <a href="https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content" target="_blank" rel="noopener noreferrer">
                        Sign the Code <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                    <Button variant="heroOutline" asChild>
                      <a href="/assess">Free Compliance Assessment</a>
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* FAQ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-16"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black">
                    <span className="text-gold-gradient">Frequently Asked</span>
                  </h2>
                </div>
                <div className="space-y-2 max-w-3xl mx-auto">
                  {FAQ_ITEMS.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card/60 overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                      >
                        <span className="text-sm font-semibold text-foreground">{item.q}</span>
                        <motion.span
                          animate={{ rotate: openFaq === i ? 45 : 0 }}
                          className="text-gold text-lg font-bold ml-2 shrink-0"
                        >
                          +
                        </motion.span>
                      </button>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="px-4 pb-4"
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="rounded-xl border border-gold/20 bg-gold/5 p-6 sm:p-8 text-center"
              >
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Article 50 Is In Force — <span className="text-gold-gradient">Since August 2, 2026</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  Every AI-generated content piece must be marked, watermarked, and metadata-labeled.
                  Apex PSI does it all — at $0.006 per verification.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" asChild>
                    <a href="/seal">Seal Your First Document</a>
                  </Button>
                  <Button variant="heroOutline" asChild>
                    <a href="/assess">Free Compliance Score</a>
                  </Button>
                </div>
              </motion.div>

              <p className="text-xs text-center text-muted-foreground/50 mt-6 italic">
                This page provides general information about EU AI Act compliance obligations.
                It does not constitute legal advice. Consult qualified legal counsel for jurisdiction-specific guidance.
                Last updated July 2026.
              </p>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
}
