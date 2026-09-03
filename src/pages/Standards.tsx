import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowRight, FileCode, Globe, CheckCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Helmet } from "react-helmet-async";

interface MappingRow {
  predicateId: string;
  predicateName: string;
  nistControl: string;
  nistFunction: string;
  isoClause: string;
  euArticle: string;
  cisaGuideline: string;
}

const mappings: MappingRow[] = [
  { predicateId: "EU_ART_5", predicateName: "Prohibited Practice Check", nistControl: "GOVERN 1.1", nistFunction: "Govern", isoClause: "4.1 — Context", euArticle: "Art. 5", cisaGuideline: "Risk Identification" },
  { predicateId: "EU_ART_6", predicateName: "Risk Classification", nistControl: "MAP 1.1", nistFunction: "Map", isoClause: "6.1 — Risk Assessment", euArticle: "Art. 6", cisaGuideline: "System Categorization" },
  { predicateId: "EU_ART_9", predicateName: "Risk Management System", nistControl: "GOVERN 1.2", nistFunction: "Govern", isoClause: "6.1.2 — Risk Treatment", euArticle: "Art. 9", cisaGuideline: "Risk Management Framework" },
  { predicateId: "EU_ART_10", predicateName: "Data Governance", nistControl: "MAP 2.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "Art. 10", cisaGuideline: "Data Quality Controls" },
  { predicateId: "EU_ART_11", predicateName: "Technical Documentation", nistControl: "GOVERN 4.1", nistFunction: "Govern", isoClause: "7.5 — Documented Info", euArticle: "Art. 11", cisaGuideline: "Documentation Standards" },
  { predicateId: "EU_ART_12", predicateName: "Record-Keeping", nistControl: "MANAGE 2.1", nistFunction: "Manage", isoClause: "9.1 — Monitoring", euArticle: "Art. 12", cisaGuideline: "Audit Trail Requirements" },
  { predicateId: "EU_ART_13", predicateName: "Transparency Obligation", nistControl: "MAP 5.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "Art. 13", cisaGuideline: "Transparency Guidelines" },
  { predicateId: "EU_ART_14", predicateName: "Human Oversight", nistControl: "GOVERN 6.1", nistFunction: "Govern", isoClause: "5.3 — Roles", euArticle: "Art. 14", cisaGuideline: "Human-in-the-Loop" },
  { predicateId: "EU_ART_15", predicateName: "Accuracy & Robustness", nistControl: "MEASURE 2.5", nistFunction: "Measure", isoClause: "9.2 — Internal Audit", euArticle: "Art. 15", cisaGuideline: "Performance Monitoring" },
  { predicateId: "EU_ART_50", predicateName: "AI-Generated Content Label", nistControl: "MAP 5.2", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "Art. 50", cisaGuideline: "Content Labeling" },
  { predicateId: "CO_AI_IMPACT", predicateName: "Colorado Impact Assessment", nistControl: "MAP 1.5", nistFunction: "Map", isoClause: "6.1 — Risk Assessment", euArticle: "—", cisaGuideline: "Impact Assessment" },
  { predicateId: "CO_AI_DISCLOSURE", predicateName: "Colorado Disclosure", nistControl: "MAP 5.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Disclosure Standards" },
  { predicateId: "CO_AI_GOVERNANCE", predicateName: "Colorado Governance Framework", nistControl: "GOVERN 1.1", nistFunction: "Govern", isoClause: "5.1 — Leadership", euArticle: "—", cisaGuideline: "Governance Framework" },
  { predicateId: "CA_ADT_IMPACT", predicateName: "California ADT Assessment", nistControl: "MAP 1.5", nistFunction: "Map", isoClause: "6.1 — Risk Assessment", euArticle: "—", cisaGuideline: "Impact Assessment" },
  { predicateId: "CA_ADT_NOTICE", predicateName: "California ADT Notice", nistControl: "MAP 5.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Consumer Notice" },
  { predicateId: "CA_FRONTIER_SAFETY", predicateName: "Frontier Model Safety", nistControl: "MANAGE 4.1", nistFunction: "Manage", isoClause: "6.1.2 — Risk Treatment", euArticle: "—", cisaGuideline: "Critical AI Safety" },
  { predicateId: "ISO_42001_4", predicateName: "Context of Organization", nistControl: "GOVERN 1.1", nistFunction: "Govern", isoClause: "4 — Context", euArticle: "Art. 9", cisaGuideline: "Organizational Context" },
  { predicateId: "ISO_42001_5", predicateName: "Leadership & Commitment", nistControl: "GOVERN 1.2", nistFunction: "Govern", isoClause: "5 — Leadership", euArticle: "Art. 9", cisaGuideline: "Leadership Commitment" },
  { predicateId: "ISO_42001_6_1", predicateName: "Risk Assessment", nistControl: "MAP 1.1", nistFunction: "Map", isoClause: "6.1 — Planning", euArticle: "Art. 9", cisaGuideline: "Risk Planning" },
  { predicateId: "ISO_42001_9", predicateName: "Performance Evaluation", nistControl: "MEASURE 1.1", nistFunction: "Measure", isoClause: "9 — Evaluation", euArticle: "Art. 15", cisaGuideline: "Performance Review" },
  { predicateId: "NIST_GOVERN", predicateName: "NIST Govern Function", nistControl: "GOVERN 1–6", nistFunction: "Govern", isoClause: "5 — Leadership", euArticle: "Art. 9, 14", cisaGuideline: "Governance Controls" },
  { predicateId: "NIST_MAP", predicateName: "NIST Map Function", nistControl: "MAP 1–5", nistFunction: "Map", isoClause: "4 — Context", euArticle: "Art. 6, 9", cisaGuideline: "Risk Mapping" },
  { predicateId: "NIST_MEASURE", predicateName: "NIST Measure Function", nistControl: "MEASURE 1–4", nistFunction: "Measure", isoClause: "9 — Evaluation", euArticle: "Art. 15", cisaGuideline: "Measurement Controls" },
  { predicateId: "NIST_MANAGE", predicateName: "NIST Manage Function", nistControl: "MANAGE 1–4", nistFunction: "Manage", isoClause: "10 — Improvement", euArticle: "Art. 12", cisaGuideline: "Risk Management" },
  { predicateId: "AU_PRIVACY", predicateName: "Australia Privacy Act", nistControl: "GOVERN 5.1", nistFunction: "Govern", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Privacy Controls" },
  { predicateId: "IN_IT_RULES", predicateName: "India IT Rules", nistControl: "GOVERN 5.1", nistFunction: "Govern", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Compliance Controls" },
  { predicateId: "CA_EO_N526_CERTIFICATION", predicateName: "CA EO N-5-26 Vendor Certification", nistControl: "GOVERN 1.1", nistFunction: "Govern", isoClause: "4.1 — Context", euArticle: "—", cisaGuideline: "Vendor Certification" },
  { predicateId: "CA_EO_N526_TRANSPARENCY", predicateName: "CA EO N-5-26 Transparency", nistControl: "MAP 5.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Transparency Standards" },
  { predicateId: "CA_EO_N526_PROCUREMENT", predicateName: "CA EO N-5-26 Procurement", nistControl: "GOVERN 4.1", nistFunction: "Govern", isoClause: "7.5 — Documented Info", euArticle: "—", cisaGuideline: "Procurement Controls" },
  { predicateId: "CA_EO_N526_TRUST_SAFETY", predicateName: "CA EO N-5-26 Trust & Safety", nistControl: "MANAGE 4.1", nistFunction: "Manage", isoClause: "6.1.2 — Risk Treatment", euArticle: "—", cisaGuideline: "Trust & Safety" },
  { predicateId: "SG_MGF_TRANSPARENCY", predicateName: "Singapore MGF Transparency", nistControl: "MAP 5.1", nistFunction: "Map", isoClause: "5.2 — Policy", euArticle: "—", cisaGuideline: "Transparency Controls" },
  { predicateId: "SG_MGF_ACCOUNTABILITY", predicateName: "Singapore MGF Accountability", nistControl: "GOVERN 6.1", nistFunction: "Govern", isoClause: "5.3 — Roles", euArticle: "—", cisaGuideline: "Accountability Framework" },
  { predicateId: "SG_MGF_FAIRNESS", predicateName: "Singapore MGF Fairness", nistControl: "MEASURE 2.5", nistFunction: "Measure", isoClause: "9.2 — Internal Audit", euArticle: "—", cisaGuideline: "Fairness Assessment" },
];

const functionColors: Record<string, string> = {
  Govern: "bg-primary/15 text-primary border-primary/30",
  Map: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  Measure: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  Manage: "bg-blue-400/15 text-blue-400 border-blue-400/30",
};

const frameworkStats = [
  { label: "PSI Predicates", value: "62+" },
  { label: "NIST Controls Mapped", value: "24" },
  { label: "ISO 42001 Clauses", value: "8" },
  { label: "Jurisdictions", value: "14" },
];

const Standards = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Standards Cross-Walk — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="How APEX PSI maps to ISO/IEC 42001, NIST AI RMF, EU AI Act, and SEC 17a-4 obligations." />
        <link rel="canonical" href="https://ai-governance-standard.com/standards" />
        <meta property="og:title" content="Standards Cross-Walk — APEX PSI" />
        <meta property="og:description" content="How APEX PSI maps to ISO/IEC 42001, NIST AI RMF, EU AI Act, and SEC 17a-4 obligations." />
        <meta property="og:url" content="https://ai-governance-standard.com/standards" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-black text-xl tracking-tight bg-transparent border-none cursor-pointer">
            <span className="text-gold-gradient">APEX</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/compare")} className="font-mono text-xs">Compare</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/engine")} className="font-mono text-xs">PSI Engine</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/architecture")} className="font-mono text-xs">Architecture</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
            STANDARDS MAPPING
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="text-gold-gradient">Every Predicate.</span>{" "}
            <span className="text-foreground">Every Standard.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The PSI Protocol maps each of its 55+ compliance predicates to NIST AI RMF 100-1 controls,
            ISO 42001 clauses, EU AI Act articles, and CISA guidelines — the most complete control mapping
            in the industry.
          </p>
        </motion.section>

        {/* Stats */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {frameworkStats.map((s) => (
            <Card key={s.label} className="bg-card border-border text-center">
              <CardContent className="pt-6 pb-4">
                <div className="text-3xl font-black font-mono text-gold-gradient">{s.value}</div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </motion.section>

        {/* NIST AI RMF Function Legend */}
        <section className="flex flex-wrap items-center justify-center gap-3">
          {Object.entries(functionColors).map(([fn, cls]) => (
            <Badge key={fn} className={`font-mono text-xs border ${cls}`}>{fn}</Badge>
          ))}
          <span className="text-xs text-muted-foreground ml-2">← NIST AI RMF Functions</span>
        </section>

        {/* Mapping Table */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-2xl font-bold mb-6 text-center">Predicate → Standard Control Mapping</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Predicate ID</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">NIST AI RMF</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Function</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">ISO 42001</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">EU AI Act</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">CISA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((row) => (
                  <TableRow key={row.predicateId} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-primary font-bold">{row.predicateId}</TableCell>
                    <TableCell className="text-sm">{row.predicateName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.nistControl}</TableCell>
                    <TableCell>
                      <Badge className={`font-mono text-[10px] border ${functionColors[row.nistFunction] || ""}`}>
                        {row.nistFunction}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.isoClause}</TableCell>
                    <TableCell className="font-mono text-xs">{row.euArticle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.cisaGuideline}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.section>

        {/* Frameworks Coverage Summary */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-bold">NIST AI RMF 100-1</h3>
              </div>
              <p className="text-sm text-muted-foreground">Full coverage of all 4 core functions: Govern, Map, Measure, Manage. Each PSI predicate maps to specific sub-controls with verifiable cryptographic attestation.</p>
              <div className="flex flex-wrap gap-1">
                {["GOVERN", "MAP", "MEASURE", "MANAGE"].map((f) => (
                  <Badge key={f} variant="outline" className="font-mono text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />{f}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="font-bold">ISO 42001 / ISO 23894</h3>
              </div>
              <p className="text-sm text-muted-foreground">Clause-level mapping across the AI Management System standard. From organizational context (Clause 4) through performance evaluation (Clause 9).</p>
              <div className="flex flex-wrap gap-1">
                {["Clause 4", "Clause 5", "Clause 6", "Clause 7", "Clause 9", "Clause 10"].map((c) => (
                  <Badge key={c} variant="outline" className="font-mono text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />{c}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                <h3 className="font-bold">CISA AI Guidelines</h3>
              </div>
              <p className="text-sm text-muted-foreground">Aligned with CISA's Roadmap for AI and critical infrastructure security directives. Every predicate maps to specific CISA governance categories.</p>
              <div className="flex flex-wrap gap-1">
                {["Risk ID", "Governance", "Transparency", "Safety"].map((g) => (
                  <Badge key={g} variant="outline" className="font-mono text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />{g}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center py-12 space-y-6">
          <h2 className="text-3xl font-black">
            <span className="text-gold-gradient">Standards-grade compliance.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No other platform provides verifiable, cryptographic mapping across NIST, ISO, CISA, and the EU AI Act simultaneously.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button onClick={() => navigate("/engine")} className="bg-primary text-primary-foreground font-mono gap-2">
              Verify Now <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/compare")} className="font-mono gap-2">
              <Shield className="h-4 w-4" /> Compare Platforms
            </Button>
          </div>
        </section>
      </main>
    </div>
  </>
  );
};

export default Standards;
