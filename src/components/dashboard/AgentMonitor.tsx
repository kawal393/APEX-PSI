import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Bot, Shield, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AgentNode {
  id: "marketing" | "monitoring";
  name: string;
  status: "active" | "idle" | "attention";
  lastRun: string | null;
  output: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-3.5 w-3.5 text-compliant" />,
  idle: <Clock className="h-3.5 w-3.5 text-warning" />,
  attention: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
};

const AgentMonitor = () => {
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [stats, setStats] = useState({ articles: 0, schedules: 0, failures: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [articleCount, latestArticle, schedules, recentLedger] = await Promise.all([
      supabase.from("seo_articles").select("id", { count: "exact", head: true }).eq("published", true),
      supabase.from("seo_articles").select("title,created_at,indexnow_submitted_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("monitoring_schedules").select("enabled,last_run,next_run").eq("enabled", true),
      supabase.from("gallows_ledger").select("status").order("created_at", { ascending: false }).limit(100),
    ]);
    const failed = (recentLedger.data || []).filter((row) => row.status && row.status !== "APPROVED").length;
    const scheduleRows = schedules.data || [];
    setStats({ articles: articleCount.count || 0, schedules: scheduleRows.length, failures: failed });
    setAgents([
      {
        id: "marketing",
        name: "Marketing Publishing Agent",
        status: latestArticle.data?.created_at ? "active" : "idle",
        lastRun: latestArticle.data?.created_at ?? null,
        output: latestArticle.data?.title ?? "No published output recorded",
      },
      {
        id: "monitoring",
        name: "Technical Monitoring Agent",
        status: scheduleRows.length > 0 ? (failed > 0 ? "attention" : "active") : "idle",
        lastRun: scheduleRows.map((row) => row.last_run).filter(Boolean).sort().pop() ?? null,
        output: scheduleRows.length > 0 ? `${scheduleRows.length} customer monitoring schedules enabled` : "No monitoring schedules enabled",
      },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            Cryptographic Runtime Governance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-[10px] bg-compliant/15 text-compliant border-compliant/30">
              ● VERIFIED DATA
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading} className="h-7 px-2 text-xs font-mono">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border p-2.5 text-center">
            <div className="text-lg font-bold font-mono text-foreground">{stats.articles}</div>
            <div className="text-[10px] font-mono text-muted-foreground">ARTICLES PUBLISHED</div>
          </div>
          <div className="rounded border border-border p-2.5 text-center">
            <div className="text-lg font-bold font-mono text-primary">{stats.schedules}</div>
            <div className="text-[10px] font-mono text-muted-foreground">ACTIVE MONITORS</div>
          </div>
          <div className="rounded border border-border p-2.5 text-center">
            <div className="text-lg font-bold font-mono text-destructive">{stats.failures}</div>
            <div className="text-[10px] font-mono text-muted-foreground">RECENT EXCEPTIONS</div>
          </div>
        </div>

        {/* Agent nodes */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Agent Nodes</div>
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2 rounded border border-border p-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {statusIcons[agent.status]}
                <div className="min-w-0">
                  <span className="font-mono text-xs text-foreground block truncate">{agent.name}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{agent.output}</span>
                </div>
              </div>
              <Badge className="font-mono text-[9px] border border-border bg-muted text-muted-foreground px-1.5 py-0 shrink-0">
                {agent.status}
              </Badge>
              <div className="text-[10px] font-mono text-muted-foreground shrink-0 text-right">
                {agent.lastRun ? new Date(agent.lastRun).toLocaleDateString() : "No run"}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
          Status is calculated from recorded publications, monitoring schedules and ledger outcomes. No simulated activity is displayed.
        </p>
      </CardContent>
    </Card>
  );
};

export default AgentMonitor;
