import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { FileText, ExternalLink, Github, BookOpen, Globe, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareEngine from "@/components/ShareEngine";
import { supabase } from "@/integrations/supabase/client";

interface Publication {
  id: string;
  title: string;
  authors: string;
  publication_date: string | null;
  pub_type: string;
  source_name: string;
  url: string;
  description: string;
  is_own: boolean;
  featured: boolean;
}

const defaultPubs: Publication[] = [
  {
    id: "ietf",
    title: "draft-singh-psi-00: Provable Safety Invariants for AI Systems",
    authors: "R. Singh",
    publication_date: "2026-03",
    pub_type: "ietf",
    source_name: "IETF Datatracker",
    url: "https://datatracker.ietf.org/doc/draft-singh-psi/",
    description: "Internet-Draft defining the PSI Protocol — a framework for mathematically verifiable AI compliance using commit-prove-verify pipelines and sovereign tribunal governance.",
    is_own: true,
    featured: true,
  },
  {
    id: "arxiv",
    title: "Verifiable AI Governance: From Self-Reported Compliance to Cryptographic Proof",
    authors: "R. Singh",
    publication_date: "2026-03",
    pub_type: "arxiv",
    source_name: "arXiv",
    url: "https://arxiv.org/",
    description: "Technical paper establishing the mathematical foundations of PSI Protocol including zero-knowledge proofs, Merkle audit trees, and multi-party computation for compliance verification.",
    is_own: true,
    featured: true,
  },
  {
    id: "github",
    title: "APEX Infrastructure — PSI Protocol Reference Implementation",
    authors: "APEX Team",
    publication_date: "2026-03",
    pub_type: "github",
    source_name: "GitHub",
    url: "https://github.com/",
    description: "Open-source reference implementation featuring the PSI verification engine, MPC consensus layer, and public verification portal.",
    is_own: true,
    featured: true,
  },
  {
    id: "medium",
    title: "Seven Things That Prove Nobody Can Verify What AI Refuses to Generate",
    authors: "R. Singh",
    publication_date: "2026-03",
    pub_type: "article",
    source_name: "Medium",
    url: "https://medium.com/@veritaschain/seven-things-happened-this-week-that-prove-nobody-can-verify-what-ai-refuses-to-generate-e23ba194fcd6",
    description: "Analysis of the verification gap in AI safety — why 'Trust Us' models fail and how cryptographic audit trails provide the only verifiable alternative.",
    is_own: true,
    featured: false,
  },
  {
    id: "zenodo-1",
    title: "Deterministic Invariant Enforcement in AI Governance",
    authors: "Ondřej Škultety",
    publication_date: "2026",
    pub_type: "zenodo",
    source_name: "Zenodo",
    url: "https://zenodo.org/",
    description: "Academic framework exploring structural governance, authority constraints, and non-bypass guarantees — validating the necessity of deterministic enforcement that PSI Protocol operationalises.",
    is_own: false,
    featured: false,
  },
];

const typeIcons: Record<string, typeof FileText> = {
  ietf: Globe,
  arxiv: BookOpen,
  github: Github,
  article: FileText,
  zenodo: Award,
  commentary: FileText,
};

const typeBadgeColors: Record<string, string> = {
  ietf: "bg-primary/10 text-primary border-primary/20",
  arxiv: "bg-destructive/10 text-destructive border-destructive/20",
  github: "bg-foreground/10 text-foreground border-foreground/20",
  article: "bg-psi-blue/10 text-psi-blue border-psi-blue/20",
  zenodo: "bg-compliant/10 text-compliant border-compliant/20",
  commentary: "bg-gold/10 text-gold border-gold/20",
};

const Research = () => {
  const [pubs, setPubs] = useState<Publication[]>(defaultPubs);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchPubs = async () => {
      const { data } = await supabase
        .from("research_publications")
        .select("*")
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setPubs(data as Publication[]);
      }
    };
    fetchPubs();
  }, []);

  const types = ["all", ...Array.from(new Set(pubs.map((p) => p.pub_type)))];
  const filtered = filter === "all" ? pubs : pubs.filter((p) => p.pub_type === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Research & Publications | PSI Protocol — IETF draft-singh-psi-00 — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="IETF drafts, arXiv papers, and institutional citations — the authoritative research behind the Open Protocol for Verifiable AI Governance."
        />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
              Institutional Authority
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Research & Publications
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              From IETF Internet-Drafts to peer-reviewed papers — the mathematical and institutional foundations of PSI Protocol.
            </p>
            <ShareEngine />
          </motion.div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                  filter === t
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-card/50 text-muted-foreground border-border hover:border-gold/20"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Publications list */}
          <div className="space-y-4">
            {filtered.map((pub, i) => {
              const Icon = typeIcons[pub.pub_type] || FileText;
              return (
                <motion.a
                  key={pub.id}
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group block bg-card/80 border border-border rounded-xl p-5 hover:border-gold/20 hover:shadow-gold transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-foreground font-semibold text-sm group-hover:text-gold transition-colors">
                          {pub.title}
                        </h3>
                        {pub.featured && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-muted-foreground text-xs">{pub.authors}</span>
                        <span className="text-muted-foreground/40 text-xs">•</span>
                        <span className="text-muted-foreground text-xs">{pub.source_name}</span>
                        {pub.publication_date && (
                          <>
                            <span className="text-muted-foreground/40 text-xs">•</span>
                            <span className="text-muted-foreground text-xs">{pub.publication_date}</span>
                          </>
                        )}
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeBadgeColors[pub.pub_type] || typeBadgeColors.commentary}`}
                        >
                          {pub.pub_type}
                        </span>
                        {!pub.is_own && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-muted-foreground/20 text-muted-foreground">
                            Third-Party
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{pub.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors mt-1 shrink-0" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Research;
