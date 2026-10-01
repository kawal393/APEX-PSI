import { motion } from "framer-motion";
import { ExternalLink, FileText, BookOpen, Landmark, TrendingUp, Shield, AlertTriangle, Scale, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories = ["All", "Regulation", "Research", "Market", "Enforcement", "Technical"] as const;
type Category = (typeof categories)[number];

const references = [
  // ── REGULATION ──
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act (Regulation 2024/1689)",
    source: "Official Journal of the European Union",
    desc: "The world's first comprehensive AI regulation. Full enforcement for high-risk systems began August 2, 2026. Fines up to €35M or 7% of global turnover.",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
  },
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act Compliance Guide 2026",
    source: "GLACIS — Jan 2026",
    desc: "6,500-word comprehensive guide covering risk categories, conformity requirements, and the full implementation roadmap for Regulation 2024/1689.",
    url: "https://www.glacis.io/guide-eu-ai-act",
  },
  {
    icon: Scale,
    category: "Regulation" as Category,
    title: "AI Act Technical Documentation: Article 11 & Annex IV",
    source: "AiActo — Feb 2026",
    desc: "Guide to the mandatory sections of technical documentation required for high-risk AI systems under Article 11 and Annex IV. It describes the legal requirement; it says nothing about any particular tool.",
    url: "https://www.aiacto.eu/en/blog/documentation-technique-ai-act-article-11-annexe-iv",
  },
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act Technical Documentation (Article 11) Guide",
    source: "Glocert International",
    desc: "Detailed breakdown of what to prepare and maintain for Article 11 compliance — 8 sections of post-market monitoring documentation most companies haven't started.",
    url: "https://www.glocertinternational.com/resources/guides/eu-ai-act-technical-documentation-article-11/",
  },
  {
    icon: Globe,
    category: "Regulation" as Category,
    title: "Comprehensive Guide to AI Laws Worldwide (2026)",
    source: "Sumsub — Dec 2025",
    desc: "Survey of AI rules across the EU, US states, China, India, Brazil, Canada and other jurisdictions. A map of requirements — it does not evaluate or mention any verification product.",
    url: "https://sumsub.com/blog/comprehensive-guide-to-ai-laws-and-regulations-worldwide/",
  },
  {
    icon: Globe,
    category: "Regulation" as Category,
    title: "AI Regulations Around the World: 2026 Edition",
    source: "GDPR Local",
    desc: "Country-by-country breakdown of AI regulation status. Its subject is the breadth of the rules, not the adequacy of any response to them.",
    url: "https://gdprlocal.com/ai-regulations-around-the-world/",
  },
  {
    icon: Scale,
    category: "Regulation" as Category,
    title: "EU AI Act High-Risk Requirements: What Companies Need to Know",
    source: "Dataiku — Aug 2025",
    desc: "Obligations for providers, deployers, importers, and distributors of high-risk AI. Summarises duties; it does not prescribe how they must be evidenced.",
    url: "https://www.dataiku.com/stories/blog/eu-ai-act-high-risk-requirements",
  },
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act Enforcement 2026: CCO's Complete Roadmap",
    source: "AI Governance Desk — Jan 2026",
    desc: "\"The question is no longer whether your organization understands the law — it is whether you can prove compliance.\" A framing this site found useful; the article does not mention APEX PSI.",
    url: "https://aigovernancedesk.com/eu-ai-act-enforcement-2026-cco-roadmap/",
  },
  {
    icon: Scale,
    category: "Regulation" as Category,
    title: "EU AI Act 2026: Compliance Requirements and Business Risks",
    source: "Legal Nodes — Feb 2026",
    desc: "Updated analysis of compliance requirements, transitional periods, and the business risks of non-compliance as enforcement begins.",
    url: "https://www.legalnodes.com/article/eu-ai-act-2026-updates-compliance-requirements-and-business-risks",
  },
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act Compliance: What to Inventory Before the Deadline",
    source: "Repello AI — Mar 2026",
    desc: "Practical inventory checklist for high-risk AI systems. Most companies haven't even catalogued what they need to comply on.",
    url: "https://repello.ai/blog/eu-ai-act-compliance",
  },

  // ── RESEARCH ──
  {
    icon: FileText,
    category: "Research" as Category,
    title: "opML: Optimistic Machine Learning on Blockchain",
    source: "arXiv:2401.17555 — Conway, So, Yu, Wong (2024)",
    desc: "Foundational paper on optimistic verification for ML inference using fraud-proof patterns. Related work: it does not describe or evaluate APEX PSI, and PSI contains no optimistic on-chain challenge.",
    url: "https://arxiv.org/abs/2401.17555",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "opp/ai: Optimistic Privacy-Preserving AI on Blockchain",
    source: "arXiv:2402.15006 — ORA Protocol (2024)",
    desc: "Privacy-preserving AI verification using optimistic proofs on blockchain. Related literature only. It validates nothing about APEX PSI, and PSI has no zero-knowledge or optimistic-proof component.",
    url: "https://arxiv.org/abs/2402.15006",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "zkAgent: Verifiable Agent Execution via ZK Proof",
    source: "ePrint 2026/199",
    desc: "IACR ePrint paper on verifiable agent execution using zero-knowledge proofs. Context for the field — APEX PSI implements no zero-knowledge proof and this paper does not evaluate it.",
    url: "https://eprint.iacr.org/2026/199",
  },
  {
    icon: Lock,
    category: "Research" as Category,
    title: "Zero Knowledge Proof AI in 2026: Verifiable AI Without Model Exposure",
    source: "Calibraint — 2026",
    desc: "Vendor-authored overview of ZK-proof applications in AI. Not peer reviewed, and unrelated to APEX PSI, which implements no ZK proof and makes no privacy claim.",
    url: "https://www.calibraint.com/blog/zero-knowledge-proof-ai-2026",
  },
  {
    icon: Shield,
    category: "Research" as Category,
    title: "Zero-Knowledge Proofs for Privacy-Preserving Context Validation",
    source: "Security Boulevard — Mar 2026",
    desc: "Argument that zero-knowledge proofs can let an organisation substantiate a claim without disclosing raw data. Does not discuss APEX PSI, which implements no ZKP.",
    url: "https://securityboulevard.com/2026/03/zero-knowledge-proofs-for-privacy-preserving-context-validation/",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Proofs of Autonomy: Scalable Verification of AI Autonomy",
    source: "OpenReview — Grigor, Schroeder de Witt, Martinovic",
    desc: "Framework for binding agent outputs to verifiable proofs; documents how a host can silently tamper with a model. Background reading, not validation of APEX PSI.",
    url: "https://openreview.net/pdf/3f6735f378d62f71825b8ce4a53b05988ac364a1.pdf",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Simplifying Software Compliance: AI in Technical Documentation",
    source: "Empirical Software Engineering — Sovrano et al. (2025)",
    desc: "Empirical study on using AI to draft AI Act technical documentation. Evidence that the documentation burden is heavy; it makes no claim about cryptographic ledgers or about APEX.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11965209/",
  },
  {
    icon: Lock,
    category: "Research" as Category,
    title: "Zero-Knowledge Proofs and New Laws Reshape US Privacy",
    source: "Grand Pinnacle Tribune — 2026",
    desc: "Newsletter item on zero-knowledge proofs and US privacy law. Says nothing about APEX PSI.", 
    url: "https://evrimagaci.org/gpt/zeroknowledge-proofs-and-new-laws-reshape-us-privacy-523124",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Project VATA: Verifiable Human-AI Distinction with Groth16 ZK Proofs",
    source: "Medium — Mason (Feb 2026)",
    desc: "A different project by an unrelated author, built on Groth16 proofs and on-chain anchoring. It validates nothing here; APEX PSI implements no Groth16 verifier.",
    url: "https://medium.com/@lhmisme2011/project-vata-building-verifiable-human-ai-distinction-with-groth16-zero-knowledge-proofs-and-b87d182e5591",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Algorithmic Assurance: How AI and Proofs Redefine Trust in 2026",
    source: "Verifyo — Dec 2025",
    desc: "\"The era of manual audits is ending. 2026 marks the rise of algorithmic assurance.\" An opinion post; the author has never heard of APEX PSI, and a quoted phrase is not evidence.",
    url: "https://medium.com/@verifyo/algorithmic-assurance-how-ai-and-proofs-redefine-trust-in-2026-7d3552a58800",
  },

  // ── MARKET ──
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "EU AI Act Compliance: €17 Billion Opportunity",
    source: "Medium / Prieditis — Nov 2025",
    desc: "Analysis of the compliance market created by the EU AI Act. €17B+ across 27 member states, most of it currently addressed by attestation and audit tooling rather than cryptographic proof.",
    url: "https://medium.com/@arturs.prieditis/the-eu-ai-acts-hidden-market-how-high-risk-ai-compliance-became-a-17-billion-opportunity-734cea9b41e2",
  },
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "Hidden Costs of AI Act Compliance: CFO Guide",
    source: "EU AI Risk (2025)",
    desc: "Breakdown of compliance cost: consulting fees, documentation overhead, ongoing monitoring. Figures are the author's estimate, not audited. (Link unreachable at check time: 30s timeout.)",
    url: "https://euairisk.com/resources/hidden-costs-ai-act-compliance-cfo-guide",
  },
  // Removed 1 Oct 2026: the "HJ Automations" penalty explainer linked here
  // returned HTTP 404, and its description claimed an ROI figure this site
  // cannot substantiate. The €35M / 7% penalty ceiling is stated instead
  // against the official text (Regulation (EU) 2024/1689, Article 99).
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "15-Month Roadmap to August 2026 Compliance",
    source: "EU AI Risk",
    desc: "Month-by-month preparation guide. The timeline is the author's own judgement and the article says nothing about APEX PSI. (Link unreachable at check time: 30s timeout.)",
    url: "https://euairisk.com/resources/eu-ai-act-2026-compliance-checklist",
  },

  // ── ENFORCEMENT ──
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Only 3% of Organizations Fully Prepared for AI Regulation",
    source: "VinciWorks Survey via Legal Futures",
    desc: "3.5% of compliance professionals consider their organisation fully prepared for AI regulation; 29% are still \"figuring it out.\" A survey of self-assessed readiness — it measures perception, not preparedness, and does not mention APEX PSI.",
    url: "https://www.legalfutures.co.uk/associate-news/only-3-of-compliance-professionals-say-their-organisation-is-fully-prepared-for-ai-regulation",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "EU AI Act Enforcement Begins — Most Startups Aren't Ready",
    source: "Silicon Canals — Feb 2026",
    desc: "Reporting on the first enforcement deadline, with startups describing their own readiness. Editorial framing by the author. (Connection reset at check time.)",
    url: "https://siliconcanals.com/sc-n-eus-new-ai-act-enforcement-begins-today-and-most-startups-say-they-arent-ready-1lwz/",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Italian DPA Fines OpenAI EUR 15 Million Over ChatGPT Data Handling",
    source: "Times of Malta — 20 Dec 2024 (Reuters and Garante confirm the same figure)",
    desc: "Italy's data protection authority fined OpenAI EUR 15 million, announced 20 December 2024, over the absence of an adequate legal basis for processing personal data. It is a GDPR case, not an AI Act case, and it is evidence of enforcement appetite rather than evidence for any verification protocol. (Link returns 403 to automated checks; the figure is corroborated by the Reuters wire of the same date.)",
    url: "https://timesofmalta.com/article/italy-fines-openai-15-million-euros-chatgpt-probe.1102753",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Global AI Regulations 2026: Enforcement, Risks & Fines",
    source: "TechResearchOnline",
    desc: "Tracker of enforcement activity across the EU, US, China, India and Brazil. Makes no assessment of any cryptographic tool.",
    url: "https://techresearchonline.com/blog/global-ai-regulations-enforcement-guide/",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "$3 Billion in Fines: Why SEC's Rule Change Is a Gift to Cryptographic Audit",
    source: "VeritasChain Blog — Dec 2025",
    desc: "Argument that the SEC's 2022 electronic-recordkeeping amendments accommodate hash-chained, digitally signed records. Published under the VeritasChain handle, which is this project's own writing — the financial sector has not validated APEX PSI's architecture.",
    url: "https://veritaschain.org/blog/posts/2025-12-25-sec-rule-17a4/",
  },

  // ── ADVERSARIAL / CRITIQUE SOURCES ──
  {
    icon: Scale,
    category: "Regulation" as Category,
    title: "EU AI Act Article 14: Human Oversight Requirements",
    source: "EU AI Act Official Text",
    desc: "Mandates human oversight to prevent risks to health and fundamental rights. The exact article critics cite against ZKP-only verification.",
    url: "https://artificialintelligenceact.eu/article/14/",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "The Impact of Zero-Knowledge Proofs on Policy & Regulation",
    source: "Internet Policy Review",
    desc: "Analysis of how zero-knowledge proofs raise technical complexity for regulators. If anything it cuts against claiming ZK capability, which is why APEX PSI claims none.",
    url: "https://policyreview.info/articles/analysis/impact-zero-knowledge-proofs",
  },
  {
    icon: BookOpen,
    category: "Technical" as Category,
    title: "AI Act Technical Documentation: Standardization Gap Analysis",
    source: "Springer — 2025",
    desc: "Identifies a gap in precise, certifiable standards for Articles 11 and 12. APEX PSI's IETF submission is an Informational draft adopted by no standards body and closes no gap by existing.",
    url: "https://link.springer.com/chapter/10.1007/978-3-031-94924-1_6",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "AI Liability & Decentralized Accountability Under EU Law",
    source: "Taylor & Francis — 2025",
    desc: "Examines liability gaps for decentralised actors under EU law. It does not discuss APEX PSI, and nothing on this page asserts that any APEX entity is a registered or recognised conformity body.",
    url: "https://www.tandfonline.com/doi/full/10.1080/19460171.2025.2496193",
  },

  // ── TECHNICAL ──
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "EU AI Act and Cryptographic Audit Trails",
    source: "VeritasChain Blog — Dec 2025",
    desc: "Argues that unauditable internal logs do not meet the record-keeping expectation of Article 12. Published under the VeritasChain handle — this project's own writing, not independent support.",
    url: "https://veritaschain.org/blog/posts/2025-12-25-eu-ai-act-cryptographic-audit/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Building Cryptographic Audit Trails for AI Trading Systems",
    source: "DEV Community — VeritasChain",
    desc: "Technical walkthrough of RFC 6962 (Certificate Transparency) structures applied to AI logs, under the VeritasChain handle. PSI's Merkle construction follows the same family of ideas; this is self-published description, not third-party review.",
    url: "https://dev.to/veritaschain/building-cryptographic-audit-trails-for-ai-trading-systems-a-deep-dive-into-rfc-6962-based-6aa",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Tamper-Evident Audit Trails: Hash Chains and Merkle Trees",
    source: "DEV Community — VeritasChain",
    desc: "\"Can you prove this log wasn't modified after the fact?\" If your answer is 'trust me,' you're about to have a very bad time.",
    url: "https://dev.to/veritaschain/building-tamper-evident-audit-trails-for-algorithmic-trading-a-deep-dive-into-hash-chains-and-3lh6",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "From 'Trust Us' to 'Verify': Cryptographic Standards for AI",
    source: "VeritasChain Blog — Jan 2026",
    desc: "Describes CAP-SRP and VeraSnap, protocols for proving that an AI system refused a request, and reports a 93x rise in AI-generated abuse material with a 79% watermark bypass rate. Those figures are the author's own and were not independently re-derived here. VeritasChain is this project's own handle.",
    url: "https://veritaschain.org/blog/posts/2026-01-16-vericapture-cap-srp-complete-verification/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Cryptographic Proof That AI Refused: CAP and SRP",
    source: "VeritasChain Blog — Jan 2026",
    desc: "Reports that Grok produced illegal imagery despite stated safeguards, and argues that 12 jurisdictions converged on the point that policy restrictions are not proof of enforcement. VeritasChain is this project's own handle; the jurisdictional claim is not sourced to a regulator here.",
    url: "https://veritaschain.org/blog/posts/2026-01-22-cap-srp-cryptographic-proof-ai-refused/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Hash, Print, Anchor: Securing Logs with Merkle Trees",
    source: "Medium — Vana Bharathi Raja T (2025)",
    desc: "A practitioner tutorial on anchoring event logs with hash chains. An unrelated author; nothing in it validates APEX PSI and it evaluates no product.",
    url: "https://medium.com/@vanabharathiraja/%EF%B8%8F-building-a-tamper-proof-event-logging-system-e71dfbc3c58a",
  },
  {
    icon: FileText,
    category: "Technical" as Category,
    title: "Seven Developments Prove Nobody Can Verify What AI Refuses",
    source: "Medium — VeritasChain (2026)",
    desc: "Round-up of regulatory developments touching content verification, published under the VeritasChain handle — the same project's own writing, not independent confirmation of anything.",
    url: "https://medium.com/@veritaschain/seven-things-happened-this-week-that-prove-nobody-can-verify-what-ai-refuses-to-generate-e23ba194fcd6",
  },
];

const categoryIcons: Record<Category, React.ElementType> = {
  All: Globe,
  Regulation: Landmark,
  Research: FileText,
  Market: TrendingUp,
  Enforcement: AlertTriangle,
  Technical: Shield,
};

const ResearchReferences = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [showAll, setShowAll] = useState(false);

  const filtered = activeCategory === "All" ? references : references.filter((r) => r.category === activeCategory);
  const displayed = showAll ? filtered : filtered.slice(0, 12);

  return (
    <section className="relative py-24 px-4" id="research">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Research & References
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Sources &amp; <span className="text-gold-gradient">Related Reading</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm mb-2">
            A reading list of the regulation, research and enforcement reporting this project sits inside. It is not a list of endorsements: none of these sources has reviewed, tested or adopted APEX PSI, and no technical claim on this site rests on a blog post.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto text-xs mb-2">
            APEX PSI's own claims are limited to what is implemented — canonicalisation, SHA-256 hash chaining, Merkle inclusion proofs, Ed25519 signatures and a human ratification screen. Where a source below discusses zero-knowledge proofs or multi-party computation, it describes somebody else's system.
          </p>
          <p className="text-xs text-muted-foreground/60">
            {references.length} sources across {categories.length - 1} categories. Every link was resolved against its host on 1 October 2026; entries marked unreachable failed at that check and are kept only because the underlying work is still citable by title.
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            const count = cat === "All" ? references.length : references.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setShowAll(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  activeCategory === cat
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-gold/20 hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((r, i) => (
            <motion.a
              key={r.title}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-xl border border-border bg-card/60 p-5 hover:border-gold/30 transition-all hover:bg-card/80 block"
            >
              <div className="flex items-center gap-2 mb-3">
                <r.icon className="h-4 w-4 text-gold" />
                <span className="text-[10px] font-black tracking-widest text-gold/70 uppercase">{r.category}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground/30 ml-auto group-hover:text-gold transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1 leading-tight">{r.title}</h3>
              <p className="text-[11px] text-gold/60 font-medium mb-2">{r.source}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </motion.a>
          ))}
        </div>

        {filtered.length > 12 && !showAll && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="border-gold/30 hover:border-gold/60 hover:bg-gold/5"
            >
              Show All {filtered.length} Sources
            </Button>
          </div>
        )}

        {showAll && filtered.length > 12 && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowAll(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Show Less
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ResearchReferences;
