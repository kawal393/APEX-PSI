import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HostedTiers from "@/components/HostedTiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";
import { RAPIDAPI_URL, salesMailto } from "@/lib/commerce";

type KeyRow = {
  id: string;
  name: string;
  tier: string;
  daily_limit: number;
  daily_used: number;
  created_at: string;
};

const Upgrade = () => {
  const [params] = useSearchParams();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const status = params.get("status");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const loadKeys = useCallback(async () => {
    const { data } = await supabase.functions.invoke("api-keys", { body: { action: "list" } });
    if (data?.keys) setKeys(data.keys as KeyRow[]);
  }, []);

  const syncPlan = useCallback(async () => {
    const { data } = await supabase.functions.invoke("sync-subscription", { body: {} });
    if (data?.tier) setTier(String(data.tier));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    syncPlan().finally(loadKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, status]);

  async function createKey() {
    setBusy("create");
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-api-key", { body: { name: "default" } });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (data?.apiKey) {
        setFreshKey(data.apiKey);
        loadKeys();
      }
    } catch (e) {
      setErr(String((e as Error)?.message || e));
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    await supabase.functions.invoke("api-keys", { body: { action: "revoke", id } });
    loadKeys();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>API access — Apex PSI</title>
        <meta
          name="description"
          content="Independent verification is free forever. Pro and Ultra raise APEX-hosted capacity by card or marketplace; Institutional is arranged directly."
        />
        <link rel="canonical" href={`${SITE_URL}/upgrade`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-gold">Hosted API access</p>
        <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">
          The protocol is free. This only raises the cap.
        </h1>
        <p className="mb-10 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Independent verification and self-hosted use stay free. The public APEX-hosted allowance is 20 receipts per
          minute and 100 per day without an account or key. Pro and Ultra raise hosted capacity; Institutional adds
          service commitments. Paid capacity never changes a verification result.
        </p>

        {status === "success" && (
          <div className="mb-8 rounded-lg border border-gold/40 bg-gold/5 p-4 text-sm">
            Payment received. Your plan is being confirmed — create a new API key below to use the higher daily cap.
          </div>
        )}
        {status === "cancelled" && (
          <div className="mb-8 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Checkout was cancelled. Nothing was charged.
          </div>
        )}
        {err && <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-300">{err}</div>}

        <div className="mb-12">
          <HostedTiers currentTier={tier} />
          <p className="mt-4 text-xs text-muted-foreground">
            The same four products are sold here and on external marketplaces —{" "}
            <a href={RAPIDAPI_URL} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
              view the RapidAPI listing
            </a>
            . Institutional volume is arranged by{" "}
            <a href={salesMailto("Institutional")} className="text-gold hover:underline">
              direct agreement
            </a>
            .
          </p>
        </div>

        {signedIn === false && (
          <div className="mb-10 rounded-lg border border-border bg-card p-6 text-sm">
            <p className="mb-4 text-muted-foreground">Sign in to subscribe and manage API keys.</p>
            <Button variant="hero" asChild><Link to="/auth">Sign in</Link></Button>
          </div>
        )}

        {signedIn && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your API keys</h2>
                <Button size="sm" variant="heroOutline" disabled={busy === "create"} onClick={createKey}>
                  {busy === "create" ? "Creating…" : "Create key"}
                </Button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Use the key as the <code className="font-mono">x-apex-api-key</code> header on the seal endpoint.
              </p>

              {freshKey && (
                <div className="mb-4 rounded-lg border border-gold/40 bg-gold/5 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Copy now — shown only once:</p>
                  <code className="break-all font-mono text-sm">{freshKey}</code>
                </div>
              )}

              {keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keys yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {keys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <div className="font-medium">
                          {k.name}{" "}
                          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{k.tier}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {k.daily_used} / {k.daily_limit === -1 ? "∞" : k.daily_limit} today
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>Revoke</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Upgrade;
