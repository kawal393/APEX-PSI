import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX, Shield, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

const ScoreCard = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<{ company_name: string; score: number; status: string; industry: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) return;
    supabase
      .rpc("get_assessment_by_share_id", { p_share_id: shareId })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setData(data[0] as any);
        }
        setLoading(false);
      });
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Score card not found.</p>
        <Button variant="hero" asChild><Link to="/assess">Take Assessment</Link></Button>
      </div>
    );
  }

  const score = data.score ?? 0;
  let color = "text-destructive";
  let Icon = ShieldX;
  if (score >= 90) { color = "text-compliant"; Icon = ShieldCheck; }
  else if (score >= 70) { color = "text-gold"; Icon = Shield; }
  else if (score >= 50) { color = "text-warning"; Icon = ShieldAlert; }

  const ogImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-score-card?id=${shareId}`;
  const pageUrl = `https://digital-gallows.apex-infrastructure.com/score/${shareId}`;

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  const shareOnX = () => {
    const text = `${data.company_name} scored ${score}% on the APEX AI Compliance Assessment!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>{data.company_name} — {score}% AI Compliance Score | APEX</title>
        <meta name="description" content={`${data.company_name} scored ${score}% on the APEX EU AI Act Compliance Assessment.`} />
        <meta property="og:title" content={`${data.company_name} — ${score}% AI Compliance`} />
        <meta property="og:description" content={`Scored ${score}% on the APEX EU AI Act Compliance Assessment. Check yours!`} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${data.company_name} — ${score}% AI Compliance`} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 sm:p-12 mb-6">
            <p className="text-xs font-bold text-gold tracking-[0.3em] mb-6">APEX PSI</p>
            <Icon className={`h-16 w-16 ${color} mx-auto mb-4`} />
            <p className={`text-6xl sm:text-7xl font-black ${color} mb-2`}>{score}%</p>
            <p className={`text-lg font-bold ${color} tracking-widest mb-2`}>{data.status}</p>
            <p className="text-xl font-bold text-foreground mb-1">{data.company_name}</p>
            {data.industry && <p className="text-sm text-muted-foreground mb-6">{data.industry}</p>}

            <div className="flex items-center justify-center gap-2 mb-6">
              <Button variant="heroOutline" size="sm" onClick={shareOnLinkedIn}>
                <Share2 className="h-3 w-3 mr-1" /> LinkedIn
              </Button>
              <Button variant="heroOutline" size="sm" onClick={shareOnX}>
                <Share2 className="h-3 w-3 mr-1" /> Post on X
              </Button>
            </div>

            <Button variant="hero" size="lg" className="w-full" asChild>
              <Link to="/assess">
                Check Your Score <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            EU AI Act compliance assessment by <span className="text-gold">APEX PSI</span>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default ScoreCard;
