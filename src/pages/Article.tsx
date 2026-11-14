import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { rewriteArticleSlug } from "@/lib/article-slug";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Article = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  content_md: string;
  created_at: string;
  updated_at: string;
};

export default function Article() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const lookup = (s: string) =>
      supabase
        .from("seo_articles")
        .select("*")
        .eq("slug", s)
        .eq("published", true)
        .maybeSingle();

    const fail = () => {
      if (cancelled) return;
      setArticle(null);
      setLoading(false);
    };

    lookup(slug).then(({ data }) => {
      if (cancelled) return;
      if (data) {
        setArticle(data as Article);
        setLoading(false);
        return;
      }
      // A correction may have renamed the article. The old address is still in
      // search results and in other people's links, so it is looked up under the
      // current slug rules before the reader is told the article does not exist.
      const rewritten = rewriteArticleSlug(slug);
      if (rewritten === slug) {
        fail();
        return;
      }
      lookup(rewritten).then(({ data: moved }) => {
        if (cancelled) return;
        if (moved) {
          navigate(`/articles/${rewritten}`, { replace: true });
          return;
        }
        fail();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16">Loading…</main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold mb-4">Article not found</h1>
          <Link to="/articles" className="text-primary underline">Back to library</Link>
        </main>
      </div>
    );
  }

  const url = `https://ai-governance-standard.com/articles/${article.slug}`;

  return (
    <>
      <Helmet>
        <title>{article.title} — Apex PSI — Universal Verification Protocol</title>
        <meta name="description" content={article.description} />
        <meta name="keywords" content={(article.keywords || []).join(", ")} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={article.created_at} />
        <meta property="article:modified_time" content={article.updated_at} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: article.title,
          description: article.description,
          keywords: (article.keywords || []).join(", "),
          datePublished: article.created_at,
          dateModified: article.updated_at,
          author: { "@type": "Organization", name: "APEX PSI" },
          publisher: {
            "@type": "Organization",
            name: "APEX PSI",
            url: "https://ai-governance-standard.com",
          },
          mainEntityOfPage: url,
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Link to="/articles" className="text-sm text-muted-foreground hover:text-primary">← All articles</Link>
          <article className="prose prose-invert max-w-none mt-6 prose-headings:font-bold prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content_md}</ReactMarkdown>
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
}
