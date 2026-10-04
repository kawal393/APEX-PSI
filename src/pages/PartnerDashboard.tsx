import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Copy, LogOut } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import apexLogo from "@/assets/apex-logo.png";

const BADGE_SNIPPET =
  '<script src="https://ai-governance-standard.com/badge.js" data-name="Your Company" data-hash="YOUR_RECORD_HASH" async></script>';

const MCP_SNIPPET = "npx -y apex-psi-mcp";

/**
 * Operator console. It holds no money and pays nothing: the referral-commission
 * programme and the white-label portal were withdrawn (see /corrections,
 * 30 September 2026). What remains is the reference your seals are attributed
 * to, the embed lines, and the doors that actually exist.
 */
const PartnerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase
        .from("partners" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!p) {
        navigate("/partner");
        return;
      }
      setPartner(p);
      setLoading(false);
    };
    load();
  }, [user]);

  const reference = partner ? (partner as any).partner_code : "";

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied.` });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={apexLogo} alt="APEX" className="h-7 w-7 glow-gold" />
            <span className="font-bold text-gold-gradient text-sm">APEX</span>
            <span className="text-xs text-muted-foreground ml-1">Operator</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold text-gold-gradient">Operator Console</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          You hold a reference, not a revenue share. Nothing here pays out, and no listing on this
          site is an endorsement or a claim of legal affiliation in either direction.
        </p>

        {/* Operator reference */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold">Your operator reference</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-secondary rounded px-3 py-2 text-foreground/80 truncate font-mono">
              {reference}
            </code>
            <Button variant="outline" size="icon" onClick={() => copyText(reference, "Reference")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use it in the <code className="font-mono">data-name</code> of your badge or in your own
            record metadata so a reader can see which operator published a receipt.
          </p>
        </div>

        {/* Badge embed */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold">The one-line badge</h3>
          <pre className="overflow-x-auto rounded bg-background/80 p-3 text-[11px] font-mono text-muted-foreground">
            {BADGE_SNIPPET}
          </pre>
          <Button variant="outline" size="sm" onClick={() => copyText(BADGE_SNIPPET, "Badge line")}>
            <Copy className="h-4 w-4 mr-1" /> Copy badge line
          </Button>
          <p className="text-xs text-muted-foreground">
            The badge resolves to a public verification record. It cannot be styled away or
            re-branded: the mark is licensed as published. See{" "}
            <Link to="/license" className="text-gold hover:underline">licence terms</Link>.
          </p>
        </div>

        {/* Verifier */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold">Install the verifier (MCP)</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-secondary rounded px-3 py-2 text-foreground/80 truncate font-mono">
              {MCP_SNIPPET}
            </code>
            <Button variant="outline" size="icon" onClick={() => copyText(MCP_SNIPPET, "Install command")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Doors that actually exist */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/upgrade" className="rounded-xl border border-border bg-card/60 p-5 hover:border-primary/50 transition-colors">
            <h3 className="text-sm font-semibold mb-1">Raise the daily cap</h3>
            <p className="text-xs text-muted-foreground">Pro and Ultra keys. Caps only - never a finding.</p>
          </Link>
          <Link to="/conformance" className="rounded-xl border border-border bg-card/60 p-5 hover:border-primary/50 transition-colors">
            <h3 className="text-sm font-semibold mb-1">Pass the conformance check</h3>
            <p className="text-xs text-muted-foreground">The suite runs in your browser. The dated shelf is at /specs.</p>
          </Link>
          <Link to="/verify" className="rounded-xl border border-border bg-card/60 p-5 hover:border-primary/50 transition-colors">
            <h3 className="text-sm font-semibold mb-1">Check any receipt</h3>
            <p className="text-xs text-muted-foreground">Free for anyone, forever, with no account and no key.</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PartnerDashboard;
