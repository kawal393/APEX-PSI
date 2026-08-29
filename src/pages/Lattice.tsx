import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Shield, Server, Zap, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LatticeNodeCard from "@/components/lattice/LatticeNodeCard";
import LatticeConnections from "@/components/lattice/LatticeConnections";
import TriVerifiedBadge from "@/components/lattice/TriVerifiedBadge";
import LatticeEventLog from "@/components/lattice/LatticeEventLog";

interface LatticeNode {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "degraded";
  timestamp?: string;
  isSelf?: boolean;
}

interface LatticeStatus {
  latticeHealth: string;
  triVerified: boolean;
  nodes: LatticeNode[];
  recentEvents: Array<{ key: string; value: string; created_at: string }>;
  timestamp: string;
}

const LATTICE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sovereign-lattice`;

export default function Lattice() {
  const [status, setStatus] = useState<LatticeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch(`${LATTICE_URL}?action=lattice-status`, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${LATTICE_URL}?action=cross-node-sync`, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const healthColor = status?.latticeHealth === "OPTIMAL"
    ? "text-[hsl(var(--compliant))]"
    : "text-[hsl(var(--warning))]";

  return (
    <>
      <Helmet>
        <title>Protocol Lattice — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Real-time distributed mesh network status across APEX platforms" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                <Radio className="h-8 w-8 text-primary animate-pulse" />
                SOVEREIGN LATTICE
              </h1>
              <p className="text-muted-foreground mt-1">
                Distributed mesh network — {status?.nodes?.length ?? 0} nodes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TriVerifiedBadge active={status?.triVerified ?? false} />
              <Button
                variant="outline"
                size="sm"
                onClick={triggerSync}
                disabled={syncing}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Force Sync"}
              </Button>
            </div>
          </div>

          {/* Health banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 flex items-center justify-between ${
              status?.latticeHealth === "OPTIMAL"
                ? "border-[hsl(var(--compliant))]/30 bg-[hsl(var(--compliant))]/5"
                : "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5"
            }`}
          >
            <div className="flex items-center gap-3">
              {status?.latticeHealth === "OPTIMAL" ? (
                <CheckCircle2 className="h-6 w-6 text-[hsl(var(--compliant))]" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-[hsl(var(--warning))]" />
              )}
              <div>
                <span className={`font-bold text-lg ${healthColor}`}>
                  {loading ? "CONNECTING…" : (status?.latticeHealth ?? "UNKNOWN")}
                </span>
                <p className="text-xs text-muted-foreground">
                  Last refresh: {lastRefresh.toLocaleTimeString()} • Auto-refresh: 10s
                </p>
              </div>
            </div>
            <Badge variant={status?.latticeHealth === "OPTIMAL" ? "default" : "destructive"}>
              {status?.latticeHealth === "OPTIMAL" ? "ALL NODES ONLINE" : "DEGRADED"}
            </Badge>
          </motion.div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {/* Mesh visualization */}
          <div className="relative">
            <LatticeConnections nodes={status?.nodes ?? []} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {(status?.nodes ?? [
                { id: "apex-review", name: "APEX REVIEW", role: "Intelligence Hub", status: "offline" as const },
                { id: "apex-infrastructure", name: "APEX INFRASTRUCTURE", role: "Operations", status: "offline" as const },
                { id: "apex-psi", name: "APEX PSI", role: "Compliance", status: "offline" as const },
              ]).map((node, i) => (
                <LatticeNodeCard key={node.id} node={node} index={i} loading={loading} />
              ))}
            </div>
          </div>

          {/* Event log */}
          <LatticeEventLog events={status?.recentEvents ?? []} />
        </div>
      </main>
      <Footer />
    </>
  );
}
