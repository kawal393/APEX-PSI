import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Rss, Radio } from "lucide-react";

type Article = { slug: string; title: string; created_at: string; indexnow_submitted_at: string | null };

export default function ContentBroadcastPanel() {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(1);
  const [recent, setRecent] = useState<Article[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("seo_articles")
      .select("slug,title,created_at,indexnow_submitted_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent((data as Article[]) || []);
  };

  useEffect(() => { loadRecent(); }, []);

  const broadcast = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-content", {
        body: { topic: topic || undefined, count },
      });
      if (error) throw error;
      toast.success(`Generated ${data.generated} article(s) and submitted to IndexNow`);
      setTopic("");
      await loadRecent();
    } catch (e: any) {
      toast.error(e.message || "Broadcast failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Content Broadcast Engine</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        AI generates SEO articles about AI governance and instantly submits URLs to Bing, Yandex, and Seznam via IndexNow. Also pings Google/Bing sitemaps.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Optional topic (leave blank for random)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="md:col-span-2"
        />
        <Input
          type="number"
          min={1}
          max={5}
          value={count}
          onChange={(e) => setCount(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
        />
      </div>
      <Button onClick={broadcast} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rss className="h-4 w-4 mr-2" />}
        Generate & Broadcast
      </Button>
      {recent.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recent broadcasts</p>
          {recent.map(a => (
            <div key={a.slug} className="flex justify-between items-center text-sm">
              <a href={`/articles/${a.slug}`} className="hover:text-primary truncate mr-2">{a.title}</a>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {a.indexnow_submitted_at ? "✓ indexed" : "pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
