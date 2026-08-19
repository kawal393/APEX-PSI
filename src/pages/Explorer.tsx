import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Activity, Hash, Shield, Clock, RefreshCw, Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface LedgerEntry {
  id: string;
  commit_id: string;
  action: string;
  predicate_id: string;
  phase: string;
  status: string | null;
  commit_hash: string;
  merkle_leaf_hash: string;
  merkle_root: string | null;
  ed25519_signature: string | null;
  created_at: string;
  sequence_number: number | null;
}

const Explorer = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [attestationCounts, setAttestationCounts] = useState<Record<string, number>>({});

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("gallows_public_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      const typed = data as unknown as LedgerEntry[];
      setEntries(typed);
      // Fetch attestation counts for visible entries
      const commitIds = typed.map(e => e.commit_id).filter(Boolean);
      if (commitIds.length > 0) {
        const { data: attestations } = await supabase
          .from("public_attestations")
          .select("commit_id")
          .in("commit_id", commitIds);
        if (attestations) {
          const counts: Record<string, number> = {};
          attestations.forEach((a: any) => {
            counts[a.commit_id] = (counts[a.commit_id] || 0) + 1;
          });
          setAttestationCounts(counts);
        }
      }
    }
    setLoading(false);
  };

  const fetchCount = async () => {
    const { count } = await supabase
      .from("gallows_public_ledger")
      .select("*", { count: "exact", head: true });
    if (count !== null) setTotalCount(count);
  };

  useEffect(() => { fetchEntries(); fetchCount(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchEntries(); fetchCount(); }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const channel = supabase
      .channel("explorer-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gallows_ledger" }, () => {
        fetchEntries(); fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = search.trim()
    ? entries.filter(e =>
        e.commit_id?.toLowerCase().includes(search.toLowerCase()) ||
        e.action?.toLowerCase().includes(search.toLowerCase()) ||
        e.predicate_id?.toLowerCase().includes(search.toLowerCase()) ||
        e.commit_hash?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const truncate = (s: string, n: number) => s && s.length > n ? s.substring(0, n) + "..." : s;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>APEX Ledger Explorer — Live Notarization Feed — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Real-time view of the APEX PSI immutable ledger. Watch cryptographic attestations being anchored in real-time." />
      </Helmet>
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="relative py-12 sm:py-16 px-4 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.06) 0%, transparent 60%)" }}
          />
          <div className="container mx-auto max-w-5xl relative z-10 text-center">
            <Badge variant="outline" className="border-primary/30 text-primary mb-4 text-xs tracking-widest">
              LIVE LEDGER FEED
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3">
              <span className="text-chrome-gradient">Merkle Tree</span>{" "}
              <span className="text-gold-gradient">Explorer</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm mb-6">
              Every notarization. Every hash. Every signature. Streaming in real-time from the immutable ledger.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-bold text-foreground">{totalCount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Total Entries</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-compliant" />
                <span className="text-sm font-bold text-foreground">{entries.filter(e => e.status === "APPROVED").length}</span>
                <span className="text-xs text-muted-foreground">Verified (visible)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-compliant animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">{autoRefresh ? "Live" : "Paused"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 -mt-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by receipt ID, hash, action, or predicate..."
                  className="pl-9 bg-card border-border font-mono text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "border-compliant/30 text-compliant" : ""}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? "Live" : "Paused"}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-mono">Loading ledger...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filtered.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="rounded-lg border border-border bg-card/60 hover:bg-card/90 transition-colors overflow-hidden"
                    >
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            entry.status === "APPROVED" ? "bg-compliant" :
                            entry.status === "BLOCKED" ? "bg-destructive" : "bg-primary"
                          }`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono font-bold text-primary">{entry.commit_id}</code>
                              <Badge variant="outline" className="text-[9px] border-border">{entry.predicate_id}</Badge>
                              {entry.phase && (
                                <Badge className={`text-[9px] ${
                                  entry.status === "APPROVED" ? "bg-compliant/10 text-compliant border-compliant/20" :
                                  "bg-muted text-muted-foreground border-border"
                                }`}>{entry.phase}</Badge>
                              )}
                              {attestationCounts[entry.commit_id] > 0 && (
                                <Badge className="text-[9px] bg-gold/10 text-gold border-gold/20 flex items-center gap-1">
                                  <Eye className="h-2.5 w-2.5" />
                                  {attestationCounts[entry.commit_id]} auditor{attestationCounts[entry.commit_id] !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {truncate(entry.action, 100)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div className="hidden md:block">
                            <code className="text-[10px] font-mono text-muted-foreground">
                              {truncate(entry.commit_hash, 20)}
                            </code>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(entry.created_at).toLocaleString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </div>
                        </div>
                      </div>
                      {entry.ed25519_signature && (
                        <div className="px-4 py-1.5 border-t border-border/50 bg-muted/20 flex items-center gap-2">
                          <Shield className="h-3 w-3 text-primary shrink-0" />
                          <code className="text-[9px] font-mono text-muted-foreground truncate">
                            Ed25519: {truncate(entry.ed25519_signature, 48)}
                          </code>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Hash className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{search ? "No entries match your search" : "No entries in the ledger yet"}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Explorer;
