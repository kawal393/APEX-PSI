import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, LogIn, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const AI_PROVIDERS = ["OpenAI", "Anthropic", "Google", "Meta", "Microsoft", "Hugging Face", "Stability AI", "Other"];
const HIGH_RISK_USES = ["Recruitment", "Credit Scoring", "Healthcare Diagnosis", "Law Enforcement", "Essential Services Access", "None"];
const SPECIAL_CATEGORIES = ["Health", "Biometric", "Political", "Religious", "None"];

interface FormData {
  company_name: string;
  industry: string;
  company_size: string;
  eu_presence: string;
  ai_system_count: number;
  ai_providers: string[];
  high_risk_uses: string[];
  automated_decisions: string;
  personal_data: string;
  special_category_data: string[];
  ai_profiling: string;
  users_informed: string;
  ai_content_labeled: string;
  right_to_explanation: string;
  governance_policy: string;
  compliance_officer: string;
  risk_assessments: string;
}

const defaultData: FormData = {
  company_name: "", industry: "", company_size: "", eu_presence: "",
  ai_system_count: 0, ai_providers: [], high_risk_uses: [],
  automated_decisions: "", personal_data: "", special_category_data: [],
  ai_profiling: "", users_informed: "", ai_content_labeled: "",
  right_to_explanation: "", governance_policy: "", compliance_officer: "",
  risk_assessments: "",
};

function calculateScore(data: FormData) {
  let score = 0;
  const hrCount = data.high_risk_uses.filter(u => u !== "None").length;
  score += hrCount === 0 ? 20 : hrCount === 1 ? 10 : 0;
  score += data.automated_decisions === "no" ? 15 : data.automated_decisions === "occasionally" ? 10 : 5;
  score += data.governance_policy === "documented" ? 20 : data.governance_policy === "informal" ? 10 : 0;
  score += data.users_informed === "always" ? 15 : data.users_informed === "sometimes" ? 8 : 0;
  score += data.right_to_explanation === "fully" ? 15 : data.right_to_explanation === "partially" ? 8 : 0;
  score += data.ai_content_labeled === "yes" ? 15 : data.ai_content_labeled === "somewhat" ? 8 : 0;
  const pct = Math.round(score);

  let status = "NON_COMPLIANT";
  let color = "text-destructive";
  let Icon = ShieldX;
  if (pct >= 90) { status = "COMPLIANT"; color = "text-compliant"; Icon = ShieldCheck; }
  else if (pct >= 70) { status = "MOSTLY COMPLIANT"; color = "text-gold"; Icon = Shield; }
  else if (pct >= 50) { status = "PARTIALLY COMPLIANT"; color = "text-warning"; Icon = ShieldAlert; }

  return { score: pct, status, color, Icon };
}

const FreeAssessment = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(defaultData);
  const [showResult, setShowResult] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const totalSteps = 5;

  const update = (field: keyof FormData, value: any) => setData(prev => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field: "ai_providers" | "high_risk_uses" | "special_category_data", item: string) => {
    setData(prev => {
      const arr = prev[field] as string[];
      if (item === "None") return { ...prev, [field]: arr.includes("None") ? [] : ["None"] };
      const without = arr.filter(i => i !== "None");
      return { ...prev, [field]: without.includes(item) ? without.filter(i => i !== item) : [...without, item] };
    });
  };

  const result = calculateScore(data);

  const handleSubmit = () => setEmailStep(true);

  const [shareId, setShareId] = useState<string | null>(null);

  // Check for referral param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("apex_ref", ref);
    }
  }, []);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      // Generate a short share_id
      const sid = Math.random().toString(36).substring(2, 10);
      setShareId(sid);

      await supabase.from("assessment_leads").upsert(
        {
          email: email.trim().toLowerCase(),
          company_name: data.company_name,
          score: result.score,
          status: result.status,
          industry: data.industry,
          share_id: sid,
        },
        { onConflict: "email" }
      );

      // If referred, increment referrer's count
      const ref = sessionStorage.getItem("apex_ref");
      if (ref) {
        // Find the referrer's compliance result by referral_code and increment
        const { data: refData } = await supabase
          .from("compliance_results")
          .select("id, referral_count")
          .eq("referral_code", ref)
          .maybeSingle();
        if (refData) {
          await supabase
            .from("compliance_results")
            .update({ referral_count: (refData.referral_count || 0) + 1 })
            .eq("id", refData.id);
        }
        sessionStorage.removeItem("apex_ref");
      }

      toast.success("Score saved! Check your results below.");
    } catch {
      // Non-blocking — still show result
    }
    setSaving(false);
    setEmailStep(false);
    setShowResult(true);
  };

  const scorePageUrl = shareId
    ? `https://digital-gallows.apex-infrastructure.com/score/${shareId}`
    : "https://digital-gallows.apex-infrastructure.com/assess";
  const shareText = `I just scored ${result.score}% on the APEX AI Compliance Assessment! Check yours at`;
  const shareUrl = scorePageUrl;

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareOnX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>Free AI Compliance Score — APEX PSI</title>
        <meta name="description" content="Free, instant AI-governance score across EU AI Act, NIST AI RMF, and ISO 42001. Shareable results." />
        <link rel="canonical" href="https://digital-gallows.apex-infrastructure.com/assess" />
        <meta property="og:title" content="Free AI Compliance Score — APEX PSI" />
        <meta property="og:description" content="Free, instant AI-governance score across EU AI Act, NIST AI RMF, and ISO 42001. Shareable results." />
        <meta property="og:url" content="https://digital-gallows.apex-infrastructure.com/assess" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-2xl">
            <AnimatePresence mode="wait">
              {!showResult && !emailStep ? (
                <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <div className="text-center mb-8">
                    <Badge variant="outline" className="border-gold/30 text-gold mb-4">FREE ASSESSMENT</Badge>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3">
                      <span className="text-chrome-gradient">Check Your</span>{" "}
                      <span className="text-gold-gradient">AI Compliance</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">No account needed. Get your score in 2 minutes.</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-muted-foreground">Step {step} of {totalSteps}</span>
                      <span className="text-xs text-gold font-mono">{Math.round((step / totalSteps) * 100)}%</span>
                    </div>
                    <Progress value={(step / totalSteps) * 100} className="h-1.5 mb-6" />

                    {step === 1 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Company Information</h3>
                        <div className="space-y-2">
                          <Label>Company Name</Label>
                          <Input value={data.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Acme Corp" className="bg-background border-border" maxLength={100} />
                        </div>
                        <div className="space-y-2">
                          <Label>Industry</Label>
                          <Select value={data.industry} onValueChange={v => update("industry", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select industry" /></SelectTrigger>
                            <SelectContent>
                              {["Technology", "Finance", "Healthcare", "Legal", "Education", "Manufacturing", "Retail", "Government", "Other"].map(i => (
                                <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Company Size</Label>
                          <Select value={data.company_size} onValueChange={v => update("company_size", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select size" /></SelectTrigger>
                            <SelectContent>
                              {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => (
                                <SelectItem key={s} value={s}>{s} employees</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>EU Presence</Label>
                          <Select value={data.eu_presence} onValueChange={v => update("eu_presence", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eu_based">Yes — EU based</SelectItem>
                              <SelectItem value="serves_eu">Yes — Non-EU, serves EU</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">AI Systems</h3>
                        <div className="space-y-2">
                          <Label>How many AI systems?</Label>
                          <Input type="number" min={0} value={data.ai_system_count} onChange={e => update("ai_system_count", parseInt(e.target.value) || 0)} className="bg-background border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label>AI Providers</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {AI_PROVIDERS.map(p => (
                              <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox checked={data.ai_providers.includes(p)} onCheckedChange={() => toggleArrayItem("ai_providers", p)} />
                                {p}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>High-Risk Use Cases</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {HIGH_RISK_USES.map(u => (
                              <label key={u} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox checked={data.high_risk_uses.includes(u)} onCheckedChange={() => toggleArrayItem("high_risk_uses", u)} />
                                {u}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Automated Decisions</Label>
                          <Select value={data.automated_decisions} onValueChange={v => update("automated_decisions", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regularly">Yes — Regularly</SelectItem>
                              <SelectItem value="occasionally">Yes — Occasionally</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Data Processing</h3>
                        <div className="space-y-2">
                          <Label>Personal data processed by AI?</Label>
                          <Select value={data.personal_data} onValueChange={v => update("personal_data", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="extensive">Yes — Extensive</SelectItem>
                              <SelectItem value="minimal">Yes — Minimal</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Special Category Data</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {SPECIAL_CATEGORIES.map(c => (
                              <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox checked={data.special_category_data.includes(c)} onCheckedChange={() => toggleArrayItem("special_category_data", c)} />
                                {c}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>AI Profiling</Label>
                          <Select value={data.ai_profiling} onValueChange={v => update("ai_profiling", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="extensive">Yes — Extensive</SelectItem>
                              <SelectItem value="minimal">Yes — Minimal</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Transparency</h3>
                        <div className="space-y-2">
                          <Label>Are users informed about AI usage?</Label>
                          <Select value={data.users_informed} onValueChange={v => update("users_informed", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="always">Yes — Always</SelectItem>
                              <SelectItem value="sometimes">Yes — Sometimes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>AI-generated content labeled?</Label>
                          <Select value={data.ai_content_labeled} onValueChange={v => update("ai_content_labeled", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="somewhat">Somewhat</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Right to explanation provided?</Label>
                          <Select value={data.right_to_explanation} onValueChange={v => update("right_to_explanation", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fully">Yes — Fully</SelectItem>
                              <SelectItem value="partially">Yes — Partially</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 5 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Governance</h3>
                        <div className="space-y-2">
                          <Label>AI governance policy?</Label>
                          <Select value={data.governance_policy} onValueChange={v => update("governance_policy", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="documented">Yes — Documented</SelectItem>
                              <SelectItem value="informal">Yes — Informal</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Compliance officer appointed?</Label>
                          <Select value={data.compliance_officer} onValueChange={v => update("compliance_officer", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="planning">No — Planning to</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Risk assessments conducted?</Label>
                          <Select value={data.risk_assessments} onValueChange={v => update("risk_assessments", v)}>
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recent">Yes — Within 12 months</SelectItem>
                              <SelectItem value="over_1_year">Yes — Over 1 year ago</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-6">
                      <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      {step < totalSteps ? (
                        <Button variant="hero" size="sm" onClick={() => setStep(s => s + 1)}>
                          Next <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button variant="hero" size="sm" onClick={handleSubmit}>
                          Get My Score <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : emailStep ? (
                <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 sm:p-12 max-w-md mx-auto text-center">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground">Step 6 of 6</span>
                      <span className="text-xs text-gold font-mono">100%</span>
                    </div>
                    <Progress value={100} className="h-1.5 mb-6" />
                    <div className="mx-auto w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                      <Mail className="h-7 w-7 text-gold" />
                    </div>
                    <h2 className="text-xl font-black text-foreground mb-2">Your Score is Ready!</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Enter your work email to see your compliance score and receive a summary of key findings.
                    </p>
                    <div className="space-y-3">
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
                        placeholder="you@company.com"
                        className="bg-background border-border text-center"
                        maxLength={255}
                      />
                      <Button variant="hero" className="w-full" onClick={handleEmailSubmit} disabled={saving}>
                        {saving ? "Processing..." : "Show My Score"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground/40 mt-2">
                        We'll send your compliance summary to this email.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                  <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 sm:p-12 mb-6">
                    <result.Icon className={`h-16 w-16 ${result.color} mx-auto mb-4`} />
                    <p className={`text-6xl sm:text-7xl font-black ${result.color} mb-2`}>{result.score}%</p>
                    <p className={`text-lg font-bold ${result.color} tracking-widest mb-4`}>{result.status}</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      {result.score >= 70
                        ? "Your organization shows strong AI governance maturity. Sign up to get your official certificate and continuous monitoring."
                        : "There are significant compliance gaps. Sign up for a detailed breakdown and remediation roadmap."
                      }
                    </p>

                    {/* Social Share */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                      <span className="text-xs text-muted-foreground mr-1">Share:</span>
                      <button
                        onClick={shareOnLinkedIn}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-gold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        LinkedIn
                      </button>
                      <button
                        onClick={shareOnX}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-gold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Post on X
                      </button>
                    </div>

                    {/* Score Breakdown Teaser */}
                    <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
                      {["Art. 5-6", "Art. 13-14", "Art. 52"].map((art) => (
                        <div key={art} className="rounded-lg border border-border bg-background p-3 relative">
                          <p className="text-xs text-muted-foreground">{art}</p>
                          <div className="flex items-center justify-center h-8">
                            <Lock className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 mb-6">
                      <p className="text-xs text-gold font-semibold mb-1">Unlock Full Report</p>
                      <p className="text-xs text-muted-foreground">
                        Sign up to get article-by-article breakdown, Merkle proof certificate, and continuous compliance monitoring.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign Up — Get Full Report
                      </Button>
                      <Button variant="heroOutline" size="lg" onClick={() => { setShowResult(false); setEmailStep(false); setStep(1); setData(defaultData); setEmail(""); }}>
                        Retake Assessment
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    This is a preliminary assessment. Full compliance verification requires authenticated access and Merkle proof generation.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default FreeAssessment;
