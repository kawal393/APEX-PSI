import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle, XCircle, Clock, Users, Gavel, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LedgerEntry {
  commit_id: string;
  action: string;
  predicate_id: string;
  phase: string;
  status: string | null;
  commit_hash: string;
  merkle_root: string | null;
  created_at: string;
  tribunal_votes_approve: number | null;
  tribunal_votes_reject: number | null;
  ratification_hash: string | null;
  ratified_at: string | null;
}

interface AuditorInfo {
  id: string;
  auditor_name: string;
  organization: string;
  jurisdiction: string;
}

interface ExistingReview {
  commit_id: string;
  verdict: string;
}

const Tribunal = () => {
  const { user } = useAuth();
  const [auditor, setAuditor] = useState<AuditorInfo | null>(null);
  const [pendingCommits, setPendingCommits] = useState<LedgerEntry[]>([]);
  const [existingReviews, setExistingReviews] = useState<ExistingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rationales, setRationales] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check if user is a registered auditor
      const { data: auditorData } = await supabase
        .from("tribunal_auditors")
        .select("id, auditor_name, organization, jurisdiction")
        .eq("user_id", user!.id)
        .maybeSingle();

      setAuditor(auditorData);

      // Load verified commits from public ledger
      const { data: commits } = await supabase
        .from("gallows_public_ledger")
        .select("commit_id, action, predicate_id, phase, status, commit_hash, merkle_root, created_at, tribunal_votes_approve, tribunal_votes_reject, ratification_hash, ratified_at")
        .in("phase", ["VERIFIED", "RATIFIED"])
        .order("created_at", { ascending: false })
        .limit(50);

      setPendingCommits((commits as LedgerEntry[]) || []);

      // Load this auditor's existing reviews
      if (auditorData) {
        const { data: reviews } = await supabase
          .from("tribunal_reviews")
          .select("commit_id, verdict")
          .eq("auditor_id", auditorData.id);
        setExistingReviews((reviews as ExistingReview[]) || []);
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  };

  const submitVerdict = async (commitId: string, verdict: "approve" | "reject") => {
    const rationale = rationales[commitId];
    if (!rationale || rationale.trim().length < 10) {
      toast.error("Rationale required", { description: "Minimum 10 characters explaining your verdict." });
      return;
    }

    setSubmitting(commitId);
    try {
      // Generate signature: SHA-256 of verdict + commit_id + timestamp
      const sigData = `${verdict}|${commitId}|${new Date().toISOString()}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(sigData));
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase.functions.invoke("tribunal-submit", {
        body: { commit_id: commitId, verdict, rationale, auditor_signature: signature },
      });

      if (error) throw error;

      if (data.ratified) {
        toast.success("RATIFIED", {
          description: `3-of-5 threshold met. Ratification hash: ${data.ratificationHash?.substring(0, 16)}...`,
        });
      } else {
        toast.success("Verdict submitted", {
          description: `${data.approvals}/3 approvals needed. ${data.totalVotes} total votes.`,
        });
      }

      await loadData();
    } catch (e: any) {
      toast.error("Submission failed", { description: e.message });
    }
    setSubmitting(null);
  };

  const getReviewForCommit = (commitId: string) => existingReviews.find(r => r.commit_id === commitId);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">Institutional Anchor Panel</h1>
          <p className="text-muted-foreground">You must be authenticated to access the Tribunal.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Institutional Anchors — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Enterprise-grade Institutional Anchor ratification layer for high-stakes compliance certification." />
      </Helmet>
      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-mono mb-4">
            <Gavel className="h-3.5 w-3.5" /> ARTICLE 14 — HUMAN OVERSIGHT
          </div>
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-3">
            Institutional Anchors
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Enterprise-grade ratification layer. Institutional Anchors provide the final cryptographic seal 
            on high-value commits that have achieved public consensus through the Open Global Tribunal.
          </p>
        </motion.div>

        {/* Auditor Status */}
        <Card className="mb-8 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              YOUR AUDITOR STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditor ? (
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {auditor.auditor_name}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {auditor.organization}
                </Badge>
                <Badge className="bg-primary/15 text-primary font-mono text-xs border-0">
                  {auditor.jurisdiction} Jurisdiction
                </Badge>
                <Badge className="bg-green-500/15 text-green-400 font-mono text-xs border-0">
                  ✓ ACTIVE
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-mono">You are not a registered Institutional Anchor. Contact the platform administrator for enterprise ratification access.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        {loading ? (
          <div className="text-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-mono font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ledger Entries ({pendingCommits.length})
            </h2>

            {pendingCommits.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground font-mono text-sm">
                  No verified commits awaiting tribunal review.
                </CardContent>
              </Card>
            ) : (
              pendingCommits.map((commit) => {
                const existingReview = getReviewForCommit(commit.commit_id);
                const isRatified = !!commit.ratification_hash;
                const approvals = commit.tribunal_votes_approve || 0;
                const rejections = commit.tribunal_votes_reject || 0;

                return (
                  <motion.div
                    key={commit.commit_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`border ${isRatified ? "border-green-500/30" : "border-border"}`}>
                      <CardContent className="p-5 space-y-4">
                        {/* Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {commit.commit_id}
                            </Badge>
                            <Badge className={`font-mono text-[10px] border-0 ${
                              commit.status === "APPROVED" ? "bg-green-500/15 text-green-400" : "bg-destructive/15 text-destructive"
                            }`}>
                              MPC: {commit.status}
                            </Badge>
                            {isRatified && (
                              <Badge className="bg-primary/15 text-primary font-mono text-[10px] border-0">
                                ✓ RATIFIED
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(commit.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-muted-foreground">Action:</span>
                            <p className="text-foreground truncate">{commit.action}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Predicate:</span>
                            <p className="text-foreground">{commit.predicate_id}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Commit Hash:</span>
                            <p className="text-foreground/60 truncate">{commit.commit_hash}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Merkle Root:</span>
                            <p className="text-foreground/60 truncate">{commit.merkle_root || "N/A"}</p>
                          </div>
                        </div>

                        {/* Vote Progress */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-green-400">✓ {approvals} approve</span>
                          <span className="text-destructive">✗ {rejections} reject</span>
                          <span className="text-muted-foreground">sovereign seal: 3-of-5</span>
                        </div>

                        {/* Review UI */}
                        {auditor && !existingReview && !isRatified && (
                          <div className="border-t border-border pt-4 space-y-3">
                            <Textarea
                              placeholder="Your rationale for this verdict (minimum 10 characters)..."
                              value={rationales[commit.commit_id] || ""}
                              onChange={(e) => setRationales(prev => ({ ...prev, [commit.commit_id]: e.target.value }))}
                              className="font-mono text-xs min-h-[80px] bg-muted/30"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => submitVerdict(commit.commit_id, "approve")}
                                disabled={submitting === commit.commit_id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-mono text-xs gap-1.5"
                                size="sm"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                {submitting === commit.commit_id ? "SIGNING..." : "APPROVE"}
                              </Button>
                              <Button
                                onClick={() => submitVerdict(commit.commit_id, "reject")}
                                disabled={submitting === commit.commit_id}
                                variant="destructive"
                                className="flex-1 font-mono text-xs gap-1.5"
                                size="sm"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                REJECT
                              </Button>
                            </div>
                          </div>
                        )}

                        {existingReview && (
                          <div className={`border-t border-border pt-3 text-xs font-mono ${
                            existingReview.verdict === "approve" ? "text-green-400" : "text-destructive"
                          }`}>
                            You voted: <strong>{existingReview.verdict.toUpperCase()}</strong>
                          </div>
                        )}

                        {isRatified && commit.ratification_hash && (
                          <div className="border-t border-border pt-3">
                            <span className="text-[10px] font-mono text-muted-foreground">RATIFICATION HASH</span>
                            <p className="text-[10px] font-mono text-primary/80 break-all">{commit.ratification_hash}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Tribunal;
