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
    desc: "Complete guide to the 9 mandatory sections of technical documentation required for high-risk AI systems. The exact problem APEX automates.",
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
    desc: "Global regulatory landscape: EU AI Act, US state bills, China's AI regulations, India's SGI mandate, Brazil, Canada, and 30+ jurisdictions. Every one needs verification infrastructure.",
    url: "https://sumsub.com/blog/comprehensive-guide-to-ai-laws-and-regulations-worldwide/",
  },
  {
    icon: Globe,
    category: "Regulation" as Category,
    title: "AI Regulations Around the World: 2026 Edition",
    source: "GDPR Local",
    desc: "Country-by-country breakdown of AI regulation status. Proves the compliance problem is global, not just European.",
    url: "https://gdprlocal.com/ai-regulations-around-the-world/",
  },
  {
    icon: Scale,
    category: "Regulation" as Category,
    title: "EU AI Act High-Risk Requirements: What Companies Need to Know",
    source: "Dataiku — Aug 2025",
    desc: "Obligations for providers, deployers, importers, and distributors of high-risk AI. Every entity in the chain needs compliance tooling.",
    url: "https://www.dataiku.com/stories/blog/eu-ai-act-high-risk-requirements",
  },
  {
    icon: Landmark,
    category: "Regulation" as Category,
    title: "EU AI Act Enforcement 2026: CCO's Complete Roadmap",
    source: "AI Governance Desk — Jan 2026",
    desc: "\"The question is no longer whether your organization understands the law — it is whether you can prove compliance.\" The exact thesis behind APEX.",
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
    desc: "The foundational paper on optimistic verification for ML. Proves fraud-proof patterns work for ML inference. APEX extends this to regulatory compliance.",
    url: "https://arxiv.org/abs/2401.17555",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "opp/ai: Optimistic Privacy-Preserving AI on Blockchain",
    source: "arXiv:2402.15006 — ORA Protocol (2024)",
    desc: "Privacy-preserving AI verification using optimistic proofs. Validates the exact architecture APEX uses: prove compliance without exposing model weights.",
    url: "https://arxiv.org/abs/2402.15006",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "zkAgent: Verifiable Agent Execution via ZK Proof",
    source: "ePrint 2026/199",
    desc: "Latest research on verifiable AI agent execution using zero-knowledge proofs. Validates ZK approaches for AI compliance verification.",
    url: "https://eprint.iacr.org/2026/199",
  },
  {
    icon: Lock,
    category: "Research" as Category,
    title: "Zero Knowledge Proof AI in 2026: Verifiable AI Without Model Exposure",
    source: "Calibraint — 2026",
    desc: "Comprehensive analysis of ZK-proof applications in AI. Privacy-preserving verification is no longer theoretical — it's production-ready.",
    url: "https://www.calibraint.com/blog/zero-knowledge-proof-ai-2026",
  },
  {
    icon: Shield,
    category: "Research" as Category,
    title: "Zero-Knowledge Proofs for Privacy-Preserving Context Validation",
    source: "Security Boulevard — Mar 2026",
    desc: "ZKPs enable organizations to prove compliance without exposing underlying data. Exactly what Articles 13 and 14 demand.",
    url: "https://securityboulevard.com/2026/03/zero-knowledge-proofs-for-privacy-preserving-context-validation/",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Proofs of Autonomy: Scalable Verification of AI Autonomy",
    source: "OpenReview — Grigor, Schroeder de Witt, Martinovic",
    desc: "Formal framework binding agent outputs to verifiable proofs. Proves hosts can silently tamper with models — unless cryptographic proofs exist.",
    url: "https://openreview.net/pdf/3f6735f378d62f71825b8ce4a53b05988ac364a1.pdf",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Simplifying Software Compliance: AI in Technical Documentation",
    source: "Empirical Software Engineering — Sovrano et al. (2025)",
    desc: "Peer-reviewed study on using AI to draft AI Act technical documentation. Proves the documentation burden is so severe that automation is mandatory.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11965209/",
  },
  {
    icon: Lock,
    category: "Research" as Category,
    title: "Zero-Knowledge Proofs and New Laws Reshape US Privacy",
    source: "Grand Pinnacle Tribune — 2026",
    desc: "ZKPs gain ground as sweeping privacy laws transform enforcement. Proves the verification paradigm is going global, not just EU.",
    url: "https://evrimagaci.org/gpt/zeroknowledge-proofs-and-new-laws-reshape-us-privacy-523124",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Project VATA: Verifiable Human-AI Distinction with Groth16 ZK Proofs",
    source: "Medium — Mason (Feb 2026)",
    desc: "Protocol verification framework using Groth16 proofs and on-chain anchoring. Independent validation of the exact architecture APEX implements.",
    url: "https://medium.com/@lhmisme2011/project-vata-building-verifiable-human-ai-distinction-with-groth16-zero-knowledge-proofs-and-b87d182e5591",
  },
  {
    icon: FileText,
    category: "Research" as Category,
    title: "Algorithmic Assurance: How AI and Proofs Redefine Trust in 2026",
    source: "Verifyo — Dec 2025",
    desc: "\"The era of manual audits is ending. 2026 marks the rise of algorithmic assurance.\" Third-party validation of our entire thesis.",
    url: "https://medium.com/@verifyo/algorithmic-assurance-how-ai-and-proofs-redefine-trust-in-2026-7d3552a58800",
  },

  // ── MARKET ──
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "EU AI Act Compliance: €17 Billion Opportunity",
    source: "Medium / Prieditis — Nov 2025",
    desc: "Analysis of the compliance market created by the EU AI Act. €17B+ across 27 member states — and APEX is the only cryptographic solution.",
    url: "https://medium.com/@arturs.prieditis/the-eu-ai-acts-hidden-market-how-high-risk-ai-compliance-became-a-17-billion-opportunity-734cea9b41e2",
  },
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "Hidden Costs of AI Act Compliance: CFO Guide",
    source: "EU AI Risk (2025)",
    desc: "The true financial landscape of compliance — consulting fees, documentation overhead, ongoing monitoring. The cost problem APEX eliminates.",
    url: "https://euairisk.com/resources/hidden-costs-ai-act-compliance-cfo-guide",
  },
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "EU AI Act 2026: August Deadline Could Cost €35 Million",
    source: "HJ Automations",
    desc: "Non-compliance penalties: up to €35M or 7% of global annual turnover. Makes the ROI on APEX compliance infinite.",
    url: "https://hamzajadoon.cloud/posts/eu-ai-act-2026-the-august-compliance-deadline-that-could-cost-your-business-eur35-million.html",
  },
  {
    icon: TrendingUp,
    category: "Market" as Category,
    title: "15-Month Roadmap to August 2026 Compliance",
    source: "EU AI Risk",
    desc: "Month-by-month compliance guide proving most organizations need 15+ months of preparation. APEX delivers it in weeks.",
    url: "https://euairisk.com/resources/eu-ai-act-2026-compliance-checklist",
  },

  // ── ENFORCEMENT ──
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Only 3% of Organizations Fully Prepared for AI Regulation",
    source: "VinciWorks Survey via Legal Futures",
    desc: "3.5% consider themselves fully prepared. 29% are still \"figuring it out.\" 97% of the market needs what APEX sells.",
    url: "https://www.legalfutures.co.uk/associate-news/only-3-of-compliance-professionals-say-their-organisation-is-fully-prepared-for-ai-regulation",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "EU AI Act Enforcement Begins — Most Startups Aren't Ready",
    source: "Silicon Canals — Feb 2026",
    desc: "First enforcement deadline hit. Most startups admit they aren't ready. The compliance gap is now a compliance crisis.",
    url: "https://siliconcanals.com/sc-n-eus-new-ai-act-enforcement-begins-today-and-most-startups-say-they-arent-ready-1lwz/",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Italy Fines OpenAI €15 Million After ChatGPT Probe",
    source: "Times of Malta — Dec 2024",
    desc: "First major AI enforcement action. Italy's DPA fined OpenAI €15M over data practices. Enforcement is not theoretical — it's happening.",
    url: "https://timesofmalta.com/article/italy-fines-openai-15-million-euros-chatgpt-probe.1102753",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "Global AI Regulations 2026: Enforcement, Risks & Fines",
    source: "TechResearchOnline",
    desc: "Global enforcement tracker: EU, US, China, India, Brazil all moving toward active enforcement. Multi-jurisdictional compliance is now mandatory.",
    url: "https://techresearchonline.com/blog/global-ai-regulations-enforcement-guide/",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "$3 Billion in Fines: Why SEC's Rule Change Is a Gift to Cryptographic Audit",
    source: "VeritasChain Blog — Dec 2025",
    desc: "SEC's 2022 rule change opens a regulatory pathway for hash chains, digital signatures, and Merkle trees. The financial sector validates our architecture.",
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
    desc: "Analysis of how ZKPs create higher technical complexity for regulators. The transparency tension APEX resolves with its dual-layer architecture.",
    url: "https://policyreview.info/articles/analysis/impact-zero-knowledge-proofs",
  },
  {
    icon: BookOpen,
    category: "Technical" as Category,
    title: "AI Act Technical Documentation: Standardization Gap Analysis",
    source: "Springer — 2025",
    desc: "Identifies the lack of precise certifiable standards for Art. 11 & 12. The standardization deadlock that first-mover IETF submission addresses.",
    url: "https://link.springer.com/chapter/10.1007/978-3-031-94924-1_6",
  },
  {
    icon: AlertTriangle,
    category: "Enforcement" as Category,
    title: "AI Liability & Decentralized Accountability Under EU Law",
    source: "Taylor & Francis — 2025",
    desc: "Examines how decentralized entities lack direct legally-binding liability. The gap that APEX Standards Foundation (ASF) fills as a registered provider.",
    url: "https://www.tandfonline.com/doi/full/10.1080/19460171.2025.2496193",
  },

  // ── TECHNICAL ──
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "EU AI Act and Cryptographic Audit Trails",
    source: "VeritasChain Blog — Dec 2025",
    desc: "In-depth analysis of why \"trust me\" logs won't satisfy Article 12. Cryptographic audit trails provide the only defensible compliance path.",
    url: "https://veritaschain.org/blog/posts/2025-12-25-eu-ai-act-cryptographic-audit/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Building Cryptographic Audit Trails for AI Trading Systems",
    source: "DEV Community — VeritasChain",
    desc: "Technical deep-dive into RFC 6962-based verification applied to AI systems. Certificate Transparency architecture for algorithmic compliance.",
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
    desc: "CAP-SRP and VeraSnap protocols: cryptographic proof that AI refused. 93x increase in AI-CSAM, 79% watermark bypass rate. Verification is the only answer.",
    url: "https://veritaschain.org/blog/posts/2026-01-16-vericapture-cap-srp-complete-verification/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Cryptographic Proof That AI Refused: CAP and SRP",
    source: "VeritasChain Blog — Jan 2026",
    desc: "After Grok generated thousands of illegal images despite claimed safeguards, 12 jurisdictions delivered one message: restrictions are not proof.",
    url: "https://veritaschain.org/blog/posts/2026-01-22-cap-srp-cryptographic-proof-ai-refused/",
  },
  {
    icon: Shield,
    category: "Technical" as Category,
    title: "Hash, Print, Anchor: Securing Logs with Merkle Trees",
    source: "Medium — Vana Bharathi Raja T (2025)",
    desc: "\"Logs don't lie — but only if they're cryptographically anchored.\" Independent validation of APEX's hash-chain ledger architecture.",
    url: "https://medium.com/@vanabharathiraja/%EF%B8%8F-building-a-tamper-proof-event-logging-system-e71dfbc3c58a",
  },
  {
    icon: FileText,
    category: "Technical" as Category,
    title: "Seven Developments Prove Nobody Can Verify What AI Refuses",
    source: "Medium — VeritasChain (2026)",
    desc: "Primary-source investigation across 4 continents, 20+ legislative efforts. The structural verification gap that APEX fills.",
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
            Built on <span className="text-gold-gradient">Verified Research</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm mb-2">
            Every claim grounded in published regulation, peer-reviewed research, market analysis, and enforcement action.
          </p>
          <p className="text-xs text-muted-foreground/60">
            {references.length} sources across {categories.length - 1} categories
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
