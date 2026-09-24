import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

type KeyRow = {
  id: string;
  name: string;
  tier: string;
  daily_limit: number;
  daily_used: number;
  created_at: string;
};

const PLANS = [
  { tier: "builder", label: "Builder", price: "$11", cadence: "/mo", limit: "2,000 seals / day" },
  { tier: "scale", label: "Scale", price: "$55", cadence: "/mo", limit: "20,000 seals / day" },
];

const Upgrade = () => {
  const [params] = useSearchParams();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const status = params.get("status");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  useEffect(() => {
    if (signedIn) loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  async function loadKeys() {
    const { data } = await supabase.functions.invoke("api-keys", { body: { action: "list" } });
    if (data?.keys) setKeys(data.keys as KeyRow[]);
  }

  async function buy(tier: string) {
    setBusy(tier);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { tier } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else setErr("Checkout unavailable right now.");
    } catch (e) {
      setErr(String((e as Error)?.message || e));
    } finally {
      setBusy(null);
    }
  }

  async function createKey() {
    setBusy("create");
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-api-key", { body: { name: "default" } });
      if (error) throw error;
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
        <meta name="description" content="Sealing and verification stay free. Paid API keys only raise the daily cap for heavy machine use." />
        <link rel="canonical" href={`${SITE_URL}/upgrade`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-gold">High-volume API access</p>
        <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">
          The protocol is free. This only raises the cap.
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Sealing, verification and the public commons stay free forever — 100 seals a day, no account,
          no key. A paid key exists only for agents that need more volume. It changes the daily limit and
          nothing else.
        </p>

        {status === "success" && (
          <div className="mb-8 rounded-lg border border-gold/40 bg-gold/5 p-4 text-sm">
            Payment received. Create your API key below — it will carry your new limit.
          </div>
        )}
        {err && <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-300">{err}</div>}

        {signedIn === false && (
          <div className="mb-10 rounded-lg border border-border bg-card p-6 text-sm">
            <p className="mb-4 text-muted-foreground">Sign in to buy a key or manage your existing ones.</p>
            <Button variant="hero" asChild><Link to="/auth">Sign in</Link></Button>
          </div>
        )}

        {signedIn && (
          <>
            <div className="mb-10 grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <Card key={p.tier}>
                  <CardContent className="p-6">
                    <div className="mb-1 text-sm font-semibold">{p.label}</div>
                    <div className="mb-3 text-3xl font-bold">{p.price}<span className="text-base font-normal text-muted-foreground">{p.cadence}</span></div>
                    <div className="mb-5 text-sm text-muted-foreground">{p.limit}</div>
                    <Button className="w-full" variant="hero" disabled={busy === p.tier} onClick={() => buy(p.tier)}>
                      {busy === p.tier ? "Loading…" : `Choose ${p.label}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

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
                          <div className="font-medium">{k.name} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{k.tier}</span></div>
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

            <p className="mt-8 text-xs text-muted-foreground">
              Government &amp; enterprise (unlimited, on-demand): arranged by direct agreement — not a self-serve plan.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Upgrade;
