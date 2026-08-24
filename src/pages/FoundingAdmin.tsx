import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  applicant_id: string;
  display_name: string;
  email: string;
  witness_line: string;
  status: string;
  seat_number: number | null;
  created_at: string;
};

const FoundingAdmin = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const { data, error: fnError } = await supabase.functions.invoke("founding-registry", {
      body: { action: "admin-list" },
    });
    if (fnError || data?.error) {
      setError(data?.error ?? "Operator login required.");
      setRows([]);
      return;
    }
    setError("");
    setRows(data.applications ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (applicant_id: string, action: "admin-approve" | "admin-reject") => {
    setBusy(applicant_id);
    const { data } = await supabase.functions.invoke("founding-registry", { body: { action, applicant_id } });
    if (data?.error) setError(data.error);
    await load();
    setBusy("");
  };

  return (
    <>
      <Helmet>
        <title>Registry review — Apex PSI</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-5xl">
            <h1 className="text-2xl font-black tracking-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
              FOUNDING REGISTRY REVIEW
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Confirmed-email applications only. Approval holds the lowest free seat. Nothing is approved
              automatically.
            </p>
            {error && <p className="text-sm text-destructive mb-6">{error}</p>}
            {!error && rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No confirmed applications to review.</p>
            )}
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.applicant_id} className="border border-border p-4 bg-card/30 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px]">
                    <span className="text-gold">{r.applicant_id}</span>
                    <span className="text-muted-foreground">
                      {r.status}
                      {r.seat_number ? ` · seat #${String(r.seat_number).padStart(3, "0")}` : ""}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{r.display_name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">{r.email}</p>
                  <p className="text-sm text-muted-foreground">{r.witness_line}</p>
                  {r.status === "VERIFIED" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={busy === r.applicant_id}
                        onClick={() => act(r.applicant_id, "admin-approve")}
                        className="font-mono uppercase tracking-[0.2em]"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.applicant_id}
                        onClick={() => act(r.applicant_id, "admin-reject")}
                        className="font-mono uppercase tracking-[0.2em]"
                      >
                        Close politely
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
};

export default FoundingAdmin;
