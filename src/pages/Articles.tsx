import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Article = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  created_at: string;
};

export default function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("seo_articles")
      .select("slug,title,description,keywords,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setArticles((data as Article[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Helmet>
        <title>AI Governance Articles — APEX PSI</title>
        <meta name="description" content="Deep-dive articles on verifiable AI compliance, EU AI Act, Ed25519 signatures, Bitcoin-anchored proofs, and the IETF PSI standard." />
        <link rel="canonical" href="https://apex-psi.lovable.app/articles" />
        <link rel="alternate" type="application/rss+xml" title="APEX PSI Feed" href="https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/rss-feed" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "APEX PSI — AI Governance",
          url: "https://apex-psi.lovable.app/articles",
          publisher: { "@type": "Organization", name: "APEX PSI" },
          blogPost: articles.slice(0, 20).map(a => ({
            "@type": "BlogPosting",
            headline: a.title,
            description: a.description,
            url: `https://apex-psi.lovable.app/articles/${a.slug}`,
            datePublished: a.created_at,
          })),
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-16">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">AI Governance Library</h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
            Continuously updated research and analysis on verifiable AI compliance, cryptographic evidence, and the standards shaping regulated AI in 2026.
          </p>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground">No articles yet.</p>
          ) : (
            <ul className="space-y-6">
              {articles.map(a => (
                <li key={a.slug} className="border-b border-border pb-6">
                  <Link to={`/articles/${a.slug}`} className="block group">
                    <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">{a.title}</h2>
                    <p className="text-muted-foreground mt-2">{a.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(a.keywords || []).slice(0, 5).map(k => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{k}</span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
