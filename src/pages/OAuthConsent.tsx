import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthNamespace(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauthNamespace().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const ns = oauthNamespace();
    const { data, error: decisionError } = approve
      ? await ns.approveAuthorization(authorizationId)
      : await ns.denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "an application";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border rounded-lg bg-card/60 p-8 space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Agent Integration Authorization
        </div>

        {error ? (
          <p className="text-sm text-destructive">Could not complete this authorization request: {error}</p>
        ) : !details ? (
          <p className="text-sm text-muted-foreground font-mono">Loading authorization request…</p>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Connect {clientName} to APEX PSI</h1>
              <p className="text-sm text-muted-foreground">
                {clientName} will be able to use APEX PSI tools as you — reading the evidence ledger and
                verification data your account can access. You can revoke this at any time.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="hero" className="flex-1" disabled={busy} onClick={() => void decide(true)}>
                Approve
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void decide(false)}>
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
