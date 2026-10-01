import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HOSTED_TIERS, RAPIDAPI_URL, salesMailto } from "@/lib/commerce";

/**
 * The hosted product ladder, identical on every channel.
 * Free and Institutional route to use / contact; Pro and Ultra open direct
 * card checkout, with the same product on the marketplace as an alternative.
 */
const HostedTiers = ({ currentTier }: { currentTier?: string }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function startCheckout(tier: string) {
    setBusy(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/auth?next=${encodeURIComponent("/upgrade")}`;
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { tier } });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (data?.url) {
        window.open(data.url as string, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Checkout could not be started.");
      }
    } catch (e) {
      toast({
        title: "Checkout unavailable",
        description: String((e as Error)?.message || e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {HOSTED_TIERS.map((tier) => {
        const isCurrent = currentTier === tier.id;
        return (
          <article
            key={tier.id}
            className={`flex flex-col rounded-lg border bg-card p-6 ${isCurrent ? "border-gold" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">APEX hosted</p>
              {isCurrent && (
                <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                  Your plan
                </span>
              )}
            </div>
            <h3 className="mt-2 text-2xl font-black">{tier.name}</h3>
            <p className="mt-3 text-3xl font-black tracking-tight">
              {tier.price}
              <span className="ml-2 text-xs font-medium text-muted-foreground">{tier.cadence}</span>
            </p>
            <p className="mt-3 min-h-10 text-sm text-muted-foreground">{tier.audience}</p>
            <p className="mt-5 text-sm font-bold text-foreground">{tier.capacity}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tier.access}</p>

            <div className="mt-6 flex flex-col gap-2">
              {tier.id === "free" && (
                <Link to="/seal" className="inline-flex items-center gap-2 text-sm font-bold text-gold hover:underline">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {tier.selfServe && (
                <>
                  <button
                    type="button"
                    disabled={busy === tier.id}
                    onClick={() => startCheckout(tier.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-gold bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/20 disabled:opacity-60"
                  >
                    {busy === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy === tier.id ? "Opening…" : `Subscribe — ${tier.price}/mo`}
                  </button>
                  <a
                    href={RAPIDAPI_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Or buy {tier.name} on RapidAPI
                  </a>
                </>
              )}

              {tier.id === "institutional" && (
                <a
                  href={salesMailto(tier.name)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-gold hover:underline"
                >
                  Contact sales <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default HostedTiers;
