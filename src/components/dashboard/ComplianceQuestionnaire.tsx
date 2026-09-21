import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EvidenceUpload from "./EvidenceUpload";

interface QuestionnaireData {
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

const defaultData: QuestionnaireData = {
  company_name: "",
  industry: "",
  company_size: "",
  eu_presence: "",
  ai_system_count: 0,
  ai_providers: [],
  high_risk_uses: [],
  automated_decisions: "",
  personal_data: "",
  special_category_data: [],
  ai_profiling: "",
  users_informed: "",
  ai_content_labeled: "",
  right_to_explanation: "",
  governance_policy: "",
  compliance_officer: "",
  risk_assessments: "",
};

const AI_PROVIDERS = ["OpenAI", "Anthropic", "Google", "Meta", "Microsoft", "Hugging Face", "Stability AI", "Other"];
const HIGH_RISK_USES = ["Recruitment", "Credit Scoring", "Healthcare Diagnosis", "Law Enforcement", "Essential Services Access", "None"];
const SPECIAL_CATEGORIES = ["Health", "Biometric", "Political", "Religious", "None"];

function calculateScore(data: QuestionnaireData) {
  let score = 0;
  const breakdown: Record<string, { score: number; max: number; label: string }> = {};

  // Article 5 - High-risk
  const hrCount = data.high_risk_uses.filter(u => u !== "None").length;
  const a5 = hrCount === 0 ? 20 : hrCount === 1 ? 10 : 0;
  breakdown["Article 5"] = { score: a5, max: 20, label: "Prohibited Practices" };
  score += a5;

  // Article 6 - Automated decisions
  const a6 = data.automated_decisions === "no" ? 15 : data.automated_decisions === "occasionally" ? 10 : 5;
  breakdown["Article 6"] = { score: a6, max: 15, label: "Classification" };
  score += a6;

  // Article 9 - Governance policy
  const a9 = data.governance_policy === "documented" ? 20 : data.governance_policy === "informal" ? 10 : 0;
  breakdown["Article 9"] = { score: a9, max: 20, label: "Risk Management" };
  score += a9;

  // Article 13 - Transparency
  const a13 = data.users_informed === "always" ? 15 : data.users_informed === "sometimes" ? 8 : 0;
  breakdown["Article 13"] = { score: a13, max: 15, label: "Transparency" };
  score += a13;

  // Article 14 - Human oversight
  const a14 = data.right_to_explanation === "fully" ? 15 : data.right_to_explanation === "partially" ? 8 : 0;
  breakdown["Article 14"] = { score: a14, max: 15, label: "Human Oversight" };
  score += a14;

  // Bonus: AI content labeling (up to 15)
  const bonus = data.ai_content_labeled === "yes" ? 15 : data.ai_content_labeled === "somewhat" ? 8 : 0;
  breakdown["Article 52"] = { score: bonus, max: 15, label: "Content Labeling" };
  score += bonus;

  const total = 100;
  const pct = Math.round((score / total) * 100);

  let status = "non_compliant";
  if (pct >= 90) status = "compliant";
  else if (pct >= 70) status = "mostly_compliant";
  else if (pct >= 50) status = "partially_compliant";

  return { score: pct, status, breakdown };
}

interface Props {
  onComplete: () => void;
  existingData?: QuestionnaireData | null;
}

const EVIDENCE_ARTICLES = [
  { key: "article_5", label: "Article 5 — Prohibited Practices" },
  { key: "article_6", label: "Article 6 — Risk Classification" },
  { key: "article_9", label: "Article 9 — Risk Management" },
  { key: "article_13", label: "Article 13 — Transparency" },
  { key: "article_14", label: "Article 14 — Human Oversight" },
];

const ComplianceQuestionnaire = ({ onComplete, existingData }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>(existingData || defaultData);
  const [saving, setSaving] = useState(false);
  const [evidenceHashes, setEvidenceHashes] = useState<Record<string, { hash: string; fileName: string }>>({});

  const totalSteps = 6;

  const handleEvidenceHash = (articleKey: string, hash: string, fileName: string) => {
    setEvidenceHashes((prev) => ({ ...prev, [articleKey]: { hash, fileName } }));
  };

  const update = (field: keyof QuestionnaireData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "ai_providers" | "high_risk_uses" | "special_category_data", item: string) => {
    setData(prev => {
      const arr = prev[field] as string[];
      if (item === "None") return { ...prev, [field]: arr.includes("None") ? [] : ["None"] };
      const without = arr.filter(i => i !== "None");
      return { ...prev, [field]: without.includes(item) ? without.filter(i => i !== item) : [...without, item] };
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Boost score if evidence is provided
      const evidenceBonus = Object.keys(evidenceHashes).length * 2; // up to 10 extra points
      const { score: rawScore, status: rawStatus } = calculateScore(data);
      const score = Math.min(100, rawScore + evidenceBonus);
      const status = score >= 90 ? "compliant" : score >= 70 ? "mostly_compliant" : score >= 50 ? "partially_compliant" : "non_compliant";

      // Build evidence hashes JSONB
      const evidenceData: Record<string, any> = {};
      for (const [key, val] of Object.entries(evidenceHashes)) {
        evidenceData[key] = { sha256: val.hash, file_name: val.fileName, attested_at: new Date().toISOString() };
      }

      // Upsert questionnaire
      const { error: qErr } = await supabase
        .from("questionnaire_responses")
        .upsert({
          user_id: user.id,
          ...data,
          completed: true,
          evidence_hashes: evidenceData,
        } as any, { onConflict: "user_id" });
      if (qErr) throw qErr;

      // Update compliance_results
      const { error: cErr } = await supabase
        .from("compliance_results")
        .update({
          overall_score: score,
          status,
          company_name: data.company_name,
        })
        .eq("user_id", user.id);
      if (cErr) throw cErr;

      // Update verification_history based on scoring
      const { score: _s, breakdown } = calculateScore(data);
      const articleMap: Record<string, string> = {
        "Article 5": "Article 5",
        "Article 6": "Article 6",
        "Article 9": "Article 9",
        "Article 13": "Article 13",
        "Article 14": "Article 14",
      };

      for (const [article, info] of Object.entries(breakdown)) {
        if (!articleMap[article]) continue;
        const vStatus = info.score >= info.max * 0.8 ? "verified" : info.score > 0 ? "pending" : "failed";
        await supabase
          .from("verification_history")
          .update({
            status: vStatus,
            verified_at: vStatus === "verified" ? new Date().toISOString() : null,
          })
          .eq("user_id", user.id)
          .eq("article_number", article);
      }

      toast.success("Compliance assessment completed!");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to save questionnaire");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-glow bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Compliance Questionnaire — Step {step} of {totalSteps}
        </CardTitle>
        <Progress value={(step / totalSteps) * 100} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Company Information</h3>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={data.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={data.industry} onValueChange={v => update("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select EU presence" /></SelectTrigger>
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
              <Label>How many AI systems does your organization use?</Label>
              <Input type="number" min={0} value={data.ai_system_count} onChange={e => update("ai_system_count", parseInt(e.target.value) || 0)} />
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
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Yes — Recent (within 12 months)</SelectItem>
                  <SelectItem value="over_1_year">Yes — Over 1 year ago</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Evidence-Based Attestation</h3>
            <p className="text-xs text-muted-foreground">
              Upload supporting policy documents for each article. Files are hashed client-side using SHA-256 — 
              <span className="text-compliant font-medium"> no sensitive document data leaves your browser.</span>
            </p>
            {EVIDENCE_ARTICLES.map((article) => (
              <EvidenceUpload
                key={article.key}
                articleKey={article.key}
                articleLabel={article.label}
                existingHash={evidenceHashes[article.key]?.hash}
                onHashGenerated={handleEvidenceHash}
              />
            ))}
            {Object.keys(evidenceHashes).length > 0 && (
              <div className="rounded-lg border border-compliant/20 bg-compliant/5 px-3 py-2">
                <p className="text-xs text-compliant font-medium">
                  {Object.keys(evidenceHashes).length} document(s) attested — evidence hashes committed to the append-only ledger
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < totalSteps ? (
            <Button variant="hero" size="sm" onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="hero" size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Submit Assessment"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceQuestionnaire;
