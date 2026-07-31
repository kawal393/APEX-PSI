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
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import apexLogo from "@/assets/apex-logo.png";
import { Helmet } from "react-helmet-async";

type BadgeTheme = "dark" | "light" | "gold";
type BadgeSize = "sm" | "md" | "lg";

const Badge = () => {
  const [companyName, setCompanyName] = useState("Your Company");
  const [theme, setTheme] = useState<BadgeTheme>("dark");
  const [size, setSize] = useState<BadgeSize>("md");
  const { user } = useAuth();
  const [complianceStatus, setComplianceStatus] = useState<string | null>(null);

  // Fetch real compliance status for authenticated users
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

  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">
  <rect width="${s.w}" height="${s.h}" rx="8" fill="${t.bg}" stroke="${t.border}" stroke-width="1"/>
  <circle cx="${s.h / 2}" cy="${s.h / 2}" r="${s.logoSize / 2}" fill="${t.accent}" fill-opacity="0.15"/>
  <text x="${s.h / 2}" y="${s.h / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${t.accent}" font-size="${s.logoSize * 0.5}" font-weight="900" font-family="system-ui">✓</text>
  <text x="${s.h + 4}" y="${s.h * 0.38}" fill="${t.text}" font-size="${s.fontSize}" font-weight="700" font-family="system-ui">PSI Verified</text>
  <text x="${s.h + 4}" y="${s.h * 0.65}" fill="${t.subtext}" font-size="${s.fontSize - 2}" font-family="system-ui">${companyName}</text>
  <text x="${s.w - 8}" y="${s.h * 0.65}" text-anchor="end" fill="${t.accent}" font-size="${s.fontSize - 3}" font-family="system-ui" opacity="0.6">APEX</text>
</svg>`;

  const embedCode = `<!-- APEX PSI Trust Badge -->
<a href="https://digital-gallows.apex-infrastructure.com/verify" target="_blank" rel="noopener noreferrer" title="PSI Verified by APEX PSI">
  <img src="data:image/svg+xml,${encodeURIComponent(badgeSvg)}" alt="PSI Verified - ${companyName}" width="${s.w}" height="${s.h}" />
</a>`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <>
      <Helmet>
        <title>Trust Badge — Display Your APEX PSI Score</title>
        <meta name="description" content="Embed a verifiable trust badge on your site. Real-time score, tamper-proof link back to your public attestation." />
        <link rel="canonical" href="https://digital-gallows.apex-infrastructure.com/badge" />
        <meta property="og:title" content="Trust Badge — Display Your APEX PSI Score" />
        <meta property="og:description" content="Embed a verifiable trust badge on your site. Real-time score, tamper-proof link back to your public attestation." />
        <meta property="og:url" content="https://digital-gallows.apex-infrastructure.com/badge" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-16 sm:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <UiBadge variant="outline" className="border-gold/30 text-gold mb-4">
                EMBEDDABLE TRUST BADGE
              </UiBadge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="text-chrome-gradient">Show Your</span>{" "}
                <span className="text-gold-gradient">Compliance</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Display the PSI Verified badge on your website. Every badge links back to our public verification portal — building trust with customers and regulators.
              </p>
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
                    <p className="text-xs text-gold font-semibold mb-2">How It Works</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>• Badge links to APEX public verification portal</li>
                      <li>• Visitors can independently verify your compliance</li>
                      <li>• Builds trust with customers and regulators</li>
                      <li>• Updates automatically as your status changes</li>
                    </ul>
                  </div>

                  {complianceStatus ? (
                    <div className="rounded-lg border border-compliant/20 bg-compliant/5 p-4">
                      <p className="text-xs text-compliant font-semibold mb-1">✓ Dynamic Badge Active</p>
                      <p className="text-xs text-muted-foreground">
                        Your badge reflects your live compliance status: <span className="font-bold text-foreground">{complianceStatus}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <p className="text-xs text-muted-foreground mb-2">Sign in to get a dynamic badge that shows your real compliance status.</p>
                      <Button variant="hero" size="sm" className="w-full" asChild>
                        <Link to="/auth">Sign In for Dynamic Badge</Link>
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
                description="Embed a live countdown to the August 2, 2026 enforcement deadline on any website. Drives traffic back to APEX."
                embedUrl="https://digital-gallows.apex-infrastructure.com/embed/countdown"
                defaultWidth={400}
                defaultHeight={220}
              />
              {complianceStatus && (
                <EmbedCodeGenerator
                  title="Live Compliance Pulse"
                  description="Show your real-time compliance status on your website. Auto-updates as your score changes."
                  embedUrl={`https://digital-gallows.apex-infrastructure.com/embed/pulse/${user?.id || ""}`}
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
