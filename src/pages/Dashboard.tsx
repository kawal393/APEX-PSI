import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Crown, Shield, RefreshCw, Zap, RotateCcw, BarChart3, Sparkles, Key, Bot } from "lucide-react";
import apexLogo from "@/assets/apex-logo.png";
import ComplianceStatus from "@/components/dashboard/ComplianceStatus";
import TrioModeSelector from "@/components/dashboard/TrioModeSelector";
import ComplianceLedger from "@/components/dashboard/ComplianceLedger";
import ReferralCard from "@/components/dashboard/ReferralCard";
import ComplianceQuestionnaire from "@/components/dashboard/ComplianceQuestionnaire";
import ComplianceCertificate from "@/components/dashboard/ComplianceCertificate";
import ScoreBreakdown from "@/components/dashboard/ScoreBreakdown";
import ChatAnalytics from "@/components/dashboard/ChatAnalytics";
import OnboardingTour from "@/components/dashboard/OnboardingTour";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";
import MonitoringToggle from "@/components/dashboard/MonitoringToggle";
import WebhookConfig from "@/components/dashboard/WebhookConfig";
import NotaryApiKeys from "@/components/dashboard/NotaryApiKeys";
import SyncApiKeys from "@/components/dashboard/SyncApiKeys";
import AgentMonitor from "@/components/dashboard/AgentMonitor";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import TrafficNoticeBanner from "@/components/TrafficNoticeBanner";

const TIER_LABELS: Record<string, string> = {
  free: "FREE",
  startup: "STARTUP",
  growth: "GROWTH",
  enterprise: "ENTERPRISE",
  goliath: "GOLIATH",
};

const FREE_VERIFICATION_LIMIT = 3;

function calculateBreakdown(qData: any) {
  if (!qData) return null;
  const breakdown: Record<string, { score: number; max: number; label: string }> = {};
  const hrCount = (qData.high_risk_uses || []).filter((u: string) => u !== "None").length;
  breakdown["Article 5"] = { score: hrCount === 0 ? 20 : hrCount === 1 ? 10 : 0, max: 20, label: "Prohibited Practices" };
  breakdown["Article 6"] = { score: qData.automated_decisions === "no" ? 15 : qData.automated_decisions === "occasionally" ? 10 : 5, max: 15, label: "Classification" };
  breakdown["Article 9"] = { score: qData.governance_policy === "documented" ? 20 : qData.governance_policy === "informal" ? 10 : 0, max: 20, label: "Risk Management" };
  breakdown["Article 13"] = { score: qData.users_informed === "always" ? 15 : qData.users_informed === "sometimes" ? 8 : 0, max: 15, label: "Transparency" };
  breakdown["Article 14"] = { score: qData.right_to_explanation === "fully" ? 15 : qData.right_to_explanation === "partially" ? 8 : 0, max: 15, label: "Human Oversight" };
  breakdown["Article 52"] = { score: qData.ai_content_labeled === "yes" ? 15 : qData.ai_content_labeled === "somewhat" ? 8 : 0, max: 15, label: "Content Labeling" };
  return breakdown;
}

const Dashboard = () => {
  const { user, signOut, subscription, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [compliance, setCompliance] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [qLoaded, setQLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showRetake, setShowRetake] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entitlements, setEntitlements] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number } | null>(null);

  const tier = subscription.subscribed ? (subscription.tier || "startup") : "free";
  const isFree = tier === "free";

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) return;
      void supabase.functions.invoke("finalize-checkout", { body: { session_id: sessionId } }).then(({ data, error }) => {
        if (error) {
          toast.error("Payment received, but activation is still processing. Use Refresh shortly.");
          return;
        }
        toast.success(`${String(data?.service_key ?? "Service").replace(/_/g, " ")} activated.`);
        void Promise.all([checkSubscription(), fetchData()]);
        navigate("/dashboard", { replace: true });
      });
    }
  }, [searchParams, navigate]);

  const fetchData = async () => {
    if (!user) return;
    const [crRes, vhRes, qRes, subRes, entitlementRes] = await Promise.all([
      supabase.from("compliance_results").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("verification_history").select("*").eq("user_id", user.id).order("article_number"),
      supabase.from("questionnaire_responses").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("verifications_used, verifications_limit").eq("user_id", user.id).maybeSingle(),
      supabase.from("service_entitlements" as any).select("service_key,status,quantity,ends_at").eq("user_id", user.id),
    ]);
    setCompliance(crRes.data);
    setVerifications(vhRes.data || []);
    setQuestionnaire(qRes.data);
    setQLoaded(true);
    setShowRetake(false);
    setEntitlements(entitlementRes.data || []);
    setUpgradeReason(null);

    if (subRes.data) {
      setUsageInfo({
        used: subRes.data.verifications_used || 0,
        limit: subRes.data.verifications_limit > 0 ? subRes.data.verifications_limit : -1,
      });
    } else {
      setUsageInfo({ used: 0, limit: FREE_VERIFICATION_LIMIT });
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const updateTrioMode = async (mode: string) => {
    if (!compliance) return;

    // Check mode access for free tier
    const allowedModes: Record<string, string[]> = {
      free: ["SHIELD"],
      startup: ["SHIELD"],
      growth: ["SHIELD", "SWORD"],
      enterprise: ["SHIELD", "SWORD", "JUDGE"],
      goliath: ["SHIELD", "SWORD", "JUDGE"],
    };

    if (!(allowedModes[tier] || ["SHIELD"]).includes(mode)) {
      setUpgradeReason("mode_locked");
      return;
    }

    await supabase.from("compliance_results").update({ trio_mode: mode }).eq("id", compliance.id);
    setCompliance({ ...compliance, trio_mode: mode });
    setUpgradeReason(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to open subscription management");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRunVerification = async () => {
    setVerifying(true);
    setUpgradeReason(null);
    try {
      const { data, error } = await supabase.functions.invoke("run-verification");

      // supabase.functions.invoke returns non-2xx bodies in error context
      // Parse structured error responses from the edge function
      if (error) {
        // Try to extract JSON body from FunctionsHttpError
        let errorBody: any = null;
        try {
          if (error.context && typeof error.context.json === 'function') {
            errorBody = await error.context.json();
          } else if (typeof error.message === 'string') {
            errorBody = JSON.parse(error.message);
          }
        } catch { /* not JSON, fall through */ }

        if (errorBody?.error === "verification_limit") {
          setUpgradeReason("verification_limit");
          setUsageInfo({ used: errorBody.used, limit: errorBody.limit });
          toast.error("Verification limit reached — upgrade for more");
          setVerifying(false);
          return;
        }
        if (errorBody?.error === "mode_locked") {
          setUpgradeReason("mode_locked");
          toast.error(errorBody.message || "This mode requires a higher plan");
          setVerifying(false);
          return;
        }

        throw new Error(errorBody?.error || errorBody?.message || error.message || "Verification failed");
      }

      // Also check data-level errors (edge function returned 200 with error)
      if (data?.error) throw new Error(data.error);

      toast.success(`Verification complete! Score: ${data.score}% (${data.mode} mode)`);

      if (data.verifications_used !== undefined && data.verifications_limit !== undefined) {
        setUsageInfo({ used: data.verifications_used, limit: data.verifications_limit });
      }

      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleRetake = () => {
    setShowRetake(true);
  };

  const showQuestionnaire = qLoaded && (!questionnaire || !questionnaire.completed || showRetake);
  const breakdown = questionnaire?.completed && !showRetake ? calculateBreakdown(questionnaire) : null;

  return (
    <div className="min-h-screen bg-background">
      <TrafficNoticeBanner />
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-14 px-4">
          <a href="/" className="flex items-center gap-2">
            <img src={apexLogo} alt="APEX" className="h-7 w-7 glow-gold" />
            <span className="font-bold text-gold-gradient text-sm">APEX</span>
          </a>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="text-xs border-gold/40 text-gold hover:bg-gold/10">
                <Shield className="h-3 w-3 mr-1" /> Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/silo")} className="text-xs hidden sm:inline-flex">
              <Shield className="h-3 w-3 mr-1" /> Silos
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <OnboardingTour />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-bold text-gold-gradient mb-6">Compliance Dashboard</h1>

        {entitlements.length > 0 && (
          <section className="mb-6 border-y border-border py-4" aria-label="Active services">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Activated services</p>
            <div className="flex flex-wrap gap-2">
              {entitlements.map((item) => (
                <span key={item.service_key} className="border border-compliant/30 bg-compliant/10 px-3 py-2 text-xs text-compliant">
                  {String(item.service_key).replace(/_/g, " ")} · {item.status}{item.quantity > 1 ? ` · ${item.quantity} credits` : ""}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Subscription Card */}
        <div className={`rounded-xl border p-6 mb-6 ${isFree ? "border-gold/20 bg-card" : "border-border bg-card"}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isFree ? (
                <Sparkles className="h-6 w-6 text-gold" />
              ) : (
                <Crown className="h-6 w-6 text-gold" />
              )}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {TIER_LABELS[tier] || tier.toUpperCase()} Plan
                </p>
                {!isFree && subscription.subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Renews {new Date(subscription.subscriptionEnd).toLocaleDateString()}
                  </p>
                )}
                {isFree && (
                  <p className="text-xs text-muted-foreground">
                    Free forever — upgrade for signed, verifiable proof
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Usage indicator */}
              {usageInfo && usageInfo.limit > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Verifications:</span>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${usageInfo.used >= usageInfo.limit ? "bg-destructive" : "bg-gold"}`}
                      style={{ width: `${Math.min(100, (usageInfo.used / usageInfo.limit) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono">{usageInfo.used}/{usageInfo.limit}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={checkSubscription}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
                {!isFree ? (
                  <Button variant="heroOutline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? "Loading..." : "Manage Subscription"}
                  </Button>
                ) : (
                  <Button variant="hero" size="sm" onClick={() => navigate("/#pricing")}>
                    <Zap className="h-4 w-4 mr-1" /> Upgrade
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        {upgradeReason && (
          <div className="mb-6">
            <UpgradePrompt
              reason={upgradeReason as any}
              currentUsage={usageInfo?.used}
              limit={usageInfo?.limit && usageInfo.limit > 0 ? usageInfo.limit : undefined}
            />
          </div>
        )}

        {/* Tabs: Compliance + Analytics */}
        <Tabs defaultValue={searchParams.get("tab") === "notary" ? "notary" : "compliance"} className="w-full">
          <TabsList className="mb-6 bg-muted w-full sm:w-auto flex flex-wrap">
            <TabsTrigger value="compliance" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-3.5 w-3.5 mr-1" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="notary" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="h-3.5 w-3.5 mr-1" /> Notary
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-3.5 w-3.5 mr-1" /> Agent Monitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance">
            {!qLoaded ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : showQuestionnaire ? (
              <ComplianceQuestionnaire onComplete={fetchData} existingData={showRetake ? questionnaire : questionnaire} />
            ) : compliance ? (
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleRunVerification}
                    disabled={verifying}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {verifying ? "Verifying…" : "Run TRIO Verification"}
                  </Button>
                  <Button variant="heroOutline" size="sm" onClick={handleRetake}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Retake Assessment
                  </Button>
                  {isFree && usageInfo && usageInfo.limit > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.max(0, usageInfo.limit - usageInfo.used)} verifications remaining this month
                    </span>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ComplianceStatus score={compliance.overall_score} status={compliance.status} />
                  <TrioModeSelector mode={compliance.trio_mode} onModeChange={updateTrioMode} />
                  {breakdown && <ScoreBreakdown breakdown={breakdown} />}
                  <ComplianceCertificate
                    companyName={compliance.company_name}
                    score={compliance.overall_score}
                    status={compliance.status}
                    date={compliance.updated_at}
                    merkleHash={verifications.find(v => v.merkle_proof_hash)?.merkle_proof_hash}
                  />
                  <ComplianceLedger verifications={verifications} />
                  <MonitoringToggle />
                  <WebhookConfig />
                  <ReferralCard referralCode={compliance.referral_code || ""} referralCount={compliance.referral_count} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="notary">
            <div className="space-y-6">
              <NotaryApiKeys />
              <SyncApiKeys />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <ChatAnalytics />
          </TabsContent>

          <TabsContent value="agents">
            <AgentMonitor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
