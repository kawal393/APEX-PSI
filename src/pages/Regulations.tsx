import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Search, Shield, AlertTriangle, Clock, CheckCircle2, XCircle, MinusCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegulationMap from "@/components/RegulationMap";
import { Helmet } from "react-helmet-async";

type RegStatus = "enforced" | "enacted" | "proposed" | "draft" | "none";

interface Regulation {
  country: string;
  region: string;
  flag: string;
  name: string;
  status: RegStatus;
  enforcementDate?: string;
  maxPenalty?: string;
  scope: string;
  url?: string;
}

const statusConfig: Record<RegStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  enforced: { label: "ENFORCED", color: "text-compliant", icon: CheckCircle2 },
  enacted: { label: "ENACTED", color: "text-gold", icon: Shield },
  proposed: { label: "PROPOSED", color: "text-warning", icon: Clock },
  draft: { label: "DRAFT", color: "text-muted-foreground", icon: MinusCircle },
  none: { label: "NO REGULATION", color: "text-destructive", icon: XCircle },
};

const regulations: Regulation[] = [
  // EU & EEA
  { country: "European Union", region: "Europe", flag: "🇪🇺", name: "EU AI Act (Reg. 2024/1689)", status: "enforced", enforcementDate: "Aug 2, 2026 (high-risk)", maxPenalty: "€35M or 7% global turnover", scope: "All AI systems marketed/used in EU", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
  { country: "United Kingdom", region: "Europe", flag: "🇬🇧", name: "AI Regulation Framework", status: "proposed", enforcementDate: "TBD", scope: "Sector-specific, principles-based", url: "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach" },
  { country: "Switzerland", region: "Europe", flag: "🇨🇭", name: "Swiss AI Guidelines", status: "draft", scope: "Aligning with EU AI Act" },
  { country: "Norway", region: "Europe", flag: "🇳🇴", name: "EU AI Act (EEA)", status: "enacted", enforcementDate: "Aligning with EU timeline", scope: "EEA adoption of EU AI Act" },
  // Americas
  { country: "United States", region: "Americas", flag: "🇺🇸", name: "Executive Order 14110 + State Laws", status: "enacted", enforcementDate: "Various (CO, IL, CA)", maxPenalty: "Varies by state", scope: "Federal guidance + patchwork state laws", url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/" },
  { country: "Canada", region: "Americas", flag: "🇨🇦", name: "AIDA (Bill C-27)", status: "proposed", scope: "High-impact AI systems" },
  { country: "Brazil", region: "Americas", flag: "🇧🇷", name: "AI Regulation Bill (PL 2338/2023)", status: "proposed", scope: "Risk-based framework, LGPD integration" },
  { country: "Mexico", region: "Americas", flag: "🇲🇽", name: "AI Regulation Proposal", status: "draft", scope: "National AI strategy" },
  // Asia-Pacific
  { country: "China", region: "Asia-Pacific", flag: "🇨🇳", name: "Interim Measures for GenAI", status: "enforced", enforcementDate: "Aug 15, 2023", maxPenalty: "Service suspension + fines", scope: "Generative AI, deepfakes, recommendation algorithms" },
  { country: "South Korea", region: "Asia-Pacific", flag: "🇰🇷", name: "AI Basic Act", status: "enacted", enforcementDate: "2025", scope: "High-risk AI, trustworthiness standards" },
  { country: "Japan", region: "Asia-Pacific", flag: "🇯🇵", name: "AI Guidelines for Business", status: "enacted", scope: "Voluntary guidelines, sector-specific" },
  { country: "India", region: "Asia-Pacific", flag: "🇮🇳", name: "Digital India AI Framework", status: "proposed", scope: "Advisory, sector-specific" },
  { country: "Singapore", region: "Asia-Pacific", flag: "🇸🇬", name: "AI Governance Framework", status: "enacted", scope: "Model AI governance, voluntary adoption" },
  { country: "Australia", region: "Asia-Pacific", flag: "🇦🇺", name: "AI Ethics Framework + Mandatory Guardrails", status: "proposed", enforcementDate: "2025-2026", scope: "High-risk AI, mandatory guardrails consultation" },
  { country: "New Zealand", region: "Asia-Pacific", flag: "🇳🇿", name: "Algorithm Charter", status: "enacted", scope: "Government use of algorithms" },
  // Middle East & Africa
  { country: "UAE", region: "Middle East", flag: "🇦🇪", name: "National AI Strategy 2031", status: "enacted", scope: "AI adoption + ethics guidelines" },
  { country: "Saudi Arabia", region: "Middle East", flag: "🇸🇦", name: "SDAIA AI Ethics Principles", status: "enacted", scope: "National data & AI governance" },
  { country: "Israel", region: "Middle East", flag: "🇮🇱", name: "AI Policy Outline", status: "proposed", scope: "Risk-based approach" },
  { country: "South Africa", region: "Africa", flag: "🇿🇦", name: "AI Framework (Draft)", status: "draft", scope: "National AI policy" },
  { country: "Kenya", region: "Africa", flag: "🇰🇪", name: "Blockchain & AI Taskforce", status: "draft", scope: "Policy recommendations" },
  { country: "Nigeria", region: "Africa", flag: "🇳🇬", name: "NITDA AI Framework", status: "proposed", scope: "National AI strategy" },
  // More EU member states
  { country: "Germany", region: "Europe", flag: "🇩🇪", name: "EU AI Act + National Implementation", status: "enforced", enforcementDate: "EU AI Act timeline", scope: "BaFin financial AI oversight" },
  { country: "France", region: "Europe", flag: "🇫🇷", name: "EU AI Act + CNIL AI Guidance", status: "enforced", enforcementDate: "EU AI Act timeline", scope: "CNIL AI compliance framework" },
  { country: "Italy", region: "Europe", flag: "🇮🇹", name: "EU AI Act + Garante Guidelines", status: "enforced", enforcementDate: "EU AI Act timeline", scope: "Data protection + AI" },
  { country: "Spain", region: "Europe", flag: "🇪🇸", name: "EU AI Act + AESIA Sandbox", status: "enforced", enforcementDate: "EU AI Act timeline", scope: "First EU AI regulatory sandbox" },
  { country: "Netherlands", region: "Europe", flag: "🇳🇱", name: "EU AI Act + Algorithm Register", status: "enforced", enforcementDate: "EU AI Act timeline", scope: "Government algorithm transparency" },
];

const regions = ["All", "Europe", "Americas", "Asia-Pacific", "Middle East", "Africa"];

const Regulations = () => {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<RegStatus | "all">("all");

  const filtered = regulations.filter(r => {
    const matchSearch = !search || r.country.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase());
    const matchRegion = regionFilter === "All" || r.region === regionFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchRegion && matchStatus;
  });

  const statusCounts = regulations.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Helmet>
        <title>Global AI Regulation Map — EU AI Act, NIST, Beyond — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Live tracker of AI regulations across 14+ jurisdictions with enforcement dates and penalty exposure." />
        <link rel="canonical" href="https://ai-governance-standard.com/regulations" />
        <meta property="og:title" content="Global AI Regulation Map — EU AI Act, NIST, Beyond" />
        <meta property="og:description" content="Live tracker of AI regulations across 14+ jurisdictions with enforcement dates and penalty exposure." />
        <meta property="og:url" content="https://ai-governance-standard.com/regulations" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
              <Badge variant="outline" className="border-gold/30 text-gold mb-4">GLOBAL AI REGULATION TRACKER</Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="text-chrome-gradient">World AI</span>{" "}
                <span className="text-gold-gradient">Regulation Map</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Track AI regulation status across every major jurisdiction. Updated regularly.
              </p>
            </motion.div>

            {/* Interactive Map */}
            <div className="mb-8">
              <RegulationMap
                regulations={regulations}
                onCountryClick={(country) => setSearch(country)}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {(["enforced", "enacted", "proposed", "draft"] as RegStatus[]).map((s) => {
                const cfg = statusConfig[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                    className={`rounded-lg border p-3 text-center transition-colors cursor-pointer ${
                      statusFilter === s ? "border-gold/40 bg-gold/5" : "border-border bg-card/60 hover:border-border/80"
                    }`}
                  >
                    <p className={`text-2xl font-black ${cfg.color}`}>{statusCounts[s] || 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or regulation..."
                  className="pl-9 bg-card border-border"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {regions.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      regionFilter === r
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Regulation Cards */}
            <div className="space-y-3">
              {filtered.map((reg, i) => {
                const cfg = statusConfig[reg.status];
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={reg.country}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="rounded-lg border border-border bg-card/60 hover:border-gold/20 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4 p-4 flex-col sm:flex-row">
                      <div className="flex items-center gap-3 shrink-0 min-w-[180px]">
                        <span className="text-2xl">{reg.flag}</span>
                        <div>
                          <p className="font-bold text-foreground text-sm">{reg.country}</p>
                          <p className="text-[10px] text-muted-foreground">{reg.region}</p>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{reg.name}</p>
                        <p className="text-xs text-muted-foreground">{reg.scope}</p>
                        {reg.enforcementDate && (
                          <p className="text-[10px] text-gold mt-0.5">⏱ {reg.enforcementDate}</p>
                        )}
                        {reg.maxPenalty && (
                          <p className="text-[10px] text-destructive mt-0.5">⚠ {reg.maxPenalty}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="text-xs font-bold tracking-wider">{cfg.label}</span>
                        </div>
                        {reg.url && (
                          <a href={reg.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No regulations found matching your criteria.</p>
              </div>
            )}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 rounded-xl border border-gold/20 bg-gold/5 p-6 sm:p-8 text-center"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">
                Ready for <span className="text-gold-gradient">Every Jurisdiction?</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Apex PSI provides a single compliance architecture that satisfies every regulatory framework listed above.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" asChild>
                  <a href="/assess">Free Compliance Score</a>
                </Button>
                <Button variant="heroOutline" asChild>
                  <a href="/spec">Read the specification</a>
                </Button>
              </div>
            </motion.div>

            <p className="text-xs text-center text-muted-foreground/50 mt-6 italic">
              Data compiled from official government sources, legal databases, and regulatory publications. Last updated March 2026.
              This tracker is informational only — consult qualified legal counsel for jurisdiction-specific advice.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default Regulations;
