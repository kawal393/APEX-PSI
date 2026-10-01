import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
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
    title: "draft-singh-psi, revision 01: Proof of Sovereign Integrity (PSI) - A Cryptographic Protocol for Verifiable AI Regulatory Compliance",
    authors: "K. Singh",
    publication_date: "2026-08",
    pub_type: "ietf",
    source_name: "IETF Datatracker",
    url: "https://datatracker.ietf.org/doc/draft-singh-psi/",
    description: "Internet-Draft defining the PSI Protocol - a framework for cryptographic evidence of AI regulatory compliance using commit-prove-verify pipelines and independent review-panel governance. The filed revision 01 (submitted 30 August 2026, expires 3 March 2027) states zero-knowledge commitments and multi-party computation as the mechanism; no such system is implemented here. What the deployed reference implementation actually provides is SHA-256 hashing over RFC 8785 canonicalised input, Ed25519 signatures and Merkle inclusion proofs, specified as the PSI-SEAL/1.0.0 schema. A revision withdrawing the unused claims has been written; until it appears on the datatracker record, the filed text is what a third party will cite, and this page describes the filed text rather than improving it.",
    is_own: true,
    featured: true,
  },
  {
    id: "whitepaper",
    title: "PSI: Proof of Stateful Integrity — A Cryptographic Protocol",
    authors: "K. Singh",
    publication_date: "2026-03",
    pub_type: "preprint",
    source_name: "Self-hosted preprint (/paper)",
    url: "https://ai-governance-standard.com/paper",
    description: "The full technical write-up of the protocol as hosted on this site. It is a preprint: it has not been peer reviewed, it is not indexed by arXiv, and no DOI has been issued for it. Any statement on this page or in the preprint that implies a venue, an index or a persistent identifier is superseded by this line.",
    is_own: true,
    featured: true,
  },
  {
    id: "github",
    title: "APEX-PSI — PSI Protocol Reference Implementation",
    authors: "kawal393/APEX-PSI",
    publication_date: "2026-03",
    pub_type: "github",
    source_name: "GitHub",
    url: "https://github.com/kawal393/APEX-PSI",
    description: "Publicly readable reference implementation: the seal schema, the TypeScript and Python verifiers, and the byte-level conformance vectors under psi-conformance/vectors. Verification code is MIT; the generation engine is not open source, so \"reference implementation\" means readable and checkable, not freely reusable. There is no consensus layer — the three verification endpoints re-run the same checks on the same input.",
    is_own: true,
    featured: true,
  },
  {
    id: "medium",
    title: "Seven Things That Prove Nobody Can Verify What AI Refuses to Generate",
    authors: "VeritasChain (@veritaschain)",
    publication_date: "2026-03",
    pub_type: "article",
    source_name: "Medium",
    url: "https://medium.com/@veritaschain/seven-things-happened-this-week-that-prove-nobody-can-verify-what-ai-refuses-to-generate-e23ba194fcd6",
    description: "Third-party commentary on the verification gap in AI safety, listed here as related reading, not as an evaluation of this protocol. It is published under the VeritasChain handle, a separate project from APEX PSI; it says nothing about PSI-SEAL conformance and does not endorse this work. The link returns 403 to automated checks, so its continued existence is taken from the sites that cite it rather than from a successful fetch.",
    is_own: false,
    featured: false,
  },
  {
    id: "zenodo-1",
    title: "Living AI Governance Standard v1.0 — A Formal Structural Framework for Governed Intelligent Systems",
    authors: "Ondřej Škultety",
    publication_date: "2026",
    pub_type: "zenodo",
    source_name: "Zenodo",
    url: "https://doi.org/10.5281/zenodo.18798197",
    description: "Independent third-party work on structural governance, resolved against the Zenodo record API on 1 October 2026. It is listed as related literature. It does not mention PSI Protocol, does not evaluate it, and provides no endorsement of it — any sentence claiming that it validates this protocol was written here and is withdrawn.",
    is_own: false,
    featured: false,
  },
];

const typeIcons: Record<string, typeof FileText> = {
  ietf: Globe,
  preprint: BookOpen,
  arxiv: BookOpen,
  github: Github,
  article: FileText,
  zenodo: Award,
  commentary: FileText,
};

const typeBadgeColors: Record<string, string> = {
  ietf: "bg-primary/10 text-primary border-primary/20",
  preprint: "bg-gold/10 text-gold border-gold/20",
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
        <title>Research & Publications | PSI Protocol — IETF draft-singh-psi rev 01 — Apex PSI — Universal Verification Protocol</title>
        <meta
          name="description"
          content="The filed IETF Internet-Draft, our self-hosted preprint and reference implementation, and third-party literature we consider relevant — each entry linked to the record that actually resolves."
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
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              The filed standards record, our own technical writing, and third-party work we consider relevant — kept
              apart, because they carry different weight.
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-2xl mx-auto mb-6">
              Every link on this page was resolved against its registry on 1 October 2026. Entries describe what the
              linked record actually says. Where an earlier version of this page cited a paper that no registry carries,
              the citation has been removed rather than reworded, and the correction is recorded in
              {" "}<Link to="/corrections" className="text-gold underline">Corrections</Link>.
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
