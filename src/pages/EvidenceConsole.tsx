import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Row = { commit_id: string; action: string; predicate_id: string; merkle_leaf_hash: string; merkle_root: string | null; ed25519_signature: string | null; created_at: string };

export default function EvidenceConsole() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("gallows_ledger")
      .select("commit_id,action,predicate_id,merkle_leaf_hash,merkle_root,ed25519_signature,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000)
      .then(({ data, error }) => { if (error) setErr(true); else setRows((data ?? []) as Row[]); });
  }, [user]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !s || [r.commit_id, r.action, r.predicate_id, r.merkle_leaf_hash].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);

  const exportJsonl = () => {
    const blob = new Blob([shown.map((r) => JSON.stringify(r)).join("\n") + "\n"], { type: "application/x-ndjson" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `apex-evidence-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Evidence Console — APEX PSI</title>
        <meta name="description" content="See, search and export every receipt you have sealed." />
      </Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-16">
        <p className="font-mono text-xs tracking-widest text-gold">EVIDENCE CONSOLE</p>
        <h1 className="mt-2 text-4xl md:text-6xl font-bold uppercase tracking-tight">Your receipts</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Every receipt sealed while you were signed in. Search it, open any receipt, or export the list to keep your
          own copy. Each exported line can be checked offline with the free verifier.
        </p>

        {!loading && !user && (
          <p className="mt-10 font-mono text-sm"><Link to="/auth" className="text-gold underline">Sign in</Link> to see your receipts.</p>
        )}

        {user && (
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Search by id, text, rule or fingerprint" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search receipts" />
              <Button onClick={exportJsonl} disabled={!shown.length}>Export {shown.length} (JSONL)</Button>
            </div>
            <div className="mt-6 border border-border">
              {err && <p className="p-6 font-mono text-sm">Receipts temporarily unavailable.</p>}
              {!err && rows === null && <p className="p-6 font-mono text-sm">Loading…</p>}
              {rows?.length === 0 && (
                <p className="p-6 font-mono text-sm">No receipts yet. Seal one on the <Link to="/notary" className="text-gold underline">notary</Link>, <Link to="/agent" className="text-gold underline">agent</Link> or <Link to="/media" className="text-gold underline">media</Link> page.</p>
              )}
              {shown.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono">
                    <thead className="text-left text-muted-foreground border-b border-border">
                      <tr><th className="p-3">Sealed (UTC)</th><th className="p-3">Receipt</th><th className="p-3">Rule</th><th className="p-3">What</th></tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => (
                        <tr key={r.commit_id} className="border-b border-border/50">
                          <td className="p-3 whitespace-nowrap">{r.created_at.slice(0, 16).replace("T", " ")}</td>
                          <td className="p-3"><Link to={`/receipt/${r.commit_id}`} className="text-gold hover:underline">{r.commit_id}</Link></td>
                          <td className="p-3">{r.predicate_id}</td>
                          <td className="p-3 text-xs text-muted-foreground max-w-md truncate">{r.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
