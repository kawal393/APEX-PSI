import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Code, ShieldCheck, ExternalLink, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge as UiBadge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmbedCodeGenerator from "@/components/EmbedCodeGenerator";
import ZeroClaimLabel from "@/components/ZeroClaimLabel";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import apexLogo from "@/assets/apex-logo.png";
import { Helmet } from "react-helmet-async";

type BadgeTheme = "dark" | "light" | "gold";
type BadgeSize = "sm" | "md" | "lg";

// The ledger lookup the badge stands on. A badge may only claim what a stranger can
// re-check: that one hash is in the append-only ledger. It is never a rating, a score, or
// an assurance that what the holder says is true — and there is no scoring engine in this
// product, so no page may imply one.
const VERIFY_HASH_URL =
  "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash";

type SealState =
  | { kind: "empty" }
  | { kind: "checking" }
  | { kind: "found"; commitId?: string }
  | { kind: "absent" }
  | { kind: "refused"; detail: string };

const Badge = () => {
  const [companyName, setCompanyName] = useState("Your Company");
  const [theme, setTheme] = useState<BadgeTheme>("dark");
  const [size, setSize] = useState<BadgeSize>("md");
  const { user } = useAuth();
  const [complianceStatus, setComplianceStatus] = useState<string | null>(null);
  const [sealHash, setSealHash] = useState("");
  const [seal, setSeal] = useState<SealState>({ kind: "empty" });

  const checkSeal = async () => {
    const clean = sealHash.trim().replace(/^sha256:/i, "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      setSeal({
        kind: "refused",
        detail: "That is not a 64-character SHA-256 hash. Paste the hash from your receipt.",
      });
      return;
    }
    setSeal({ kind: "checking" });
    try {
      const res = await fetch(`${VERIFY_HASH_URL}?hash=${clean}`, { method: "GET" });
      if (res.status === 429) {
        // The flood guard refused the lookup. Nothing was asked of the ledger, so the page
        // must not read "not sealed" — that would be the site lying about a real record.
        const wait = Number(res.headers.get("retry-after") ?? "");
        setSeal({
          kind: "refused",
          detail: Number.isFinite(wait) && wait > 0
            ? `Lookup rate-limited (20 free lookups a minute per address). Nothing was asked of the ledger. Try again in about ${Math.ceil(wait)} second(s).`
            : "Lookup rate-limited (20 free lookups a minute per address). Nothing was asked of the ledger. Try again shortly.",
        });
        return;
      }
      if (!res.ok) {
        setSeal({ kind: "refused", detail: `Ledger probe answered HTTP ${res.status}. Nothing was confirmed.` });
        return;
      }
      const body = (await res.json()) as { verified?: boolean; found?: boolean; commit_id?: string };
      if (body.verified || body.found) {
        setSeal({ kind: "found", commitId: typeof body.commit_id === "string" ? body.commit_id : undefined });
      } else {
        setSeal({ kind: "absent" });
      }
    } catch (err) {
      setSeal({ kind: "refused", detail: `Could not reach the ledger: ${(err as Error).message}` });
    }
  };

  const sealedHash = seal.kind === "found" ? sealHash.trim().replace(/^sha256:/i, "").toLowerCase() : "";
  const isSealed = sealedHash.length === 64;

  // Fetch the workspace status only so a signed-in holder can see it. It is an assessment
  // recorded in their own workspace, not a fact the ledger carries, so it never drives a
  // public badge.
  useEffect(() => {
    if (!user) return;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("compliance_results")
        .select("company_name, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        if (data.company_name) setCompanyName(data.company_name);
        setComplianceStatus(data.status);
      }
    };
    fetchStatus();
  }, [user]);

  const sizeConfig = {
    sm: { w: 200, h: 48, fontSize: 10, logoSize: 20 },
    md: { w: 280, h: 64, fontSize: 12, logoSize: 28 },
    lg: { w: 360, h: 80, fontSize: 14, logoSize: 36 },
  };

  const themeConfig = {
    dark: { bg: "#0a0a0f", border: "#1a1a2e", text: "#e8e0d0", accent: "#d4a017", subtext: "#888" },
    light: { bg: "#fafaf8", border: "#e0ddd5", text: "#1a1a1a", accent: "#b8860b", subtext: "#666" },
    gold: { bg: "#1a1508", border: "#d4a01740", text: "#d4a017", accent: "#d4a017", subtext: "#a08030" },
  };

  const s = sizeConfig[size];
  const t = themeConfig[theme];

  const badgeLabel = isSealed ? "PSI Sealed" : "No seal checked";
  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">
  <rect width="${s.w}" height="${s.h}" rx="8" fill="${t.bg}" stroke="${t.border}" stroke-width="1"/>
  <circle cx="${s.h / 2}" cy="${s.h / 2}" r="${s.logoSize / 2}" fill="${t.accent}" fill-opacity="${isSealed ? "0.15" : "0.05"}"/>
  <text x="${s.h / 2}" y="${s.h / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${t.accent}" font-size="${s.logoSize * 0.5}" font-weight="900" font-family="system-ui">${isSealed ? "✓" : "·"}</text>
  <text x="${s.h + 4}" y="${s.h * 0.38}" fill="${t.text}" font-size="${s.fontSize}" font-weight="700" font-family="system-ui">${badgeLabel}</text>
  <text x="${s.h + 4}" y="${s.h * 0.65}" fill="${t.subtext}" font-size="${s.fontSize - 2}" font-family="system-ui">${companyName}</text>
  <text x="${s.w - 8}" y="${s.h * 0.65}" text-anchor="end" fill="${t.accent}" font-size="${s.fontSize - 3}" font-family="system-ui" opacity="0.6">APEX</text>
</svg>`;

  // The link IS the claim. It goes to the one record, not to a front page where a visitor
  // has to take our word for it.
  const badgeHref = isSealed
    ? `https://www.ai-governance-standard.com/verify?hash=${sealedHash}`
    : "https://www.ai-governance-standard.com/verify";
  const embedCode = isSealed
    ? `<!-- APEX PSI seal badge — links to one ledger record anyone can re-check -->
<a href="${badgeHref}" target="_blank" rel="noopener noreferrer" title="Sealed in the APEX PSI append-only ledger. Verify it yourself.">
  <img src="data:image/svg+xml,${encodeURIComponent(badgeSvg)}" alt="PSI Sealed - ${companyName}" width="${s.w}" height="${s.h}" />
</a>`
    : `Paste a seal hash above and the code here becomes the badge for that one record.`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <>
      <Helmet>
        <title>Seal Badge — Put one verifiable record on your site — APEX PSI</title>
        <meta name="description" content="Embed a badge that links to a single record in the APEX PSI append-only ledger. Anyone can re-check it, free, with no account. A seal proves a record was made and has not changed — never that its contents are true." />
        <link rel="canonical" href="https://www.ai-governance-standard.com/badge" />
        <meta property="og:title" content="Seal Badge — link your site to one verifiable record" />
        <meta property="og:description" content="The badge points at a specific ledger entry. A visitor re-checks the hash themselves; nobody has to trust a rating." />
        <meta property="og:url" content="https://www.ai-governance-standard.com/badge" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-16 sm:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <UiBadge variant="outline" className="border-gold/30 text-gold mb-4">
                EMBEDDABLE SEAL BADGE
              </UiBadge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="text-chrome-gradient">Point at</span>{" "}
                <span className="text-gold-gradient">one record</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Paste a hash that the APEX PSI ledger already holds, and the badge below links
                straight to it. A visitor re-checks the record themselves — free, no account.
                The badge proves a record was made and has not changed since its timestamp. It
                does not rate you, certify you, or say that anything you claim is true.
              </p>
              <div className="max-w-xl mx-auto mt-5 text-left">
                <ZeroClaimLabel state="verified" />
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Preview */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="rounded-xl border border-border bg-card/80 p-6">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    Badge Preview
                  </h3>

                  {/* Live Preview */}
                  <div className="rounded-lg border border-border bg-background p-8 flex items-center justify-center mb-6 min-h-[120px]">
                    <div dangerouslySetInnerHTML={{ __html: badgeSvg }} />
                  </div>

                  {/* Customization */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Seal hash — the 64-character hash from your receipt
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={sealHash}
                          onChange={(e) => {
                            setSealHash(e.target.value);
                            setSeal({ kind: "empty" });
                          }}
                          placeholder="e.g. 4606e9ee…  (64 hex characters)"
                          className="bg-background border-border font-mono text-xs"
                          maxLength={71}
                        />
                        <Button variant="heroOutline" size="sm" onClick={checkSeal} className="shrink-0">
                          Check
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {seal.kind === "empty" && "Nothing asked of the ledger yet. The badge stays a preview until a hash is confirmed."}
                        {seal.kind === "checking" && "Asking the ledger…"}
                        {seal.kind === "found" && (
                          <>This hash is in the append-only ledger{seal.commitId ? ` (receipt ${seal.commitId})` : ""}.{" "}
                            <a className="text-gold underline" href={badgeHref} target="_blank" rel="noopener noreferrer">
                              See the record
                            </a>
                            . A seal proves the record was made and has not changed — not that its contents are true.</>
                        )}
                        {seal.kind === "absent" && "The ledger holds no record of that hash. Seal something first, then come back."}
                        {seal.kind === "refused" && seal.detail}
                      </p>
                      {!isSealed && (
                        <p className="text-xs mt-1">
                          No receipt yet?{" "}
                          <Link to="/seal" className="text-gold underline">Seal a record</Link>{" "}
                          or ask the{" "}
                          <Link to="/mcp" className="text-gold underline">MCP server</Link> to seal one for you.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Company Name</label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company"
                        className="bg-background border-border"
                        maxLength={30}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                        <Palette className="h-3 w-3" /> Theme
                      </label>
                      <div className="flex gap-2">
                        {(["dark", "light", "gold"] as BadgeTheme[]).map((th) => (
                          <button
                            key={th}
                            onClick={() => setTheme(th)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                              theme === th
                                ? "border-gold/60 bg-gold/10 text-gold"
                                : "border-border bg-background text-muted-foreground hover:border-border/80"
                            }`}
                          >
                            {th.charAt(0).toUpperCase() + th.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Size</label>
                      <div className="flex gap-2">
                        {(["sm", "md", "lg"] as BadgeSize[]).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSize(sz)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                              size === sz
                                ? "border-gold/60 bg-gold/10 text-gold"
                                : "border-border bg-background text-muted-foreground hover:border-border/80"
                            }`}
                          >
                            {sz.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Embed Code */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="rounded-xl border border-border bg-card/80 p-6 space-y-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Code className="h-4 w-4 text-gold" />
                    Embed Code
                  </h3>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">HTML — Copy and paste into your website</p>
                    <div className="relative">
                      <pre className="rounded-lg bg-background border border-border p-4 text-xs font-mono text-muted-foreground overflow-x-auto max-h-[200px] whitespace-pre-wrap break-all">
                        {embedCode}
                      </pre>
                      <Button
                        variant="heroOutline"
                        size="sm"
                        disabled={!isSealed}
                        className="absolute top-2 right-2"
                        onClick={() => copy(embedCode, "Embed code")}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">SVG — Direct image code</p>
                    <Button
                      variant="heroOutline"
                      size="sm"
                      className="w-full"
                      onClick={() => copy(badgeSvg, "SVG code")}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy SVG
                    </Button>
                  </div>

                  <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
                    <p className="text-xs text-gold font-semibold mb-2">What this badge does, and what it cannot</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>• It links to one ledger entry, not to a marketing page</li>
                      <li>• Anyone can re-check that hash, free, with no account</li>
                      <li>• It shows a record existed at its timestamp and has not changed</li>
                      <li>• It does not rate, certify or endorse the holder, and it cannot — APEX PSI issues no scores</li>
                      <li>• It never proves the sealed content is true, accurate, or lawful</li>
                      <li>• It is not legal advice and no regulator has approved it</li>
                    </ul>
                  </div>

                  {complianceStatus ? (
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <p className="text-xs text-foreground font-semibold mb-1">Your workspace status</p>
                      <p className="text-xs text-muted-foreground">
                        Your own assessments record a status of <span className="font-bold text-foreground">{complianceStatus}</span>.
                        That number and word live in your workspace and nobody verifies them for you — the badge above only
                        ever carries the ledger, which is a fact a stranger can re-check.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Sign in to keep your own assessments in one place. It changes nothing about the badge: the badge
                        stands on a sealed hash, and that is the part a visitor can check.
                      </p>
                      <Button variant="hero" size="sm" className="w-full" asChild>
                        <Link to="/auth">Sign In</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Embed Widgets Section */}
            <div className="grid lg:grid-cols-2 gap-8 mt-12">
              <EmbedCodeGenerator
                title="EU AI Act Countdown Widget"
                description="Embed a live in-force clock for the August 2, 2026 Article 50 enforcement on any website. Drives traffic back to APEX."
                embedUrl="https://ai-governance-standard.com/embed/countdown"
                defaultWidth={400}
                defaultHeight={220}
              />
              {complianceStatus && (
                <EmbedCodeGenerator
                  title="Workspace Status Widget"
                  description="Shows a status you recorded in your own APEX PSI workspace. It is a display of your own notes, not a verification by APEX and not a rating — a visitor checking the ledger learns nothing about this number."
                  embedUrl={`https://ai-governance-standard.com/embed/pulse/${user?.id || ""}`}
                  defaultWidth={320}
                  defaultHeight={160}
                />
              )}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default Badge;
