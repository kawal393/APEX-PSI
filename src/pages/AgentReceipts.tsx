import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Link_ = { index: number; kind: string; detail: unknown; event_hash: string; link: string };
type Result = { answer: string; chain: Link_[]; chain_head: string; receipt: { receipt_id: string } | null; seal_error: string | null };

export default function AgentReceipts() {
  const { user } = useAuth();
  const [task, setTask] = useState("What is the SHA-256 of the text 'hello world'?");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setRes(null);
    const { data, error } = await supabase.functions.invoke("agent-receipts", { body: { task } });
    setBusy(false);
    if (error) {
      let msg = "The agent could not finish.";
      try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* keep default */ }
      setErr(msg);
    } else setRes(data as Result);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Agent Receipts — APEX PSI</title>
        <meta name="description" content="Run a small AI agent and get a sealed, step-by-step evidence chain of what it did." />
      </Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-16">
        <p className="font-mono text-xs tracking-widest text-gold">AGENT RECEIPTS · LIVE</p>
        <h1 className="mt-2 text-4xl md:text-6xl font-bold uppercase tracking-tight">Every step, sealed</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Give the agent a small task. Every step it takes — the task, each tool it uses, each result, and its final
          answer — is fingerprinted into a chain. The end of the chain is sealed as a normal APEX receipt. The receipt
          proves what the agent did and in what order. It does not prove the answer is correct.
        </p>

        {!user ? (
          <p className="mt-10 font-mono text-sm">
            <Link to="/auth" className="text-gold underline">Sign in</Link> to run the agent. Runs use your public allowance.
          </p>
        ) : (
          <div className="mt-10 space-y-4 max-w-3xl">
            <Textarea value={task} onChange={(e) => setTask(e.target.value)} maxLength={2000} rows={4} aria-label="Agent task" />
            <Button onClick={run} disabled={busy || task.trim().length < 3}>{busy ? "Running…" : "Run and seal"}</Button>
            {err && <p className="font-mono text-sm text-destructive">{err}</p>}
          </div>
        )}

        {res && (
          <section className="mt-12 space-y-6">
            <div className="border border-border p-6">
              <p className="font-mono text-xs text-gold">ANSWER</p>
              <p className="mt-2 whitespace-pre-wrap">{res.answer}</p>
            </div>
            <div className="border border-border p-6 font-mono text-xs">
              <p className="text-gold">RECEIPT</p>
              {res.receipt ? (
                <p className="mt-2">Sealed as <Link className="underline" to={`/receipt/${res.receipt.receipt_id}`}>{res.receipt.receipt_id}</Link> · chain head sha256:{res.chain_head}</p>
              ) : (
                <p className="mt-2 text-destructive">Not sealed: {res.seal_error}</p>
              )}
            </div>
            <ol className="border border-border divide-y divide-border">
              {res.chain.map((c) => (
                <li key={c.index} className="p-4 font-mono text-xs">
                  <span className="text-gold uppercase">{c.index}. {c.kind.replace("_", " ")}</span>
                  <pre className="mt-2 whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(c.detail, null, 2).slice(0, 1200)}</pre>
                  <p className="mt-2 break-all">link {c.link}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
