import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, Shield, Activity, ArrowLeft, RefreshCw, Anchor, Radar, Sparkles, Megaphone } from "lucide-react";
import apexLogo from "@/assets/apex-logo.png";
import { toast } from "sonner";
import AdminAIChat from "@/components/admin/AdminAIChat";
import BlockchainAnchorPanel from "@/components/admin/BlockchainAnchorPanel";
import SovereignIntelligence from "@/components/admin/SovereignIntelligence";
import CampaignPanel from "@/components/admin/CampaignPanel";

import SocialProofManager from "@/components/admin/SocialProofManager";
import ContentBroadcastPanel from "@/components/admin/ContentBroadcastPanel";

interface AdminStats {
  total_users: number;
  paid_users: number;
  tier_counts: Record<string, number>;
  total_verifications: number;
  avg_compliance_score: number;
}

interface Customer {
  id: string;
  email: string;
  created_at: string;
  tier: string;
  status: string;
  verifications_used: number;
  compliance_score: number | null;
  compliance_status: string | null;
  trio_mode: string | null;
  company_name: string | null;
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  startup: "bg-primary/20 text-primary",
  growth: "bg-accent/20 text-accent-foreground",
  enterprise: "bg-gold/20 text-gold",
  goliath: "bg-destructive/20 text-destructive",
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
  const [recentLedger, setRecentLedger] = useState<any[]>([]);
  const [siteIntelligence, setSiteIntelligence] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [marketingLeads, setMarketingLeads] = useState<any[]>([]);


  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data");
      if (error) {
        const body = error.context ? await error.context.json?.() : null;
        if (body?.error?.includes("Forbidden") || body?.error?.includes("admin")) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        throw error;
      }
      if (data?.error?.includes("Forbidden")) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      setStats(data.stats);
      setCustomers(data.customers || []);
      setRecentVerifications(data.recent_verifications || []);
      setRecentLedger(data.recent_ledger || []);
      setSiteIntelligence(data.site_intelligence || null);
      setCampaigns(data.campaigns || []);
      setMarketingLeads(data.marketing_leads || []);

    } catch (e: any) {
      toast.error(e.message || "Failed to load admin data");
      setForbidden(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground mb-4">You do not have admin privileges.</p>
            <Button variant="hero" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <img src={apexLogo} alt="APEX" className="h-7 w-7 glow-gold" />
              <span className="font-bold text-gold-gradient text-sm">APEX</span>
            </a>
            <Badge variant="outline" className="text-xs border-destructive text-destructive">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="hero" size="sm" onClick={() => navigate("/master")} className="text-xs">
              <Shield className="h-4 w-4 mr-1" /> Master View
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchAdminData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-xl font-bold text-gold-gradient mb-6">Platform Admin</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.total_users}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <CreditCard className="h-5 w-5 text-gold mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.paid_users}</div>
                <div className="text-xs text-muted-foreground">Paid Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Activity className="h-5 w-5 text-compliant mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.total_verifications}</div>
                <div className="text-xs text-muted-foreground">Total Verifications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Shield className="h-5 w-5 text-accent mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.avg_compliance_score}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tier Breakdown */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(stats.tier_counts).map(([tier, count]) => (
              <Badge key={tier} className={TIER_COLORS[tier] || "bg-muted text-muted-foreground"}>
                {tier.toUpperCase()}: {count}
              </Badge>
            ))}
          </div>
        )}

        <Tabs defaultValue="intelligence" className="w-full">
          <TabsList className="mb-6 bg-muted flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="intelligence" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Radar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Intelligence
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> AI
            </TabsTrigger>

            <TabsTrigger value="customers" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Customers
            </TabsTrigger>
            <TabsTrigger value="verifications" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Verifications
            </TabsTrigger>
            <TabsTrigger value="ledger" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Ledger
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Anchor className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Blockchain
            </TabsTrigger>
            <TabsTrigger value="social-proof" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Social Proof
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Radar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> Broadcast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intelligence">
            <SovereignIntelligence data={siteIntelligence} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignPanel campaigns={campaigns} leads={marketingLeads} />
          </TabsContent>



          <TabsContent value="ai">
            <AdminAIChat />
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader><CardTitle className="text-base">All Customers ({customers.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Verifications</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-mono">{c.email}</TableCell>
                        <TableCell className="text-xs">{c.company_name || "—"}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${TIER_COLORS[c.tier] || ""}`}>{c.tier.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{c.compliance_score ?? "—"}%</TableCell>
                        <TableCell className="text-xs">{c.trio_mode || "—"}</TableCell>
                        <TableCell className="text-xs">{c.verifications_used}</TableCell>
                        <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verifications">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Verifications</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Merkle Hash</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentVerifications.slice(0, 50).map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs">{v.article_number}</TableCell>
                        <TableCell>
                          <Badge className={v.status === "verified" ? "bg-compliant/20 text-compliant" : "bg-destructive/20 text-destructive"}>
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[200px] truncate">{v.merkle_proof_hash || "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger">
            <Card>
              <CardHeader><CardTitle className="text-base">Gallows Ledger (Recent 50)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commit ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLedger.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-mono">{l.commit_id?.slice(0, 12)}…</TableCell>
                        <TableCell className="text-xs">{l.action}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{l.phase}</Badge></TableCell>
                        <TableCell className="text-xs">{l.status || "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <BlockchainAnchorPanel />
          </TabsContent>

          <TabsContent value="social-proof">
            <SocialProofManager />
          </TabsContent>

          <TabsContent value="broadcast">
            <ContentBroadcastPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};


export default Admin;
